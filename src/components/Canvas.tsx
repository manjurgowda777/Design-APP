import React, { useRef, useState, useCallback, useEffect } from 'react';
import type { ViewportTransform, Point, ToolMode } from '../types/canvas';
import { clamp, screenToCanvas } from '../utils/math';

interface CanvasProps {
  viewport: ViewportTransform;
  toolMode: ToolMode;
  onViewportChange: (viewport: ViewportTransform) => void;
  onCanvasClick?: () => void;
  onPenStart?: (canvasPoint: Point) => void;
  onPenMove?: (canvasPoint: Point) => void;
  onPenEnd?: () => void;
  onDropComponent?: (itemData: any, canvasPoint: Point) => void;
  onMarqueeStart?: (canvasPoint: Point) => void;
  onMarqueeMove?: (canvasPoint: Point) => void;
  onMarqueeEnd?: () => void;
  marqueeBox?: { x: number; y: number; width: number; height: number } | null;
  onCursorMove?: (canvasPoint: Point | null) => void;
  children?: React.ReactNode;
}

export const Canvas: React.FC<CanvasProps> = ({
  viewport,
  toolMode,
  onViewportChange,
  onCanvasClick,
  onPenStart,
  onPenMove,
  onPenEnd,
  onDropComponent,
  onMarqueeStart,
  onMarqueeMove,
  onMarqueeEnd,
  marqueeBox,
  onCursorMove,
  children,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isPanning, setIsPanning] = useState(false);
  const isPenDrawingRef = useRef(false);
  const isMarqueeRef = useRef(false);
  const marqueeStartScreenRef = useRef<Point>({ x: 0, y: 0 });
  const panStartRef = useRef<Point>({ x: 0, y: 0 });
  const viewportStartRef = useRef<ViewportTransform>(viewport);
  const isDragDistanceExceededRef = useRef<boolean>(false);

  // Handle Wheel: Zoom centered at cursor, or trackpad pan
  const handleWheel = useCallback(
    (e: React.WheelEvent) => {
      e.preventDefault();

      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const mouseScreen: Point = {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      };

      // Zoom factor
      const zoomFactor = e.deltaY < 0 ? 1.1 : 0.9;
      const newScale = clamp(viewport.scale * zoomFactor, 0.1, 5.0);

      // Keep cursor position stable on zoom
      const mouseCanvas = screenToCanvas(mouseScreen, viewport);
      const newX = mouseScreen.x - mouseCanvas.x * newScale;
      const newY = mouseScreen.y - mouseCanvas.y * newScale;

      onViewportChange({
        x: newX,
        y: newY,
        scale: newScale,
      });
    },
    [viewport, onViewportChange]
  );

  // Mouse Down: Branch between Pen drawing vs Canvas Panning
  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (e.button !== 0 && e.button !== 1) return;

      if (toolMode === 'pen' && e.button === 0) {
        // Freehand pen drawing mode
        isPenDrawingRef.current = true;
        const rect = containerRef.current?.getBoundingClientRect();
        if (rect && onPenStart) {
          const mouseScreen: Point = {
            x: e.clientX - rect.left,
            y: e.clientY - rect.top,
          };
          const canvasPoint = screenToCanvas(mouseScreen, viewport);
          onPenStart(canvasPoint);
        }
        return;
      }

      // Check for canvas background click or middle click or hand tool
      const target = e.target as HTMLElement | SVGElement;
      const isBackground =
        target === e.currentTarget ||
        target.tagName === 'svg' ||
        target.id === 'canvas-background-rect';

      // 1. Panning with Middle Click or Hand Tool
      if (e.button === 1 || toolMode === 'hand') {
        setIsPanning(true);
        panStartRef.current = { x: e.clientX, y: e.clientY };
        viewportStartRef.current = { ...viewport };
        isDragDistanceExceededRef.current = false;
        return;
      }

      // 2. Marquee Selection in Select Mode on background
      if (toolMode === 'select' && e.button === 0 && isBackground) {
        const rect = containerRef.current?.getBoundingClientRect();
        if (rect && onMarqueeStart) {
          const mouseScreen: Point = {
            x: e.clientX - rect.left,
            y: e.clientY - rect.top,
          };
          const canvasPoint = screenToCanvas(mouseScreen, viewport);
          isMarqueeRef.current = true;
          marqueeStartScreenRef.current = { x: e.clientX, y: e.clientY };
          onMarqueeStart(canvasPoint);
        }
        return;
      }

      // Fallback panning on background
      if (isBackground) {
        setIsPanning(true);
        panStartRef.current = { x: e.clientX, y: e.clientY };
        viewportStartRef.current = { ...viewport };
        isDragDistanceExceededRef.current = false;
      }
    },
    [viewport, toolMode, onPenStart, onMarqueeStart]
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (containerRef.current && onCursorMove) {
        const rect = containerRef.current.getBoundingClientRect();
        const mouseScreen: Point = {
          x: e.clientX - rect.left,
          y: e.clientY - rect.top,
        };
        const canvasPoint = screenToCanvas(mouseScreen, viewport);
        onCursorMove(canvasPoint);
      }

      // 1. If actively pen drawing
      if (isPenDrawingRef.current && onPenMove && containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        const mouseScreen: Point = {
          x: e.clientX - rect.left,
          y: e.clientY - rect.top,
        };
        const canvasPoint = screenToCanvas(mouseScreen, viewport);
        onPenMove(canvasPoint);
        return;
      }

      // 2. If actively marquee selecting
      if (isMarqueeRef.current && onMarqueeMove && containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        const mouseScreen: Point = {
          x: e.clientX - rect.left,
          y: e.clientY - rect.top,
        };
        const canvasPoint = screenToCanvas(mouseScreen, viewport);
        onMarqueeMove(canvasPoint);
        return;
      }

      // 3. If canvas panning
      if (isPanning) {
        const dx = e.clientX - panStartRef.current.x;
        const dy = e.clientY - panStartRef.current.y;

        if (Math.abs(dx) > 3 || Math.abs(dy) > 3) {
          isDragDistanceExceededRef.current = true;
        }

        onViewportChange({
          x: viewportStartRef.current.x + dx,
          y: viewportStartRef.current.y + dy,
          scale: viewportStartRef.current.scale,
        });
      }
    },
    [isPanning, onViewportChange, onPenMove, onMarqueeMove, onCursorMove, viewport]
  );

  const handleMouseUp = useCallback(
    (e: React.MouseEvent) => {
      // End pen drawing
      if (isPenDrawingRef.current) {
        isPenDrawingRef.current = false;
        if (onPenEnd) onPenEnd();
        return;
      }

      // End marquee selection
      if (isMarqueeRef.current) {
        isMarqueeRef.current = false;
        const dragDist = Math.hypot(
          e.clientX - marqueeStartScreenRef.current.x,
          e.clientY - marqueeStartScreenRef.current.y
        );
        if (onMarqueeEnd) {
          onMarqueeEnd();
        }
        if (dragDist < 5 && onCanvasClick) {
          onCanvasClick();
        }
        return;
      }

      // End canvas panning
      if (isPanning) {
        setIsPanning(false);
        // Deselect if just a click on the background without drag
        if (!isDragDistanceExceededRef.current) {
          const target = e.target as HTMLElement | SVGElement;
          const isBackground =
            target === e.currentTarget ||
            target.tagName === 'svg' ||
            target.id === 'canvas-background-rect';
          if (isBackground && onCanvasClick) {
            onCanvasClick();
          }
        }
      }
    },
    [isPanning, onCanvasClick, onPenEnd, onMarqueeEnd]
  );

  useEffect(() => {
    const handleGlobalMouseUp = () => {
      if (isPenDrawingRef.current) {
        isPenDrawingRef.current = false;
        if (onPenEnd) onPenEnd();
      }
      if (isMarqueeRef.current) {
        isMarqueeRef.current = false;
        if (onMarqueeEnd) onMarqueeEnd();
      }
      setIsPanning(false);
    };

    window.addEventListener('mouseup', handleGlobalMouseUp);
    return () => window.removeEventListener('mouseup', handleGlobalMouseUp);
  }, [onPenEnd, onMarqueeEnd]);

  // Dynamic cursor style
  const getCursor = () => {
    if (toolMode === 'pen') return 'crosshair';
    if (toolMode === 'hand') return isPanning ? 'grabbing' : 'grab';
    return 'default';
  };

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      if (!onDropComponent || !containerRef.current) return;
      try {
        const raw = e.dataTransfer.getData('application/json');
        if (!raw) return;
        const itemData = JSON.parse(raw);
        const rect = containerRef.current.getBoundingClientRect();
        const screenPoint: Point = {
          x: e.clientX - rect.left,
          y: e.clientY - rect.top,
        };
        const canvasPoint = screenToCanvas(screenPoint, viewport);
        onDropComponent(itemData, canvasPoint);
      } catch (err) {
        console.warn('Drop component parsing error:', err);
      }
    },
    [onDropComponent, viewport]
  );

  return (
    <div
      ref={containerRef}
      className={`canvas-container ${isPanning ? 'is-panning' : ''}`}
      onWheel={handleWheel}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={() => onCursorMove && onCursorMove(null)}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      style={{ cursor: getCursor() }}
    >
      <svg
        id="architecture-canvas-svg"
        className="canvas-svg"
        width="100%"
        height="100%"
      >
        <defs>
          {/* Subtle grid pattern for whiteboard look */}
          <pattern
            id="canvas-grid"
            width={40 * viewport.scale}
            height={40 * viewport.scale}
            patternUnits="userSpaceOnUse"
            patternTransform={`translate(${viewport.x % (40 * viewport.scale)}, ${viewport.y % (40 * viewport.scale)})`}
          >
            <circle
              cx={20 * viewport.scale}
              cy={20 * viewport.scale}
              r={1 * Math.max(0.75, Math.min(viewport.scale, 2))}
              fill="rgba(148, 163, 184, 0.35)"
            />
          </pattern>

          {/* Glow filter for animated data traffic pulse dots */}
          <filter id="flow-particle-glow" x="-100%" y="-100%" width="300%" height="300%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="2.5" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Grid Background */}
        <rect
          id="canvas-background-rect"
          width="100%"
          height="100%"
          fill="url(#canvas-grid)"
        />

        {/* Zoom & Pan Viewport Layer */}
        <g transform={`translate(${viewport.x}, ${viewport.y}) scale(${viewport.scale})`}>
          {children}

          {/* Marquee Multi-Select Box */}
          {marqueeBox && (
            <rect
              x={marqueeBox.x}
              y={marqueeBox.y}
              width={marqueeBox.width}
              height={marqueeBox.height}
              className="marquee-selection-rect"
            />
          )}
        </g>
      </svg>
    </div>
  );
};
