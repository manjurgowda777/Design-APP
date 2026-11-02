import type { NodeElement, NodeShapeType } from '../types/canvas';

export interface ComponentCostItem {
  nodeId: string;
  label: string;
  shape: NodeShapeType;
  category: 'compute' | 'database' | 'networking' | 'messaging' | 'free';
  monthlyCost: number;
}

export interface CostCategorySummary {
  category: 'compute' | 'database' | 'networking' | 'messaging';
  label: string;
  totalMonthly: number;
  itemCount: number;
  color: string;
}

export interface ArchitectureCostEstimate {
  totalMonthlyCost: number;
  categories: CostCategorySummary[];
  items: ComponentCostItem[];
}

export const BASE_MONTHLY_RATES: Record<string, { cost: number; category: ComponentCostItem['category'] }> = {
  // Database & Storage
  database: { cost: 25.0, category: 'database' },
  cache: { cost: 15.0, category: 'database' },
  storage: { cost: 5.0, category: 'database' },

  // Compute
  service: { cost: 12.0, category: 'compute' },
  serverless: { cost: 0.2, category: 'compute' }, // Pay-per-invocation serverless base

  // Networking & Gateways
  'api-gateway': { cost: 10.0, category: 'networking' },
  'load-balancer': { cost: 10.0, category: 'networking' },
  cdn: { cost: 8.0, category: 'networking' },
  auth: { cost: 10.0, category: 'networking' },
  firewall: { cost: 15.0, category: 'networking' },

  // Messaging & Streaming
  queue: { cost: 8.0, category: 'messaging' },
  pubsub: { cost: 8.0, category: 'messaging' },

  // Free / Client / Containers / Flowchart
  browser: { cost: 0.0, category: 'free' },
  mobile: { cost: 0.0, category: 'free' },
  'group-container': { cost: 0.0, category: 'free' },
  rectangle: { cost: 0.0, category: 'free' },
  circle: { cost: 0.0, category: 'free' },
  diamond: { cost: 0.0, category: 'free' },
};

/**
 * Calculates estimated monthly cloud costs for the given active nodes.
 */
export function estimateArchitectureCost(nodes: NodeElement[]): ArchitectureCostEstimate {
  const items: ComponentCostItem[] = [];
  let totalMonthlyCost = 0;

  const categoryTotals: Record<'compute' | 'database' | 'networking' | 'messaging', { total: number; count: number }> = {
    compute: { total: 0, count: 0 },
    database: { total: 0, count: 0 },
    networking: { total: 0, count: 0 },
    messaging: { total: 0, count: 0 },
  };

  for (const node of nodes) {
    const rateInfo = BASE_MONTHLY_RATES[node.shape] || { cost: 0, category: 'free' };
    const cost = rateInfo.cost;
    totalMonthlyCost += cost;

    items.push({
      nodeId: node.id,
      label: node.label,
      shape: node.shape,
      category: rateInfo.category,
      monthlyCost: cost,
    });

    if (rateInfo.category !== 'free') {
      categoryTotals[rateInfo.category].total += cost;
      categoryTotals[rateInfo.category].count += 1;
    }
  }

  const categories: CostCategorySummary[] = [
    {
      category: 'compute',
      label: 'Compute & Execution',
      totalMonthly: Math.round(categoryTotals.compute.total * 100) / 100,
      itemCount: categoryTotals.compute.count,
      color: '#818cf8',
    },
    {
      category: 'database',
      label: 'Databases & In-Memory Caches',
      totalMonthly: Math.round(categoryTotals.database.total * 100) / 100,
      itemCount: categoryTotals.database.count,
      color: '#10b981',
    },
    {
      category: 'networking',
      label: 'Gateways, Load Balancers & Ingress',
      totalMonthly: Math.round(categoryTotals.networking.total * 100) / 100,
      itemCount: categoryTotals.networking.count,
      color: '#38bdf8',
    },
    {
      category: 'messaging',
      label: 'Event Streaming & Task Queues',
      totalMonthly: Math.round(categoryTotals.messaging.total * 100) / 100,
      itemCount: categoryTotals.messaging.count,
      color: '#f59e0b',
    },
  ];

  return {
    totalMonthlyCost: Math.round(totalMonthlyCost * 100) / 100,
    categories,
    items,
  };
}
