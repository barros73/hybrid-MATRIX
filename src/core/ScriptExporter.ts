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

export class ScriptExporter {
    private workspaceRoot: string;

    constructor(workspaceRoot: string) {
        this.workspaceRoot = workspaceRoot;
    }

    public exportContext(targetPath: string): string | null {
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

        // Find relevant MATRIX links
        const activeLinks = matrixStore.links.filter(l =>
            l.layer3_targets.some(t => path.resolve(this.workspaceRoot, t.file_path) === absTarget)
        );

        const requirements = activeLinks.flatMap(l => l.layer1_sources);
        const reqTag = requirements.length > 0 ? `// @MATRIX-REQ: ${requirements.join(', ')}` : '// @MATRIX-REQ: Unmapped';

        // Find RCP Node for this file
        const node = rcpStore.nodes.find((n: any) => n.filePath === absTarget);
        if (!node) {
            console.error(`Error: Target file ${targetPath} not found in hybrid-rcp.json.`);
            return null;
        }

        // Find RCP Edges (Imports) originating from this file
        const outgoingEdges = rcpStore.edges?.filter((e: any) => e.from === absTarget) || [];

        const ext = path.extname(absTarget);
        if (ext === '.ts' || ext === '.js') {
            return this.renderTypescriptSkeleton(node, outgoingEdges, reqTag);
        } else if (ext === '.rs') {
            return this.renderRustSkeleton(node, outgoingEdges, reqTag);
        } else if (ext === '.py') {
            return this.renderPythonSkeleton(node, outgoingEdges, reqTag);
        } else {
            console.error(`Unsupported extension for Code-as-Context: ${ext}`);
            return null;
        }
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
        let code = `// @MATRIX-CONTEXT: Do not modify architectural boundaries. Implement logic only.\n${reqTag}\n\n`;

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
                code += `    pub fn ${m.name}(${m.args || ''}) -> ${m.type || '()'} {\n`;
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
