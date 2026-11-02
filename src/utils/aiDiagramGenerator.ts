import type { NodeElement, ArrowElement, NodeShapeType } from '../types/canvas';
import { getNodeDomain } from '../types/canvas';
import { getNodeAnchorPoint } from './math';

export type AiProvider = 'gemini' | 'openai' | 'instant';

export interface AiSettings {
  provider: AiProvider;
  apiKey: string;
}

export interface GenerateAiDiagramOptions {
  prompt: string;
  provider: AiProvider;
  apiKey?: string;
  existingNodes?: NodeElement[];
}

export interface GeneratedDiagramResult {
  nodes: NodeElement[];
  arrows: ArrowElement[];
  summary: string;
}

const SETTINGS_STORAGE_KEY = 'architecture_ai_settings_v1';

export function getSavedAiSettings(): AiSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        provider: parsed.provider || 'gemini',
        apiKey: parsed.apiKey || '',
      };
    }
  } catch (e) {
    console.warn('Failed to load AI settings from localStorage', e);
  }
  return {
    provider: 'gemini',
    apiKey: '',
  };
}

export function saveAiSettings(settings: AiSettings): void {
  try {
    localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
  } catch (e) {
    console.warn('Failed to save AI settings to localStorage', e);
  }
}

// Color and sizing map for shapes
const SHAPE_DEFAULTS: Record<
  string,
  { strokeColor: string; width: number; height: number; subtitle: string }
> = {
  browser: { strokeColor: '#0ea5e9', width: 170, height: 90, subtitle: 'WEB CLIENT' },
  mobile: { strokeColor: '#a855f7', width: 100, height: 140, subtitle: 'MOBILE APP' },
  'api-gateway': { strokeColor: '#6366f1', width: 180, height: 90, subtitle: 'GATEWAY' },
  'load-balancer': { strokeColor: '#6366f1', width: 180, height: 90, subtitle: 'LOAD BALANCER' },
  cdn: { strokeColor: '#06b6d4', width: 180, height: 90, subtitle: 'EDGE CDN' },
  service: { strokeColor: '#818cf8', width: 180, height: 90, subtitle: 'SERVICE' },
  serverless: { strokeColor: '#f59e0b', width: 180, height: 90, subtitle: 'LAMBDA' },
  database: { strokeColor: '#10b981', width: 180, height: 90, subtitle: 'DATABASE' },
  cache: { strokeColor: '#ef4444', width: 180, height: 90, subtitle: 'CACHE' },
  storage: { strokeColor: '#14b8a6', width: 180, height: 90, subtitle: 'OBJECT STORAGE' },
  queue: { strokeColor: '#f59e0b', width: 180, height: 90, subtitle: 'QUEUE' },
  pubsub: { strokeColor: '#ec4899', width: 180, height: 90, subtitle: 'EVENT BUS' },
  auth: { strokeColor: '#10b981', width: 180, height: 90, subtitle: 'AUTH' },
  firewall: { strokeColor: '#ef4444', width: 180, height: 90, subtitle: 'FIREWALL' },
  'group-container': { strokeColor: 'rgba(148, 163, 184, 0.45)', width: 440, height: 300, subtitle: 'VPC' },
};

