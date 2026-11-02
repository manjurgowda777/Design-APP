import type { NodeElement, ArrowElement, Point, ViewportTransform } from '../types/canvas';

export interface WalkthroughStep {
  id: string;
  stepNumber: number;
  targetId: string;
  targetType: 'node' | 'arrow';
  title: string;
  subtitle?: string;
  categoryTag: string;
  description: string;
  techStack?: string;
  port?: string;
  environment?: string;
  notes?: string;
  focusPoint: Point;
  targetBounds: { x: number; y: number; width: number; height: number };
}

/**
 * Returns tier rank for automatic flow ordering:
 * 0: Client (Browser / Mobile)
 * 1: Gateway / Ingress (API Gateway / Load Balancer / CDN / Auth)
 * 2: Compute / Services (Service / Serverless)
 * 3: Messaging / Streaming (Queue / PubSub)
 * 4: Storage & Caching (Cache / Database / Storage)
 * 5: Other components
 */
function getNodeTier(shape: string): number {
  switch (shape) {
    case 'browser':
    case 'mobile':
      return 0;
    case 'api-gateway':
    case 'load-balancer':
    case 'cdn':
    case 'firewall':
    case 'auth':
      return 1;
    case 'service':
    case 'serverless':
      return 2;
    case 'queue':
    case 'pubsub':
      return 3;
    case 'cache':
    case 'database':
    case 'storage':
      return 4;
    default:
      return 5;
  }
}

/**
 * Generates an intuitive narrative description for a given architecture node.
 */
function generateNodeNarrative(node: NodeElement): { subtitle: string; categoryTag: string; description: string } {
  const tier = getNodeTier(node.shape);
  const tech = node.metadata?.techStack;
  const notes = node.metadata?.notes;

  if (notes) {
    return {
      subtitle: node.subtitle || node.shape.toUpperCase(),
      categoryTag: tier === 0 ? 'Client Tier' : tier === 1 ? 'Ingress Gateway' : tier === 2 ? 'Compute Service' : tier === 3 ? 'Event Transport' : 'Data Tier',
      description: notes,
    };
  }

  switch (tier) {
    case 0:
      return {
        subtitle: node.subtitle || 'CLIENT APPLICATION',
        categoryTag: 'Client Ingress',
        description: `User interaction triggers frontend request dispatch via ${tech || 'web / mobile interface'}.`,
      };
    case 1:
      return {
        subtitle: node.subtitle || 'INGRESS GATEWAY',
        categoryTag: 'API Gateway & Routing',
        description: `Terminates TLS, validates incoming credentials, applies rate limiting, and routes traffic to internal microservices.`,
      };
    case 2:
      return {
        subtitle: node.subtitle || 'COMPUTE SERVICE',
        categoryTag: 'Business Logic Execution',
        description: `Executes core domain operations, orchestrates downstream RPC calls, and enforces business validation.`,
      };
    case 3:
      return {
        subtitle: node.subtitle || 'ASYNCHRONOUS PIPELINE',
        categoryTag: 'Event Streaming & Queues',
        description: `Buffers messages for asynchronous processing, dampening peak load spikes and decoupling microservice dependencies.`,
      };
    case 4:
      return {
        subtitle: node.subtitle || 'PERSISTENCE TIER',
        categoryTag: 'Data & State Management',
        description: node.shape === 'cache'
          ? `Serves ultra-low latency cached key-value queries and offloads read pressure from primary databases.`
          : `Ensures ACID transaction durability, data consistency, and long-term storage of business entity records.`,
      };
    default:
      return {
        subtitle: node.subtitle || 'SYSTEM COMPONENT',
        categoryTag: 'Architecture Element',
        description: `Core component participating in the end-to-end request lifecycle and system state.`,
      };
  }
}

/**
 * Generates narrative description for connection arrows in the flow.
 */
function generateArrowNarrative(arrow: ArrowElement, startNode?: NodeElement, endNode?: NodeElement): {
  title: string;
  subtitle: string;
  categoryTag: string;
  description: string;
} {
  const label = arrow.label || (arrow.strokeStyle === 'dashed' ? 'Async Event' : 'HTTP/gRPC Call');
  const isAsync = arrow.strokeStyle === 'dashed';

  const fromName = startNode?.label || 'Source Component';
  const toName = endNode?.label || 'Target Component';

  return {
    title: label,
    subtitle: isAsync ? 'ASYNC DISPATCH' : 'SYNC REQUEST',
    categoryTag: isAsync ? 'Event Publishing' : 'Network Transit',
    description: isAsync
      ? `Asynchronous event dispatched from "${fromName}" to "${toName}". Decoupled message execution without blocking.`
      : `Synchronous request forwarded from "${fromName}" to "${toName}" using ${label}.`,
  };
}

