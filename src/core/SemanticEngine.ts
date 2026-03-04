/**
 * SemanticEngine — Phase 4: LLM-Based Semantic Affinity
 * Scores orphan code files against requirement labels using:
 *   - Mode A (default): Pure TF-IDF cosine similarity (zero external deps)
 *   - Mode B (optional): OpenAI-compatible embedding API (Ollama, OpenAI, etc.)
 *
 * Config: .hybrid/hybrid-config.json
 */

import * as fs from 'fs';
import * as path from 'path';
import * as https from 'https';
import * as http from 'http';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface SemanticMatch {
    reqId: string;
    reqLabel: string;
    node: any;
    score: number;       // 0.0 → 1.0
    mode: 'llm' | 'tfidf';
    preview: string[];   // extracted function signatures / class names
}

interface HybridConfig {
    llm?: {
        enabled?: boolean;
        endpoint?: string;
        model?: string;
        apiKey?: string;
    };
    semantic?: {
        threshold?: number;
        maxCandidatesPerReq?: number;
    };
}

// ─── Language-aware signature extractors ──────────────────────────────────────

const SIGNATURE_PATTERNS: RegExp[] = [
    /pub\s+(?:async\s+)?fn\s+(\w+)/g,         // Rust: pub fn / pub async fn
    /(?:async\s+)?fn\s+(\w+)/g,               // Rust: fn
    /(?:pub\s+)?(?:struct|enum|impl|trait)\s+(\w+)/g, // Rust types
    /(?:export\s+)?(?:async\s+)?function\s+(\w+)/g,   // JS/TS
    /(?:export\s+)?class\s+(\w+)/g,           // JS/TS class
    /(?:export\s+)?(?:const|let)\s+(\w+)\s*=/g, // JS/TS exports
    /def\s+(\w+)\s*\(/g,                      // Python
    /class\s+(\w+)\s*[:(]/g,                  // Python class
    /func\s+\(?(\w+)/g,                       // Go
    /(?:void|int|bool|string|auto)\s+(\w+)\s*\(/g, // C/C++
];

// ─── SemanticEngine ───────────────────────────────────────────────────────────

export class SemanticEngine {
    private config: HybridConfig;

    constructor(private workspaceRoot: string) {
        this.config = this.loadConfig();
    }

    // ── Public API ──────────────────────────────────────────────────────────

    /**
     * Score all orphan nodes against all requirement nodes.
     * Returns matches above the configured threshold.
     */
    public async score(
        orphans: any[],
        requirementNodes: any[]
    ): Promise<SemanticMatch[]> {
        const threshold = this.config.semantic?.threshold ?? 0.35;
        const maxPerReq = this.config.semantic?.maxCandidatesPerReq ?? 3;
        const useLLM = this.config.llm?.enabled === true;

        const results: SemanticMatch[] = [];

        for (const req of requirementNodes) {
            const reqLabel = req.label || '';
            const reqDesc = req.description || req.label || '';
            const matches: SemanticMatch[] = [];

            for (const orphan of orphans) {
                if (!orphan.filePath) continue;

                const preview = this.extractSignatures(orphan.filePath);
                const fileText = this.buildFileText(orphan, preview);

                let score = 0;
                let mode: 'llm' | 'tfidf' = 'tfidf';

                if (useLLM) {
                    try {
                        const [reqEmb, fileEmb] = await Promise.all([
                            this.embed(reqDesc),
                            this.embed(fileText)
                        ]);
                        score = cosineSimilarity(reqEmb, fileEmb);
                        mode = 'llm';
                    } catch {
                        // Fallback gracefully to TF-IDF if LLM fails
                        score = this.tfidfScore(reqDesc, fileText);
                    }
                } else {
                    score = this.tfidfScore(reqDesc, fileText);
                }

                if (score >= threshold) {
                    matches.push({
                        reqId: req.index || req.id || reqLabel,
                        reqLabel,
                        node: orphan,
                        score: Math.round(score * 100) / 100,
                        mode,
                        preview
                    });
                }
            }

            // Sort by descending score, cap at maxPerReq
            matches.sort((a, b) => b.score - a.score);
            results.push(...matches.slice(0, maxPerReq));
        }

        // Deduplicate: same req+node combination
        const seen = new Set<string>();
        return results.filter(m => {
            const key = `${m.reqId}::${m.node.id}`;
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
        });
    }

    // ── File content extraction ─────────────────────────────────────────────

    private extractSignatures(filePath: string): string[] {
        if (!fs.existsSync(filePath)) return [];
        const content = fs.readFileSync(filePath, 'utf-8').slice(0, 4000); // first 4KB only
        const signatures = new Set<string>();

        for (const pattern of SIGNATURE_PATTERNS) {
            pattern.lastIndex = 0; // reset global regex
            let match: RegExpExecArray | null;
            while ((match = pattern.exec(content)) !== null) {
                const name = match[1];
                if (name && name.length > 1 && !isCommonKeyword(name)) {
                    signatures.add(name);
                }
                if (signatures.size >= 12) break;
            }
        }

        // Also extract doc comments (first 3 lines starting with /// or #)
        const docLines = content
            .split('\n')
            .filter(l => /^\s*(\/\/\/|##?\s|\/\*\*)/.test(l))
            .slice(0, 3)
            .map(l => l.trim().replace(/^(\/\/\/|##?|\/\*\*)\s*/, ''));

        return [...signatures, ...docLines].slice(0, 10);
    }

    private buildFileText(node: any, preview: string[]): string {
        const parts: string[] = [];
        const base = path.basename(node.filePath || '').replace(/\.[^.]+$/, '');
        // Convert snake_case / camelCase / kebab-case to words
        const fileWords = base
            .replace(/[-_]/g, ' ')
            .replace(/([a-z])([A-Z])/g, '$1 $2')
            .toLowerCase();
        parts.push(fileWords);
        if (node.label) parts.push(node.label);
        if (node.description) parts.push(node.description);
        parts.push(preview.join(' '));
        return parts.join(' ');
    }

    // ── TF-IDF cosine similarity ────────────────────────────────────────────

    private tfidfScore(reqText: string, fileText: string): number {
        const tokA = tokenize(reqText);
        const tokB = tokenize(fileText);
        if (tokA.length === 0 || tokB.length === 0) return 0;

        const vocab = new Set([...tokA, ...tokB]);
        const vecA = tfidfVector(tokA, vocab);
        const vecB = tfidfVector(tokB, vocab);
        return cosineSimilarity(vecA, vecB);
    }

    // ── LLM Embedding call ──────────────────────────────────────────────────

    private embed(text: string): Promise<number[]> {
        return new Promise((resolve, reject) => {
            const endpoint = this.config.llm?.endpoint ?? 'http://localhost:11434/v1';
            const model = this.config.llm?.model ?? 'nomic-embed-text';
            const apiKey = this.config.llm?.apiKey ?? '';

            const body = JSON.stringify({ model, input: text });
            const url = new URL(`${endpoint}/embeddings`);
            const isHttps = url.protocol === 'https:';
            const transport = isHttps ? https : http;

            const options = {
                hostname: url.hostname,
                port: url.port || (isHttps ? 443 : 80),
                path: url.pathname,
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Content-Length': Buffer.byteLength(body),
                    ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {})
                }
            };

            const req = transport.request(options, res => {
                let data = '';
                res.on('data', chunk => data += chunk);
                res.on('end', () => {
                    try {
                        const json = JSON.parse(data);
                        const vector = json?.data?.[0]?.embedding;
                        if (Array.isArray(vector)) resolve(vector);
                        else reject(new Error('Invalid embedding response'));
                    } catch (e) { reject(e); }
                });
            });

            req.on('error', reject);
            req.setTimeout(8000, () => { req.destroy(); reject(new Error('Embed timeout')); });
            req.write(body);
            req.end();
        });
    }

    // ── Config loading ──────────────────────────────────────────────────────

    private loadConfig(): HybridConfig {
        const configPath = path.join(this.workspaceRoot, '.hybrid', 'hybrid-config.json');

        if (!fs.existsSync(configPath)) {
            // Write default config template on first use
            const defaultConfig: HybridConfig = {
                llm: {
                    enabled: false,
                    endpoint: 'http://localhost:11434/v1',
                    model: 'nomic-embed-text',
                    apiKey: ''
                },
                semantic: {
                    threshold: 0.45,
                    maxCandidatesPerReq: 2
                }
            };
            try {
                fs.writeFileSync(configPath, JSON.stringify(defaultConfig, null, 2), 'utf-8');
            } catch { /* read-only workspace, ignore */ }
            return defaultConfig;
        }

        try {
            return JSON.parse(fs.readFileSync(configPath, 'utf-8'));
        } catch {
            return {};
        }
    }
}

// ─── Pure utility functions (no deps) ─────────────────────────────────────────

function tokenize(text: string): string[] {
    return text
        .toLowerCase()
        .replace(/[^a-z0-9_\s]/g, ' ')
        .split(/\s+/)
        .filter(t => t.length > 2 && !STOP_WORDS.has(t));
}

function tfidfVector(tokens: string[], vocab: Set<string>): number[] {
    const tf = new Map<string, number>();
    tokens.forEach(t => tf.set(t, (tf.get(t) ?? 0) + 1));
    return Array.from(vocab).map(term => (tf.get(term) ?? 0) / tokens.length);
}

function cosineSimilarity(a: number[], b: number[]): number {
    let dot = 0, normA = 0, normB = 0;
    for (let i = 0; i < a.length; i++) {
        dot += a[i] * b[i];
        normA += a[i] * a[i];
        normB += b[i] * b[i];
    }
    const denom = Math.sqrt(normA) * Math.sqrt(normB);
    return denom === 0 ? 0 : dot / denom;
}

function isCommonKeyword(name: string): boolean {
    return KEYWORDS.has(name.toLowerCase());
}

const KEYWORDS = new Set([
    'main', 'new', 'self', 'this', 'true', 'false', 'null', 'none', 'ok',
    'err', 'default', 'from', 'into', 'clone', 'drop', 'init', 'get', 'set',
    'run', 'test', 'setup', 'build', 'fmt', 'debug', 'display', 'the', 'mod'
]);

const STOP_WORDS = new Set([
    'the', 'and', 'for', 'with', 'from', 'that', 'this', 'are', 'was',
    'not', 'but', 'all', 'can', 'its', 'our', 'has', 'have', 'been',
    'will', 'more', 'also', 'some', 'into', 'than', 'then', 'each',
    'any', 'use', 'new', 'via', 'per'
]);
