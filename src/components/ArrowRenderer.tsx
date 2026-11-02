import React, { useState, useRef, useEffect } from 'react';
import type { ArrowElement, NodeElement, Point } from '../types/canvas';
import { getAnchorPoint, buildOrthogonalPath } from '../utils/math';
import { sanitizeText, sanitizeColor } from '../utils/sanitizer';

interface ArrowRendererProps {
  arrow: ArrowElement;
  nodesMap: Map<string, NodeElement>;
  isSelected?: boolean;
  isSimulatingFlow?: boolean;
  isDimmed?: boolean;
  isPresentationActive?: boolean;
  isWalkthroughFocused?: boolean;
  stepNumber?: number;
  onSelect?: (e: React.MouseEvent, id: string) => void;
  onLabelChange?: (id: string, label: string) => void;
  /** Called once after mount by parent to trigger label edit mode */
  triggerEditLabel?: () => void;
}

export const ArrowRenderer: React.FC<ArrowRendererProps> = ({
  arrow,
  nodesMap,
  isSelected = false,
  isSimulatingFlow = false,
  isDimmed = false,
  isPresentationActive = false,
  isWalkthroughFocused = false,
  stepNumber,
  onSelect,
  onLabelChange,
  triggerEditLabel,
}) => {
  const [isEditingLabel, setIsEditingLabel] = useState(false);
  const [editValue, setEditValue] = useState(arrow.label ?? '');
  const inputRef = useRef<HTMLInputElement>(null);

  // When parent signals to edit the label, activate edit mode
  useEffect(() => {
    if (triggerEditLabel) {
      setEditValue(arrow.label ?? '');
      setIsEditingLabel(true);
      triggerEditLabel(); // clear the trigger in parent
    }
  }, [triggerEditLabel]); // eslint-disable-line react-hooks/exhaustive-deps

  // Sync editValue when arrow.label changes externally
  useEffect(() => {
    if (!isEditingLabel) {
      setEditValue(arrow.label ?? '');
    }
  }, [arrow.label, isEditingLabel]);

  // Focus the input when editing starts
  useEffect(() => {
    if (isEditingLabel && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditingLabel]);

  // Calculate start point
  let startPt = arrow.startPoint;
  if (arrow.startNodeId && arrow.startAnchor) {
    const startNode = nodesMap.get(arrow.startNodeId);
    if (startNode) startPt = getAnchorPoint(startNode, arrow.startAnchor);
  }

  // Calculate end point
  let endPt = arrow.endPoint;
  if (arrow.endNodeId && arrow.endAnchor) {
    const endNode = nodesMap.get(arrow.endNodeId);
    if (endNode) endPt = getAnchorPoint(endNode, arrow.endAnchor);
  }

  const { pathString, angle, midPoint } = buildOrthogonalPath(
    startPt,
    arrow.startAnchor,
    endPt,
    arrow.endAnchor
  );

  const headLength = 12;
  const headAngle  = Math.PI / 6;
  const arrowColor  = isWalkthroughFocused ? '#38bdf8' : isSelected ? '#38bdf8' : sanitizeColor(arrow.color, '#94a3b8');
  const strokeWidth = isWalkthroughFocused ? (arrow.strokeWidth || 2) + 1.8 : isSelected ? (arrow.strokeWidth || 2) + 1 : arrow.strokeWidth || 2;
  const isDashed    = arrow.strokeStyle === 'dashed';
  const dashArray   = isDashed ? `${strokeWidth * 3} ${strokeWidth * 3}` : undefined;

  // Arrowhead points
  const p1 = endPt;
  const p2: Point = {
    x: endPt.x - headLength * Math.cos(angle - headAngle),
    y: endPt.y - headLength * Math.sin(angle - headAngle),
  };
  const p3: Point = {
    x: endPt.x - headLength * Math.cos(angle + headAngle),
    y: endPt.y - headLength * Math.sin(angle + headAngle),
  };
  const arrowheadPolygon = `${p1.x},${p1.y} ${p2.x},${p2.y} ${p3.x},${p3.y}`;

  const handleDoubleClick = (e: React.MouseEvent) => {
    if (!onLabelChange) return;
    e.stopPropagation();
    setEditValue(arrow.label ?? '');
    setIsEditingLabel(true);
  };

  const commitEdit = () => {
    setIsEditingLabel(false);
    if (onLabelChange) {
      onLabelChange(arrow.id, editValue.trim());
    }
  };

  const hasLabel = arrow.label && arrow.label.trim() !== '';

  // Badge dimensions for foreign object (estimated)
  const badgeW = Math.max(60, (arrow.label?.length ?? 0) * 7.5 + 24);
  const badgeH = 22;

  return (
    <g
      className={`arrow-element-group ${isSelected ? 'selected' : ''} ${isDimmed ? 'dimmed' : ''} ${isWalkthroughFocused ? 'walkthrough-focused' : ''}`}
      onDoubleClick={!isPresentationActive && !isDimmed ? handleDoubleClick : undefined}
      onClick={(e) => {
        if (!isPresentationActive && !isDimmed && onSelect) {
          e.stopPropagation();
          onSelect(e, arrow.id);
        }
      }}
      style={{
        cursor: isPresentationActive || isDimmed ? 'default' : 'pointer',
        opacity: isDimmed ? 0.15 : 1,
        pointerEvents: isPresentationActive || isDimmed ? 'none' : 'auto',
        transition: 'opacity 0.3s ease, filter 0.3s ease',
      }}
    >
      {/* Invisible wider hit area */}
      <path
        d={pathString}
        fill="none"
        stroke="transparent"
        strokeWidth={14}
      />

      {/* Main Arrow Curved Path */}
      <path
        d={pathString}
        fill="none"
        stroke={arrowColor}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeDasharray={dashArray}
        className="arrow-line"
      />

      {/* Triangular Arrowhead */}
      <polygon
        points={arrowheadPolygon}
        fill={arrowColor}
        stroke={arrowColor}
        strokeWidth={1}
        className="arrow-head"
      />

      {/* Start dot */}
      <circle cx={startPt.x} cy={startPt.y} r={3} fill={arrowColor} />

      {/* ── Flow Simulation Animated Streams & Pulse Dots ── */}
      {(isSimulatingFlow || isWalkthroughFocused) && (
        <g className="arrow-flow-simulation-group" pointerEvents="none">
          {/* Animated flowing stream line */}
          <path
            d={pathString}
            fill="none"
            stroke={arrowColor}
            strokeWidth={strokeWidth + 1}
            strokeDasharray="8 16"
            className="arrow-flow-stream"
            opacity={0.8}
          />
          {/* Leading glowing pulse dot */}
          <circle r={4.5} fill="#38bdf8" filter="url(#flow-particle-glow)">
            <animateMotion
              dur="2.4s"
              repeatCount="indefinite"
              path={pathString}
              rotate="auto"
            />
          </circle>
          {/* Secondary staggered pulse dot */}
          <circle r={3.5} fill="#818cf8" filter="url(#flow-particle-glow)">
            <animateMotion
              dur="2.4s"
              begin="1.2s"
              repeatCount="indefinite"
              path={pathString}
              rotate="auto"
            />
          </circle>
        </g>
      )}

      {/* ── Label Badge / Walkthrough Step Badge ── */}
      {(hasLabel || isEditingLabel || isWalkthroughFocused) && (
        <g className={`arrow-label-group ${isWalkthroughFocused ? 'walkthrough-label-group' : ''}`}>
          {/* Solid background rect masking the line underneath */}
          <rect
            x={midPoint.x - (isWalkthroughFocused && !hasLabel ? 45 : badgeW / 2)}
            y={midPoint.y - badgeH / 2}
            width={isWalkthroughFocused && !hasLabel ? 90 : badgeW}
            height={badgeH}
            rx={6}
            ry={6}
            fill={isWalkthroughFocused ? '#0284c7' : '#0f172a'}
            stroke={isWalkthroughFocused ? '#38bdf8' : isSelected ? '#38bdf8' : arrowColor}
            strokeWidth={isWalkthroughFocused ? 2 : isSelected ? 1.5 : 1}
            filter={isWalkthroughFocused ? 'drop-shadow(0 0 10px rgba(56, 189, 248, 0.7))' : 'drop-shadow(0 2px 6px rgba(0,0,0,0.5))'}
            className="arrow-label-bg"
          />

          {isEditingLabel ? (
            /* Inline edit using foreignObject */
            <foreignObject
              x={midPoint.x - badgeW / 2}
              y={midPoint.y - badgeH / 2}
              width={badgeW}
              height={badgeH}
            >
              <input
                ref={inputRef}
                className="arrow-label-input"
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                onBlur={commitEdit}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') commitEdit();
                  if (e.key === 'Escape') {
                    setIsEditingLabel(false);
                    setEditValue(arrow.label ?? '');
                  }
                  e.stopPropagation();
                }}
                onMouseDown={(e) => e.stopPropagation()}
                onClick={(e) => e.stopPropagation()}
              />
            </foreignObject>
          ) : (
            /* Static label text */
            <text
              x={midPoint.x}
              y={midPoint.y + 1}
              textAnchor="middle"
              dominantBaseline="middle"
              className="arrow-label-text"
              fill={isWalkthroughFocused ? '#ffffff' : isSelected ? '#38bdf8' : '#f1f5f9'}
              fontSize={11}
              fontFamily="Inter, sans-serif"
              fontWeight={isWalkthroughFocused ? 700 : 600}
            >
              {isWalkthroughFocused && typeof stepNumber === 'number'
                ? `STEP ${stepNumber}${hasLabel ? `: ${sanitizeText(arrow.label)}` : ''}`
                : sanitizeText(arrow.label)}
            </text>
          )}
        </g>
      )}

      {/* Double-click hint on empty selected arrow */}
      {isSelected && !hasLabel && !isEditingLabel && onLabelChange && (
        <g className="arrow-label-hint" onDoubleClick={handleDoubleClick}>
          <rect
            x={midPoint.x - 52}
            y={midPoint.y - 11}
            width={104}
            height={22}
            rx={5}
            fill="#0f172a"
            stroke="#6366f1"
            strokeWidth={1}
            strokeDasharray="3 2"
          />
          <text
            x={midPoint.x}
            y={midPoint.y + 1}
            textAnchor="middle"
            dominantBaseline="middle"
            fill="#94a3b8"
            fontSize={10}
            fontFamily="Inter, sans-serif"
            fontWeight={500}
          >
            double-click to label
          </text>
        </g>
      )}
    </g>
  );
};
