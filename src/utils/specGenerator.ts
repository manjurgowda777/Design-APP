import type { NodeElement, ArrowElement } from '../types/canvas';
import { generateMermaidDiagram } from './mermaid';
import { estimateArchitectureCost } from './costEstimator';
import { saveFileLocally } from './electronBridge';

export interface ArchitectureSpecOptions {
  title?: string;
  nodes: NodeElement[];
  arrows: ArrowElement[];
  totalMonthlyCost?: number;
  healthScore?: number;
}

/**
 * Generates a comprehensive Architecture Specification & Decision Record (ADR)
 * in GitHub-flavored Markdown.
 */
export function generateArchitectureSpec(options: ArchitectureSpecOptions): string {
  const {
    title = 'Cloud Architecture Studio System',
    nodes,
    arrows,
    healthScore,
  } = options;

  const cost = options.totalMonthlyCost ?? estimateArchitectureCost(nodes).totalMonthlyCost;
  const now = new Date();
  const formattedDate = now.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
  const formattedTime = now.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    timeZoneName: 'short',
  });

  const nodeMap = new Map<string, NodeElement>();
  nodes.forEach((n) => nodeMap.set(n.id, n));

  // Regular components excluding pure boundary containers for inventory
  const functionalNodes = nodes.filter((n) => n.shape !== 'group-container');
  const boundaryNodes = nodes.filter((n) => n.shape === 'group-container');

  // Mermaid diagram string
  const mermaidDiagram = generateMermaidDiagram(nodes, arrows, 'LR');

  const lines: string[] = [];

  // 1. Document Title & Header
  lines.push(`# Architecture Specification & Decision Record (ADR)`);
  lines.push(`\n**Project:** ${title}`);
  lines.push(`**Generated On:** ${formattedDate} at ${formattedTime}`);
  lines.push(`**Format:** Markdown ADR v1.0 | Cloud Blueprint Standard`);
  lines.push(`\n---`);

  // 2. Executive Architecture Overview & Metrics
  lines.push(`\n## 1. Executive Summary & Metrics`);
  lines.push(`\nThis specification documents the cloud system topology, component inventory, data flow protocols, and estimated operational expenditure defined in the interactive architecture canvas.`);
  lines.push(``);
  lines.push(`| Metric | Value | Description |`);
  lines.push(`| :--- | :--- | :--- |`);
  lines.push(`| **Total Components** | \`${nodes.length}\` | ${functionalNodes.length} active service/data nodes, ${boundaryNodes.length} VPC/network boundaries |`);
  lines.push(`| **Total Interconnections** | \`${arrows.length}\` | Stepped orthogonal & labeled data transport channels |`);
  lines.push(`| **Estimated Monthly Spend** | **$${cost.toFixed(2)} / mo** | ~$${(cost * 12).toFixed(2)}/yr baseline cloud infrastructure budget |`);
  if (typeof healthScore === 'number') {
    const healthRating =
      healthScore >= 90
        ? 'Production Grade (Excellent)'
        : healthScore >= 80
        ? 'Good Health (Minor Warnings)'
        : healthScore >= 50
        ? 'Attention Needed (Potential Bottlenecks)'
        : 'Critical Vulnerabilities Detected';
    lines.push(`| **Architecture Health Score** | **${healthScore}%** | ${healthRating} |`);
  }
  lines.push(``);

  // 3. System Components Inventory Table
  lines.push(`## 2. System Components Inventory`);
  lines.push(`\nItemized registry of all application tiers, storage engines, serverless compute units, and ingress gateways.\n`);

  if (nodes.length === 0) {
    lines.push(`_No components are currently defined on the canvas._\n`);
  } else {
    lines.push(`| Component Name | Role / Shape | Tier / Domain | Tech Stack / Engine | Port / Protocol | Environment | Notes & Specs |`);
    lines.push(`| :--- | :--- | :--- | :--- | :--- | :--- | :--- |`);

    for (const node of nodes) {
      const name = node.label ? `**${escapeMarkdownCell(node.label)}**` : `\`${node.id}\``;
      const role = `\`${node.shape}\``;
      const domain = node.domain ? capitalize(node.domain) : 'Backend';
      const techStack = node.metadata?.techStack ? `\`${escapeMarkdownCell(node.metadata.techStack)}\`` : '—';
      const port = node.metadata?.port ? `\`${escapeMarkdownCell(node.metadata.port)}\`` : '—';
      const env = node.metadata?.environment ? capitalize(node.metadata.environment) : 'Production';
      const notes = node.metadata?.notes ? escapeMarkdownCell(node.metadata.notes) : '—';

      lines.push(`| ${name} | ${role} | ${domain} | ${techStack} | ${port} | ${env} | ${notes} |`);
    }
    lines.push(``);
  }

  // 4. Communication & Protocols Table
  lines.push(`## 3. Communication & Protocols`);
  lines.push(`\nTopology interconnects, communication contracts, network endpoints, and synchronization behaviors.\n`);

  if (arrows.length === 0) {
    lines.push(`_No inter-service connections are currently defined on the canvas._\n`);
  } else {
    lines.push(`| Source Component | Target Component | Protocol / Channel Label | Execution Mode | Arrow Style |`);
    lines.push(`| :--- | :--- | :--- | :--- | :--- |`);

    for (const arrow of arrows) {
      const sourceNode = arrow.startNodeId ? nodeMap.get(arrow.startNodeId) : null;
      const targetNode = arrow.endNodeId ? nodeMap.get(arrow.endNodeId) : null;

      const sourceName = sourceNode ? `**${escapeMarkdownCell(sourceNode.label)}**` : `\`${arrow.startNodeId || 'External'}\``;
      const targetName = targetNode ? `**${escapeMarkdownCell(targetNode.label)}**` : `\`${arrow.endNodeId || 'External'}\``;
      const protocol = arrow.label ? `\`${escapeMarkdownCell(arrow.label)}\`` : '`Default Protocol`';
      const isAsync = arrow.strokeStyle === 'dashed';
      const mode = isAsync ? '⚡ **Async** (Event / Decoupled)' : '🔄 **Sync** (Request / Response)';
      const style = isAsync ? 'Dashed Line' : 'Solid Line';

      lines.push(`| ${sourceName} | ${targetName} | ${protocol} | ${mode} | ${style} |`);
    }
    lines.push(``);
  }

  // 5. Embedded Mermaid.js Diagram
  lines.push(`## 4. Architecture Diagram (Mermaid.js)`);
  lines.push(`\nBelow is the validated Diagram-as-Code definition. You can render this directly in GitHub markdown, Notion, or [Mermaid Live Editor](https://mermaid.live).\n`);
  lines.push('```mermaid');
  lines.push(mermaidDiagram);
  lines.push('```');
  lines.push(``);

  // 6. Architectural Decision Guidelines & Best Practices
  lines.push(`## 5. Architectural Principles & Operational Guidance`);
  lines.push(`\n1. **Zero-Trust Client Ingress:** All browser and mobile traffic must terminate at an API Gateway or Load Balancer. Direct database or cache access from client nodes is strictly forbidden.`);
  lines.push(`2. **Resilience & Rate Dampening:** High fan-in service nodes (>3 upstream callers) must incorporate an asynchronous queue (e.g. Kafka, SQS) or an in-memory caching layer (Redis) to prevent cascade failures.`);
  lines.push(`3. **Transport Encryption:** All ingress and inter-service channels must enforce TLS 1.3 encryption (HTTPS / gRPC with mTLS). Plain HTTP or unencrypted protocols are disallowed in production.`);
  lines.push(`4. **Cost Optimization:** Review baseline monthly allocations periodically against actual cloud utilization metrics.\n`);

  lines.push(`---`);
  lines.push(`*Generated automatically by Architecture Studio.*`);

  return lines.join('\n');
}

/**
 * Escapes characters for clean Markdown table rendering.
 */
function escapeMarkdownCell(text: string): string {
  return text.replace(/\|/g, '\\|').replace(/\n/g, '<br/>').trim();
}

/**
 * Capitalizes a string.
 */
function capitalize(text: string): string {
  if (!text) return '';
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/**
 * Triggers a browser download or native Electron local file save of the generated Markdown file.
 */
export async function downloadMarkdownFile(
  content: string,
  filename: string = 'architecture-specification.md'
): Promise<void> {
  await saveFileLocally(
    filename,
    content,
    [{ name: 'Architecture Decision Record (Markdown)', extensions: ['md'] }]
  );
}

/**
 * Copies text to the system clipboard with robust fallback.
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  if (navigator.clipboard && window.isSecureContext) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch (err) {
      console.warn('navigator.clipboard.writeText failed, falling back to textarea execCommand:', err);
    }
  }

  try {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.left = '-999999px';
    textArea.style.top = '-999999px';
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    const successful = document.execCommand('copy');
    document.body.removeChild(textArea);
    return successful;
  } catch (err) {
    console.error('All clipboard methods failed:', err);
    return false;
  }
}
