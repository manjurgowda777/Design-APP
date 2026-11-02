import type { Point, AnchorPosition, NodeElement, ViewportTransform } from '../types/canvas';

/**
 * Convert screen coordinates (client/viewport pixels) to canvas virtual coordinates
 */
export function screenToCanvas(
  screenPoint: Point,
  viewport: ViewportTransform
): Point {
  return {
    x: (screenPoint.x - viewport.x) / viewport.scale,
    y: (screenPoint.y - viewport.y) / viewport.scale,
  };
}

/**
 * Convert canvas virtual coordinates to screen coordinates
 */
export function canvasToScreen(
  canvasPoint: Point,
  viewport: ViewportTransform
): Point {
  return {
    x: canvasPoint.x * viewport.scale + viewport.x,
    y: canvasPoint.y * viewport.scale + viewport.y,
  };
}

/**
 * Calculate connection anchor points (top, right, bottom, left) for any node or shape
 */
export function getNodeAnchors(node: NodeElement): Record<AnchorPosition, Point> {
  const { x, y, width, height, shape } = node;

  if (shape === 'circle') {
    const radius = Math.min(width, height) / 2;
    const centerX = x + width / 2;
    const centerY = y + height / 2;
    return {
      top:    { x: centerX, y: centerY - radius },
      right:  { x: centerX + radius, y: centerY },
      bottom: { x: centerX, y: centerY + radius },
      left:   { x: centerX - radius, y: centerY },
    };
  }

  if (shape === 'diamond') {
    const centerX = x + width / 2;
    const centerY = y + height / 2;
    return {
      top:    { x: centerX, y },
      right:  { x: x + width, y: centerY },
      bottom: { x: centerX, y: y + height },
      left:   { x, y: centerY },
    };
  }

  // Gateways (Inverted Trapezoid / Funnel)
  if (shape === 'api-gateway' || shape === 'load-balancer') {
    const inset = Math.min(22, width * 0.14);
    const centerX = x + width / 2;
    const centerY = y + height / 2;
    return {
      top:    { x: centerX, y },
      right:  { x: x + width - inset / 2, y: centerY },
      bottom: { x: centerX, y: y + height },
      left:   { x: x + inset / 2, y: centerY },
    };
  }

  // Serverless / Lambda (Hexagon)
  if (shape === 'serverless') {
    const centerX = x + width / 2;
    const centerY = y + height / 2;
    return {
      top:    { x: centerX, y },
      right:  { x: x + width, y: centerY },
      bottom: { x: centerX, y: y + height },
      left:   { x, y: centerY },
    };
  }

  // Database & Cache (3D Cylinder)
  if (shape === 'database' || shape === 'cache') {
    const centerX = x + width / 2;
    const centerY = y + height / 2;
    return {
      top:    { x: centerX, y },
      right:  { x: x + width, y: centerY },
      bottom: { x: centerX, y: y + height },
      left:   { x, y: centerY },
    };
  }

  // Queue & Pub/Sub (Capsule / Pipe)
  if (shape === 'queue' || shape === 'pubsub') {
    const centerX = x + width / 2;
    const centerY = y + height / 2;
    return {
      top:    { x: centerX, y },
      right:  { x: x + width, y: centerY },
      bottom: { x: centerX, y: y + height },
      left:   { x, y: centerY },
    };
  }

  return {
    top:    { x: x + width / 2, y },
    right:  { x: x + width, y: y + height / 2 },
    bottom: { x: x + width / 2, y: y + height },
    left:   { x, y: y + height / 2 },
  };
}

/**
 * Returns the specific anchor point coordinate for a given node and anchor side
 */
export function getNodeAnchorPoint(node: NodeElement, anchor: AnchorPosition): Point {
  return getNodeAnchors(node)[anchor];
}

/** Alias for getNodeAnchorPoint */
export const getAnchorPoint = getNodeAnchorPoint;

/** Euclidean distance between two points */
export function distance(p1: Point, p2: Point): number {
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  return Math.sqrt(dx * dx + dy * dy);
}

/** Clamp a number between min and max */
export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

// ─────────────────────────────────────────────────────────────────────────────
// Snap-to-Grid
// ─────────────────────────────────────────────────────────────────────────────

export const GRID_SIZE = 16;

/**
 * Snap a single coordinate to the nearest multiple of gridSize
 */
