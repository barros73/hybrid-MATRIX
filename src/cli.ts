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

import { Command } from 'commander';
import * as path from 'path';
import * as fs from 'fs';
import { execSync } from 'child_process';
import { IdManager } from './core/IdManager';
import { MatrixValidator } from './core/MatrixValidator';
import { TagInjector } from './injector/TagInjector';
import { MatrixStore } from './core/types';
import { ContextExtractor } from './ai/ContextExtractor';
import { ImpactSimulator } from './ai/ImpactSimulator';
import { SkeletonGenerator } from './core/SkeletonGenerator';
import { BridgeEngine } from './core/BridgeEngine';
import { ScriptExporter } from './core/ScriptExporter';
import { ForgeEngine } from './core/ForgeEngine';
import { MCPServer } from './mcp-server';

const program = new Command();

program
    .name('hybrid-matrix')
    .description('Layer 2 of the Hybrid Ecosystem: Traceability Engine')
    .version('0.6.2');

program
    .option('-w, --workspace <path>', 'Workspace root path', process.cwd())
    .option('--ai-format', 'Output in machine-readable JSON format');

function getWorkspaceRoot(options: any): string {
    return path.resolve(options.workspace || process.cwd());
}

function getPaths(workspaceRoot: string) {
    const hybridDir = path.join(workspaceRoot, '.hybrid');
    return {
        hybridDir,
        matrixPath: path.join(hybridDir, 'hybrid-matrix.json'),
        manifestPath: path.join(hybridDir, 'MASTER_PROJECT_TREE.md'),
        logPath: path.join(hybridDir, 'matrix-report.log'),
        exportHistoryPath: path.join(hybridDir, 'export-history.json')
    };
}

function appendLog(logPath: string, cmd: string, message: string): void {
    const hybridDir = path.dirname(logPath);
    if (!fs.existsSync(hybridDir)) fs.mkdirSync(hybridDir, { recursive: true });
    const timestampedOutput = `[${new Date().toISOString()}] COMMAND: ${cmd}\n${message.trim()}\n\n`;
    fs.appendFileSync(logPath, timestampedOutput);
}

program
    .command('extract-context <nodeId>')
    .description('Extract high-density context for a specific node')
    .action(async (nodeId) => {
        const options = program.opts();
        const workspaceRoot = getWorkspaceRoot(options);
        const context = await ContextExtractor.extract(workspaceRoot, nodeId);
        if (options.aiFormat) {
            console.log(JSON.stringify(context));
        } else {
            console.log('🌌 AI Laser Sight: Context for ' + nodeId);
            console.log(JSON.stringify(context, null, 2));
        }
    });

program
    .command('simulate <patchPath>')
    .description('Simulates architectural impact of a code patch')
    .action(async (patchPath) => {
        const options = program.opts();
        const workspaceRoot = getWorkspaceRoot(options);
        const patchContent = fs.readFileSync(path.resolve(patchPath), 'utf8');
        const simulator = new ImpactSimulator();
        const result = await simulator.simulate(workspaceRoot, patchContent);
        if (options.aiFormat) {
            console.log(JSON.stringify(result));
        } else {
            if (result.status === 'SAFE_TO_APPLY') {
                console.log('✅ Simulation: No architectural violations detected.');
            } else {
                console.log('⚠️  SIMULATION ALERT: Potential Architectural Violations Found!');
                result.violations.forEach(v => console.log('  - ' + v));
            }
        }
    });

