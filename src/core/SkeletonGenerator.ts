import * as path from 'path';
import * as fs from 'fs';

interface TreeNode {
    id: string;
    parentId: string | null;
    label: string;
    description: string;
    ownership?: string;
    status: string;
}

export class SkeletonGenerator {
    constructor(private workspaceRoot: string) { }

    public generate() {
        console.log('Hybrid Matrix: Generating Safe Skeleton...');
        const hybridDir = path.join(this.workspaceRoot, '.hybrid');
        const treePath = path.join(hybridDir, 'hybrid-tree.json');

        if (!fs.existsSync(treePath)) {
            console.error('Error: hybrid-tree.json not found in .hybrid/');
            return { error: 'No tree found' };
        }

        const treeData = JSON.parse(fs.readFileSync(treePath, 'utf8'));
        const nodes: TreeNode[] = treeData.manifest || [];

        // 1. Calculate Priority (In-Degree Weight roughly modeled)
        // For a greenfield project with just a tree, parents have higher priority.
        // If we had a full graph, we would count incoming edges.
        const priorityMap = new Map<string, number>();
        nodes.forEach(n => {
            priorityMap.set(n.id, 0);
        });

        // Add weight for every child a node has (acting as outgoing dependencies / structural importance)
        nodes.forEach(n => {
            if (n.parentId && priorityMap.has(n.parentId)) {
                priorityMap.set(n.parentId, priorityMap.get(n.parentId)! + 1);
            }
        });

        // Sort: Highest priority first (most incoming connections/children)
        const sortedNodes = [...nodes].sort((a, b) => {
            return (priorityMap.get(b.id) || 0) - (priorityMap.get(a.id) || 0);
        });

        const srcDir = path.join(this.workspaceRoot, 'src');
        if (!fs.existsSync(srcDir)) {
            fs.mkdirSync(srcDir, { recursive: true });
        }

        let createdCount = 0;
        let skippedCount = 0;

        // Create structure logically
        sortedNodes.forEach(node => {
            if (!node.parentId) {
                // It's a root/Group: create a module directory
                const dirPath = path.join(srcDir, node.id);
                if (!fs.existsSync(dirPath)) {
                    fs.mkdirSync(dirPath, { recursive: true });
                    const modRsPath = path.join(dirPath, 'mod.rs');
                    if (!fs.existsSync(modRsPath)) {
                        fs.writeFileSync(modRsPath, `// Auto-generated module: ${node.label}\n`);
                    }
                    createdCount++;
                } else {
                    skippedCount++;
                }
            } else {
                // It's an item/component: create a file inside the parent directory
                const parentDir = path.join(srcDir, node.parentId);
                if (!fs.existsSync(parentDir)) {
                    fs.mkdirSync(parentDir, { recursive: true });
                }
                const filePath = path.join(parentDir, `${node.id}.rs`);
                if (!fs.existsSync(filePath)) {
                    let content = `// Auto-generated Component: ${node.label}\n`;
                    if (node.description) {
                        content += `/*\n * Context:\n * ${node.description}\n */\n`;
                    }
                    if (node.ownership) {
                        content += `// Ownership Policy: ${node.ownership}\n`;
                    }
                    content += `\npub fn init_${node.id}() {\n    // TODO: Implement ${node.label}\n}\n`;
                    fs.writeFileSync(filePath, content);
                    createdCount++;

                    // Also try to append pub mod to parent's mod.rs securely
                    const parentModRs = path.join(parentDir, 'mod.rs');
                    if (fs.existsSync(parentModRs)) {
                        const modStr = `pub mod ${node.id};\n`;
                        const existingMod = fs.readFileSync(parentModRs, 'utf8');
                        if (!existingMod.includes(modStr)) {
                            fs.appendFileSync(parentModRs, modStr);
                        }
                    }
                } else {
                    skippedCount++;
                }
            }
        });

        console.log(`✅ Skeleton Processed: ${createdCount} constructs created, ${skippedCount} existing skipped (Safe Mode).`);
        return { success: true, createdCount, skippedCount };
    }
}
