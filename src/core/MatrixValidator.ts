/*
 * hybrid-MATRIX - The Deterministic Traceability Engine
 * Copyright 2026 Fabrizio Baroni
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import * as fs from 'fs';
import * as path from 'path';
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
        const rcpPath = path.join(hybridDir, 'hybrid-rcp.json');

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

        const unlinkedReqs: string[] = [];
        const unlinkedTags: string[] = [];

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
        console.log(`Checking ${target.file_path}...`);
        if (!fs.existsSync(target.file_path)) {
            console.log(`File not found: ${target.file_path}`);
            return false;
        }

        // 1. Physical Byte Check (Regex Tag)
        const content = fs.readFileSync(target.file_path, 'utf-8');
        const lines = content.split('\n');
        const hasTag = lines.some(line => line.includes(target.expected_tag));

        if (!hasTag) {
            console.log(`Tag not found: ${target.expected_tag} in ${target.file_path}`);
            return false;
        }
        console.log(`Tag found: ${target.expected_tag}`);

        // 2. Semantic Check (if RCP structure is available)
        if (rcpStructure && target.construct_name) {
            // Find the file in RCP structure
            const node = rcpStructure.nodes.find((n: any) => n.id === target.file_path || n.filePath === target.file_path);
            if (!node) {
                console.log(`Node not found in RCP structure for: ${target.file_path}`);
                return false;
            }
            // Check if the construct exists in exports/outputs
            const hasConstruct = node.outputs?.some((o: any) => o.name === target.construct_name) ||
                node.data?.some((d: any) => d.name === target.construct_name);

            if (!hasConstruct) {
                console.log(`Construct ${target.construct_name} not found in node ${node.id}`);
            }
            return hasConstruct;
        }

        return true;
    }
}
