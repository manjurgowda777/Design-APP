# Privacy & Data Handling Policy

We believe your system architecture diagrams and internal network topologies belong solely to you.

## 1. Zero-Knowledge Storage
* **Local Persistence:** By default, all canvas items, node descriptions, ports, and credentials are saved exclusively within your browser's local sandbox (`localStorage`).
* **Zero Telemetry on Canvas Data:** No node labels, code snippets, or system architectures are transmitted to our servers or third-party trackers.

## 2. AI Model & API Key Privacy
* **Bring Your Own Key (BYOK):** Any OpenAI or Gemini API keys entered into the generator modal remain strictly in your browser session or local storage. 
* **Direct Egress:** Requests to LLM providers are made either directly or via a stateless proxy. Your system designs are not retained for model training.

## 3. Recommended Security Practice
* Never place real production passwords, active SSH private keys, or internal private IP addresses on visual diagrams intended for public export.
