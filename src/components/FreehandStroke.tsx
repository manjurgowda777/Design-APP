import React from 'react';
import type { FreehandStroke as FreehandStrokeType } from '../types/canvas';

interface FreehandStrokeProps {
  stroke: FreehandStrokeType;
  isSelected?: boolean;
  onSelect?: (e: React.MouseEvent, id: string) => void;
}

/**
 * Generates a smooth SVG path through a series of points using quadratic bezier midpoints
 */
export function getSvgPathFromPoints(points: { x: number; y: number }[]): string {
  if (points.length === 0) return '';
  if (points.length === 1) {
    return `M ${points[0].x} ${points[0].y} L ${points[0].x + 0.1} ${points[0].y + 0.1}`;
  }

  let path = `M ${points[0].x} ${points[0].y}`;

  for (let i = 1; i < points.length - 1; i++) {
    const current = points[i];
    const next = points[i + 1];
    const midX = (current.x + next.x) / 2;
    const midY = (current.y + next.y) / 2;
    path += ` Q ${current.x} ${current.y}, ${midX} ${midY}`;
  }

  const last = points[points.length - 1];
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
  const strokeColor = isSelected ? '#38bdf8' : stroke.color || '#f43f5e';
  const strokeWidth = isSelected ? (stroke.strokeWidth || 3) + 2 : stroke.strokeWidth || 3;

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
