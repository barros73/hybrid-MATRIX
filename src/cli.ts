#!/usr/bin/env node
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

import * as path from 'path';
import * as fs from 'fs';
import { IdManager } from './core/IdManager';
import { MatrixValidator } from './core/MatrixValidator';
import { TagInjector } from './injector/TagInjector';
import { MatrixStore } from './core/types';

const args = process.argv.slice(2);
const command = args[0];
let workspaceRoot = process.cwd();

// Parse workspace root flag (-w)
const wIndex = args.indexOf('-w');
if (wIndex !== -1 && args[wIndex + 1]) {
    workspaceRoot = path.resolve(args[wIndex + 1]);
}

const hybridDir = path.join(workspaceRoot, '.hybrid');
const matrixPath = path.join(hybridDir, 'hybrid-matrix.json');
const manifestPath = path.join(workspaceRoot, 'MASTER_PROJECT_TREE.md');

/**
 * CLI entry point for hybrid-MATRIX.
 * Manages traceability links between requirements (Layer 1) and code (Layer 3).
 */
async function run() {
    const idManager = new IdManager(workspaceRoot);
    const validator = new MatrixValidator(matrixPath);
    const injector = new TagInjector();

    switch (command) {
        // Synchronizes IDs between code and manifest, and validates all existing links
        case 'sync':
            console.log('Hybrid Matrix: Syncing IDs and Validating...');
            idManager.syncIdsWithManifest(manifestPath);

            let store: MatrixStore = {
                matrix_version: "1.0",
                links: [],
                orphans: { unlinked_requirements: [], unlinked_code_tags: [] }
            };

            if (fs.existsSync(matrixPath)) {
                store = JSON.parse(fs.readFileSync(matrixPath, 'utf-8'));
            }

            // Perform high-fidelity validation using RCP structures
            const updatedStore = await validator.validate(store, workspaceRoot);
            fs.writeFileSync(matrixPath, JSON.stringify(updatedStore, null, 2));
            console.log(`Sync Complete. Validated ${updatedStore.links.length} links.`);
            break;

        // Injects @MATRIX: tags into source code for broken links
        case 'inject':
            console.log('Hybrid Matrix: Injecting Tags...');
            if (!fs.existsSync(matrixPath)) {
                console.error('Error: No hybrid-matrix.json found. Run sync first.');
                process.exit(1);
            }

            const injectStore: MatrixStore = JSON.parse(fs.readFileSync(matrixPath, 'utf-8'));
            let injectCount = 0;
            for (const link of injectStore.links) {
                if (link.status === 'BROKEN') {
                    for (const target of link.layer3_targets) {
                        // Injects tags directly into the target source file
                        if (injector.inject(target, link.layer1_sources)) injectCount++;
                    }
                }
            }
            console.log(`Injected ${injectCount} tags.`);
            break;

        // Automatically generates traceability links by bridging hybrid-tree.json (Requirements) and hybrid-rcp.json (Code)
        case 'connect':
            console.log('Hybrid Matrix: Bridging Requirements (Tree) to Code (RCP)...');
            const treePath = path.join(hybridDir, 'hybrid-tree.json');
            const rcpPath = path.join(hybridDir, 'hybrid-rcp.json');

            if (!fs.existsSync(treePath)) {
                console.log(`Error: hybrid-tree.json not found. Run "hybrid-tree consolidate" first.`);
                process.exit(1);
            }
            if (!fs.existsSync(rcpPath)) {
                console.log(`Error: hybrid-rcp.json not found. Run "hybrid-rcp export-structure" first.`);
                process.exit(1);
            }

            const treeData = JSON.parse(fs.readFileSync(treePath, 'utf-8'));
            const rcpStructure = JSON.parse(fs.readFileSync(rcpPath, 'utf-8'));

            // Recursive function to extract requirement IDs from the tree
            const extractReqs = (items: any[]): string[] => {
                let ids: string[] = [];
                for (const item of items) {
                    // Extract IDs from labels like "[AC.1.1] Title" or just "AC.1.1"
                    const match = item.label.match(/([A-Z0-9]+(?:\.[A-Z0-9]+)+)/);
                    if (match) ids.push(match[1]);
                    if (item.children && item.children.length > 0) {
                        ids = ids.concat(extractReqs(item.children));
                    }
                }
                return Array.from(new Set(ids));
            };

            const reqIds = extractReqs(treeData.manifest);
            console.log(`Extracted ${reqIds.length} requirements from ${treePath}`);

            let connectStore: MatrixStore = {
                matrix_version: "1.0",
                links: [],
                orphans: { unlinked_requirements: [], unlinked_code_tags: [] }
            };

            if (fs.existsSync(matrixPath)) {
                connectStore = JSON.parse(fs.readFileSync(matrixPath, 'utf-8'));
            }

            // Mapping rules between requirement prefixes and project crates/modules
            const mappingRules: Record<string, string> = {
                "A.": "core_shared",
                "B.": "geo_engine",
                "C.": "core_shared/src/bim",
                "D.": "fem_solver",
                "E.": "fem_solver",
                "F.": "reinforcement",
                "G.": "reinforcement",
                "H.": "reinforcement",
                "I.": "ui_client",
                "J.": "ui_client",
                "K.": "ui_client",
                "L.": "report_engine",
                "M.": "ui_client",
                "N.": "core_db",
                "O.": "core_db",
                "P.": "node_engine",
                "Q.": "node_engine",
                "R.": "server_core",
                "S.": "server_core",
                "AC.": "core_db/src/fabrication"
            };

            let connectCount = 0;
            for (const reqId of reqIds) {
                // Skip if already linked
                if (connectStore.links.some(l => l.layer1_sources.includes(reqId))) continue;

                let targetCrate = "";
                for (const [prefix, crate] of Object.entries(mappingRules)) {
                    if (reqId.startsWith(prefix)) {
                        targetCrate = crate;
                        break;
                    }
                }

                if (targetCrate) {
                    const node = rcpStructure.nodes.find((n: any) => n.filePath.includes(targetCrate));
                    if (node) {
                        const constructName = node.outputs?.[0]?.name || node.data?.[0]?.name || "mod";
                        connectStore.links.push({
                            matrix_id: `MTX-BIM-${reqId.replace(/\./g, '-')}`,
                            cardinality: "1:1",
                            layer1_sources: [reqId],
                            layer3_targets: [{
                                file_path: node.filePath,
                                construct_name: constructName,
                                language: "rust",
                                expected_tag: `@MATRIX: REQ-${reqId}`
                            }],
                            status: "BROKEN",
                            last_verified: new Date().toISOString()
                        });
                        connectCount++;
                    }
                }
            }

            // Gap Analysis
            const unmapped = reqIds.filter(id => !connectStore.links.some(l => l.layer1_sources.includes(id)));
            if (unmapped.length > 0) {
                console.log(`⚠️  Gap Analysis: ${unmapped.length} requirements have no code constructs mapped.`);
            }

            fs.writeFileSync(matrixPath, JSON.stringify(connectStore, null, 2));
            console.log(`✅ Bridge Updated: ${connectCount} new links added to hybrid-matrix.json`);
            break;

        // Generates a high-level Health Score report for the ecosystem
        case 'report':
            console.log('Hybrid Matrix: Generating Ecosystem Health Report...');
            if (!fs.existsSync(matrixPath)) {
                console.error('Error: No hybrid-matrix.json found. Run connect first.');
                process.exit(1);
            }

            const reportStore: MatrixStore = JSON.parse(fs.readFileSync(matrixPath, 'utf-8'));
            const totalLinks = reportStore.links.length;
            const validLinks = reportStore.links.filter(l => l.status === 'VALID').length;
            const brokenLinks = totalLinks - validLinks;

            // Extract unmapped requirements from the store's orphan data
            const unmappedReqs = reportStore.orphans?.unlinked_requirements?.length || 0;

            const healthScore = totalLinks > 0 ? Math.round((validLinks / totalLinks) * 100) : 0;

            console.log('\n--- HYBRID ECOSYSTEM HEALTH REPORT ---');
            console.log(`🟢 Traceability Integrity: ${healthScore}%`);
            console.log(`🔗 Total Links: ${totalLinks}`);
            console.log(`✅ Validated: ${validLinks}`);
            console.log(`🔴 Broken/Pending: ${brokenLinks}`);
            console.log(`⚠️  Documentation Gaps: ${unmappedReqs} requirements without code`);
            console.log('-------------------------------------\n');
            break;

        default:
            console.log('Usage: hybrid-matrix [sync|inject|connect|report] [-w <workspace-root>]');
    }
}

// Start the CLI application
run();
