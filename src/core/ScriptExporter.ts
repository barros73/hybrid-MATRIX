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
import { MatrixStore } from './types';
import { DiscoveryEngine } from './DiscoveryEngine';

export class ScriptExporter {
    private workspaceRoot: string;
    private discoveryEngine: DiscoveryEngine;

    constructor(workspaceRoot: string) {
        this.workspaceRoot = workspaceRoot;
        this.discoveryEngine = new DiscoveryEngine(workspaceRoot);
    }

    public exportContext(targetPath: string, forceReqId?: string): string | null {
        const hybridDir = path.join(this.workspaceRoot, '.hybrid');
        const matrixPath = path.join(hybridDir, 'hybrid-matrix.json');
        const rcpPath = path.join(hybridDir, 'hybrid-rcp.json');

        if (!fs.existsSync(matrixPath) || !fs.existsSync(rcpPath)) {
            console.error("Missing .hybrid JSON files. Run 'hybrid-rcp export-structure' and 'hybrid-matrix connect' first.");
            return null;
        }

        const matrixStore: MatrixStore = JSON.parse(fs.readFileSync(matrixPath, 'utf-8'));
        const rcpStore = JSON.parse(fs.readFileSync(rcpPath, 'utf-8'));

        // Normalize target path
        const absTarget = path.resolve(this.workspaceRoot, targetPath);

        // Find logical cluster (Phase 3 Feature)
        const cluster = this.discoveryEngine.discoverCluster(absTarget);

        // Find relevant MATRIX links
        let activeLinks = matrixStore.links.filter(l =>
            l.layer3_targets.some(t => path.resolve(this.workspaceRoot, t.file_path) === absTarget)
        );

        if (forceReqId && activeLinks.length === 0) {
            // Manually link this requirement to this ghost file
            activeLinks = [{
                matrix_id: `MTX-MAN-${forceReqId}`,
                cardinality: '1:1',
                layer1_sources: [forceReqId],
                layer3_targets: [{
                    file_path: targetPath,
                    language: 'rust', // Defaulting to rust for ghost
                    expected_tag: `@MATRIX: ${forceReqId}`
                }],
                status: 'BROKEN',
                last_verified: new Date().toISOString()
            }];
        }

        const requirements = activeLinks.flatMap(l => l.layer1_sources);
        const reqTag = requirements.length > 0 ? `// @MATRIX-REQ: ${requirements.join(', ')}` : '// @MATRIX-REQ: Unmapped';

        // Find RCP Node for this file
        let node = rcpStore.nodes.find((n: any) => n.id === absTarget || n.filePath === absTarget);
        const outgoingEdges = rcpStore.edges?.filter((e: any) => e.from === absTarget) || [];

        if (!node) {
            // "Ghost Skeleton" mode
            if (activeLinks.length > 0) {
                const targetInfo = activeLinks[0].layer3_targets.find(t => path.resolve(this.workspaceRoot, t.file_path) === absTarget);
                node = {
                    name: targetInfo?.construct_name || path.basename(absTarget, path.extname(absTarget)),
                    filePath: absTarget,
                    data: [],
                    outputs: activeLinks.map(l => ({
                        name: l.layer3_targets.find(t => path.resolve(this.workspaceRoot, t.file_path) === absTarget)?.construct_name || "mod_logic",
                        type: "void",
                        args: ""
                    }))
                };
            } else {
                console.error(`Error: Target file ${targetPath} has no mapping in hybrid-matrix.json.`);
                return null;
            }
        }

        const ext = path.extname(absTarget);
        let skeletonBody = "";
        if (ext === '.ts' || ext === '.js') {
            skeletonBody = this.renderTypescriptSkeleton(node, outgoingEdges, reqTag);
        } else if (ext === '.rs') {
            skeletonBody = this.renderRustSkeleton(node, outgoingEdges, reqTag);
        } else if (ext === '.py') {
            skeletonBody = this.renderPythonSkeleton(node, outgoingEdges, reqTag);
        } else {
            console.error(`Unsupported extension: ${ext}`);
            return null;
        }

        const cis = this.calculateCIS(skeletonBody, node, outgoingEdges);
        const cisColor = cis > 80 ? "🟢" : cis > 40 ? "🟡" : "🔴";

        let contextHeader = `// @MATRIX-CONTEXT: Do not modify architectural boundaries. Implement logic only.\n${reqTag}\n// @MATRIX-CIS: ${cis}% ${cisColor}\n`;

        if (cluster && cluster.logicCores.length > 0) {
            contextHeader += `/* \n * 🌉 LOGICAL CLUSTER (Spatial Map Gravity)\n`;
            contextHeader += ` * This component is logically connected to:\n`;
            cluster.logicCores.forEach(core => {
                contextHeader += ` * - ${path.basename(core.filePath)} (${core.name})\n`;
            });
            contextHeader += ` */\n`;
        }
        contextHeader += `\n`;

        return contextHeader + skeletonBody;
    }

