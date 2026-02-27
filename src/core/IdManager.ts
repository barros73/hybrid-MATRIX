import * as fs from 'fs';
import * as path from 'path';

export class IdManager {
    private lastId: number = 0;

    constructor(private workspaceRoot: string) { }

    /**
     * Parses the MASTER_PROJECT_TREE.md and ensures every node has a REQ-XXX ID.
     * If a node lacks an ID, one is generated and injected into the file.
     */
    public syncIdsWithManifest(manifestPath: string): Map<string, string> {
        if (!fs.existsSync(manifestPath)) return new Map();

        let content = fs.readFileSync(manifestPath, 'utf-8');
        const lines = content.split('\n');
        const idMap = new Map<string, string>(); // Label -> ID

        // Find the highest existing ID to continue sequence
        const idRegex = /REQ-(\d{3})/;
        const matches = content.match(new RegExp(idRegex, 'g'));
        if (matches) {
            matches.forEach(m => {
                const num = parseInt(m.split('-')[1]);
                if (num > this.lastId) this.lastId = num;
            });
        }

        const newLines = lines.map(line => {
            // Match hybrid-TREE nodes like: "├── [X] Label: Description" or "├── [X] Label"
            const treeMatch = line.match(/^([│\s├└─]+)\s*(\[[\s/X!]\])\s*([^:]+)(:.*)?$/);
            if (treeMatch) {
                const prefix = treeMatch[1];
                const status = treeMatch[2];
                let label = treeMatch[3].trim();
                const rest = treeMatch[4] || "";

                if (!idRegex.test(label)) {
                    this.lastId++;
                    const newId = `REQ-${this.lastId.toString().padStart(3, '0')}`;
                    const newLabel = `${newId}: ${label}`;
                    idMap.set(label, newId);
                    return `${prefix} ${status} ${newLabel}${rest}`;
                } else {
                    const existingId = label.match(idRegex)![0];
                    const cleanLabel = label.replace(idRegex, "").replace(/^:\s*/, "").trim();
                    idMap.set(cleanLabel, existingId);
                }
            }
            return line;
        });

        const newContent = newLines.join('\n');
        if (newContent !== content) {
            fs.writeFileSync(manifestPath, newContent);
        }

        return idMap;
    }

    public getNextId(): string {
        this.lastId++;
        return `REQ-${this.lastId.toString().padStart(3, '0')}`;
    }
}