const SYSTEM_PROMPT = `You are an expert cloud solutions architect. Convert the user's natural language system architecture description into a clean, modern architecture diagram layout.

Output ONLY a raw valid JSON object with NO markdown formatting, NO backticks, and NO surrounding text.

JSON Schema:
{
  "summary": "Short 1-sentence description of the generated architecture",
  "nodes": [
    {
      "id": "node-1",
      "shape": "browser" | "mobile" | "api-gateway" | "load-balancer" | "service" | "serverless" | "database" | "cache" | "storage" | "queue" | "pubsub" | "auth" | "firewall",
      "label": "Human readable name (e.g. React SPA, Stripe Worker, PostgreSQL 16)",
      "subtitle": "UPPERCASE CATEGORY (e.g. CLIENT, GATEWAY, SERVICE, DB)",
      "x": number (grid tier coordinates: Clients x=60, Gateways x=300, Services x=560, Queues/Storage x=820, Databases x=1080),
      "y": number (vertical spacing 160-220px apart to avoid overlaps, starting around 120),
      "metadata": {
        "techStack": "e.g. Next.js 14, Go/Gin, Redis 7, Postgres 16",
        "port": "e.g. 443 / HTTPS, 5432 / TCP, 6379 / TCP, 9092 / TCP",
        "environment": "production" | "staging" | "internal" | "development",
        "notes": "Short architectural note"
      }
    }
  ],
  "arrows": [
    {
      "id": "arr-1",
      "startNodeId": "node-1",
      "endNodeId": "node-2",
      "startAnchor": "right" | "bottom" | "top" | "left",
      "endAnchor": "left" | "top" | "bottom" | "right",
      "label": "e.g. HTTPS / REST, gRPC, Pub/Sub, SQL Query :5432",
      "strokeStyle": "solid" | "dashed"
    }
  ]
}

Layout Rules:
- Layout flows left-to-right: Clients (x: 60) -> Gateways/LB (x: 300) -> Services/Lambda (x: 560) -> Queue/Cache/DB (x: 820 to 1080).
- Vertically separate parallel nodes by at least 150px (y: 120, 290, 460...).
- Connect dependent services with arrows that have descriptive labels. Use "solid" for sync REST/gRPC and "dashed" for async event streaming or queue jobs.`;

/**
 * Main generator entry point
 */
export async function generateAiDiagram(
  options: GenerateAiDiagramOptions
): Promise<GeneratedDiagramResult> {
  const { prompt, provider, apiKey, existingNodes = [] } = options;
  const trimmedKey = (apiKey || '').trim();

  // If Instant mode or no API key, use intelligent algorithmic architecture synthesis
  if (provider === 'instant' || !trimmedKey) {
    return generateInstantSmartDiagram(prompt, existingNodes);
  }

  if (provider === 'gemini') {
    return callGeminiApi(prompt, trimmedKey, existingNodes);
  } else if (provider === 'openai') {
    return callOpenAiApi(prompt, trimmedKey, existingNodes);
  }

  return generateInstantSmartDiagram(prompt, existingNodes);
}

/**
 * Call Gemini 1.5/2.5 Flash API directly
 */
