# Architecture Whiteboard Designer

A modern, high-performance web-based architecture diagramming whiteboard built for developers and system architects. Design cloud topologies, simulate network traffic, estimate AWS/GCP/Azure infrastructure costs, run security & reliability audits, collaborate in real time, and export specifications as code.

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![React](https://img.shields.io/badge/React-19-61dafb.svg)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178c6.svg)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-8-646cff.svg)](https://vitejs.dev/)

---

## Features

### 1. Interactive Infinite Canvas
- **Infinite Pan & Zoom:** Smooth zoom centered on cursor, trackpad pinch, and space/hand pan.
- **Smart Guides & Snap-to-Grid:** Magnetic alignment guides for rapid, neat layout design.
- **Functional Silhouettes:** Tailored SVG shapes that represent component behavior (cylindrical databases, pipe-shaped queues, inverted trapezoid gateways, and serverless hexagons).
- **Freehand Pen & Marquee Selection:** Freehand annotation and lasso multi-selection.

### 2. Live Multi-User Collaboration
- **Zero-Backend Peer Sync:** Real-time synchronization across browser tabs and windows powered by `BroadcastChannel` with room hash routing (`#room=<id>`).
- **Remote Cursors:** View live cursor movements and name badges in collaborator-assigned colors with matrix-aware zoom compensation.
- **Collaborator Presence:** Top bar avatar cluster showing active users and a one-click **Share Board** button.

### 3. Architecture Audit & Cloud Cost Suite
- **Live Cloud Cost Estimator:** Real-time baseline monthly cost estimation for Compute, Storage, and Networking.
- **Security & Reliability Linter:** Detects critical architectural flaws (such as frontend clients bypassing gateways to connect directly to databases) and orphan nodes.

### 4. AI Prompt-to-Diagram Generator
- Generate complete architecture diagrams from natural language descriptions (e.g., *"E-commerce app with Redis cache, Stripe webhook, and Postgres DB"*).
- Bring Your Own Key (BYOK) support for OpenAI and Google Gemini with offline/sample template fallbacks.

### 5. Diagram-as-Code & Spec Export
- **Mermaid.js Integration:** Live two-way Mermaid.js diagram definition generator ready to copy directly into GitHub READMEs and Notion.
- **Architecture Specification (ADR):** One-click export to comprehensive Markdown architecture specifications with inventory tables, protocols, and cost summaries.
- **Export Formats:** PNG, SVG, JSON snapshot, and Markdown Spec.

### 6. Interactive Presentation / Request Walkthrough Mode
- Step-by-step sequential walkthrough engine (Client -> Gateway -> Service -> DB).
- Spotlight viewport framing with dimmed background, neon component glows, and step narrative tooltips.

---

## Getting Started

### Prerequisites
- Node.js 18+
- npm or yarn

### Installation
```bash
# Clone the repository
git clone https://github.com/manjurgowda777/Design-APP.git

# Navigate to project folder
cd Design-APP

# Install dependencies
npm install

# Start local development server
npm run dev
```

Visit `http://localhost:5173/` in your browser.

### Building for Production
```bash
npm run build
```

---

## Privacy & Security

We believe your system diagrams and network topologies belong solely to you:
- **Zero-Knowledge Storage:** Canvas data, inspector metadata, and credentials stay in your browser's `localStorage`.
- **Zero Telemetry on Canvas Data:** No node labels, network designs, or code snippets are transmitted to external servers.
- **BYOK Privacy:** API keys remain strictly in your browser session.

See our full [Privacy & Data Handling Policy](PRIVACY.md) and [Security Policy](SECURITY.md).

---

## License

Distributed under the [MIT License](LICENSE). Copyright (c) 2026 Manjunath.
