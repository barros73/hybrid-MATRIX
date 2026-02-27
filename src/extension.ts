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

import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { IdManager } from './core/IdManager';
import { MatrixValidator } from './core/MatrixValidator';
import { TagInjector } from './injector/TagInjector';
import { MatrixStore, MatrixLink } from './core/types';

export function activate(context: vscode.ExtensionContext) {
    const workspaceRoot = vscode.workspace.workspaceFolders?.[0].uri.fsPath;
    if (!workspaceRoot) return;

    const hybridDir = path.join(workspaceRoot, '.hybrid');
    if (!fs.existsSync(hybridDir)) fs.mkdirSync(hybridDir);

    const matrixPath = path.join(hybridDir, 'hybrid-matrix.json');
    const manifestPath = path.join(workspaceRoot, 'MASTER_PROJECT_TREE.md');

    const idManager = new IdManager(workspaceRoot);
    const validator = new MatrixValidator(matrixPath);
    const injector = new TagInjector();

    let disposableSync = vscode.commands.registerCommand('hybrid-matrix.sync', async () => {
        vscode.window.showInformationMessage('Hybrid Matrix: Syncing IDs and Validating Links...');

        // 1. Sync IDs with Layer 1 Manifest
        const idMap = idManager.syncIdsWithManifest(manifestPath);

        // 2. Load or Init Matrix Store
        let store: MatrixStore = {
            matrix_version: "1.0",
            links: [],
            orphans: { unlinked_requirements: [], unlinked_code_tags: [] }
        };

        if (fs.existsSync(matrixPath)) {
            store = JSON.parse(fs.readFileSync(matrixPath, 'utf-8'));
        }

        // 3. Update Store with new IDs and run validation
        const updatedStore = await validator.validate(store, workspaceRoot);
        fs.writeFileSync(matrixPath, JSON.stringify(updatedStore, null, 2));

        vscode.window.showInformationMessage(`Hybrid Matrix: Sync Complete. Found ${updatedStore.links.length} links.`);
    });

    let disposableInject = vscode.commands.registerCommand('hybrid-matrix.inject', async () => {
        if (!fs.existsSync(matrixPath)) {
            vscode.window.showErrorMessage('No hybrid-matrix.json found. Run Sync first.');
            return;
        }

        const store: MatrixStore = JSON.parse(fs.readFileSync(matrixPath, 'utf-8'));
        let injectedCount = 0;

        for (const link of store.links) {
            if (link.status === 'BROKEN') {
                for (const target of link.layer3_targets) {
                    const success = injector.inject(target, link.layer1_sources);
                    if (success) injectedCount++;
                }
            }
        }

        vscode.window.showInformationMessage(`Hybrid Matrix: Injected ${injectedCount} tags.`);
        // Re-run sync to update status
        await vscode.commands.executeCommand('hybrid-matrix.sync');
    });

    context.subscriptions.push(disposableSync);
    context.subscriptions.push(disposableInject);
}

export function deactivate() { }
