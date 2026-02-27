import * as fs from 'fs';
import { MatrixStore, MatrixLink, Layer3Target } from './types';

export class MatrixValidator {
    constructor(private matrixFilePath: string) { }

    /**
     * Performs Double Validation loop.
     * 1. Check if Layer 1 requirement exists.
     * 2. Check if Layer 3 code tag matches.
     */
    public async validate(store: MatrixStore, workspaceRoot: string): Promise<MatrixStore> {
        const validatedLinks: MatrixLink[] = [];
        const hybridDir = path.join(workspaceRoot, '.hybrid');
        const rcpPath = path.join(hybridDir, 'project-structure.json');

        // Load RCP structural analysis if available
        let rcpStructure: any = null;
        if (fs.existsSync(rcpPath)) {
            rcpStructure = JSON.parse(fs.readFileSync(rcpPath, 'utf-8'));
        }

        for (const link of store.links) {
            let allTargetsValid = true;

            for (const target of link.layer3_targets) {
                const isValid = await this.verifyTarget(target, rcpStructure);
                if (!isValid) {
                    allTargetsValid = false;
                }
            }

            link.status = allTargetsValid ? 'VALID' : 'BROKEN';
            link.last_verified = new Date().toISOString();
            validatedLinks.push(link);
        }

        return {
            ...store,
            links: validatedLinks,
            orphans: {
                unlinked_requirements: unlinkedReqs,
                unlinked_code_tags: unlinkedTags
            }
        };
    }

    private async verifyTarget(target: Layer3Target, rcpStructure: any): Promise<boolean> {
        if (!fs.existsSync(target.file_path)) return false;

        // 1. Physical Byte Check (Regex Tag)
        const content = fs.readFileSync(target.file_path, 'utf-8');
        const lines = content.split('\n');
        const hasTag = lines.some(line => line.includes(target.expected_tag));

        if (!hasTag) return false;

        // 2. Semantic Check (if RCP structure is available)
        if (rcpStructure && target.construct_name) {
            // Find the file in RCP structure
            // RCP structure is a graph with nodes
            const node = rcpStructure.nodes.find((n: any) => n.id === target.file_path || n.filePath === target.file_path);
            if (node) {
                // Check if the construct exists in exports/outputs
                const hasConstruct = node.outputs?.some((o: any) => o.name === target.construct_name) ||
                    node.data?.some((d: any) => d.name === target.construct_name);
                return hasConstruct;
            }
        }

        return true;
    }
}
