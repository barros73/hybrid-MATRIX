import { IdManager } from './core/IdManager';
import { MatrixValidator } from './core/MatrixValidator';
import { TagInjector } from './injector/TagInjector';
import * as fs from 'fs';
import * as path from 'path';

async function runTest() {
    const workspace = path.join(__dirname, 'test-workspace');
    if (!fs.existsSync(workspace)) fs.mkdirSync(workspace);

    const manifestPath = path.join(workspace, 'MASTER_PROJECT_TREE.md');
    const codePath = path.join(workspace, 'logic.rs');
    const matrixPath = path.join(workspace, 'hybrid-matrix.json');

    // 1. Initial Manifest
    fs.writeFileSync(manifestPath, `
## 🏗️ Architettura
root
├── [ ] Auth_System: Gestione accessi
└── [ ] Network_Module: Connesione socket
    `);

    // 2. Initial Code
    fs.writeFileSync(codePath, `
pub fn login() {
    // login logic
}
    `);

    console.log("--- Phase 1: ID Sync ---");
    const idManager = new IdManager(workspace);
    const idMap = idManager.syncIdsWithManifest(manifestPath);
    console.log("ID Map:", idMap);
    console.log("Updated Manifest:\n", fs.readFileSync(manifestPath, 'utf-8'));

    console.log("\n--- Phase 2: Create Link & Validate (BROKEN) ---");
    const req001 = Array.from(idMap.values()).find(id => id === 'REQ-001')!;
    const store = {
        matrix_version: "1.0",
        links: [{
            matrix_id: "MTX-001",
            cardinality: "1:1",
            layer1_sources: [req001],
            layer3_targets: [{
                file_path: codePath,
                construct_name: "login",
                language: "rust",
                expected_tag: `@MATRIX: ${req001}`
            }],
            status: "VALID",
            last_verified: ""
        }],
        orphans: { unlinked_requirements: [], unlinked_code_tags: [] }
    };

    const validator = new MatrixValidator(matrixPath);
    const validatedStore = await validator.validate(store as any, workspace);
    console.log("Status after first validation (should be BROKEN):", validatedStore.links[0].status);

    console.log("\n--- Phase 3: Injection ---");
    const injector = new TagInjector();
    injector.inject(validatedStore.links[0].layer3_targets[0], validatedStore.links[0].layer1_sources);
    console.log("Code after injection:\n", fs.readFileSync(codePath, 'utf-8'));

    console.log("\n--- Phase 4: Validate (VALID) ---");
    const finalStore = await validator.validate(validatedStore, workspace);
    console.log("Status after injection (should be VALID):", finalStore.links[0].status);
}

runTest();