/**
 * Calculates midpoint and bounding box for an arrow.
 */
function getArrowMetrics(
  arrow: ArrowElement,
  nodeMap: Map<string, NodeElement>
): { focusPoint: Point; bounds: { x: number; y: number; width: number; height: number } } {
  let startX = arrow.startPoint.x;
  let startY = arrow.startPoint.y;
  let endX = arrow.endPoint.x;
  let endY = arrow.endPoint.y;

  if (arrow.startNodeId && nodeMap.has(arrow.startNodeId)) {
    const sNode = nodeMap.get(arrow.startNodeId)!;
    startX = sNode.x + sNode.width / 2;
    startY = sNode.y + sNode.height / 2;
  }

  if (arrow.endNodeId && nodeMap.has(arrow.endNodeId)) {
    const eNode = nodeMap.get(arrow.endNodeId)!;
    endX = eNode.x + eNode.width / 2;
    endY = eNode.y + eNode.height / 2;
  }

  const midX = Math.round((startX + endX) / 2);
  const midY = Math.round((startY + endY) / 2);
  const minX = Math.min(startX, endX);
  const minY = Math.min(startY, endY);
  const width = Math.max(Math.abs(endX - startX), 100);
  const height = Math.max(Math.abs(endY - startY), 60);

  return {
    focusPoint: { x: midX, y: midY },
    bounds: { x: minX, y: minY, width, height },
  };
}

/**
 * Automatically infers an end-to-end request sequence across the architecture graph:
 * Client -> Gateway -> Service -> Database/Queue -> etc.
 */
