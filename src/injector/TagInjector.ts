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
        const tag = this.formatTag(target.language, ids);

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

    private formatTag(language: string, ids: string[]): string {
        const idString = ids.join(', ');
        switch (language) {
            case 'python':
                return `# @MATRIX: ${idString}`;
            case 'rust':
            case 'cpp':
            case 'typescript':
            case 'javascript':
            case 'go':
                return `// @MATRIX: ${idString}`;
            default:
                return `// @MATRIX: ${idString}`;
        }
    }
}
