import React from 'react';
import type { ViewportTransform } from '../types/canvas';
import type { PeerUser } from '../utils/collaboration';

interface RemoteCursorsProps {
  peers: PeerUser[];
  viewport: ViewportTransform;
}

export const RemoteCursors: React.FC<RemoteCursorsProps> = ({ peers, viewport }) => {
  // Render within canvas SVG space
  const activePeersWithCursor = peers.filter((p) => !p.isSelf && p.cursor != null);

  if (activePeersWithCursor.length === 0) return null;

  // Scale factor to keep cursor and badge comfortably readable across zoom levels
  const invScale = 1 / Math.max(0.4, Math.min(viewport.scale, 2.5));

  return (
    <g className="remote-cursors-layer" pointerEvents="none">
      {activePeersWithCursor.map((peer) => {
        const { cursor, color, name, id } = peer;
        if (!cursor) return null;

        // Estimated name badge dimensions
        const badgeWidth = Math.max(50, name.length * 7.5 + 16);
        const badgeHeight = 20;

        return (
          <g
            key={id}
            className="remote-cursor-item"
            transform={`translate(${cursor.x}, ${cursor.y}) scale(${invScale})`}
            style={{
              transition: 'transform 0.05s cubic-bezier(0, 0, 0.2, 1)',
            }}
          >
            {/* Smooth SVG Cursor Pointer Arrow */}
            <path
              d="M 0,0 L 0,18.5 L 4.8,14.5 L 8.8,22.5 L 12,20.8 L 8,13 L 14.5,13 Z"
              fill={color}
              stroke="#0f172a"
              strokeWidth={1.5}
              strokeLinejoin="round"
              filter="drop-shadow(0 2px 6px rgba(0,0,0,0.45))"
            />

            {/* User Name Badge Tag */}
            <g transform="translate(14, 14)">
              <rect
                x={0}
                y={0}
                width={badgeWidth}
                height={badgeHeight}
                rx={10}
                ry={10}
                fill={color}
                filter="drop-shadow(0 2px 8px rgba(0,0,0,0.35))"
              />
              <text
                x={badgeWidth / 2}
                y={13.5}
                textAnchor="middle"
                fill="#ffffff"
                fontSize={10.5}
                fontFamily="Inter, system-ui, sans-serif"
                fontWeight={700}
                letterSpacing={0.2}
              >
                {name}
              </text>
            </g>
          </g>
        );
      })}
    </g>
  );
};