export function inferWalkthroughSequence(
  nodes: NodeElement[],
  arrows: ArrowElement[]
): WalkthroughStep[] {
  // Exclude group boundaries from individual presentation steps
  const regularNodes = nodes.filter((n) => n.shape !== 'group-container');
  if (regularNodes.length === 0) return [];

  const nodeMap = new Map<string, NodeElement>();
  regularNodes.forEach((n) => nodeMap.set(n.id, n));

  // Build adjacency
  const outgoingArrows = new Map<string, ArrowElement[]>();
  const incomingCount = new Map<string, number>();

  regularNodes.forEach((n) => {
    outgoingArrows.set(n.id, []);
    incomingCount.set(n.id, 0);
  });

  arrows.forEach((a) => {
    if (a.startNodeId && a.endNodeId && nodeMap.has(a.startNodeId) && nodeMap.has(a.endNodeId)) {
      outgoingArrows.get(a.startNodeId)?.push(a);
      incomingCount.set(a.endNodeId, (incomingCount.get(a.endNodeId) || 0) + 1);
    }
  });

  // Identify root starting nodes (prefer clients, then in-degree 0)
  const clientRoots = regularNodes.filter((n) => n.shape === 'browser' || n.shape === 'mobile');
  const zeroInRoots = regularNodes.filter((n) => (incomingCount.get(n.id) || 0) === 0);

  let startNodes: NodeElement[] = [];
  if (clientRoots.length > 0) {
    startNodes = [...clientRoots].sort((a, b) => a.x - b.x);
  } else if (zeroInRoots.length > 0) {
    startNodes = [...zeroInRoots].sort((a, b) => a.x - b.x);
  } else {
    // If cyclic, sort by tier then X
    startNodes = [...regularNodes].sort((a, b) => {
      const tierDiff = getNodeTier(a.shape) - getNodeTier(b.shape);
      if (tierDiff !== 0) return tierDiff;
      return a.x - b.x;
    });
  }

  const steps: WalkthroughStep[] = [];
  const visitedNodeIds = new Set<string>();
  const visitedArrowIds = new Set<string>();

  let stepCounter = 1;

  // BFS / DFS queue with root exploration
  const queue: string[] = startNodes.map((n) => n.id);

  while (queue.length > 0) {
    const currentId = queue.shift()!;
    if (visitedNodeIds.has(currentId)) continue;
    visitedNodeIds.add(currentId);

    const currentNode = nodeMap.get(currentId);
    if (!currentNode) continue;

    // Add node step
    const narrative = generateNodeNarrative(currentNode);
    steps.push({
      id: `step-${stepCounter}-${currentNode.id}`,
      stepNumber: stepCounter++,
      targetId: currentNode.id,
      targetType: 'node',
      title: currentNode.label,
      subtitle: narrative.subtitle,
      categoryTag: narrative.categoryTag,
      description: narrative.description,
      techStack: currentNode.metadata?.techStack,
      port: currentNode.metadata?.port,
      environment: currentNode.metadata?.environment,
      notes: currentNode.metadata?.notes,
      focusPoint: {
        x: Math.round(currentNode.x + currentNode.width / 2),
        y: Math.round(currentNode.y + currentNode.height / 2),
      },
      targetBounds: {
        x: currentNode.x,
        y: currentNode.y,
        width: currentNode.width,
        height: currentNode.height,
      },
    });

    // Check outgoing arrows
    const outArrows = outgoingArrows.get(currentId) || [];
    // Sort arrows left to right or top to bottom
    outArrows.sort((a, b) => {
      const nodeA = a.endNodeId ? nodeMap.get(a.endNodeId) : null;
      const nodeB = b.endNodeId ? nodeMap.get(b.endNodeId) : null;
      if (nodeA && nodeB) {
        return nodeA.x - nodeB.x;
      }
      return 0;
    });

    for (const arrow of outArrows) {
      if (!arrow.endNodeId || !nodeMap.has(arrow.endNodeId)) continue;

      if (!visitedArrowIds.has(arrow.id)) {
        visitedArrowIds.add(arrow.id);
        const targetNode = nodeMap.get(arrow.endNodeId);
        const arrowNarrative = generateArrowNarrative(arrow, currentNode, targetNode);
        const metrics = getArrowMetrics(arrow, nodeMap);

        // Add arrow transition step
        steps.push({
          id: `step-${stepCounter}-${arrow.id}`,
          stepNumber: stepCounter++,
          targetId: arrow.id,
          targetType: 'arrow',
          title: arrowNarrative.title,
          subtitle: arrowNarrative.subtitle,
          categoryTag: arrowNarrative.categoryTag,
          description: arrowNarrative.description,
          focusPoint: metrics.focusPoint,
          targetBounds: metrics.bounds,
        });
      }

      if (!visitedNodeIds.has(arrow.endNodeId)) {
        queue.push(arrow.endNodeId);
      }
    }
  }

  // If any regular nodes were disconnected or missed, append them sorted by tier
  const remainingNodes = regularNodes.filter((n) => !visitedNodeIds.has(n.id));
  remainingNodes.sort((a, b) => {
    const tierDiff = getNodeTier(a.shape) - getNodeTier(b.shape);
    if (tierDiff !== 0) return tierDiff;
    return a.x - b.x;
  });

  for (const node of remainingNodes) {
    visitedNodeIds.add(node.id);
    const narrative = generateNodeNarrative(node);
    steps.push({
      id: `step-${stepCounter}-${node.id}`,
      stepNumber: stepCounter++,
      targetId: node.id,
      targetType: 'node',
      title: node.label,
      subtitle: narrative.subtitle,
      categoryTag: narrative.categoryTag,
      description: narrative.description,
      techStack: node.metadata?.techStack,
      port: node.metadata?.port,
      environment: node.metadata?.environment,
      notes: node.metadata?.notes,
      focusPoint: {
        x: Math.round(node.x + node.width / 2),
        y: Math.round(node.y + node.height / 2),
      },
      targetBounds: {
        x: node.x,
        y: node.y,
        width: node.width,
        height: node.height,
      },
    });
  }

  return steps;
}

/**
 * Calculates optimal viewport pan (x, y) and zoom scale to frame a walkthrough step cleanly.
 */
export function calculateStepViewport(
  step: WalkthroughStep,
  windowWidth: number,
  windowHeight: number
): ViewportTransform {
  // Comfortable zoom for focused component
  const targetZoom = step.targetType === 'arrow' ? 1.05 : 1.15;

  // Offset focus slightly upwards so bottom presentation bar never obscures the component
  const verticalOffset = -60;

  const targetX = Math.round(windowWidth / 2 - step.focusPoint.x * targetZoom);
  const targetY = Math.round(windowHeight / 2 - (step.focusPoint.y + verticalOffset) * targetZoom);

  return {
    x: targetX,
    y: targetY,
    scale: targetZoom,
  };
}
