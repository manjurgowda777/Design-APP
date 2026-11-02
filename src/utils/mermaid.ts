import type { NodeElement, ArrowElement } from '../types/canvas';

/**
 * Sanitizes a node ID for Mermaid.js (must be alphanumeric or underscores)
 */
function sanitizeMermaidId(id: string): string {
  return id.replace(/[^a-zA-Z0-9_]/g, '_');
}

/**
 * Escapes characters that might break Mermaid string literals
 */
function escapeMermaidText(text: string): string {
  return text.replace(/"/g, "'").replace(/\n/g, '<br/>');
}

/**
 * Formats a node with the proper Mermaid shape enclosure:
 * - Cylinder for databases, storage, cache: [( ... )]
 * - Rounded capsule for services, gateways, clients: ([ ... ])
 * - Diamond for decisions: { ... }
 * - Circle for circle states: (( ... ))
 * - Standard rectangle: [ ... ]
 */
function formatNodeShape(shape: string, content: string): string {
  switch (shape) {
    case 'database':
    case 'storage':
    case 'cache':
      return `[("${content}")]`;
    case 'circle':
      return `(("${content}"))`;
    case 'diamond':
      return `{"${content}"}`;
    case 'service':
    case 'serverless':
    case 'api-gateway':
    case 'load-balancer':
    case 'auth':
    case 'browser':
    case 'mobile':
      return `(["${content}"])`;
    default:
      return `["${content}"]`;
  }
}

/**
 * Converts the canvas nodes and arrows into standard Mermaid flowchart syntax.
 */
export function generateMermaidDiagram(
  nodes: NodeElement[],
  arrows: ArrowElement[],
  direction: 'LR' | 'TD' = 'LR'
): string {
  if (nodes.length === 0) {
    return `flowchart ${direction}\n  %% Canvas is currently empty\n`;
  }

  const lines: string[] = [`flowchart ${direction}`];

  // Map to sanitize and look up node IDs
  const idMap = new Map<string, string>();
  nodes.forEach((n) => {
    idMap.set(n.id, sanitizeMermaidId(n.id));
  });

  // Separate boundary containers from regular nodes
  const containerNodes = nodes.filter((n) => n.shape === 'group-container');
  const regularNodes = nodes.filter((n) => n.shape !== 'group-container');

  // Track which regular nodes fall inside containers
  const assignedToContainer = new Set<string>();

  // Process containers as subgraphs
  containerNodes.forEach((container) => {
    const containerId = idMap.get(container.id) || sanitizeMermaidId(container.id);
    const containerTitle = escapeMermaidText(container.label);
    lines.push(`\n  subgraph ${containerId} ["${containerTitle}"]`);
    lines.push(`    style ${containerId} stroke-dasharray: 5 5,fill:#0f172a,stroke:#64748b`);

    // Check which regular nodes fall inside this container
    regularNodes.forEach((child) => {
      const isInside =
        child.x >= container.x &&
        child.y >= container.y &&
        child.x + child.width <= container.x + container.width &&
        child.y + child.height <= container.y + container.height;

      if (isInside) {
        assignedToContainer.add(child.id);
        const childId = idMap.get(child.id) || sanitizeMermaidId(child.id);
        const nodeText = buildNodeLabel(child);
        const nodeDef = formatNodeShape(child.shape, nodeText);
        lines.push(`    ${childId}${nodeDef}`);
      }
    });

    lines.push(`  end`);
  });

  // Process standalone nodes outside containers
  const standaloneNodes = regularNodes.filter((n) => !assignedToContainer.has(n.id));
  if (standaloneNodes.length > 0) {
    lines.push(`\n  %% Architecture Components`);
    standaloneNodes.forEach((node) => {
      const safeId = idMap.get(node.id) || sanitizeMermaidId(node.id);
      const nodeText = buildNodeLabel(node);
      const nodeDef = formatNodeShape(node.shape, nodeText);
      lines.push(`  ${safeId}${nodeDef}`);
    });
  }

  // Process Connections / Arrows
  if (arrows.length > 0) {
    lines.push(`\n  %% Connectors`);
    arrows.forEach((arr) => {
      if (!arr.startNodeId || !arr.endNodeId) return;

      const fromId = idMap.get(arr.startNodeId);
      const toId = idMap.get(arr.endNodeId);
      if (!fromId || !toId) return;

      const isDashed = arr.strokeStyle === 'dashed';
      const arrowLabel = arr.label ? escapeMermaidText(arr.label) : '';

      if (isDashed) {
        if (arrowLabel) {
          lines.push(`  ${fromId} -. "${arrowLabel}" .-> ${toId}`);
        } else {
          lines.push(`  ${fromId} -.-> ${toId}`);
        }
      } else {
        if (arrowLabel) {
          lines.push(`  ${fromId} -->|"${arrowLabel}"| ${toId}`);
        } else {
          lines.push(`  ${fromId} --> ${toId}`);
        }
      }
    });
  }

  // Add subtle modern styling classes
  lines.push(`\n  %% Styling Defaults`);
  lines.push(`  classDef default fill:#1e293b,stroke:#38bdf8,stroke-width:1.5px,color:#f8fafc`);

  return lines.join('\n');
}

/**
 * Helper to build the visual text content for a Mermaid node
 */
function buildNodeLabel(node: NodeElement): string {
  const parts: string[] = [escapeMermaidText(node.label)];

  // Add subtitle or port if available
  const subParts: string[] = [];
  if (node.subtitle) {
    subParts.push(escapeMermaidText(node.subtitle));
  }
  if (node.metadata?.port) {
    subParts.push(escapeMermaidText(node.metadata.port));
  }

  if (subParts.length > 0) {
    parts.push(`<small>${subParts.join(' • ')}</small>`);
  }

  return parts.join('<br/>');
}
