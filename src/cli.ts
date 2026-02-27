#!/usr/bin/env node
import * as path from 'path';
import * as fs from 'fs';
import { IdManager } from './core/IdManager';
import { MatrixValidator } from './core/MatrixValidator';
import { TagInjector } from './injector/TagInjector';
import { MatrixStore } from './core/types';

const args = process.argv.slice(2);
const command = args[0];
const workspaceRoot = process.cwd();

const hybridDir = path.join(workspaceRoot, '.hybrid');
const matrixPath = path.join(hybridDir, 'hybrid-matrix.json');
const manifestPath = path.join(workspaceRoot, 'MASTER_PROJECT_TREE.md');

async function run() {
    const idManager = new IdManager(workspaceRoot);
    const validator = new MatrixValidator(matrixPath);
    const injector = new TagInjector();

    switch (command) {
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

            const updatedStore = await validator.validate(store, workspaceRoot);
            fs.writeFileSync(matrixPath, JSON.stringify(updatedStore, null, 2));
            console.log(`Sync Complete. Validated ${updatedStore.links.length} links.`);
            break;

        case 'inject':
            console.log('Hybrid Matrix: Injecting Tags...');
            if (!fs.existsSync(matrixPath)) {
                console.error('Error: No hybrid-matrix.json found. Run sync first.');
                process.exit(1);
            }

            const currentStore: MatrixStore = JSON.parse(fs.readFileSync(matrixPath, 'utf-8'));
            let count = 0;
            for (const link of currentStore.links) {
                if (link.status === 'BROKEN') {
                    for (const target of link.layer3_targets) {
                        if (injector.inject(target, link.layer1_sources)) count++;
                    }
                }
            }
            console.log(`Injected ${count} tags.`);
            break;

        default:
            console.log('Usage: hybrid-matrix [sync|inject]');
    }
}

run();
