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
import { execSync } from 'child_process';
import { IdManager } from './core/IdManager';
import { MatrixValidator } from './core/MatrixValidator';
import { TagInjector } from './injector/TagInjector';
import { MatrixStore } from './core/types';
import { ContextExtractor } from './ai/ContextExtractor';
import { ImpactSimulator } from './ai/ImpactSimulator';

const args = process.argv.slice(2);
const command = args[0];
let workspaceRoot = process.cwd();

// Parse flags
const wIndex = args.indexOf('-w');
if (wIndex !== -1 && args[wIndex + 1]) {
    workspaceRoot = path.resolve(args[wIndex + 1]);
}

const aiFormat = args.includes('--ai-format');

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
        // AI "Laser Sight": Extracts high-density context for a specific node
        case 'extract-context':
            const nodeId = args[1] === '-w' ? args[3] : args[1];
            if (!nodeId) {
                console.error('Usage: hybrid-matrix extract-context <node-id>');
                process.exit(1);
            }
            const context = await ContextExtractor.extract(workspaceRoot, nodeId);
            if (aiFormat) {
                console.log(JSON.stringify(context));
            } else {
                console.log('🌌 AI Laser Sight: Context for ' + nodeId);
                console.log(JSON.stringify(context, null, 2));
            }
            break;

        // AI "Dry-Run": Simulates architectural impact of a code patch
        case 'simulate':
            const patchPath = args[1] === '-w' ? args[3] : args[1];
            if (!patchPath) {
                console.error('Usage: hybrid-matrix simulate <patch-path>');
                process.exit(1);
            }
            const patchContent = fs.readFileSync(path.resolve(patchPath), 'utf8');
            const simulator = new ImpactSimulator();
            const result = await simulator.simulate(workspaceRoot, patchContent);
            if (aiFormat) {
                console.log(JSON.stringify(result));
            } else {
                if (result.status === 'SAFE_TO_APPLY') {
                    console.log('✅ Simulation: No architectural violations detected.');
                } else {
                    console.log('⚠️  SIMULATION ALERT: Potential Architectural Violations Found!');
                    result.violations.forEach(v => console.log('  - ' + v));
                }
            }
            break;

        // Synchronizes IDs between code and manifest, and validates all existing links
        case 'sync':
            if (!aiFormat) console.log('Hybrid Matrix: Syncing IDs and Validating...');
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
            if (aiFormat) {
                console.log(JSON.stringify({ status: 'success', validated_links: updatedStore.links.length }));
            } else {
                console.log(`Sync Complete. Validated ${updatedStore.links.length} links.`);
            }
            break;

        // Injects @MATRIX: tags into source code for broken links
        case 'inject':
            if (!aiFormat) console.log('Hybrid Matrix: Injecting Tags...');
            if (!fs.existsSync(matrixPath)) {
                if (aiFormat) console.log(JSON.stringify({ error: 'hybrid-matrix.json not found' }));
                else console.error('Error: No hybrid-matrix.json found. Run sync first.');
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
            if (aiFormat) {
                console.log(JSON.stringify({ status: 'success', injected_count: injectCount }));
            } else {
                console.log(`Injected ${injectCount} tags.`);
            }
            break;

        // Automatically generates traceability links by bridging hybrid-tree.json (Requirements) and hybrid-rcp.json (Code)
        case 'connect':
            if (!aiFormat) console.log('Hybrid Matrix: Bridging Requirements (Tree) to Code (RCP)...');
            const treePath = path.join(hybridDir, 'hybrid-tree.json');
            const rcpPath = path.join(hybridDir, 'hybrid-rcp.json');

            if (!fs.existsSync(treePath)) {
                if (aiFormat) console.log(JSON.stringify({ error: 'hybrid-tree.json not found' }));
                else console.log(`Error: hybrid-tree.json not found. Run "hybrid-tree consolidate" first.`);
                process.exit(1);
            }
            if (!fs.existsSync(rcpPath)) {
                if (aiFormat) console.log(JSON.stringify({ error: 'hybrid-rcp.json not found' }));
                else console.log(`Error: hybrid-rcp.json not found. Run "hybrid-rcp export-structure" first.`);
                process.exit(1);
            }

            const treeData = JSON.parse(fs.readFileSync(treePath, 'utf-8'));
            const rcpStructure = JSON.parse(fs.readFileSync(rcpPath, 'utf-8'));

            // Recursive function to extract requirement IDs from the tree
            const extractReqs = (items: any[]): string[] => {
                let ids: string[] = [];
                for (const item of items) {
                    const match = item.label.match(/([A-Z0-9]+(?:\.[A-Z0-9]+)+)/);
                    if (match) ids.push(match[1]);
                    if (item.children && item.children.length > 0) {
                        ids = ids.concat(extractReqs(item.children));
                    }
                }
                return Array.from(new Set(ids));
            };

            const reqIds = extractReqs(treeData.manifest || treeData.nodes || []);
            if (!aiFormat) console.log(`Extracted ${reqIds.length} requirements from ${treePath}`);

            let connectStore: MatrixStore = {
                matrix_version: "1.0",
                links: [],
                orphans: { unlinked_requirements: [], unlinked_code_tags: [] }
            };

            if (fs.existsSync(matrixPath)) {
                connectStore = JSON.parse(fs.readFileSync(matrixPath, 'utf-8'));
            }

            const mappingRules: Record<string, string> = {
                "A.": "core_shared", "B.": "geo_engine", "C.": "core_shared/src/bim",
                "D.": "fem_solver", "E.": "fem_solver", "F.": "reinforcement",
                "G.": "reinforcement", "H.": "reinforcement", "I.": "ui_client",
                "J.": "ui_client", "K.": "ui_client", "L.": "report_engine",
                "M.": "ui_client", "N.": "core_db", "O.": "core_db",
                "P.": "node_engine", "Q.": "node_engine", "R.": "server_core",
                "S.": "server_core", "AC.": "core_db/src/fabrication"
            };

            let connectCount = 0;
            for (const reqId of reqIds) {
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

            const unmapped = reqIds.filter(id => !connectStore.links.some(l => l.layer1_sources.includes(id)));

            fs.writeFileSync(matrixPath, JSON.stringify(connectStore, null, 2));

            if (aiFormat) {
                console.log(JSON.stringify({ status: 'success', new_links: connectCount, gaps: unmapped.length }));
            } else {
                if (unmapped.length > 0) console.log(`⚠️  Gap Analysis: ${unmapped.length} requirements have no code constructs mapped.`);
                console.log(`✅ Bridge Updated: ${connectCount} new links added to hybrid-matrix.json`);
            }
            break;

        // Generates a high-level Health Score report for the ecosystem
        case 'report':
            if (!aiFormat) console.log('Hybrid Matrix: Generating Ecosystem Health Report...');
            if (!fs.existsSync(matrixPath)) {
                if (aiFormat) console.log(JSON.stringify({ error: 'hybrid-matrix.json not found' }));
                else console.error('Error: No hybrid-matrix.json found. Run connect first.');
                process.exit(1);
            }

            const reportStore: MatrixStore = JSON.parse(fs.readFileSync(matrixPath, 'utf-8'));
            const totalLinks = reportStore.links.length;
            const validLinks = reportStore.links.filter(l => l.status === 'VALID').length;
            const brokenLinks = totalLinks - validLinks;
            const unmappedReqs = reportStore.orphans?.unlinked_requirements?.length || 0;
            const healthScore = totalLinks > 0 ? Math.round((validLinks / totalLinks) * 100) : 0;

            if (aiFormat) {
                console.log(JSON.stringify({
                    health_score: healthScore,
                    total_links: totalLinks,
                    valid: validLinks,
                    broken: brokenLinks,
                    gaps: unmappedReqs
                }));
            } else {
                const reportOutput = `
--- HYBRID ECOSYSTEM HEALTH REPORT ---
🟢 Traceability Integrity: ${healthScore}%
🔗 Total Links: ${totalLinks}
✅ Validated: ${validLinks}
🔴 Broken/Pending: ${brokenLinks}
⚠️  Documentation Gaps: ${unmappedReqs} requirements without code
-------------------------------------
`;
                console.log(reportOutput);
                const logPath = path.join(hybridDir, 'matrix-report.log');
                const timestampedOutput = `[${new Date().toISOString()}]\n${reportOutput.trim()}\n\n`;
                fs.appendFileSync(logPath, timestampedOutput);
                console.log(`Report appended at: ${logPath}`);
            }
            break;

        // Watch Mode: Background orchestrator that monitors files and updates the ecosystem
        case 'watch':
            console.log('👀 Hybrid Matrix: Entering Watch Mode (Background Orchestrator)...');
            console.log('Monitoring .rs files, .md files, and .hybrid/ artifacts.');

            const rcpExec = `node ${path.join(__dirname, '../../hybrid-RCP/dist/cli.js')} export-structure ${workspaceRoot}`;
            const treeExec = `node ${path.join(__dirname, '../../hybrid-TREE/dist/cli.js')} consolidate`;

            // Function to trigger a full ecosystem refresh
            const refresh = async (source: string) => {
                console.log(`\n🔄 Change detected in ${source}. Refreshing ecosystem...`);
                try {
                    if (source.endsWith('.rs')) {
                        console.log('⚡ Triggering RCP Scan...');
                        execSync(rcpExec, { stdio: 'inherit' });
                    }
                    if (source.endsWith('.md')) {
                        console.log('⚡ Triggering TREE Consolidation...');
                        execSync(treeExec, { stdio: 'inherit', cwd: workspaceRoot });
                    }

                    console.log('⚡ Synchronizing Matrix Links...');
                    const syncStore = JSON.parse(fs.readFileSync(matrixPath, 'utf-8'));
                    const updatedSyncStore = await validator.validate(syncStore, workspaceRoot);
                    fs.writeFileSync(matrixPath, JSON.stringify(updatedSyncStore, null, 2));
                    console.log('✅ Ecosystem Synchronized.');
                } catch (e) {
                    console.error('❌ Error during background sync:', e);
                }
            };

            // Watch for Rust changes
            fs.watch(workspaceRoot, { recursive: true }, (event, filename) => {
                if (filename && filename.endsWith('.rs') && !filename.includes('target')) {
                    refresh(filename);
                }
                if (filename && filename.endsWith('.md') && !filename.includes('.hybrid')) {
                    refresh(filename);
                }
            });

            // Keep the process alive
            process.stdin.resume();
            break;

        default:
            console.log('Usage: hybrid-matrix [sync|inject|connect|report] [-w <workspace-root>]');
    }
}

// Start the CLI application
run();
