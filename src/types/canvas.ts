export type ToolMode =
  | 'select'
  | 'hand'
  | 'pen'
  | 'rectangle'
  | 'rounded_rectangle'
  | 'circle'
  | 'diamond'
  | 'database'
  | 'cloud'
  | 'arrow'
  | 'text'
  | 'eraser';

export type NodeShapeType =
  // Architecture - Client
  | 'browser'
  | 'mobile'
  // Architecture - Gateway
  | 'api-gateway'
  | 'load-balancer'
  | 'cdn'
  // Architecture - Compute
  | 'service'
  | 'serverless'
  // Architecture - Database
  | 'database'
  | 'cache'
  | 'storage'
  // Architecture - Messaging
  | 'queue'
  | 'pubsub'
  // Architecture - Security
  | 'auth'
  | 'firewall'
  // Flowchart & Basic Shapes
  | 'rectangle'
  | 'circle'
  | 'diamond'
  // Containers
  | 'group-container';

export type AnchorPosition = 'top' | 'right' | 'bottom' | 'left';

export interface Point {
  x: number;
  y: number;
}

export type NodeEnvironment = 'production' | 'staging' | 'internal' | 'development';

export interface NodeMetadata {
  techStack?: string;
  port?: string;
  environment?: NodeEnvironment;
  notes?: string;
}

export type NodeDomain = 'frontend' | 'backend' | 'boundary';
export type ViewPerspective = 'all' | 'frontend' | 'backend';

export function getNodeDomain(shape: NodeShapeType, explicitDomain?: NodeDomain): NodeDomain {
  if (explicitDomain) return explicitDomain;
  if (
    shape === 'browser' ||
    shape === 'mobile' ||
    shape === 'rectangle' ||
    shape === 'circle' ||
    shape === 'diamond'
  ) {
    return 'frontend';
  }
  if (shape === 'group-container') {
    return 'boundary';
  }
  return 'backend';
}

export interface NodeElement {
  id: string;
  type: 'node';
  shape: NodeShapeType;
  domain?: NodeDomain;
  x: number;
  y: number;
  width: number;
  height: number;
  label: string;
  subtitle?: string;
  strokeColor: string;
  fillColor: string;
  strokeWidth: number;
  textColor?: string;
  fontSize?: number;
  metadata?: NodeMetadata;
}

export interface FreehandPoint extends Point {
  pressure?: number;
}

export interface FreehandStroke {
  id: string;
  type: 'stroke';
  points: FreehandPoint[];
  color: string;
  strokeWidth: number;
}

export interface ArrowElement {
  id: string;
  type: 'arrow';
  startPoint: Point;
  endPoint: Point;
  startNodeId?: string;
  startAnchor?: AnchorPosition;
  endNodeId?: string;
  endAnchor?: AnchorPosition;
  color: string;
  strokeWidth: number;
  arrowHead?: 'arrow' | 'dot' | 'none';
  label?: string;
  strokeStyle?: 'solid' | 'dashed';
}

export type CanvasElement = NodeElement | FreehandStroke | ArrowElement;

export interface ViewportTransform {
  x: number;
  y: number;
  scale: number;
}

export interface DiagramData {
  version: number;
  timestamp: number;
  nodes: NodeElement[];
  arrows: ArrowElement[];
  strokes: FreehandStroke[];
  viewport?: ViewportTransform;
}
