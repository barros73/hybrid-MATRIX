# 🧊 hybrid-MATRIX
**The Deterministic Traceability Engine: Bridging Architectural Intent with Physical Code.**

In codebase di grandi dimensioni (30k+ righe, monorepo, ecosistemi ibridi), mantenere la coerenza tra ciò che è stato progettato e ciò che è stato scritto è la sfida più grande. I ticket vengono chiusi, il codice muta, e il contesto si perde.

hybrid-MATRIX è il motore di tracciabilità in tempo reale (l'Asse Z) che connette i requisiti di progetto al codice sorgente. Nessuna supposizione AI, nessun database vettoriale probabilistico: solo determinismo puro e contratti architetturali di ferro.

🏗️ The "3D" Ecosystem
hybrid-MATRIX fa parte di una suite di orchestrazione a tre livelli, progettata per ambienti cloud (come Google Antigravity / IDX) e per codebase ibride (Rust, C++, Python, ecc.):

*   **Layer 1 (L'Intento):** [hybrid-TREE](file:///home/ingbaroni/hybrid/hybrid-TREE) - Il livello semantico. Checklist Markdown, requisiti e project management.
*   **Layer 2 (Il Ponte):** **hybrid-MATRIX** - Questo modulo. L'ascensore che collega in modo rigido l'intento al silicio.
*   **Layer 3 (La Realtà):** [hybrid-RCP](file:///home/ingbaroni/hybrid/hybrid-RCP) - Il parser del codice sorgente che valida la sintassi e previene i conflitti (Ownership, Memory Leaks).

✨ Core Features
🔒 **Doppia Validazione (Belt & Suspenders):** Un collegamento è valido solo se il file `hybrid-matrix.json` dichiara la rotta (Top-Down) E il parser trova fisicamente il tag nel codice sorgente (es. `// @MATRIX: REQ-01`) (Bottom-Up). Se sposti un file e dimentichi di aggiornare l'architettura, il sistema va in allarme.

🔀 **Cardinalità Complessa:** Supporta nativamente relazioni 1:1, 1:N (un task genera 50 file) e N:1 (10 requisiti di sicurezza puntano a un solo costrutto Core).

🕵️ **Analisi degli Orfani:** Il motore esegue una scansione continua restituendo due metriche vitali:
*   **Missing Code (Ascensore rotto in alto):** Requisiti approvati che non hanno riscontro nel codice.
*   **Zombie Code (Ascensore rotto in basso):** Codice esistente e taggato, ma il cui requisito originale è stato cancellato.

🤖 **AI-Proof:** Sviluppato per impedire le "allucinazioni" dei modelli LLM. MATRIX fornisce agli agenti AI (come quelli di Antigravity) una mappa inattaccabile dei collegamenti, dicendo all'AI esattamente dove si trova un blocco logico, senza farle tirare a indovinare.

⚙️ Come Funziona (The Matrix JSON)
Il cuore del sistema è un multiplexer JSON versionato su Git (dentro `.hybrid/`), che funge da unica fonte di verità (Single Source of Truth):

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

E nel tuo codice (Layer 3):

```rust
// @MATRIX: REQ-SEC-01, REQ-NET-05
pub struct GatewayManager {
    // ...
}
```

🚀 Getting Started

### Installazione
1. Clona il repository.
2. Esegui `npm install`.
3. Compila il progetto con `npm run compile`.

### Utilizzo CLI
Puoi interagire con MATRIX direttamente dal terminale (perfetto per script AI):
*   `hybrid-matrix sync`: Scansiona `MASTER_PROJECT_TREE.md`, assegna ID e valida i link esistenti.
*   `hybrid-matrix inject`: Inserisce automaticamente i tag `@MATRIX` mancanti nel codice sorgente.

### Utilizzo VS Code
Installa come estensione per avere accesso ai comandi:
*   `Hybrid Matrix: Sync & Validate`
*   `Hybrid Matrix: Inject Tags`

---
*License: GPL-3.0-only*
