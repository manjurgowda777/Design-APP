import React from 'react';
import type { FreehandStroke as FreehandStrokeType } from '../types/canvas';
import { sanitizeColor, sanitizeNumber } from '../utils/sanitizer';

interface FreehandStrokeProps {
  stroke: FreehandStrokeType;
  isSelected?: boolean;
  onSelect?: (e: React.MouseEvent, id: string) => void;
}

/**
 * Generates a smooth SVG path through a series of points using quadratic bezier midpoints.
 * Safely filters out non-finite coordinates to prevent SVG path injection.
 */
export function getSvgPathFromPoints(points: { x: number; y: number }[]): string {
  if (!Array.isArray(points) || points.length === 0) return '';
  const safePoints = points.filter(
    (p) => p && typeof p.x === 'number' && typeof p.y === 'number' && Number.isFinite(p.x) && Number.isFinite(p.y)
  );
  if (safePoints.length === 0) return '';
  if (safePoints.length === 1) {
    return `M ${safePoints[0].x} ${safePoints[0].y} L ${safePoints[0].x + 0.1} ${safePoints[0].y + 0.1}`;
  }

  let path = `M ${safePoints[0].x} ${safePoints[0].y}`;

  for (let i = 1; i < safePoints.length - 1; i++) {
    const current = safePoints[i];
    const next = safePoints[i + 1];
    const midX = (current.x + next.x) / 2;
    const midY = (current.y + next.y) / 2;
    path += ` Q ${current.x} ${current.y}, ${midX} ${midY}`;
  }

  const last = safePoints[safePoints.length - 1];
  path += ` L ${last.x} ${last.y}`;

  return path;
}

export const FreehandStroke: React.FC<FreehandStrokeProps> = ({
  stroke,
  isSelected = false,
  onSelect,
}) => {
  if (!stroke.points || stroke.points.length === 0) return null;

  const pathData = getSvgPathFromPoints(stroke.points);
  const strokeColor = isSelected ? '#38bdf8' : sanitizeColor(stroke.color, '#f43f5e');
  const baseWidth = sanitizeNumber(stroke.strokeWidth, 3);
  const strokeWidth = isSelected ? baseWidth + 2 : baseWidth;

  return (
    <g
      className={`freehand-stroke-group ${isSelected ? 'selected' : ''}`}
      onClick={(e) => {
        if (onSelect) {
          e.stopPropagation();
          onSelect(e, stroke.id);
        }
      }}
      style={{ cursor: 'pointer' }}
    >
      {/* Invisible wider hit area for selecting stroke */}
      <path
        d={pathData}
        fill="none"
        stroke="transparent"
        strokeWidth={Math.max(strokeWidth + 10, 16)}
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Visible Stroke Path */}
      <path
        d={pathData}
        fill="none"
        stroke={strokeColor}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        style={{
          filter: isSelected ? 'drop-shadow(0 0 6px rgba(56, 189, 248, 0.6))' : 'none',
        }}
      />
    </g>
  );
};
