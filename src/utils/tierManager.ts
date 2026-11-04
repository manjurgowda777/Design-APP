/**
 * User Tier Gate & Feature Flag Manager
 * Manages Free vs Pro tier permissions and features.
 */

export type UserTier = 'free' | 'pro';

export type ProFeature =
  | 'export-spec'
  | 'export-4k'
  | 'cloud-cost'
  | 'cloud-templates';

export interface ProFeatureInfo {
  id: ProFeature;
  title: string;
  tagline: string;
  description: string;
  iconName: 'file-text' | 'image' | 'dollar-sign' | 'layout-template';
}

export const PRO_FEATURES_CATALOG: Record<ProFeature, ProFeatureInfo> = {
  'export-spec': {
    id: 'export-spec',
    title: 'Architecture Decision Record (ADR / Markdown)',
    tagline: 'Export documentation-ready Markdown architecture specifications',
    description:
      'Generate comprehensive system inventory tables, communication protocols, cost metrics, and embedded Mermaid.js diagrams ready for GitHub and Notion.',
    iconName: 'file-text',
  },
  'export-4k': {
    id: 'export-4k',
    title: '4K Ultra HD & Vector PDF Export',
    tagline: 'Crystal-clear exports for executive presentations and printing',
    description:
      'Export high-dpi raster renders up to 4096px wide and print-ready vector PDF documents without loss of quality.',
    iconName: 'image',
  },
  'cloud-cost': {
    id: 'cloud-cost',
    title: 'Live Cloud Cost Estimation Suite',
    tagline: 'Real-time AWS, GCP & Azure monthly infrastructure pricing',
    description:
      'Live category cost breakdowns (Compute, Storage, Networking, Gateways), itemized component summaries, and budget forecasting as you draw.',
    iconName: 'dollar-sign',
  },
  'cloud-templates': {
    id: 'cloud-templates',
    title: 'Pre-built Cloud Blueprint Starters',
    tagline: 'Enterprise reference architectures with a single click',
    description:
      'Instantly spawn production-grade blueprints including 3-Tier Web Apps, Event-Driven Microservices with Kafka, and AI/ML RAG Inference Pipelines.',
    iconName: 'layout-template',
  },
};

export const TIER_PERMISSIONS = {
  free: {
    unlimitedDrawing: true,
    allNodeTypes: true,
    basicPngSvgJson: true,
    byokAiGenerator: true,
    architectureAudit: true,
    cloudCostBreakdown: true,
    exportSpecMarkdown: true,
    cloudTemplates: true,
    export4kPdf: true,
  },
  pro: {
    unlimitedDrawing: true,
    allNodeTypes: true,
    basicPngSvgJson: true,
    byokAiGenerator: true,
    architectureAudit: true,
    cloudCostBreakdown: true,
    exportSpecMarkdown: true,
    cloudTemplates: true,
    export4kPdf: true,
  },
} as const;

const TIER_STORAGE_KEY = 'architecture_user_tier_v1';

/**
 * Returns current user tier. All features are fully unlocked ('pro').
 */
export function getUserTier(): UserTier {
  return 'pro';
}

/**
 * Persists the user tier in localStorage.
 */
export function setUserTier(tier: UserTier): void {
  try {
    localStorage.setItem(TIER_STORAGE_KEY, tier);
  } catch (e) {
    console.warn('Failed to save user tier to storage', e);
  }
}

/**
 * Evaluates whether the user's tier has access to a specific gated feature.
 * All features are 100% unlocked and accessible.
 */
export function hasFeatureAccess(_tier: UserTier, _feature: ProFeature): boolean {
  return true;
}
