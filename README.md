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

## 🏁 Getting Started

### Prerequisites
- **Node.js**: Version 16.x or higher.
- **npm**: Standard Node package manager.

### 🚀 Quick Installation
```bash
curl -sSL https://raw.githubusercontent.com/barros73/hybrid-BIM/main/install.sh | bash
```

---

## CLI Reference

### Usage
```bash
node /path/to/hybrid-MATRIX/dist/cli.js <command> [options]
```

### Commands
| Command | Description |
| :--- | :--- |
| `sync` | Validates existing links in `hybrid-matrix.json` and syncs requirement IDs with the master manifest. |
| `inject` | Automatically inserts `// @MATRIX: REQ-XXX` tags into the source code for all links marked as `BROKEN`. |
| `connect` | Bridges `hybrid-tree.json` (Requirements) and `hybrid-rcp.json` (Code) to automatically generate potential links. |
| `report` | Generates a high-level **Health Report** showing Traceability Integrity, total links, and documentation gaps. |

### Global Options
- `-w <path>`: Specify the project workspace root where the `.hybrid/` folder is located. Defaults to current directory.

---

## Ecosystem Workflow
The `hybrid` suite operates in a deterministic pipeline:
1. **RCP**: `export-structure .` (Maps the code)
2. **TREE**: `consolidate` (Maps the intent)
3. **MATRIX**: `connect -w .` (Creates the bridge)
4. **MATRIX**: `inject -w .` (Labels the reality)
5. **MATRIX**: `report -w .` (Verifies the score)

---

## 🧠 The Data Layer (.hybrid/)
MATRIX relies on a unified data layer stored in the `.hybrid/` folder:
- **`hybrid-tree.json`**: Requirements extracted by `TREE`.
- **`hybrid-rcp.json`**: Code structure analyzed by `RCP`.
- **`hybrid-matrix.json`**: The resulting traceability map.

---

## License
This project is licensed under the Apache License, Version 2.0.