program
    .command('sync')
    .description('Sync IDs and validate links')
    .action(async () => {
        const options = program.opts();
        const workspaceRoot = getWorkspaceRoot(options);
        const { matrixPath, manifestPath, logPath } = getPaths(workspaceRoot);

        if (!options.aiFormat) console.log('Hybrid Matrix: Syncing IDs and Validating...');
        const idManager = new IdManager(workspaceRoot);
        idManager.syncIdsWithManifest(manifestPath);

        let store: MatrixStore = {
            matrix_version: "1.0",
            links: [],
            orphans: { unlinked_requirements: [], unlinked_code_tags: [] }
        };

        if (fs.existsSync(matrixPath)) {
            store = JSON.parse(fs.readFileSync(matrixPath, 'utf-8'));
        }

        const validator = new MatrixValidator(matrixPath);
        const updatedStore = await validator.validate(store, workspaceRoot);

        if (options.aiFormat) {
            const out = JSON.stringify({ status: 'success', validated_links: updatedStore.links.length });
            console.log(out);
            appendLog(logPath, 'sync', out);
        } else {
            const msg = `Sync Complete. Validated ${updatedStore.links.length} links.`;
            console.log(msg);
            appendLog(logPath, 'sync', msg);
        }
    });

program
    .command('inject')
    .description('Inject tags into source code')
    .action(async () => {
        const options = program.opts();
        const workspaceRoot = getWorkspaceRoot(options);
        const { matrixPath, logPath } = getPaths(workspaceRoot);

        if (!options.aiFormat) console.log('Hybrid Matrix: Injecting Tags...');
        if (!fs.existsSync(matrixPath)) {
            if (options.aiFormat) console.log(JSON.stringify({ error: 'hybrid-matrix.json not found' }));
            else console.error('Error: No hybrid-matrix.json found. Run sync first.');
            process.exit(1);
        }

        const injector = new TagInjector();
        const injectStore: MatrixStore = JSON.parse(fs.readFileSync(matrixPath, 'utf-8'));
        let injectCount = 0;
        for (const link of injectStore.links) {
            if (link.status === 'BROKEN') {
                for (const target of link.layer3_targets) {
                    if (injector.inject(target, link.layer1_sources)) injectCount++;
                }
            }
        }
        if (options.aiFormat) {
            const out = JSON.stringify({ status: 'success', injected_count: injectCount });
            console.log(out);
            appendLog(logPath, 'inject', out);
        } else {
            const msg = `Injected ${injectCount} tags.`;
            console.log(msg);
            appendLog(logPath, 'inject', msg);
        }
    });