async function callGeminiApi(
  prompt: string,
  apiKey: string,
  existingNodes: NodeElement[]
): Promise<GeneratedDiagramResult> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [
        {
          parts: [
            { text: SYSTEM_PROMPT },
            { text: `User Description: "${prompt}"\nGenerate the complete JSON architecture diagram.` },
          ],
        },
      ],
      generationConfig: {
        responseMimeType: 'application/json',
        temperature: 0.2,
      },
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Gemini API Error (${response.status}): ${errText}`);
  }

  const json = await response.json();
  const textContent =
    json.candidates?.[0]?.content?.parts?.[0]?.text || '';

  return parseAndPostProcessJson(textContent, existingNodes, prompt);
}

/**
 * Call OpenAI API (gpt-4o-mini)
 */
async function callOpenAiApi(
  prompt: string,
  apiKey: string,
  existingNodes: NodeElement[]
): Promise<GeneratedDiagramResult> {
  const url = 'https://api.openai.com/v1/chat/completions';

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: `User Description: "${prompt}"\nGenerate the complete JSON architecture diagram.` },
      ],
      temperature: 0.2,
      response_format: { type: 'json_object' },
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`OpenAI API Error (${response.status}): ${errText}`);
  }

  const json = await response.json();
  const textContent = json.choices?.[0]?.message?.content || '';

  return parseAndPostProcessJson(textContent, existingNodes, prompt);
}

/**
 * Parse LLM JSON output, validate, assign defaults, and compute anchor coordinates
 */
function parseAndPostProcessJson(
  rawJson: string,
  existingNodes: NodeElement[],
  prompt: string
): GeneratedDiagramResult {
  let cleaned = rawJson.trim();
  // Strip code block fences if present
  if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
  }

  let parsed: any;
  try {
    parsed = JSON.parse(cleaned);
  } catch (e) {
    console.warn('Direct JSON parse failed, trying fallback extraction:', e);
    const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      parsed = JSON.parse(jsonMatch[0]);
    } else {
      throw new Error('LLM did not return valid JSON. Please try again or use Instant Mode.');
    }
  }

  if (!parsed || !Array.isArray(parsed.nodes) || parsed.nodes.length === 0) {
    return generateInstantSmartDiagram(prompt, existingNodes);
  }

  // Calculate vertical offset so appended nodes don't collide with existing nodes
  const offsetY =
    existingNodes.length > 0
      ? Math.max(...existingNodes.map((n) => n.y + n.height)) + 90
      : 0;

  const idMap = new Map<string, string>();
  const processedNodes: NodeElement[] = [];

  for (let i = 0; i < parsed.nodes.length; i++) {
    const rawNode = parsed.nodes[i];
    const shape = (rawNode.shape || 'service') as NodeShapeType;
    const defaults = SHAPE_DEFAULTS[shape] || SHAPE_DEFAULTS.service;

    const newId = `node-ai-${Date.now()}-${i}`;
    idMap.set(rawNode.id || `node-${i + 1}`, newId);

    const width = rawNode.width || defaults.width;
    const height = rawNode.height || defaults.height;

    const nodeElem: NodeElement = {
      id: newId,
      type: 'node',
      shape,
      domain: getNodeDomain(shape),
      x: typeof rawNode.x === 'number' ? rawNode.x : 60 + (i % 4) * 260,
      y: (typeof rawNode.y === 'number' ? rawNode.y : 120 + Math.floor(i / 4) * 180) + offsetY,
      width,
      height,
      label: rawNode.label || `Component ${i + 1}`,
      subtitle: rawNode.subtitle || defaults.subtitle,
      strokeColor: defaults.strokeColor,
      fillColor: shape === 'group-container' ? 'rgba(15, 23, 42, 0.25)' : '#1e293b',
      strokeWidth: 2,
      metadata: rawNode.metadata || {
        environment: 'production',
        notes: 'Generated via AI Diagram Architect',
      },
    };

    processedNodes.push(nodeElem);
  }

  // Fast map for coordinate recalculation
  const nodesMap = new Map<string, NodeElement>();
  processedNodes.forEach((n) => nodesMap.set(n.id, n));

  const processedArrows: ArrowElement[] = [];
  if (Array.isArray(parsed.arrows)) {
    for (let i = 0; i < parsed.arrows.length; i++) {
      const rawArr = parsed.arrows[i];
      const startNodeId = idMap.get(rawArr.startNodeId) || rawArr.startNodeId;
      const endNodeId = idMap.get(rawArr.endNodeId) || rawArr.endNodeId;

      const startNode = nodesMap.get(startNodeId);
      const endNode = nodesMap.get(endNodeId);

      const startAnchor = rawArr.startAnchor || 'right';
      const endAnchor = rawArr.endAnchor || 'left';

      let startPt = { x: 0, y: 0 };
      let endPt = { x: 0, y: 0 };

      if (startNode) {
        startPt = getNodeAnchorPoint(startNode, startAnchor);
      }
      if (endNode) {
        endPt = getNodeAnchorPoint(endNode, endAnchor);
      }

      const arrowElem: ArrowElement = {
        id: `arrow-ai-${Date.now()}-${i}`,
        type: 'arrow',
        startNodeId,
        endNodeId,
        startAnchor,
        endAnchor,
        startPoint: startPt,
        endPoint: endPt,
        label: rawArr.label || undefined,
        strokeStyle: rawArr.strokeStyle === 'dashed' ? 'dashed' : 'solid',
        color: startNode?.strokeColor || '#38bdf8',
        strokeWidth: 2,
        arrowHead: 'arrow',
      };

      processedArrows.push(arrowElem);
    }
  }

  return {
    nodes: processedNodes,
    arrows: processedArrows,
    summary: parsed.summary || 'Architecture diagram synthesized successfully.',
  };
}

/**
 * Intelligent Algorithmic Architecture Synthesizer
 * Produces realistic, production-grade architectures tailored to user prompt keywords
 * without requiring any external network API calls or API keys!
 */
export function generateInstantSmartDiagram(
  userPrompt: string,
  existingNodes: NodeElement[]
): GeneratedDiagramResult {
  const p = userPrompt.toLowerCase();
  const offsetY =
    existingNodes.length > 0
      ? Math.max(...existingNodes.map((n) => n.y + n.height)) + 90
      : 0;

  const isEcommerce = p.includes('e-commerce') || p.includes('ecommerce') || p.includes('shop') || p.includes('stripe') || p.includes('payment');
  const isMicroservices = p.includes('microservice') || p.includes('kafka') || p.includes('event') || p.includes('queue') || p.includes('worker');
  const isMobile = p.includes('mobile') || p.includes('ios') || p.includes('android') || p.includes('offline');
  const isAiMl = p.includes('ai') || p.includes('ml') || p.includes('rag') || p.includes('vector') || p.includes('llm') || p.includes('inference');

  interface RawNodeSpec {
    id: string;
    shape: NodeShapeType;
    label: string;
    subtitle: string;
    x: number;
    y: number;
    metadata: {
      techStack: string;
      port?: string;
      environment: 'production' | 'staging' | 'internal' | 'development';
      notes: string;
    };
  }

  interface RawArrowSpec {
    from: string;
    to: string;
    startAnchor: 'right' | 'bottom' | 'top' | 'left';
    endAnchor: 'left' | 'top' | 'bottom' | 'right';
    label: string;
    dashed?: boolean;
  }

  let nodesSpec: RawNodeSpec[] = [];
  let arrowsSpec: RawArrowSpec[] = [];
  let summary = '';

  if (isAiMl) {
    summary = 'AI/ML RAG Pipeline with Vector Search & Inference Worker';
    nodesSpec = [
      {
        id: 'client',
        shape: 'browser',
        label: 'AI Chat Client',
        subtitle: 'WEB CLIENT',
        x: 60,
        y: 180,
        metadata: { techStack: 'Next.js 14 / Tailwind', port: '443 / HTTPS', environment: 'production', notes: 'Streaming AI chat interface with markdown rendering.' },
      },
      {
        id: 'gateway',
        shape: 'api-gateway',
        label: 'FastAPI Gateway',
        subtitle: 'GATEWAY',
        x: 320,
        y: 180,
        metadata: { techStack: 'Python / FastAPI', port: '443 / HTTPS', environment: 'production', notes: 'Authenticates prompts, handles rate-limits, and orchestrates RAG flow.' },
      },
      {
        id: 'inference',
        shape: 'serverless',
        label: 'LLM Inference Pod',
        subtitle: 'GPU COMPUTE',
        x: 580,
        y: 110,
        metadata: { techStack: 'vLLM / PyTorch / A100', port: '8000 / HTTP', environment: 'production', notes: 'High-throughput transformer inference cluster.' },
      },
      {
        id: 'vector-db',
        shape: 'database',
        label: 'Pinecone Vector DB',
        subtitle: 'VECTOR STORE',
        x: 580,
        y: 290,
        metadata: { techStack: 'Pinecone / HNSW Index', port: '443 / HTTPS', environment: 'production', notes: 'Stores 1536-dim document embeddings for cosine similarity search.' },
      },
      {
        id: 'cache',
        shape: 'cache',
        label: 'Redis Semantic Cache',
        subtitle: 'CACHE',
        x: 840,
        y: 110,
        metadata: { techStack: 'Redis v7.2 Enterprise', port: '6379 / TCP', environment: 'production', notes: 'Caches frequent prompt completions with 85% cache hit rate.' },
      },
      {
        id: 'queue',
        shape: 'queue',
        label: 'Task Queue (Celery)',
        subtitle: 'QUEUE',
        x: 840,
        y: 290,
        metadata: { techStack: 'Celery / Redis Broker', port: '6379 / TCP', environment: 'production', notes: 'Asynchronous document ingestion and chunk embedding pipeline.' },
      },
    ];

    arrowsSpec = [
      { from: 'client', to: 'gateway', startAnchor: 'right', endAnchor: 'left', label: 'Prompt Stream' },
      { from: 'gateway', to: 'inference', startAnchor: 'right', endAnchor: 'left', label: 'Inference Request' },
      { from: 'gateway', to: 'vector-db', startAnchor: 'bottom', endAnchor: 'left', label: 'Semantic Query' },
      { from: 'inference', to: 'cache', startAnchor: 'right', endAnchor: 'left', label: 'Cache Hit / Store' },
      { from: 'vector-db', to: 'queue', startAnchor: 'right', endAnchor: 'left', label: 'Ingest Trigger', dashed: true },
    ];
  } else if (isEcommerce) {
    summary = 'E-Commerce Platform with Stripe Webhooks, Redis Cache & Postgres DB';
    nodesSpec = [
      {
        id: 'client',
        shape: 'browser',
        label: 'Storefront SPA',
        subtitle: 'WEB CLIENT',
        x: 60,
        y: 140,
        metadata: { techStack: 'React / Next.js Storefront', port: '443 / HTTPS', environment: 'production', notes: 'Customer shopping cart, product catalog, and checkout flow.' },
      },
      {
        id: 'mobile',
        shape: 'mobile',
        label: 'Mobile App',
        subtitle: 'MOBILE CLIENT',
        x: 95,
        y: 290,
        metadata: { techStack: 'React Native / Expo', port: '443 / HTTPS', environment: 'production', notes: 'Native iOS & Android mobile commerce client.' },
      },
      {
        id: 'gateway',
        shape: 'api-gateway',
        label: 'Stripe & API Gateway',
        subtitle: 'GATEWAY',
        x: 340,
        y: 210,
        metadata: { techStack: 'Kong Gateway 3.4', port: '443 / HTTPS', environment: 'production', notes: 'Validates Stripe webhook signatures and routes customer orders.' },
      },
      {
        id: 'service',
        shape: 'service',
        label: 'Order Processing API',
        subtitle: 'SERVICE',
        x: 600,
        y: 210,
        metadata: { techStack: 'Go 1.22 / Gin', port: '8080 / HTTP', environment: 'production', notes: 'Transactional order orchestration, inventory hold, and receipt dispatch.' },
      },
      {
        id: 'cache',
        shape: 'cache',
        label: 'Redis Catalog Cache',
        subtitle: 'CACHE',
        x: 860,
        y: 110,
        metadata: { techStack: 'Redis 7.2 Sentinel', port: '6379 / TCP', environment: 'production', notes: 'Sub-millisecond product inventory and flash sale pricing.' },
      },
      {
        id: 'db',
        shape: 'database',
        label: 'Postgres Orders DB',
        subtitle: 'DATABASE',
        x: 860,
        y: 290,
        metadata: { techStack: 'PostgreSQL 16 High-Availability', port: '5432 / TCP', environment: 'production', notes: 'ACID transactional store for orders, customers, and payments.' },
      },
    ];

    arrowsSpec = [
      { from: 'client', to: 'gateway', startAnchor: 'right', endAnchor: 'left', label: 'HTTPS / Checkout' },
      { from: 'mobile', to: 'gateway', startAnchor: 'right', endAnchor: 'bottom', label: 'Mobile GraphQL' },
      { from: 'gateway', to: 'service', startAnchor: 'right', endAnchor: 'left', label: 'Webhook & Order API' },
      { from: 'service', to: 'cache', startAnchor: 'right', endAnchor: 'left', label: 'Read Catalog' },
      { from: 'service', to: 'db', startAnchor: 'right', endAnchor: 'left', label: 'Store Order :5432' },
    ];
  } else if (isMicroservices) {
    summary = 'Distributed Event-Driven Microservices with Kafka Broker';
    nodesSpec = [
      {
        id: 'gateway',
        shape: 'api-gateway',
        label: 'Ingress API Gateway',
        subtitle: 'GATEWAY',
        x: 60,
        y: 200,
        metadata: { techStack: 'Envoy Gateway / Kubernetes', port: '443 / HTTPS', environment: 'production', notes: 'L7 ingress proxy with mutual TLS and JWT auth.' },
      },
      {
        id: 'auth',
        shape: 'auth',
        label: 'Auth Service',
        subtitle: 'SECURITY',
        x: 320,
        y: 90,
        metadata: { techStack: 'Go / OAuth2 / OIDC', port: '8081 / gRPC', environment: 'production', notes: 'Issues and introspects cryptographic JWT tokens.' },
      },
      {
        id: 'producer',
        shape: 'service',
        label: 'Event Producer Service',
        subtitle: 'SERVICE',
        x: 320,
        y: 290,
        metadata: { techStack: 'Node.js / TypeScript', port: '8080 / HTTP', environment: 'production', notes: 'Publishes domain state change events to distributed topics.' },
      },
      {
        id: 'queue',
        shape: 'queue',
        label: 'Kafka Event Stream',
        subtitle: 'EVENT BUS',
        x: 580,
        y: 290,
        metadata: { techStack: 'Apache Kafka 3.6 Cluster', port: '9092 / TCP', environment: 'production', notes: 'Partitioned distributed commit log with 7-day retention.' },
      },
      {
        id: 'consumer',
        shape: 'serverless',
        label: 'Worker Lambda Consumer',
        subtitle: 'CONSUMER',
        x: 840,
        y: 200,
        metadata: { techStack: 'Python 3.12 / Celery', port: 'Internal', environment: 'production', notes: 'Consumes batched topic records, processes jobs asynchronously.' },
      },
      {
        id: 'db',
        shape: 'database',
        label: 'Audit & Event Store',
        subtitle: 'DATABASE',
        x: 1080,
        y: 200,
        metadata: { techStack: 'PostgreSQL 16 / Timescale', port: '5432 / TCP', environment: 'production', notes: 'Immutable event ledger and current view models.' },
      },
    ];

    arrowsSpec = [
      { from: 'gateway', to: 'auth', startAnchor: 'top', endAnchor: 'left', label: 'Verify Token' },
      { from: 'gateway', to: 'producer', startAnchor: 'bottom', endAnchor: 'left', label: 'REST Dispatch' },
      { from: 'producer', to: 'queue', startAnchor: 'right', endAnchor: 'left', label: 'Produce Event', dashed: true },
      { from: 'queue', to: 'consumer', startAnchor: 'right', endAnchor: 'bottom', label: 'Consume Records', dashed: true },
      { from: 'consumer', to: 'db', startAnchor: 'right', endAnchor: 'left', label: 'Write Snapshot' },
    ];
  } else if (isMobile) {
    summary = 'Offline-First Mobile Architecture with Sync Gateway';
    nodesSpec = [
      {
        id: 'mobile',
        shape: 'mobile',
        label: 'Mobile Client (iOS/Android)',
        subtitle: 'MOBILE APP',
        x: 60,
        y: 170,
        metadata: { techStack: 'Flutter / SQLite Offline Store', port: 'Local', environment: 'production', notes: 'Local-first offline mobile app with optimistic UI updates.' },
      },
      {
        id: 'gateway',
        shape: 'api-gateway',
        label: 'Sync Gateway',
        subtitle: 'GATEWAY',
        x: 280,
        y: 200,
        metadata: { techStack: 'Couchbase Sync Gateway', port: '443 / HTTPS', environment: 'production', notes: 'Handles bidirectional synchronization and conflict resolution.' },
      },
      {
        id: 'service',
        shape: 'service',
        label: 'Sync Resolution Engine',
        subtitle: 'SERVICE',
        x: 540,
        y: 200,
        metadata: { techStack: 'Node.js / CRDT Engine', port: '8080 / HTTP', environment: 'production', notes: 'Conflict-free replicated data types and operational transformation.' },
      },
      {
        id: 'db',
        shape: 'database',
        label: 'Cloud Document DB',
        subtitle: 'DATABASE',
        x: 800,
        y: 200,
        metadata: { techStack: 'MongoDB Atlas / Couchbase', port: '27017 / TCP', environment: 'production', notes: 'Cloud source-of-truth document store.' },
      },
    ];

    arrowsSpec = [
      { from: 'mobile', to: 'gateway', startAnchor: 'right', endAnchor: 'left', label: 'WebSocket Sync', dashed: true },
      { from: 'gateway', to: 'service', startAnchor: 'right', endAnchor: 'left', label: 'Process Mutations' },
      { from: 'service', to: 'db', startAnchor: 'right', endAnchor: 'left', label: 'Persist State' },
    ];
  } else {
    // General 3-Tier / Web Architecture tailored to prompt
    summary = `Custom 3-Tier Architecture for: "${userPrompt.slice(0, 40)}"`;
    nodesSpec = [
      {
        id: 'client',
        shape: 'browser',
        label: 'Web Client Interface',
        subtitle: 'WEB CLIENT',
        x: 60,
        y: 190,
        metadata: { techStack: 'React / Vite SPA', port: '443 / HTTPS', environment: 'production', notes: 'Dynamic web frontend with responsive UX.' },
      },
      {
        id: 'lb',
        shape: 'load-balancer',
        label: 'NGINX Load Balancer',
        subtitle: 'LOAD BALANCER',
        x: 320,
        y: 190,
        metadata: { techStack: 'NGINX Plus', port: '443 / HTTPS', environment: 'production', notes: 'SSL termination and round-robin traffic balancing.' },
      },
      {
        id: 'service',
        shape: 'service',
        label: 'Application Cluster',
        subtitle: 'SERVICE',
        x: 580,
        y: 190,
        metadata: { techStack: 'Node.js / Express', port: '8080 / HTTP', environment: 'production', notes: 'Main application logic and API endpoints.' },
      },
      {
        id: 'cache',
        shape: 'cache',
        label: 'Redis Session Cache',
        subtitle: 'CACHE',
        x: 840,
        y: 100,
        metadata: { techStack: 'Redis v7.2', port: '6379 / TCP', environment: 'production', notes: 'High-speed in-memory store for sessions and caching.' },
      },
      {
        id: 'db',
        shape: 'database',
        label: 'Primary Database',
        subtitle: 'DATABASE',
        x: 840,
        y: 280,
        metadata: { techStack: 'PostgreSQL 16', port: '5432 / TCP', environment: 'production', notes: 'Relational database with transactional persistence.' },
      },
    ];

    arrowsSpec = [
      { from: 'client', to: 'lb', startAnchor: 'right', endAnchor: 'left', label: 'HTTPS / REST' },
      { from: 'lb', to: 'service', startAnchor: 'right', endAnchor: 'left', label: 'Proxy Pass :8080' },
      { from: 'service', to: 'cache', startAnchor: 'right', endAnchor: 'left', label: 'Cache Lookup' },
      { from: 'service', to: 'db', startAnchor: 'right', endAnchor: 'left', label: 'SQL Query :5432' },
    ];
  }

  // Construct processed elements
  const idMap = new Map<string, string>();
  const nodes: NodeElement[] = nodesSpec.map((spec, idx) => {
    const newId = `node-ai-${Date.now()}-${idx}`;
    idMap.set(spec.id, newId);
    const defaults = SHAPE_DEFAULTS[spec.shape] || SHAPE_DEFAULTS.service;
    return {
      id: newId,
      type: 'node',
      shape: spec.shape,
      domain: getNodeDomain(spec.shape),
      x: spec.x,
      y: spec.y + offsetY,
      width: defaults.width,
      height: defaults.height,
      label: spec.label,
      subtitle: spec.subtitle,
      strokeColor: defaults.strokeColor,
      fillColor: '#1e293b',
      strokeWidth: 2,
      metadata: spec.metadata,
    };
  });

  const nodesMap = new Map<string, NodeElement>();
  nodes.forEach((n) => nodesMap.set(n.id, n));

  const arrows: ArrowElement[] = arrowsSpec.map((arr, idx) => {
    const startNodeId = idMap.get(arr.from) || arr.from;
    const endNodeId = idMap.get(arr.to) || arr.to;

    const startNode = nodesMap.get(startNodeId);
    const endNode = nodesMap.get(endNodeId);

    const startPt = startNode
      ? getNodeAnchorPoint(startNode, arr.startAnchor)
      : { x: 0, y: 0 };
    const endPt = endNode
      ? getNodeAnchorPoint(endNode, arr.endAnchor)
      : { x: 0, y: 0 };

    return {
      id: `arrow-ai-${Date.now()}-${idx}`,
      type: 'arrow',
      startNodeId,
      endNodeId,
      startAnchor: arr.startAnchor,
      endAnchor: arr.endAnchor,
      startPoint: startPt,
      endPoint: endPt,
      label: arr.label,
      strokeStyle: arr.dashed ? 'dashed' : 'solid',
      color: startNode?.strokeColor || '#38bdf8',
      strokeWidth: 2,
      arrowHead: 'arrow',
    };
  });

  return {
    nodes,
    arrows,
    summary,
  };
}
