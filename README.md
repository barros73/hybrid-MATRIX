# 🧊 hybrid-MATRIX: v0.6.1 - 2026-03-04
**The Deterministic Traceability Engine: Bridging Architectural Intent with Physical Code.**

In large-scale codebases (30k+ lines, monorepos, hybrid ecosystems), maintaining consistency between what was designed and what was written is the greatest challenge. Tickets are closed, code mutates, and context is lost.

hybrid-MATRIX is the real-time traceability engine (the Z-Axis) that connects project requirements to source code. No AI assumptions, no probabilistic vector databases: just pure determinism and ironclad architectural contracts.

🏗️ The "3D" Ecosystem
hybrid-MATRIX is part of a three-tier orchestration suite designed for cloud environments (like Google Antigravity / IDX) and hybrid codebases (Rust, C++, Python, etc.):

*   **Layer 1 (The Intent):** [hybrid-TREE](file:///home/ingbaroni/hybrid/hybrid-TREE) - The semantic layer. Markdown checklists, requirements, and project management.
*   **Layer 2 (The Bridge):** **hybrid-MATRIX** - This module. The elevator that rigidly connects intent to silicon.
*   **Layer 3 (The Reality):** [hybrid-RCP](file:///home/ingbaroni/hybrid/hybrid-RCP) - The source code parser that validates syntax and prevents conflicts (Ownership, Memory Leaks).

 ✨ Core Features
🔴 **Color-Coded Risk Management (The Dashboard):** Every component in the system is assigned a stability/risk level, visualized in the `bridge` report:
- 🔴 **RED (Conflict)**: Architectural violations (e.g., Ownership conflicts, missing files). **Blocks implementation until resolved.**
- 🟡 **YELLOW (Orphan)**: Code exists but is not mapped to a requirement. Signals architectural drift.
- ⚪ **WHITE (In-Progress)**: Active mission currently under development.
- 🟢 **GREEN (Stable)**: Requirement and Code are perfectly synchronized.
- 🔵 **BLUE (High Gravity)**: Core stable nodes with high dependency counts. Requires extreme caution during modification.

🔍 **Discovery Engine (Logical Clusters):** Beyond static rules, MATRIX uses a BFS-based graph traversal to find the "Gravity Core" of any file. When implementing a feature, MATRIX automatically identifies and includes core dependencies (manager, types, lib) in the AI context.

🔒 **Double Validation:** A link is only valid if the `hybrid-matrix.json` file declares the route AND the parser physically finds the tag in the source code.

🕵️ **Orphan Analysis:** Continuous scan for missing code (requirements without files) and zombie code (files without requirements).

🤖 **AI-Proof Context:** Provides LLM agents with an unassailable map of connections, including "Ghost Skeletons" for missing files, ensuring the AI never has to guess the architecture.

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

## 🛠️ CLI Reference & Operational Manual

### Usage
```bash
node dist/cli.js <command> [options]
```

### Global Options
- `-w <path>`: Specifies the project workspace root where the `.hybrid/` folder is located (Defaults to `process.cwd()`).
- `--ai-format`: Hidden flag. Suppresses human-readable console metrics, returning pure JSON payloads. Crucial for invoking MATRIX via bash orchestrators or LLM Agents.

---

### Commands Deep Dive

#### 1. `connect` (The Architect)
Bridges logical intent from `hybrid-tree.json` with the physical code reality mapped in `hybrid-rcp.json`.
- **Action**: Matches requirement IDs (e.g., `J.1.2`) against code constructs and generates `.hybrid/hybrid-matrix.json`. Newly mapped abstract links are initially flagged as `"BROKEN"`.
- **Example**: `hybrid-matrix connect -w .`

#### 2. `inject` (The Tagger)
Violently enforces traceability within Layer 3 (The Code).
- **Action**: Autonomously reads all `"BROKEN"` links and injects the actual `// @MATRIX: REQ-XXX` tracking comments atop the designated `.rs`, `.ts`, or `.hpp` structures.
- **Example**: `hybrid-matrix inject -w .`

#### 3. `sync` (The Auditor)
Validates existing links to ensure the software hasn't drifted from its design.
- **Action**: Syncs ID hierarchies with the master manifest. Confirms that tagged code in Layer 3 still aligns with Layer 1 intent. Flips statuses from `"BROKEN"` to `"VALID"`.
- **Example**: `hybrid-matrix sync -w . --ai-format`

#### 4. `report` (The Health Inspector)
Yields a high-level **Health Score** representing Traceability Integrity.
- **Action**: Evaluates the ecosystem coverage. Displays the total number of links, Valid links vs Broken links, and critically exposes **Documentation Gaps** (Orphan requirements waiting for code).
- **Example**: `hybrid-matrix report`

#### 5. `bridge` (The AI Navigator)
The primary directive for LLMs entering the system (Brownfield or Greenfield).
- **Action**: Cross-references logical gaps against reality, generating an explicit, machine-instruction file: `MATRIX_INSTRUCTION.md`.
- **New in v0.6**: Includes a **Spatial Mission Map (Mermaid)** and prioritizes **Architectural Conflicts** (Red Nodes) as Priority Zero.
- **Example**: `hybrid-matrix bridge -w .`

#### 6. `export-script` (Code-as-Context Generator)
Translates the JSON architectural graphs into compilable "Ghost Skeletons" optimized for LLM inference.
- **Action**: Produces an empty, deterministically typed script containing the exact interfaces and `import` edges the AI must follow.
- **Cluster-Aware**: Uses the **Discovery Engine** to automatically include "Core" dependencies in the skeleton header, preventing the AI from hallucinating isolated logic.
- **Example**: `hybrid-matrix export-script -w . --target src/core/network_gateway.rs`

#### 7. `skeleton` (The Scaffolder)
Safe, deterministic directory scaffolding.
- **Action**: Reads `"BROKEN"` components requiring new files/folders and securely generates the empty Rust constructs (`mod.rs`, directories). It safely skips existing files to prevent overwrite corruption.
- **Example**: `hybrid-matrix skeleton`

#### 8. `watch` (The Daemon)
Background orchestrator mode.
- **Action**: Monitors `*.md` and `*.rs` directories. Triggers autonomous re-compilation (RCP parsing, TREE consolidation, and MATRIX synchronization) upon save.

---

## 📜 Global Ecosystem Logging (Audit Trail)

Due to the destructive and highly precise nature of MATRIX operations (like `inject` and `skeleton`), every single CLI run appends its explicit result to a centralized ledger.

**Log Location:**
**`📁 .hybrid/matrix-report.log`**

**Example Log Entry:**
```text
[2026-02-28T14:42:00.000Z] COMMAND: report
--- HYBRID ECOSYSTEM HEALTH REPORT ---
🟢 Traceability Integrity: 88%
🔗 Total Links: 42
✅ Validated: 37
🔴 Broken/Pending: 5
⚠️  Documentation Gaps: 2 requirements without code
-------------------------------------
```

## Ecosystem Workflow
The `hybrid` suite operates in a deterministic "Golden Loop" pipeline:
1. **GENESIS**: `export --target tree` (Maps the Intent)
2. **TREE**: `consolidate` (Maps the Logic)
3. **RCP**: `export-structure .` (Maps the Reality)
4. **MATRIX**: `connect` (Bridges Logic and Reality)
5. **MATRIX**: `bridge` (Generates the Next Best Action)
6. **MATRIX**: `inject` (Labels the reality)

---

## 🧠 The Data Layer (.hybrid/)
MATRIX relies on a unified data layer stored in the `.hybrid/` folder:
- **`hybrid-tree.json`**: Requirements extracted by `TREE`.
- **`hybrid-rcp.json`**: Code structure analyzed by `RCP`.
- **`hybrid-matrix.json`**: The resulting traceability map.

---
*Copyright 2026 Fabrizio Baroni. Licensed under the Apache License, Version 2.0.*
