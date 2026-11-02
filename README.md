# System Architecture & Workflow Canvas

An interactive, two-in-one system design whiteboard and architecture modeler equipped with specialized component silhouettes, dynamic orthogonal connectors, AI-assisted diagram generation, and architectural health auditing.

[![Build Status](https://github.com/manjurgowda777/Design-APP/actions/workflows/deploy.yml/badge.svg)](https://github.com/manjurgowda777/Design-APP/actions)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![React](https://img.shields.io/badge/React-19-61dafb.svg)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178c6.svg)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-8-646cff.svg)](https://vitejs.dev/)

---

## 🚀 Key Features

* **Functional Architecture Silhouettes:** Distinct geometries for databases (cylinders), queues (pipes), gateways (trapezoids), microservices, serverless functions, and mobile clients.
* **AI Prompt-to-Architecture:** Describe a system in natural language to generate fully bound canvas topologies with BYOK (Bring Your Own Key) support for OpenAI and Google Gemini.
* **Smart Connectors:** Right-angled orthogonal lines with snap anchors, protocol labels, and animated data flow simulation.
* **Architecture Health Linter & Cloud Cost:** Flags anti-patterns (such as direct client-to-database connections and single points of failure) alongside real-time AWS/GCP/Azure monthly infrastructure cost estimates.
* **Live Multi-User Collaboration:** Instant peer synchronization powered by `BroadcastChannel` with live matrix-aware remote cursors and shareable room hashes.
* **Interactive Presentation Mode:** Step-by-step request flow walkthroughs (Client → Gateway → Service → DB) with dimmed spotlight framing and technical notes.
* **Diagram-as-Code & Spec Export:** Export to Markdown Architecture Decision Records (ADR), two-way Mermaid.js strings, PNG, SVG, and JSON snapshots.
* **Zero-Knowledge Privacy:** 100% client-side persistence in `localStorage`; no diagrams or credentials ever leave your browser.

---

## 🛠️ Tech Stack

* **Engine:** React 19, TypeScript, Vector SVG Rendering Engine
* **Styling & UI:** Modern Dark Glassmorphic CSS, Lucide Icons
* **Build Tool:** Vite 8
* **CI/CD:** GitHub Actions (Automated TypeCheck & Linting)

---

## 📦 Getting Started

### Prerequisites
* Node.js 18+
* npm or yarn

### Installation
```bash
git clone https://github.com/manjurgowda777/Design-APP.git
cd Design-APP
npm install
npm run dev
```

Visit `http://localhost:5173/` in your browser.

### Production Build & Verification
```bash
npm run build
npm run lint
```

---

## 🔒 Privacy & Security

We believe your system diagrams and network topologies belong solely to you:
* **Zero-Knowledge Storage:** Canvas items, descriptions, and credentials remain exclusively within your browser's local sandbox (`localStorage`).
* **Zero Telemetry on Canvas Data:** No node labels, network designs, or code snippets are transmitted to external servers.
* **BYOK Key Privacy:** Custom LLM API keys are stored with client-side obfuscation or in session memory and can be cleared instantly.

For more details, see our [Privacy Policy](PRIVACY.md) and [Security Policy](SECURITY.md).

---

## 📄 License

Distributed under the [MIT License](LICENSE). Copyright (c) 2026 Manjunath.
