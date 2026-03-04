import * as path from 'path';
import * as fs from 'fs';

export interface DiscoveryResult {
    primaryNode: any;
    logicCores: any[];
    dependencies: string[];
}

export class DiscoveryEngine {
    constructor(private workspaceRoot: string) { }

    /**
     * Finds the logical cluster for a given target file by following dependency edges.
     */
    public discoverCluster(targetFilePath: string): DiscoveryResult | null {
        const hybridDir = path.join(this.workspaceRoot, '.hybrid');
        const rcpPath = path.join(hybridDir, 'hybrid-rcp.json');

        if (!fs.existsSync(rcpPath)) return null;

        const rcpData = JSON.parse(fs.readFileSync(rcpPath, 'utf8'));
        const nodes = rcpData.nodes || [];
        const edges = rcpData.edges || [];

        const primaryNode = nodes.find((n: any) => n.filePath === targetFilePath || n.id === targetFilePath);
        if (!primaryNode) return null;

        const logicCores: any[] = [];
        const visited = new Set<string>();
        visited.add(primaryNode.id);

        // Simple BFS to find direct and indirect dependencies (the "Spatial Map" gravity)
        const queue = [primaryNode.id];
        let depth = 0;
        const MAX_DEPTH = 2; // We only want the immediate architectural vicinity

        while (queue.length > 0 && depth < MAX_DEPTH) {
            const currentId = queue.shift()!;
            const directDeps = edges.filter((e: any) => e.from === currentId && e.type !== 'ownership');

            for (const edge of directDeps) {
                if (!visited.has(edge.to)) {
                    visited.add(edge.to);
                    const targetNode = nodes.find((n: any) => n.id === edge.to);
                    if (targetNode && !this.isExternal(targetNode.id)) {
                        logicCores.push(targetNode);
                        queue.push(targetNode.id);
                    }
                }
            }
            depth++;
        }

        return {
            primaryNode,
            logicCores,
            dependencies: Array.from(visited)
        };
    }

    private isExternal(id: string): boolean {
        // Basic heuristic: if it's not in our workspace path, it's external (like std or crates.io)
        return !id.startsWith('/') && !id.includes(this.workspaceRoot);
    }
}
