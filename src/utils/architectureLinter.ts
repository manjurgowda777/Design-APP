import type { NodeElement, ArrowElement } from '../types/canvas';

export type LintSeverity = 'critical' | 'warning' | 'notice' | 'passed';

export interface LintIssue {
  id: string;
  severity: LintSeverity;
  title: string;
  description: string;
  recommendation: string;
  nodeIds: string[];
  arrowIds?: string[];
}

export interface ArchitectureAuditReport {
  healthScore: number;
  criticalCount: number;
  warningCount: number;
  noticeCount: number;
  passedCount: number;
  issues: LintIssue[];
  passedChecks: { id: string; title: string; description: string }[];
}

/**
 * Runs architectural graph linting rules against nodes and arrows.
 */
export function auditArchitectureGraph(
  nodes: NodeElement[],
  arrows: ArrowElement[]
): ArchitectureAuditReport {
  const issues: LintIssue[] = [];
  const passedChecks: { id: string; title: string; description: string }[] = [];

  const nodesMap = new Map<string, NodeElement>();
  nodes.forEach((n) => nodesMap.set(n.id, n));

  // Build adjacency graph for fast queries
  const incomingMap = new Map<string, ArrowElement[]>();
  const outgoingMap = new Map<string, ArrowElement[]>();

  nodes.forEach((n) => {
    incomingMap.set(n.id, []);
    outgoingMap.set(n.id, []);
  });

  arrows.forEach((arr) => {
    if (arr.startNodeId && outgoingMap.has(arr.startNodeId)) {
      outgoingMap.get(arr.startNodeId)!.push(arr);
    }
    if (arr.endNodeId && incomingMap.has(arr.endNodeId)) {
      incomingMap.get(arr.endNodeId)!.push(arr);
    }
  });

  // -------------------------------------------------------------
  // Rule 1: CRITICAL - Direct Client-to-Database Exposure
  // Flag if 'browser' or 'mobile' connects directly to 'database' or 'cache'
  // -------------------------------------------------------------
  const clientShapes = new Set(['browser', 'mobile']);
  const dataShapes = new Set(['database', 'cache']);
  let hasClientDbExposure = false;

  arrows.forEach((arr) => {
    if (arr.startNodeId && arr.endNodeId) {
      const source = nodesMap.get(arr.startNodeId);
      const target = nodesMap.get(arr.endNodeId);

      if (source && target) {
        if (clientShapes.has(source.shape) && dataShapes.has(target.shape)) {
          hasClientDbExposure = true;
          issues.push({
            id: `direct-client-db-${arr.id}`,
            severity: 'critical',
            title: `Direct Client Exposure to ${target.label}`,
            description: `${source.label} (${source.subtitle || 'Client'}) connects directly to ${target.label} (${target.shape.toUpperCase()}), bypassing API security boundaries.`,
            recommendation: 'Place an API Gateway or backend service between clients and data stores to enforce JWT authentication, rate limiting, and input sanitization.',
            nodeIds: [source.id, target.id],
            arrowIds: [arr.id],
          });
        }
      }
    }
  });

  if (!hasClientDbExposure && nodes.length > 0) {
    passedChecks.push({
      id: 'pass-client-db-isolation',
      title: 'Database Perimeter Isolation',
      description: 'Zero public clients are exposed directly to transactional databases or internal caches.',
    });
  }

  // -------------------------------------------------------------
  // Rule 2: WARNING - Orphan Components
  // Flag components with 0 incoming AND 0 outgoing connections
  // (ignore group-container VPC boundaries)
  // -------------------------------------------------------------
  let orphanCount = 0;
  nodes.forEach((node) => {
    if (node.shape === 'group-container') return;

    const incoming = incomingMap.get(node.id) || [];
    const outgoing = outgoingMap.get(node.id) || [];

    if (incoming.length === 0 && outgoing.length === 0) {
      orphanCount++;
      issues.push({
        id: `orphan-node-${node.id}`,
        severity: 'warning',
        title: `Disconnected Component: ${node.label}`,
        description: `This ${node.shape.toUpperCase()} has no incoming or outgoing connections in the topology graph.`,
        recommendation: 'Connect this component with an arrow to integrated services, or delete it if no longer needed.',
        nodeIds: [node.id],
      });
    }
  });

  if (orphanCount === 0 && nodes.length > 0) {
    passedChecks.push({
      id: 'pass-no-orphans',
      title: 'Fully Integrated Graph',
      description: 'All services and data nodes are interconnected in the workflow pipeline.',
    });
  }

  // -------------------------------------------------------------
  // Rule 3: WARNING - Single Point of Failure (SPOF)
  // Flag service nodes with >3 incoming arrows without an attached cache or queue
  // -------------------------------------------------------------
  let spofDetected = false;
  nodes.forEach((node) => {
    if (node.shape === 'service' || node.shape === 'serverless') {
      const incoming = incomingMap.get(node.id) || [];
      const outgoing = outgoingMap.get(node.id) || [];

      if (incoming.length > 3) {
        // Check if connected to a cache or queue downstream or upstream
        const connectedShapes = [
          ...incoming.map((a) => nodesMap.get(a.startNodeId || '')?.shape),
          ...outgoing.map((a) => nodesMap.get(a.endNodeId || '')?.shape),
        ];

        const hasBufferOrCache = connectedShapes.some(
          (s) => s === 'cache' || s === 'queue' || s === 'pubsub'
        );

        if (!hasBufferOrCache) {
          spofDetected = true;
          issues.push({
            id: `spof-high-fanin-${node.id}`,
            severity: 'warning',
            title: `Potential Bottleneck / SPOF: ${node.label}`,
            description: `${node.label} handles ${incoming.length} incoming connections without a distributed queue or caching layer.`,
            recommendation: 'Introduce a Redis cache for idempotent responses or an asynchronous Kafka/RabbitMQ queue to decouple burst traffic.',
            nodeIds: [node.id],
          });
        }
      }
    }
  });

  if (!spofDetected && nodes.length > 0) {
    passedChecks.push({
      id: 'pass-fanin-resilience',
      title: 'High-Fan-in Resiliency',
      description: 'High-throughput nodes utilize caching and event streams to buffer peak traffic loads.',
    });
  }

  // -------------------------------------------------------------
  // Rule 4: NOTICE - Insecure Protocol or Missing Gateway Ports
  // Flag if unencrypted protocol (HTTP, :80) or missing port is on Gateway
  // -------------------------------------------------------------
  let insecureIngressDetected = false;
  nodes.forEach((node) => {
    if (node.shape === 'api-gateway' || node.shape === 'load-balancer') {
      const port = node.metadata?.port;
      if (!port) {
        insecureIngressDetected = true;
        issues.push({
          id: `missing-port-${node.id}`,
          severity: 'notice',
          title: `Undefined Port on Ingress: ${node.label}`,
          description: `${node.label} has no configured ingress port or protocol in its technical metadata.`,
          recommendation: 'Configure port "443 / HTTPS" in the Inspector Drawer to document TLS encryption.',
          nodeIds: [node.id],
        });
      } else if (port.includes('80 ') || port.toLowerCase().includes('http /')) {
        insecureIngressDetected = true;
        issues.push({
          id: `unencrypted-http-${node.id}`,
          severity: 'notice',
          title: `Unencrypted HTTP Ingress: ${node.label}`,
          description: `${node.label} specifies unencrypted HTTP on port "${port}".`,
          recommendation: 'Upgrade to port "443 / HTTPS" to enforce end-to-end transport encryption.',
          nodeIds: [node.id],
        });
      }
    }
  });

  if (!insecureIngressDetected && nodes.some((n) => n.shape === 'api-gateway' || n.shape === 'load-balancer')) {
    passedChecks.push({
      id: 'pass-tls-enforced',
      title: 'Transport Encryption Enforced',
      description: 'All ingress gateways have documented HTTPS/TLS ports and termination.',
    });
  }

  // -------------------------------------------------------------
  // Calculate Health Score (0 - 100%)
  // -------------------------------------------------------------
  let penalty = 0;
  let criticalCount = 0;
  let warningCount = 0;
  let noticeCount = 0;

  issues.forEach((iss) => {
    if (iss.severity === 'critical') {
      penalty += 30;
      criticalCount++;
    } else if (iss.severity === 'warning') {
      penalty += 12;
      warningCount++;
    } else if (iss.severity === 'notice') {
      penalty += 4;
      noticeCount++;
    }
  });

  const healthScore = Math.max(0, Math.min(100, Math.round(100 - penalty)));

  return {
    healthScore,
    criticalCount,
    warningCount,
    noticeCount,
    passedCount: passedChecks.length,
    issues,
    passedChecks,
  };
}