export function snapToGrid(value: number, gridSize: number = GRID_SIZE): number {
  return Math.round(value / gridSize) * gridSize;
}

// ─────────────────────────────────────────────────────────────────────────────
// Smart Guide Lines
// ─────────────────────────────────────────────────────────────────────────────

export interface GuideLine {
  /** 'h' = horizontal (fixed y), 'v' = vertical (fixed x) */
  axis: 'h' | 'v';
  /** The coordinate value (y for 'h', x for 'v') */
  position: number;
  kind: 'center' | 'edge';
}

const SNAP_THRESHOLD = 8; // virtual-pixel tolerance for snapping

/**
 * Given the node being dragged and all other nodes, returns:
 *  - snappedX / snappedY — the position after snapping to an alignment
 *  - guides — the guide lines to render while dragging
 */
export function computeSmartGuides(
  dragged: NodeElement,
  others: NodeElement[]
): { snappedX: number; snappedY: number; guides: GuideLine[] } {
  const { x, y, width, height } = dragged;

  const dLeft    = x;
  const dRight   = x + width;
  const dCenterX = x + width / 2;
  const dTop     = y;
  const dBottom  = y + height;
  const dCenterY = y + height / 2;

  let snappedX = x;
  let snappedY = y;
  const guides: GuideLine[] = [];

  for (const other of others) {
    if (other.id === dragged.id) continue;

    const oLeft    = other.x;
    const oRight   = other.x + other.width;
    const oCenterX = other.x + other.width / 2;
    const oTop     = other.y;
    const oBottom  = other.y + other.height;
    const oCenterY = other.y + other.height / 2;

    // ── Vertical guides (x-axis) ──
    const vCandidates = [
      { draggRef: dLeft,    ref: oLeft,    pos: oLeft,    kind: 'edge'   as const },
      { draggRef: dLeft,    ref: oRight,   pos: oRight,   kind: 'edge'   as const },
      { draggRef: dRight,   ref: oLeft,    pos: oLeft,    kind: 'edge'   as const },
      { draggRef: dRight,   ref: oRight,   pos: oRight,   kind: 'edge'   as const },
      { draggRef: dCenterX, ref: oCenterX, pos: oCenterX, kind: 'center' as const },
    ];

    for (const c of vCandidates) {
      const diff = c.draggRef - c.ref;
      if (Math.abs(diff) < SNAP_THRESHOLD) {
        snappedX = x - diff;
        guides.push({ axis: 'v', position: c.pos, kind: c.kind });
        break;
      }
    }

    // ── Horizontal guides (y-axis) ──
    const hCandidates = [
      { draggRef: dTop,     ref: oTop,     pos: oTop,     kind: 'edge'   as const },
      { draggRef: dTop,     ref: oBottom,  pos: oBottom,  kind: 'edge'   as const },
      { draggRef: dBottom,  ref: oTop,     pos: oTop,     kind: 'edge'   as const },
      { draggRef: dBottom,  ref: oBottom,  pos: oBottom,  kind: 'edge'   as const },
      { draggRef: dCenterY, ref: oCenterY, pos: oCenterY, kind: 'center' as const },
    ];

    for (const c of hCandidates) {
      const diff = c.draggRef - c.ref;
      if (Math.abs(diff) < SNAP_THRESHOLD) {
        snappedY = y - diff;
        guides.push({ axis: 'h', position: c.pos, kind: c.kind });
        break;
      }
    }
  }

  return { snappedX, snappedY, guides };
}

// ─────────────────────────────────────────────────────────────────────────────
// Orthogonal (Elbow) Arrow Path
// ─────────────────────────────────────────────────────────────────────────────

const ELBOW_STUB = 28;   // initial stub length out of the anchor
const CORNER_R   = 8;    // corner radius for the rounded elbow

/**
 * Build a rounded-corner orthogonal (elbow) SVG path string between two anchor points.
 * The path exits the source anchor straight, turns 90°, runs orthogonally, turns again,
 * and arrives at the destination anchor straight.
 * All turns are rounded with a small arc (corner radius).
 */
