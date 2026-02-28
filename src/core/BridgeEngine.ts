import * as path from 'path';
import * as fs from 'fs';

export class BridgeEngine {
    constructor(private workspaceRoot: string) { }

    public bridge() {
        console.log('Hybrid Matrix: Executing Bridge Analysis...');
        const hybridDir = path.join(this.workspaceRoot, '.hybrid');
        const treePath = path.join(hybridDir, 'hybrid-tree.json');
        const rcpPath = path.join(hybridDir, 'hybrid-rcp.json');

        let report = `# 🌉 MATRIX BRIDGE: Mission Map\n\n`;

        if (!fs.existsSync(treePath)) {
            report += `⚠️ **Error**: No TREE manifest found in .hybrid/. Run Genesis/TREE first.\n`;
            return this.finalize(report);
        }

        const treeData = JSON.parse(fs.readFileSync(treePath, 'utf8'));
        const nodes: any[] = treeData.manifest || [];

        const getContext = (index: string): string => {
            const parts = index.split('.');
            let context = "";
            if (parts.length > 1) {
                const parentIdx = parts.slice(0, -1).join('.');
                const parent = nodes.find(n => n.index === parentIdx);
                if (parent) {
                    context += `\n> **Parent Context (${parent.index})**: ${parent.label}\n`;
                    if (parent.description) context += `> ${parent.description}\n`;

                    const gparts = parentIdx.split('.');
                    if (gparts.length > 1) {
                        const grandIdx = gparts.slice(0, -1).join('.');
                        const grand = nodes.find(n => n.index === grandIdx);
                        if (grand) {
                            context += `> **Grandparent Context (${grand.index})**: ${grand.label}\n`;
                        }
                    }
                }
            }
            return context;
        };

        if (!fs.existsSync(rcpPath)) {
            report += `⚠️ **Warning**: No RCP state found. Assumed Greenfield project with Skeleton. Next step: Code the Skeleton.\n`;

            report += `\n### 🤖 AI MISSION: Greenfield Initialization\n`;
            report += `You are starting a new project. Follow the hierarchical coordinates to maintain architectural integrity.\n\n`;

            nodes.forEach(n => {
                report += `#### 📍 Coordinate ${n.index}: ${n.label}\n`;
                const ctx = getContext(n.index);
                if (ctx) report += ctx;
                if (n.description) report += `\n**Instruction**: ${n.description}\n`;
                report += `\n--- \n`;
            });

            return this.finalize(report);
        }

        const rcpData = JSON.parse(fs.readFileSync(rcpPath, 'utf8'));
        const codeNodes: any[] = rcpData.nodes || [];

        report += `### 🔍 BROWNFRIELD SYNC: Gap Analysis\n`;
        report += `MATRIX has reconciled the Topographic Plan (TREE) with the Physical Reality (RCP).\n\n`;

        let missingInCode = 0;
        let unknownInCode = 0;

        report += `#### 🔴 TARGETS: Missing in Reality\n`;
        nodes.forEach(n => {
            // Match by Index or specific ID tags
            const isImplemented = codeNodes.some(cn =>
                (cn.tags && cn.tags.some((t: string) => t === n.id || t === n.index)) ||
                (cn.data && cn.data.some((d: any) => d.name.includes(n.id) || d.name.includes(n.index))) ||
                cn.filePath.includes(n.id) ||
                cn.name === n.id
            );

            if (!isImplemented) {
                report += `\n##### 🎯 Mission ${n.index}: ${n.label}\n`;
                const ctx = getContext(n.index);
                if (ctx) report += ctx;
                if (n.description) report += `**Goal**: ${n.description}\n`;
                missingInCode++;
            }
        });

        if (missingInCode === 0) report += `- *None! All planned features exist in code.*\n`;

        report += `\n#### 👻 ORPHANS: Unmapped Reality\n`;
        codeNodes.forEach(cn => {
            const fileName = path.basename(cn.filePath, path.extname(cn.filePath));
            const isPlanned = nodes.some(n =>
                n.id === fileName ||
                n.index === fileName ||
                (cn.tags && cn.tags.some((t: string) => t === n.id || t === n.index)) ||
                (cn.data && cn.data.some((d: any) => d.name === n.id || d.name === n.index))
            );
            if (!isPlanned && fileName !== 'mod' && fileName !== 'main' && fileName !== 'lib') {
                report += `- [?] File/Module \`${cn.filePath}\` is not mapped in TREE.\n`;
                unknownInCode++;
            }
        });

        if (unknownInCode === 0) report += `- *None! All code is perfectly tracked.*\n`;

        report += `\n### 🤖 FINAL AI INSTRUCTION\n`;
        if (missingInCode > 0) {
            report += `1. **Execute Missions**: Implement the components listed in 'TARGETS'. Use the provided Parent/Grandparent context to ensure logic alignment.\n`;
        }
        if (unknownInCode > 0) {
            report += `2. **Address Orphans**: Either incorporate these files into the TREE/GENESIS plan or remove them to avoid architectural drift.\n`;
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
