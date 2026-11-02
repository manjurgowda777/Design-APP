import React from 'react';
import { Trash2, Copy, Pencil, Minus, MoreHorizontal } from 'lucide-react';
import type { ViewportTransform, Point, ArrowElement } from '../types/canvas';
import { canvasToScreen } from '../utils/math';

interface ContextActionBarProps {
  canvasPosition: Point;
  viewport: ViewportTransform;
  onDelete: () => void;
  onDuplicate: () => void;
  itemTypeLabel?: string;
  // Arrow-specific controls (only provided when an arrow is selected)
  selectedArrow?: ArrowElement | null;
  onArrowStyleChange?: (id: string, style: 'solid' | 'dashed') => void;
  onArrowLabelEdit?: (id: string) => void;
}

export const ContextActionBar: React.FC<ContextActionBarProps> = ({
  canvasPosition,
  viewport,
  onDelete,
  onDuplicate,
  itemTypeLabel,
  selectedArrow,
  onArrowStyleChange,
  onArrowLabelEdit,
}) => {
  const screenPos = canvasToScreen(canvasPosition, viewport);
  const isArrow = itemTypeLabel === 'ARROW' && !!selectedArrow;

  return (
    <div
      className="context-action-bar"
      style={{
        left: `${screenPos.x}px`,
        top: `${screenPos.y - 12}px`,
      }}
      onMouseDown={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
    >
      {itemTypeLabel && (
        <span className="context-action-type-tag">{itemTypeLabel}</span>
      )}

      {/* Arrow-specific controls */}
      {isArrow && onArrowStyleChange && selectedArrow && (
        <>
          <button
            className={`context-action-btn style-btn ${selectedArrow.strokeStyle !== 'dashed' ? 'active' : ''}`}
            onClick={() => onArrowStyleChange(selectedArrow.id, 'solid')}
            title="Solid line"
            aria-label="Solid connector"
          >
            <Minus size={13} />
            <span>Solid</span>
          </button>

          <button
            className={`context-action-btn style-btn ${selectedArrow.strokeStyle === 'dashed' ? 'active' : ''}`}
            onClick={() => onArrowStyleChange(selectedArrow.id, 'dashed')}
            title="Dashed line (async / event)"
            aria-label="Dashed connector"
          >
            <MoreHorizontal size={13} />
            <span>Dashed</span>
          </button>

          {onArrowLabelEdit && (
            <button
              className="context-action-btn edit-label-btn"
              onClick={() => onArrowLabelEdit(selectedArrow.id)}
              title="Edit label"
              aria-label="Edit arrow label"
            >
              <Pencil size={13} />
              <span>Label</span>
            </button>
          )}

          <div className="context-action-divider" />
        </>
      )}

      <button
        className="context-action-btn duplicate-btn"
        onClick={onDuplicate}
        title="Duplicate (creates copy +25px)"
        aria-label="Duplicate element"
      >
        <Copy size={14} />
        <span>Duplicate</span>
      </button>

      <div className="context-action-divider" />

      <button
        className="context-action-btn delete-btn"
        onClick={onDelete}
        title="Delete (Del / Backspace)"
        aria-label="Delete element"
      >
        <Trash2 size={14} />
        <span>Delete</span>
      </button>
    </div>
  );
};
