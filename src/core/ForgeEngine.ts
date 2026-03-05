/*
 * Hybrid-MATRIX - Forge Engine
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

import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

export class ForgeEngine {
    /**
     * Triggers Git events based on the state documented in MATRIX_INSTRUCTION.md.
     * This closes the "Golden Loop" when the system is stable.
     */
    public trigger(workDir: string, performCommit: boolean = false): void {
        const matrixPath = path.join(workDir, 'MATRIX_INSTRUCTION.md');

        if (!fs.existsSync(matrixPath)) {
            console.error(`❌ Error: MATRIX_INSTRUCTION.md not found in ${workDir}`);
            return;
        }

        const content = fs.readFileSync(matrixPath, 'utf-8');
        const isStable = content.includes('🟢 STABLE');

        if (!isStable) {
            console.log('⚠️  MATRIX is not STABLE. Git trigger aborted to preserve integrity.');
            return;
        }

        console.log('✅ MATRIX is STABLE. Closing Golden Loop...');
        const commitMsg = "chore: hybrid golden loop sync [STABLE]";

        if (performCommit) {
            try {
                console.log('📦 Committing and tagging...');
                execSync('git add .', { cwd: workDir });
                execSync(`git commit -m "${commitMsg}"`, { cwd: workDir });
                execSync('git tag -a stable -m "Hybrid Stable Snapshot" --force', { cwd: workDir });
                console.log(`✨ Success: System committed and tagged as 'stable'.`);
            } catch (e: any) {
                console.error(`❌ Git Error: ${e.message}`);
            }
        } else {
            console.log(`👉 Dry-run: would run 'git add .', 'git commit -m "${commitMsg}"' and tag 'stable'.`);
            console.log('   Use --commit to execute.');
        }
    }
}