export function buildOrthogonalPath(
  start: Point,
  startAnchor: AnchorPosition | undefined,
  end: Point,
  endAnchor: AnchorPosition | undefined
): { pathString: string; angle: number; midPoint: Point } {
  // Stub directions
  const stubDir = (anchor?: AnchorPosition): Point => {
    switch (anchor) {
      case 'top':    return { x: 0, y: -1 };
      case 'bottom': return { x: 0, y: 1 };
      case 'left':   return { x: -1, y: 0 };
      case 'right':  return { x: 1, y: 0 };
      default:       return { x: 1, y: 0 };
    }
  };

  const sd = stubDir(startAnchor);
  const ed = stubDir(endAnchor);

  // Stub exit / entry points
  const p0 = start;
  const p1: Point = { x: start.x + sd.x * ELBOW_STUB, y: start.y + sd.y * ELBOW_STUB };
  const p3: Point = { x: end.x   + ed.x * ELBOW_STUB, y: end.y   + ed.y * ELBOW_STUB };
  const p4 = end;

  // Middle waypoint: halfway between the two stubs

  // Decide the midpoint snapping:
  // If the start exits horizontally, the mid bend uses the start stub x → then horizontal to p3
  let p2: Point;
  const isStartHorizontal = sd.x !== 0;
  const isEndHorizontal   = ed.x !== 0;

  if (isStartHorizontal && !isEndHorizontal) {
    // Exit right/left, enter top/bottom → single elbow at (p3.x, p1.y)
    p2 = { x: p3.x, y: p1.y };
  } else if (!isStartHorizontal && isEndHorizontal) {
    // Exit top/bottom, enter right/left → single elbow at (p1.x, p3.y)
    p2 = { x: p1.x, y: p3.y };
  } else if (isStartHorizontal && isEndHorizontal) {
    // Both horizontal → go out, turn vertically, come back in horizontally
    p2 = { x: (p1.x + p3.x) / 2, y: p1.y };
    const p2b: Point = { x: (p1.x + p3.x) / 2, y: p3.y };
    // Build a 3-bend path via helper
    return buildRoundedPolyline([p0, p1, p2, p2b, p3, p4]);
  } else {
    // Both vertical → turn horizontally mid-way
    p2 = { x: p1.x, y: (p1.y + p3.y) / 2 };
    const p2b: Point = { x: p3.x, y: (p1.y + p3.y) / 2 };
    return buildRoundedPolyline([p0, p1, p2, p2b, p3, p4]);
  }

  return buildRoundedPolyline([p0, p1, p2, p3, p4]);
}

/**
 * Given an array of waypoints, build a rounded-corner SVG path using
 * quadratic Bézier arcs at each interior corner.
 */
function buildRoundedPolyline(
  pts: Point[]
): { pathString: string; angle: number; midPoint: Point } {
  if (pts.length < 2) {
    return { pathString: '', angle: 0, midPoint: pts[0] ?? { x: 0, y: 0 } };
  }

  let d = `M ${pts[0].x} ${pts[0].y}`;

  for (let i = 1; i < pts.length - 1; i++) {
    const prev = pts[i - 1];
    const curr = pts[i];
    const next = pts[i + 1];

    // Vector from prev→curr and curr→next
    const lenIn  = distance(prev, curr);
    const lenOut = distance(curr, next);
    const r = Math.min(CORNER_R, lenIn / 2, lenOut / 2);

    if (r < 1) {
      // Segment too short: just go straight
      d += ` L ${curr.x} ${curr.y}`;
      continue;
    }

    // Point just before the corner
    const t1 = r / lenIn;
    const q1: Point = {
      x: curr.x + (prev.x - curr.x) * t1,
      y: curr.y + (prev.y - curr.y) * t1,
    };

    // Point just after the corner
    const t2 = r / lenOut;
    const q2: Point = {
      x: curr.x + (next.x - curr.x) * t2,
      y: curr.y + (next.y - curr.y) * t2,
    };

    d += ` L ${q1.x} ${q1.y} Q ${curr.x} ${curr.y} ${q2.x} ${q2.y}`;
  }

  const last = pts[pts.length - 1];
  d += ` L ${last.x} ${last.y}`;

  // Angle at arrival (last two points)
  const secondLast = pts[pts.length - 2];
  const angle = Math.atan2(last.y - secondLast.y, last.x - secondLast.x);

  // Midpoint: pick the middle waypoint index
  const midIdx = Math.floor(pts.length / 2);
  const midPoint: Point = {
    x: (pts[midIdx - 1].x + pts[midIdx].x) / 2,
    y: (pts[midIdx - 1].y + pts[midIdx].y) / 2,
  };

  return { pathString: d, angle, midPoint };
}
