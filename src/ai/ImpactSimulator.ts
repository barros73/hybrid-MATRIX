import * as fs from 'fs';
import * as path from 'path';
import { RustParser } from '../../../hybrid-RCP/src/parsers/rust-parser';
import { MatrixStore } from '../core/types';

export interface SimulationResult {
    status: 'SAFE_TO_APPLY' | 'REJECTED';
    violations: string[];
}

export class ImpactSimulator {
    private parser: RustParser;

    constructor() {
        this.parser = new RustParser();
    }

    public async simulate(workspaceRoot: string, patchContent: string): Promise<SimulationResult> {
        const violations: string[] = [];
        const hybridDir = path.join(workspaceRoot, '.hybrid');
        const matrixPath = path.join(hybridDir, 'hybrid-matrix.json');

        if (!fs.existsSync(matrixPath)) {
            return { status: 'SAFE_TO_APPLY', violations: [] };
        }

        const matrix: MatrixStore = JSON.parse(fs.readFileSync(matrixPath, 'utf8'));

        // 1. Parse patch to identify files and changes
        const patches = this.parseUnifiedDiff(patchContent);

        for (const patch of patches) {
            const fullPath = path.isAbsolute(patch.file) ? patch.file : path.join(workspaceRoot, patch.file);
            if (!fs.existsSync(fullPath)) continue;

            const originalContent = fs.readFileSync(fullPath, 'utf8');
            const virtualContent = this.applyPatch(originalContent, patch.hunks);

            // 2. RE-PARSE via RCP
            const name = path.basename(fullPath, '.rs');
            const virtualResult = await this.parser.parseString(virtualContent, name, fullPath, 'file');

            // 3. Compare with Matrix Expected Hashes
            for (const link of matrix.links) {
                for (const target of link.layer3_targets) {
                    if (target.file_path === patch.file && target.expected_hash) {
                        // Find this construct in the virtual result
                        const virtualConstruct = this.findConstruct(virtualResult, target.construct_name || '');
                        if (virtualConstruct) {
                            if (virtualConstruct.logicHash !== target.expected_hash) {
                                // Logic changed! Check original
                                const originalResult = await this.parser.parseString(originalContent, name, fullPath, 'file');
                                const originalConstruct = this.findConstruct(originalResult, target.construct_name || '');

                                if (originalConstruct && originalConstruct.logicHash === target.expected_hash) {
                                    violations.push(`Target [${target.construct_name}] logic changed. Matrix expects stability.`);
                                }
                            }
                        } else if (target.construct_name) {
                            violations.push(`Target [${target.construct_name}] was DELETED or RENAMED.`);
                        }
                    }
                }
            }

            // 4. Check for tag removal
            for (const link of matrix.links) {
                for (const target of link.layer3_targets) {
                    if (target.file_path === patch.file && !virtualContent.includes(target.expected_tag)) {
                        violations.push(`Matrix tag [${target.expected_tag}] was REMOVED.`);
                    }
                }
            }
        }

        return {
            status: violations.length === 0 ? 'SAFE_TO_APPLY' : 'REJECTED',
            violations
        };
    }

    private findConstruct(root: any, name: string): any | null {
        // Search in data (structs)
        const struct = root.data?.find((s: any) => s.name === name);
        if (struct) return struct;

        // Search in outputs (functions)
        const fn = root.outputs?.find((f: any) => f.name === name);
        if (fn) return fn;

        // Recurse children
        for (const child of root.children || []) {
            const found = this.findConstruct(child, name);
            if (found) return found;
        }

        return null;
    }

    private parseUnifiedDiff(diff: string): { file: string; hunks: string[] }[] {
        const patches: { file: string; hunks: string[] }[] = [];
        const lines = diff.split('\n');
        let currentPatch: { file: string; hunks: string[] } | null = null;

        for (const line of lines) {
            if (line.startsWith('+++ b/')) {
                if (currentPatch) patches.push(currentPatch);
                currentPatch = { file: line.substring(6).trim(), hunks: [] };
            } else if (line.startsWith('@@') && currentPatch) {
                currentPatch.hunks.push(line);
            } else if (currentPatch) {
                currentPatch.hunks[currentPatch.hunks.length - 1] += '\n' + line;
            }
        }
        if (currentPatch) patches.push(currentPatch);
        return patches;
    }

    private applyPatch(content: string, hunks: string[]): string {
        // Simplified patch application for simulation purposes
        // In a real scenario, this would use a proper diff library
        // Here we just use a heuristic: replace old lines with new lines
        let result = content;
        for (const hunk of hunks) {
            const lines = hunk.split('\n');
            const oldLines: string[] = [];
            const newLines: string[] = [];

            for (const line of lines) {
                if (line.startsWith('-')) oldLines.push(line.substring(1));
                else if (line.startsWith('+')) newLines.push(line.substring(1));
                else if (line.startsWith(' ') || line === '') {
                    // Context lines - we ignore them for this simple implementation
                    // but we should probably use them to locate the change.
                }
            }

            if (oldLines.length > 0) {
                const oldText = oldLines.join('\n');
                const newText = newLines.join('\n');
                result = result.replace(oldText, newText);
            } else if (newLines.length > 0) {
                // Addition only
                result += '\n' + newLines.join('\n');
            }
        }
        return result;
    }
}
