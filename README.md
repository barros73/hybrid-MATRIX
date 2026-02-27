# 🧊 hybrid-MATRIX
**The Deterministic Traceability Engine: Bridging Architectural Intent with Physical Code.**

In large-scale codebases (30k+ lines, monorepos, hybrid ecosystems), maintaining consistency between what was designed and what was written is the greatest challenge. Tickets are closed, code mutates, and context is lost.

hybrid-MATRIX is the real-time traceability engine (the Z-Axis) that connects project requirements to source code. No AI assumptions, no probabilistic vector databases: just pure determinism and ironclad architectural contracts.

🏗️ The "3D" Ecosystem
hybrid-MATRIX is part of a three-tier orchestration suite designed for cloud environments (like Google Antigravity / IDX) and hybrid codebases (Rust, C++, Python, etc.):

*   **Layer 1 (The Intent):** [hybrid-TREE](file:///home/ingbaroni/hybrid/hybrid-TREE) - The semantic layer. Markdown checklists, requirements, and project management.
*   **Layer 2 (The Bridge):** **hybrid-MATRIX** - This module. The elevator that rigidly connects intent to silicon.
*   **Layer 3 (The Reality):** [hybrid-RCP](file:///home/ingbaroni/hybrid/hybrid-RCP) - The source code parser that validates syntax and prevents conflicts (Ownership, Memory Leaks).

✨ Core Features
🔒 **Double Validation (Belt & Suspenders):** A link is only valid if the `hybrid-matrix.json` file declares the route (Top-Down) AND the parser physically finds the tag in the source code (e.g., `// @MATRIX: REQ-01`) (Bottom-Up). If you move a file and forget to update the architecture, the system triggers an alarm.

🔀 **Complex Cardinality:** Natively supports 1:1, 1:N (one task generates 50 files), and N:1 (10 security requirements pointing to a single Core construct) relationships.

🕵️ **Orphan Analysis:** The engine performs a continuous scan, returning two vital metrics:
*   **Missing Code (Broken elevator at the top):** Approved requirements with no corresponding code.
*   **Zombie Code (Broken elevator at the bottom):** Existing and tagged code whose original requirement has been deleted.

🤖 **AI-Proof:** Developed to prevent LLM "hallucinations." MATRIX provides AI agents (like those in Antigravity) with an unassailable map of connections, telling the AI exactly where a logical block is located without making it guess.

⚙️ How It Works (The Matrix JSON)
The core of the system is a Git-versioned JSON multiplexer (inside `.hybrid/`), acting as the Single Source of Truth:

```json
{
  "matrix_id": "MTX-1042",
  "cardinality": "N:1",
  "layer1_sources": ["REQ-SEC-01", "REQ-NET-05"],
  "layer3_targets": [
    {
      "file_path": "src/core/network_gateway.rs",
      "construct_name": "struct GatewayManager",
      "expected_tag": "@MATRIX: REQ-SEC-01, REQ-NET-05"
    }
  ],
  "status": "VALID"
}
```

And in your code (Layer 3):

```rust
// @MATRIX: REQ-SEC-01, REQ-NET-05
pub struct GatewayManager {
    // ...
}
```

## Ecosystem Usage

The `hybrid` ecosystem works in three stages to bridge documentation and code.

### 1. Snapshot Code Structure
Run this inside your project directory to extract the physical architecture into a high-fidelity JSON map.
```bash
node /path/to/hybrid-RCP/dist/cli.js export-structure .
```

### 2. Consolidate Manifest (Automatic Tree)
This command automatically parses all Markdown files in `docs/feature_trees/` and creates a consolidated `hybrid-tree.json`. It also detects "orphan" code files not yet documented.
```bash
node /path/to/hybrid-TREE/dist/cli.js consolidate
```

### 3. Connect Requirements to Code
Bridge the logical tree and the physical code structure to generate a deterministic traceability matrix.
```bash
node /path/to/hybrid-MATRIX/dist/cli.js connect -w .
```

---

*License: Apache-2.0*
