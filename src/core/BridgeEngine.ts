import * as path from 'path';
import * as fs from 'fs';

export class BridgeEngine {
    constructor(private workspaceRoot: string) { }

    public bridge() {
        console.log('Hybrid Matrix: Executing Bridge Analysis...');
        const hybridDir = path.join(this.workspaceRoot, '.hybrid');
        const treePath = path.join(hybridDir, 'hybrid-tree.json');
        const rcpPath = path.join(hybridDir, 'hybrid-rcp.json');

        let report = `# 🌉 MATRIX Bridge Report\n\n`;

        if (!fs.existsSync(treePath)) {
            report += `⚠️ **Error**: No TREE manifest found in .hybrid/. Run Genesis/TREE first.\n`;
            return this.finalize(report);
        }

        const treeData = JSON.parse(fs.readFileSync(treePath, 'utf8'));
        const nodes: any[] = treeData.manifest || [];

        if (!fs.existsSync(rcpPath)) {
            report += `⚠️ **Warning**: No RCP state found. Assumed Greenfield project with Skeleton. Next step: Code the Skeleton.\n`;

            report += `\n### 🤖 AI Instruction:\n`;
            report += `You are in a **Greenfield** state. The skeleton has been created based on the TREE plan.\n`;
            report += `Start coding the components listed below, following the order (highest priority first):\n\n`;

            nodes.forEach(n => {
                report += `- **${n.label}** (\`${n.id}\`) ${n.ownership ? `[${n.ownership}]` : ''}\n`;
            });

            return this.finalize(report);
        }

        const rcpData = JSON.parse(fs.readFileSync(rcpPath, 'utf8'));
        const codeNodes: any[] = rcpData.nodes || [];

        report += `### 🔍 Brownfield / Ongoing Sync\n`;
        report += `MATRIX has cross-referenced the logical plan (TREE) with the physical reality (RCP).\n\n`;

        let missingInCode = 0;
        let unknownInCode = 0; // Orphans

        report += `#### 🔴 Missing in Reality (To be implemented):\n`;
        nodes.forEach(n => {
            const isImplemented = codeNodes.some(cn => cn.filePath.includes(n.id) || (cn.data && cn.data.some((d: any) => d.name.includes(n.id))));
            if (!isImplemented) {
                report += `- [ ] ${n.label} (\`${n.id}\`)\n`;
                missingInCode++;
            }
        });

        if (missingInCode === 0) report += `- *None! All planned features exist in code.*\n`;

        report += `\n#### 👻 Orphans (Code without Planning):\n`;
        codeNodes.forEach(cn => {
            const fileName = path.basename(cn.filePath, path.extname(cn.filePath));
            const isPlanned = nodes.some(n => n.id === fileName || (cn.data && cn.data.some((d: any) => d.name === n.id)));
            if (!isPlanned && fileName !== 'mod' && fileName !== 'main' && fileName !== 'lib') {
                report += `- [?] File/Module \`${cn.filePath}\` is not mapped in TREE.\n`;
                unknownInCode++;
            }
        });

        if (unknownInCode === 0) report += `- *None! All code is perfectly tracked.*\n`;

        report += `\n### 🤖 AI Instruction:\n`;
        if (missingInCode > 0) {
            report += `1. Focus on implementing the **Missing in Reality** components. Generate their internal logic.\n`;
        }
        if (unknownInCode > 0) {
            report += `2. You have **Orphans**. Either document them in GENESIS/TREE or refactor/strip them out to maintain architectural purity.\n`;
        }

        return this.finalize(report);
    }

    private finalize(report: string) {
        const hybridDir = path.join(this.workspaceRoot, '.hybrid');
        if (!fs.existsSync(hybridDir)) fs.mkdirSync(hybridDir, { recursive: true });
        const reportPath = path.join(hybridDir, 'MATRIX_INSTRUCTION.md');
        fs.writeFileSync(reportPath, report);
        console.log(`✅ Instruction Generated: ${reportPath}`);
    }
}
