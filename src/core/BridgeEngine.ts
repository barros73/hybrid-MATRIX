import * as path from 'path';
import * as fs from 'fs';
import { ScriptExporter } from './ScriptExporter';
import { SemanticEngine } from './SemanticEngine';

export class BridgeEngine {
    constructor(private workspaceRoot: string) { }

    public async bridge() {
        console.log('Hybrid Matrix: Executing Bridge Analysis...');
        const hybridDir = path.join(this.workspaceRoot, '.hybrid');
        const treePath = path.join(hybridDir, 'hybrid-tree.json');
        const rcpPath = path.join(hybridDir, 'hybrid-rcp.json');

        let report = `# 🌉 MATRIX BRIDGE: Mission Map\n\n`;

        if (!fs.existsSync(treePath)) {
            report += `⚠️ **Error**: No TREE manifest found in .hybrid/. Run Genesis/TREE first.\n`;
            return this.finalize(report);
        }

        const treeData = JSON.parse(fs.readFileSync(treePath, 'utf8'));
        const nodes: any[] = treeData.manifest || [];

        const getContext = (index: string): string => {
            const parts = index.split('.');
            let context = "";
            if (parts.length > 1) {
                const parentIdx = parts.slice(0, -1).join('.');
                const parent = nodes.find(n => n.index === parentIdx);
                if (parent) {
                    context += `\n> **Parent Context (${parent.index})**: ${parent.label}\n`;
                    if (parent.description) context += `> ${parent.description}\n`;

                    const gparts = parentIdx.split('.');
                    if (gparts.length > 1) {
                        const grandIdx = gparts.slice(0, -1).join('.');
                        const grand = nodes.find(n => n.index === grandIdx);
                        if (grand) {
                            context += `> **Grandparent Context (${grand.index})**: ${grand.label}\n`;
                        }
                    }
                }
            }
            return context;
        };

        if (!fs.existsSync(rcpPath)) {
            report += `⚠️ **Warning**: No RCP state found. Assumed Greenfield project with Skeleton. Next step: Code the Skeleton.\n`;

            report += `\n### 🤖 AI MISSION: Greenfield Initialization\n`;
            report += `You are starting a new project. Follow the hierarchical coordinates to maintain architectural integrity.\n\n`;

            nodes.forEach(n => {
                report += `#### 📍 Coordinate ${n.index}: ${n.label}\n`;
                const ctx = getContext(n.index);
                if (ctx) report += ctx;
                if (n.description) report += `\n**Instruction**: ${n.description}\n`;
                report += `\n--- \n`;
            });

            return this.finalize(report);
        }

        const rcpData = JSON.parse(fs.readFileSync(rcpPath, 'utf8'));
        const codeNodes: any[] = rcpData.nodes || [];
        const edges: any[] = rcpData.edges || [];

        // -- LOAD RUSTED REPORT IF EXISTS --
        const rustedReportPath = path.join(hybridDir, 'hybrid-rusted-report.json');
        const rustedReport = fs.existsSync(rustedReportPath)
            ? JSON.parse(fs.readFileSync(rustedReportPath, 'utf-8'))
            : null;

        const scriptExporter = new ScriptExporter(this.workspaceRoot);
        const scriptsDir = path.join(hybridDir, 'scripts');
        if (!fs.existsSync(scriptsDir)) fs.mkdirSync(scriptsDir, { recursive: true });

        // -- SINGLE READ of hybrid-matrix.json --
        const matrixPath = path.join(hybridDir, 'hybrid-matrix.json');
        const matrixStore = fs.existsSync(matrixPath)
            ? JSON.parse(fs.readFileSync(matrixPath, 'utf-8'))
            : { links: [] };

        // Extension regex for all supported languages: Rust, C++, Python, Go, TypeScript/JS, C
        const LANG_EXT_RE = /\.(rs|ts|js|cpp|hpp|cc|py|go|c|h)$/i;

        // Pre-compute: which file paths are already declared in matrix.json
        const mappedFilePaths = new Set<string>(
            matrixStore.links.flatMap((l: any) => l.layer3_targets.map((t: any) => t.file_path))
        );

        report += `### 🔍 BROWNFIELD SYNC: Gap Analysis\n`;
        report += `MATRIX has reconciled the Topographic Plan (TREE) with the Physical Reality (RCP).\n\n`;

        let missingInCode = 0;

        // ─────────────────────────────────────────────────────────────
        // SECTION 1: TARGETS — requirements with no code yet
        // ─────────────────────────────────────────────────────────────
        report += `#### 🔴 TARGETS: Missing in Reality\n`;
        nodes.forEach(n => {
            const label = n.label || '';
            const isMermaidSyntax = (label.includes('[') && label.includes(']')) || label.includes('-->') || label.includes('==>') || label.includes('|');
            const isTechnicalMarker = label.includes('```') || label.includes('graph ') || isMermaidSyntax || n.id?.includes('`');
            if (isTechnicalMarker) return;

            const isImplemented = codeNodes.some(cn =>
                (cn.tags && cn.tags.some((t: string) => t === n.id || t === n.index)) ||
                (cn.data && cn.data.some((d: any) => d.name.includes(n.id) || d.name.includes(n.index))) ||
                (cn.filePath && cn.filePath.includes(n.id)) ||
                cn.name === n.id
            );

            if (!isImplemented) {
                report += `\n##### 🎯 Mission ${n.index}: ${n.label}\n`;
                const ctx = getContext(n.index);
                if (ctx) report += ctx;
                if (n.description) report += `**Goal**: ${n.description}\n`;

                const link = matrixStore.links.find((l: any) =>
                    l.layer1_sources.includes(n.id) || l.layer1_sources.includes(n.index)
                );
                if (link && link.layer3_targets.length > 0) {
                    const targetFile = link.layer3_targets[0].file_path;
                    const scriptContent = scriptExporter.exportContext(targetFile);
                    if (scriptContent) {
                        const scriptFileName = `${path.basename(targetFile, path.extname(targetFile))}_skeleton${path.extname(targetFile)}`;
                        const scriptPath = path.join(scriptsDir, scriptFileName);
                        fs.writeFileSync(scriptPath, scriptContent);
                        report += `> 📝 **Skeleton Generated**: [.hybrid/scripts/${scriptFileName}](file://${scriptPath})\n`;
                    }
                }
                missingInCode++;
            }
        });
        if (missingInCode === 0) report += `- *None! All planned features exist in code.*\n`;

        // ─────────────────────────────────────────────────────────────
        // SECTION 2: ARCHITECTURAL CONFLICTS (RED — Priority Zero)
        // ─────────────────────────────────────────────────────────────
        const conflicts: any[] = rcpData.conflicts || [];
        if (conflicts.length > 0) {
            report += `\n#### ⚠️ ARCHITECTURAL CONFLICTS\n`;
            conflicts.forEach((c: any) => {
                const icon = c.severity === 'error' ? '🔴' : '🟡';
                report += `- ${icon} **${c.category}**: ${c.description} (at \`${path.basename(c.location.file)}:L${c.location.line}\`)\n`;
                if (c.suggestedFix) report += `  - 💡 *Fix*: ${c.suggestedFix}\n`;
            });
            report += `\n`;
        }

        // ─────────────────────────────────────────────────────────────
        // SECTION 2b: RUSTED DIFFERENTIAL TESTING (🦀)
        // ─────────────────────────────────────────────────────────────
        if (rustedReport && Object.keys(rustedReport.nodes).length > 0) {
            report += `#### 🦀 RUSTED: Differential Test Results\n`;
            Object.entries(rustedReport.nodes).forEach(([id, result]: [string, any]) => {
                const icon = result.status === 'STABLE' ? '🟢' : (result.status === 'CONFLICT' ? '🔴' : '⚪');
                report += `- ${icon} **${id}**: ${result.status} (mean_diff: ${result.meanDiff.toExponential(2)})\n`;
                if (result.status === 'CONFLICT') {
                    report += `  - ⚖️ *Drift Detection*: The Rust implementation diverges from source behavior. Review logic in \`${id}\`.\n`;
                }
            });
            report += `\n`;
        }

        // ─────────────────────────────────────────────────────────────
        // SECTION 3: CANDIDATE DISCOVERY (PURPLE — Semantic Affinity)
        // Phase 4: LLM-based scoring via SemanticEngine
        // Supported: .rs .ts .js .cpp .hpp .cc .py .go .c .h
        // Config: .hybrid/hybrid-config.json
        // ─────────────────────────────────────────────────────────────
        const orphans = codeNodes.filter(cn => cn.filePath && !mappedFilePaths.has(cn.filePath));

        // Filter: only pass clean requirement nodes to the semantic engine
        // Exclude Mermaid graph syntax labels like "B --> C[\"BIM Models\"]"
        const semanticReqs = nodes.filter(n => {
            const label = n.label || '';
            const hasMermaidArrow = label.includes('-->') || label.includes('==>');
            const hasBrackets = label.includes('[') && label.includes(']');
            const hasGraphKeyword = /^graph\s+(TD|LR|BT|RL)/i.test(label);
            const hasCodeFence = label.includes('```');
            return !hasMermaidArrow && !hasBrackets && !hasGraphKeyword && !hasCodeFence
                && label.trim().length > 2;
        });

        const semanticEngine = new SemanticEngine(this.workspaceRoot);
        const semanticMatches = await semanticEngine.score(orphans, semanticReqs);

        if (semanticMatches.length > 0) {
            report += `#### 🟣 CANDIDATE DISCOVERY (Semantic Affinity)\n`;
            semanticMatches.forEach(m => {
                const bt = '`';
                const previewStr = m.preview.length > 0
                    ? bt + m.preview.slice(0, 3).join(bt + '  ' + bt) + bt
                    : '';
                report += `- ✨ **${m.reqId}** (${m.reqLabel}) [score: ${m.score.toFixed(2)}, mode: ${m.mode}]\n`;
                report += `  → ${bt}${path.basename(m.node.filePath)}${bt}${previewStr ? `  —  ${previewStr}` : ''}\n`;
                report += `  - 🔗 *Action*: ${bt}hybrid-matrix map --ai --req ${m.reqId} --target ${m.node.filePath}${bt}\n`;
            });
            report += `\n`;
        }

        // Keep backward compat: expose candidates array for orphan filtering
        const candidates = semanticMatches;

        // ─────────────────────────────────────────────────────────────
        // SECTION 4: ORPHANS — files with no requirement and no candidate
        // ─────────────────────────────────────────────────────────────
        const candidateNodeIds = new Set(candidates.map(c => c.node.id));
        const unknownOrphans = orphans.filter(o => !candidateNodeIds.has(o.id));
        if (unknownOrphans.length > 0) {
            report += `#### 👻 ORPHANS: Unmapped Reality\n`;
            unknownOrphans.forEach(o => {
                report += `- [?] \`${path.basename(o.filePath)}\` — not in TREE, not matched to any requirement\n`;
            });
            report += `\n`;
        }

        // ─────────────────────────────────────────────────────────────
        // FINAL AI INSTRUCTION
        // ─────────────────────────────────────────────────────────────
        report += `\n### 🤖 FINAL AI INSTRUCTION\n`;
        if (missingInCode > 0) report += `1. **Execute Missions**: Implement components in 'TARGETS'.\n`;
        if (conflicts.length > 0) report += `2. **Resolve Conflicts**: Fix issues in 'ARCHITECTURAL CONFLICTS'.\n`;
        if (candidates.length > 0) report += `3. **Adopt Candidates**: Link ${candidates.length} files in 'CANDIDATE DISCOVERY'.\n`;
        if (unknownOrphans.length > 0) report += `4. **Address Orphans**: Map or remove files in 'ORPHANS'.\n`;

        // ─────────────────────────────────────────────────────────────
        // SECTION 5: SPATIAL MISSION MAP (Mermaid — Color-Coded)
        // ─────────────────────────────────────────────────────────────
        report += `\n### 🗺️ SPATIAL MISSION MAP (Mermaid Graph)\n`;
        report += `\`\`\`mermaid\ngraph TD\n`;

        const usedEdges = new Set<string>();
        const nodeStability: Record<string, { incoming: number; color: string }> = {};

        // Initialize all code nodes: default YELLOW (orphan)
        codeNodes.forEach(cn => {
            const nodeId = cn.filePath
                ? path.basename(cn.filePath).replace(/\./g, '_')
                : cn.id.replace(/\./g, '_');

            let color = '#ffff33'; // Yellow (Orphan)
            if (mappedFilePaths.has(cn.filePath)) color = '#33ff33'; // Green (Linked)

            // Override with RUSTED status if available
            if (rustedReport && (rustedReport.nodes[cn.id] || rustedReport.nodes[cn.index])) {
                const r = rustedReport.nodes[cn.id] || rustedReport.nodes[cn.index];
                if (r.status === 'STABLE') color = '#006400'; // Dark Green (Verified Stable)
                if (r.status === 'CONFLICT') color = '#ff3333'; // Red (Test Failure)
            }

            if (rcpData.conflicts?.some((c: any) => c.location.file === cn.filePath)) color = '#ff3333'; // Red (Conflict — overrides)
            if (candidates.some(c => c.node.filePath === cn.filePath)) color = '#9333ea'; // Purple (Candidate)

            nodeStability[nodeId] = { incoming: 0, color };
        });

        // Calculate incoming edge gravity
        edges.forEach((e: any) => {
            const targetId = path.basename(e.to).replace(/\./g, '_');
            if (nodeStability[targetId]) nodeStability[targetId].incoming++;
        });

        // Promote high-gravity stable nodes to BLUE
        Object.keys(nodeStability).forEach(id => {
            if (nodeStability[id].incoming >= 5 && nodeStability[id].color === '#33ff33') {
                nodeStability[id].color = '#3333ff'; // Blue (High Gravity)
            }
        });

        // Add Mission nodes (WHITE = In-Progress)
        nodes.forEach(n => {
            const id = `MISSION_${n.index.replace(/\./g, '_')}`;
            nodeStability[id] = { incoming: 0, color: '#ffffff' };
        });

        // Render: code dependency edges
        edges.forEach((e: any) => {
            if (e.type === 'ownership') return;
            const source = path.basename(e.from).replace(/\./g, '_');
            const target = path.basename(e.to).replace(/\./g, '_');
            const typeLabel = e.type === 'mutable' ? '== mutates ==>' : '-->';
            const edgeKey = `${source}${typeLabel}${target}`;
            if (!usedEdges.has(edgeKey)) {
                report += `  ${source}${typeLabel}${target}\n`;
                usedEdges.add(edgeKey);
            }
        });

        // Render: requirement → code mappings (pink dashed lines)
        matrixStore.links.forEach((l: any) => {
            const reqValue = l.layer1_sources[0] || 'Unk';
            const reqId = `REQ_${reqValue.replace(/[^a-zA-Z0-9]/g, '_')}`;
            nodeStability[reqId] = { incoming: 0, color: '#f9f' };
            l.layer3_targets.forEach((t: any) => {
                const targetName = path.basename(t.file_path).replace(/\./g, '_');
                report += `  ${reqId} -. maps .-> ${targetName}\n`;
            });
        });

        // Render styles for all nodes
        Object.entries(nodeStability).forEach(([id, meta]) => {
            const darkBg = ['#ff3333', '#3333ff', '#9333ea'].includes(meta.color);
            const fontColor = darkBg ? 'color:#fff' : 'color:#333';
            const strokeWidth = meta.color === '#ff3333' ? '3px' : '2px';
            report += `  style ${id} fill:${meta.color},stroke:#333,stroke-width:${strokeWidth},${fontColor}\n`;
        });

        report += `\`\`\`\n\n`;
        report += `> **Legend**: 🔴 Conflict | 🟣 Candidate | 🟡 Orphan | ⚪ In-Progress | 🟢 Stable | 🔵 High Gravity (≥5 deps)\n`;

        return this.finalize(report);
    }


    private finalize(report: string) {
        const hybridDir = path.join(this.workspaceRoot, '.hybrid');
        if (!fs.existsSync(hybridDir)) fs.mkdirSync(hybridDir, { recursive: true });
        const reportPath = path.join(hybridDir, 'MATRIX_INSTRUCTION.md');
        fs.writeFileSync(reportPath, report);
        console.log(`✅ Instruction Generated: ${reportPath}`);
    }
}
