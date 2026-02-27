import * as fs from 'fs';
import * as path from 'path';
import { RustParser } from '../../../hybrid-RCP/src/parsers/rust-parser';

export interface AIContext {
    node_id: string;
    why: string;
    what: string[];
    where: { file: string; construct: string }[];
    code_snippet: string | null;
}

export class ContextExtractor {
    public static async extract(workspaceRoot: string, nodeId: string): Promise<AIContext | null> {
        try {
            const hybridDir = path.join(workspaceRoot, '.hybrid');
            const parser = new RustParser();

            // ... (Layers 0 and 1 remain same) ...
            // 1. Layer 0: GENESIS (Why)
            const mapPath = path.join(workspaceRoot, 'genesis-map.json');
            let why = "Unknown";
            if (fs.existsSync(mapPath)) {
                const map = JSON.parse(fs.readFileSync(mapPath, 'utf8'));
                const node = map.nodes.find((n: any) => n.id === nodeId);
                if (node) {
                    why = node.label;
                    const rationales = map.edges
                        .filter((e: any) => e.target === nodeId || e.source === nodeId)
                        .map((e: any) => e.rationale);
                    if (rationales.length > 0) {
                        why += " | Rationale: " + rationales.join("; ");
                    }
                }
            }

            // 2. Layer 1: TREE (What)
            const treePath = path.join(hybridDir, 'hybrid-tree.json');
            let what: string[] = [];
            if (fs.existsSync(treePath)) {
                const tree = JSON.parse(fs.readFileSync(treePath, 'utf8'));
                const findTask = (nodes: any[]): any => {
                    for (const n of nodes) {
                        if (n.id === nodeId) return n;
                        if (n.children) {
                            const found = findTask(n.children);
                            if (found) return found;
                        }
                    }
                };
                const taskNode = findTask(tree.nodes || []);
                if (taskNode) {
                    what = taskNode.checklist || [taskNode.label];
                }
            }

            // 3. Layer 2: MATRIX (Where)
            const matrixPath = path.join(hybridDir, 'hybrid-matrix.json');
            let where: { file: string; construct: string }[] = [];
            let code_snippet: string | null = null;

            if (fs.existsSync(matrixPath)) {
                const matrix = JSON.parse(fs.readFileSync(matrixPath, 'utf8'));
                const links = matrix.links.filter((l: any) => l.layer1_sources.includes(nodeId));
                where = links.flatMap((l: any) => l.layer3_targets.map((t: any) => ({
                    file: t.file_path,
                    construct: t.construct_name
                })));

                // 4. Laser Sight: Extract Code Snippet
                if (where.length > 0) {
                    const firstTarget = where[0];
                    const fullPath = path.isAbsolute(firstTarget.file)
                        ? firstTarget.file
                        : path.join(workspaceRoot, firstTarget.file);

                    if (fs.existsSync(fullPath)) {
                        const content = fs.readFileSync(fullPath, 'utf8');
                        code_snippet = parser.extractConstruct(content, firstTarget.construct);
                    }
                }
            }

            return { node_id: nodeId, why, what, where, code_snippet };
        } catch (e) {
            console.error('Error extracting context:', e);
            return null;
        }
    }
}