program
    .command('connect')
    .description('Bridge Requirements to Code')
    .action(async () => {
        const options = program.opts();
        const workspaceRoot = getWorkspaceRoot(options);
        const { matrixPath, hybridDir, logPath } = getPaths(workspaceRoot);

        if (!options.aiFormat) console.log('Hybrid Matrix: Bridging Requirements (Tree) to Code (RCP)...');
        const treePath = path.join(hybridDir, 'hybrid-tree.json');
        const rcpPath = path.join(hybridDir, 'hybrid-rcp.json');

        if (!fs.existsSync(treePath)) {
            if (options.aiFormat) console.log(JSON.stringify({ error: 'hybrid-tree.json not found' }));
            else console.log(`Error: hybrid-tree.json not found. Run "hybrid-tree consolidate" first.`);
            process.exit(1);
        }
        if (!fs.existsSync(rcpPath)) {
            if (options.aiFormat) console.log(JSON.stringify({ error: 'hybrid-rcp.json not found' }));
            else console.log(`Error: hybrid-rcp.json not found. Run "hybrid-rcp export-structure" first.`);
            process.exit(1);
        }

        const treeData = JSON.parse(fs.readFileSync(treePath, 'utf-8'));
        const rcpStructure = JSON.parse(fs.readFileSync(rcpPath, 'utf-8'));

        const extractReqs = (items: any[]): string[] => {
            let ids: string[] = [];
            for (const item of items) {
                // Improved regex: matches IDs like A, AC.1, AC.1.1, REQ-XXX, EXT.BIM.1
                const labelMatch = item.label?.match(/(?:\[[ x]\]\s+)?([A-ZACEXT]{1,5}(?:\.[0-9]+)*)/i) ||
                    item.label?.match(/(REQ-[A-Z0-9-]+)/i);

                if (labelMatch && labelMatch[1].length > 0) {
                    const id = labelMatch[1].toUpperCase();
                    // Filter out non-ID acronyms common in labels
                    if (!['SI', 'BIM', 'CAD', 'FEM', 'IFC', 'BOM', 'NC1', 'DSTV', 'B-REP', 'OCCT', 'HLR', 'CPU', 'GPU'].includes(id)) {
                        ids.push(id);
                    }
                }

                if (item.children && item.children.length > 0) {
                    ids = ids.concat(extractReqs(item.children));
                }
            }
            return Array.from(new Set(ids));
        };

        const reqIds = extractReqs(treeData.manifest || treeData.nodes || []);
        if (!options.aiFormat) console.log(`Extracted ${reqIds.length} requirements from ${treePath}`);

        let connectStore: MatrixStore = {
            matrix_version: "1.0",
            links: [],
            orphans: { unlinked_requirements: [], unlinked_code_tags: [] }
        };

        if (fs.existsSync(matrixPath)) connectStore = JSON.parse(fs.readFileSync(matrixPath, 'utf-8'));

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
                const nodes = rcpStructure.nodes.filter((n: any) => n.filePath.includes(targetCrate));
                for (const node of nodes) {
                    const constructName = node.outputs?.[0]?.name || node.data?.[0]?.name || "mod";
                    connectStore.links.push({
                        matrix_id: `MTX-BIM-${reqId.replace(/\./g, '-')}-${path.basename(node.filePath, '.ts')}`,
                        cardinality: "1:1",
                        layer1_sources: [reqId],
                        layer3_targets: [{
                            file_path: node.filePath,
                            construct_name: constructName,
                            language: "typescript",
                            expected_tag: `@MATRIX: ${reqId}`
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

        if (options.aiFormat) {
            const out = JSON.stringify({ status: 'success', new_links: connectCount, gaps: unmapped.length });
            console.log(out);
            appendLog(logPath, 'connect', out);
        } else {
            let msg = unmapped.length > 0 ? `⚠️  Gap Analysis: ${unmapped.length} requirements have no code constructs mapped.\n` : "";
            msg += `✅ Bridge Updated: ${connectCount} new links added to hybrid-matrix.json`;
            console.log(msg);
            appendLog(logPath, 'connect', msg);
        }
    });

program
    .command('report')
    .description('Ecosystem Health Report')
    .action(async () => {
        const options = program.opts();
        const workspaceRoot = getWorkspaceRoot(options);
        const { matrixPath, logPath } = getPaths(workspaceRoot);

        if (!options.aiFormat) console.log('Hybrid Matrix: Generating Ecosystem Health Report...');
        if (!fs.existsSync(matrixPath)) {
            if (options.aiFormat) console.log(JSON.stringify({ error: 'hybrid-matrix.json not found' }));
            else console.error('Error: No hybrid-matrix.json found. Run connect first.');
            process.exit(1);
        }

        const reportStore: MatrixStore = JSON.parse(fs.readFileSync(matrixPath, 'utf-8'));
        const totalLinks = reportStore.links.length;
        const validLinks = reportStore.links.filter(l => l.status === 'VALID').length;
        const brokenLinks = totalLinks - validLinks;
        const unmappedReqs = reportStore.orphans?.unlinked_requirements?.length || 0;
        const healthScore = totalLinks > 0 ? Math.round((validLinks / totalLinks) * 100) : 0;

        // Calculate Hotspots (density)
        const densityMap: Record<string, number> = {};
        reportStore.links.forEach(link => {
            link.layer1_sources.forEach(src => {
                densityMap[src] = (densityMap[src] || 0) + 1;
            });
        });
        const hotspots = Object.entries(densityMap)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5)
            .map(([id, count]) => ({ id, count }));

        if (options.aiFormat) {
            const out = JSON.stringify({
                health_score: healthScore,
                total_links: totalLinks,
                valid: validLinks,
                broken: brokenLinks,
                gaps: unmappedReqs,
                hotspots: hotspots
            });
            console.log(out);
            appendLog(logPath, 'report', out);
        } else {
            let reportOutput = `
--- HYBRID ECOSYSTEM HEALTH REPORT ---
🟢 Traceability Integrity: ${healthScore}%
🔗 Total Links: ${totalLinks}
✅ Validated: ${validLinks}
🔴 Broken/Pending: ${brokenLinks}
⚠️  Documentation Gaps: ${unmappedReqs} requirements without code

🔥 TOP HOTSPOTS (Highest Density):
${hotspots.map(h => `  - ${h.id}: ${h.count} connections`).join('\n')}
-------------------------------------
`;
            console.log(reportOutput);
            appendLog(logPath, 'report', reportOutput);
        }
    });

program
    .command('skeleton')
    .description('Safety scaffold architecture')
    .action(async () => {
        const options = program.opts();
        const workspaceRoot = getWorkspaceRoot(options);
        const { logPath } = getPaths(workspaceRoot);

        if (!options.aiFormat) console.log('Hybrid Matrix: Executing Safe Skeleton Generation...');
        const generator = new SkeletonGenerator(workspaceRoot, options.aiFormat);
        const genResult = generator.generate();
        if (options.aiFormat) {
            console.log(JSON.stringify(genResult));
        }
        appendLog(logPath, 'skeleton', JSON.stringify(genResult));
    });

program
    .command('bridge')
    .description('Cross-reference logic and reality')
    .action(async () => {
        const options = program.opts();
        const workspaceRoot = getWorkspaceRoot(options);
        const { logPath } = getPaths(workspaceRoot);

        if (!options.aiFormat) console.log('Hybrid Matrix: Cross-referencing logic and reality...');
        const bridgeEngine = new BridgeEngine(workspaceRoot, options.aiFormat);
        const result = await bridgeEngine.bridge();
        if (options.aiFormat) {
            console.log(JSON.stringify(result));
        }
        appendLog(logPath, 'bridge', 'AI Context Bridge Instructions Generated successfully');
    });

program
    .command('watch')
    .description('Background orchestrator')
    .action(async () => {
        const options = program.opts();
        const workspaceRoot = getWorkspaceRoot(options);
        const { matrixPath } = getPaths(workspaceRoot);

        console.log('👀 Hybrid Matrix: Entering Watch Mode (Background Orchestrator)...');
        console.log('Monitoring .rs files, .md files, and .hybrid/ artifacts.');

        const refresh = async (source: string) => {
            console.log(`\n🔄 Change detected in ${source}. Refreshing ecosystem...`);
            try {
                if (source.endsWith('.rs')) {
                    console.log('⚡ Triggering RCP Scan...');
                    execSync(`hybrid-rcp export-structure ${workspaceRoot}`, { stdio: 'inherit' });
                }
                if (source.endsWith('.md')) {
                    console.log('⚡ Triggering TREE Consolidation...');
                    execSync(`hybrid-tree consolidate`, { stdio: 'inherit', cwd: workspaceRoot });
                }

                console.log('⚡ Synchronizing Matrix Links...');
                const validator = new MatrixValidator(matrixPath);
                const syncStore = JSON.parse(fs.readFileSync(matrixPath, 'utf-8'));
                const updatedSyncStore = await validator.validate(syncStore, workspaceRoot);
                fs.writeFileSync(matrixPath, JSON.stringify(updatedSyncStore, null, 2));
                console.log('✅ Ecosystem Synchronized.');
            } catch (e) {
                console.error('❌ Error during background sync:', e);
            }
        };

        fs.watch(workspaceRoot, { recursive: true }, (event, filename) => {
            if (filename && (filename.endsWith('.rs') || filename.endsWith('.md')) && !filename.includes('target') && !filename.includes('.hybrid')) {
                refresh(filename);
            }
        });

        process.stdin.resume();
    });

program
    .command('export-script')
    .description('Export high-level context / ghost-skeleton for a target file')
    .requiredOption('--target <path>', 'Path to the target source file')
    .option('--req <id>', 'Force a requirement ID for the exported script (Ghost Skeleton)')
    .option('--save', 'Physically save the generated skeleton to disk', false)
    .option('--ai-format', 'Machine-friendly output', false)
    .action(async (cmdOptions) => {
        const options = program.opts(); // Get global options
        const workspaceRoot = getWorkspaceRoot(options);
        const { logPath, exportHistoryPath } = getPaths(workspaceRoot);
        const targetPath = cmdOptions.target;
        const forceReqId = cmdOptions.req; // Get the new --req option

        if (!options.aiFormat) console.log('Hybrid Matrix: Exporting Code-as-Context script...');
        const scriptExporter = new ScriptExporter(workspaceRoot);
        const scriptContent = scriptExporter.exportContext(targetPath, forceReqId);

        if (scriptContent) {
            if (options.aiFormat) console.log(scriptContent);
            else {
                console.log(`\n--- Code-as-Context Generated for ${targetPath} ---\n`);
                console.log(scriptContent);
                console.log('--------------------------------------------------');
            }

            if (cmdOptions.save) {
                const absPath = path.resolve(workspaceRoot, targetPath);
                fs.writeFileSync(absPath, scriptContent);
                if (!options.aiFormat) console.log(`✅ Skeleton saved to: ${absPath}`);
            }

            const { exportHistoryPath } = getPaths(workspaceRoot);
            let history: any[] = [];
            if (fs.existsSync(exportHistoryPath)) {
                try {
                    history = JSON.parse(fs.readFileSync(exportHistoryPath, 'utf-8'));
                } catch (e) {
                    history = [];
                }
            }
            history.push({
                timestamp: new Date().toISOString(),
                target: targetPath,
                saved: !!cmdOptions.save,
                content_preview: scriptContent.substring(0, 100) + "..."
            });
            fs.writeFileSync(exportHistoryPath, JSON.stringify(history, null, 2));

            appendLog(logPath, 'export-script', `Generated text skeleton for ${targetPath}`);
        } else {
            if (options.aiFormat) console.log(JSON.stringify({ error: "Failed to export script" }));
            process.exit(1);
        }
    });

program
    .command('forge')
    .description('🌉 CI/CD Bridge — Automates Git events from MATRIX instructions')
    .option('--commit', 'Actually perform git commit and tag if STABLE')
    .action((cmdOptions) => {
        const options = program.opts();
        const workspaceRoot = getWorkspaceRoot(options);
        const engine = new ForgeEngine();
        const result = engine.trigger(workspaceRoot, !!cmdOptions.commit, options.aiFormat);
        if (options.aiFormat) {
            console.log(JSON.stringify(result));
        }
    });

program
    .command('mcp')
    .description('Start MCP server over Stdio')
    .action(() => {
        const server = new MCPServer();
        const options = program.opts();
        const workspaceRoot = getWorkspaceRoot(options);

        server.registerTool({
            name: "matrix_sync",
            description: "Sync IDs and validate links in the traceability matrix",
            inputSchema: { type: "object", properties: {} },
            handler: async () => {
                return { content: [{ type: "text", text: "Matrix sync requested." }] };
            }
        });

        server.registerTool({
            name: "matrix_bridge",
            description: "Cross-reference logic and reality to generate instructions",
            inputSchema: { type: "object", properties: {} },
            handler: async () => {
                const bridgeEngine = new BridgeEngine(workspaceRoot, true);
                const result = await bridgeEngine.bridge();
                return { content: [{ type: "text", text: `Matrix bridge (instructions) generated successfully at ${result?.instructionPath}.` }] };
            }
        });

        server.registerTool({
            name: "matrix_forge",
            description: "CI/CD Bridge — Automates Git events from MATRIX instructions",
            inputSchema: {
                type: "object",
                properties: {
                    commit: { type: "boolean" }
                }
            },
            handler: async (args: any) => {
                const engine = new ForgeEngine();
                const result = engine.trigger(workspaceRoot, !!args.commit, true);
                return { content: [{ type: "text", text: `Forge trigger executed: ${result?.message}` }] };
            }
        });

        server.start();
        console.error("Hybrid Matrix MCP Server started");
    });

program.parse(process.argv);
