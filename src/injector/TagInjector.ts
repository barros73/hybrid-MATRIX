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
import { Layer3Target } from '../core/types';

export class TagInjector {
    /**
     * Injects the matrix tag into the specified file.
     * It attempts to find the constructive element (fn, struct, class) 
     * and places the tag right above it.
     */
    public inject(target: Layer3Target, ids: string[]): boolean {
        if (!fs.existsSync(target.file_path)) return false;

        let content = fs.readFileSync(target.file_path, 'utf-8');
        const lines = content.split('\n');
        const tag = target.expected_tag.startsWith('//') || target.expected_tag.startsWith('#')
            ? target.expected_tag
            : this.formatRawTag(target.language, target.expected_tag);

        if (content.includes(tag)) return true; // Already exists

        // Logic to find the construct and inject above it
        // For simplicity, if construct_name is provided, we search for it.
        // Otherwise, we might need more advanced AST or regex.
        let targetLine = -1;
        if (target.construct_name) {
            const regex = new RegExp(`(pub\\s+)?(fn|struct|class|def)\\s+${target.construct_name}`);
            targetLine = lines.findIndex(line => regex.test(line));
        }

        if (targetLine !== -1) {
            lines.splice(targetLine, 0, tag);
            fs.writeFileSync(target.file_path, lines.join('\n'));
            return true;
        }

        // Fallback: append to top of file if construct not found
        fs.writeFileSync(target.file_path, tag + '\n' + content);
        return true;
    }

    private formatRawTag(language: string, tag: string): string {
        switch (language) {
            case 'python':
                return `# ${tag}`;
            default:
                return `// ${tag}`;
        }
    }
}