    private calculateCIS(skeleton: string, node: any, edges: any[]): number {
        // Simple Token Estimation (Characters / 4 is a common heuristic for code)
        const estimatedTokens = Math.max(1, Math.floor(skeleton.length / 4));

        // Signal: Implementation nodes (data/methods) + dependency edges
        const signalCount = (node.data?.length || 0) + (node.outputs?.length || 0) + (edges.length || 0);

        // Weighting: each signal item is worth approx 20 "conceptual tokens"
        const signalDensity = (signalCount * 20) / estimatedTokens;

        return Math.min(100, Math.floor(signalDensity * 100));
    }

    private renderTypescriptSkeleton(node: any, edges: any[], reqTag: string): string {
        let code = `// @MATRIX-CONTEXT: Do not modify architectural boundaries. Implement logic only.\n${reqTag}\n\n`;

        // Imports
        const uniqueImports = new Set(edges.map(e => e.to));
        uniqueImports.forEach(imp => {
            const relPath = path.relative(path.dirname(node.filePath), imp).replace(/\.(ts|js)$/, '');
            const moduleName = path.basename(imp, path.extname(imp));
            code += `import { ${moduleName} } from './${relPath}';\n`;
        });
        if (uniqueImports.size > 0) code += '\n';

        // Interface / Class
        const constructName = node.name || 'UnknownConstruct';
        code += `export class ${constructName} {\n`;

        // Properties (Data)
        if (node.data) {
            node.data.forEach((d: any) => {
                const visibility = d.isPublic ? 'public' : 'private';
                code += `    ${visibility} ${d.name}: ${d.type || 'any'};\n`;
            });
            if (node.data.length > 0) code += '\n';
        }

        // Methods (Outputs)
        if (node.outputs) {
            node.outputs.forEach((m: any) => {
                const isAsync = m.type?.includes('Promise') ? 'async ' : '';
                code += `    public ${isAsync}${m.name}(${m.args || ''}): ${m.type || 'void'} {\n`;
                code += `        // [AI_IMPLEMENTATION_TARGET]\n`;
                code += `        throw new Error("Not implemented");\n`;
                code += `    }\n\n`;
            });
        }

        code += `}\n`;
        return code;
    }

    private renderRustSkeleton(node: any, edges: any[], reqTag: string): string {
        let code = ``; // Removed initial context and reqTag, now handled in exportContext

        const uniqueImports = new Set(edges.map(e => e.to));
        uniqueImports.forEach(imp => {
            const moduleName = path.basename(imp, path.extname(imp));
            code += `use crate::${moduleName}::*;\n`;
        });
        if (uniqueImports.size > 0) code += '\n';

        const constructName = node.name || 'UnknownConstruct';
        code += `pub struct ${constructName} {\n`;

        if (node.data) {
            node.data.forEach((d: any) => {
                const visibility = d.isPublic ? 'pub' : 'pub(crate)';
                code += `    ${visibility} ${d.name}: ${d.type || 'String'},\n`;
            });
        }
        code += `}\n\n`;

        if (node.outputs && node.outputs.length > 0) {
            code += `impl ${constructName} {\n`;
            node.outputs.forEach((m: any) => {
                let returnType = m.type || '()';
                if (returnType === 'pub fn' || returnType === 'fn') returnType = '()';
                code += `    pub fn ${m.name}(${m.args || ''}) -> ${returnType} {\n`;
                code += `        // [AI_IMPLEMENTATION_TARGET]\n`;
                code += `        unimplemented!("Not implemented yet");\n`;
                code += `    }\n\n`;
            });
            code += `}\n`;
        }

        return code;
    }

    private renderPythonSkeleton(node: any, edges: any[], reqTag: string): string {
        let code = `# @MATRIX-CONTEXT: Do not modify architectural boundaries. Implement logic only.\n# ${reqTag.replace('// ', '')}\n\n`;

        const uniqueImports = new Set(edges.map(e => e.to));
        uniqueImports.forEach(imp => {
            const moduleName = path.basename(imp, path.extname(imp));
            code += `import ${moduleName}\n`;
        });
        if (uniqueImports.size > 0) code += '\n';

        const constructName = node.name || 'UnknownConstruct';
        code += `class ${constructName}:\n`;

        if (node.outputs && node.outputs.length > 0) {
            node.outputs.forEach((m: any) => {
                const isAsync = m.type?.includes('Coroutine') ? 'async ' : '';
                code += `    ${isAsync}def ${m.name}(self, ${m.args || ''}) -> ${m.type || 'None'}:\n`;
                code += `        # [AI_IMPLEMENTATION_TARGET]\n`;
                code += `        raise NotImplementedError("Not implemented")\n\n`;
            });
        } else {
            code += `    pass\n`;
        }
        return code;
    }
}
