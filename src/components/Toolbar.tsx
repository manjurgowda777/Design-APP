import React, { useRef } from 'react';
import {
  MousePointer,
  Hand,
  Pencil,
  ArrowUpRight,
  Type,
  Undo2,
  Redo2,
  Download,
  Upload,
  Image,
  ZoomIn,
  ZoomOut,
  FileCode,
  Play,
  Pause,
  LayoutTemplate,
  Code2,
  Layers,
  Monitor,
  Server,
  Sparkles,
  Shield,
  DollarSign,
  FileText,
  Copy,
  Tv,
} from 'lucide-react';
import type { ToolMode, ViewPerspective } from '../types/canvas';

interface ToolbarProps {
  currentTool: ToolMode;
  onSelectTool: (tool: ToolMode) => void;
  canUndo?: boolean;
  canRedo?: boolean;
  onUndo?: () => void;
  onRedo?: () => void;
  onExportJson?: () => void;
  onImportJson?: (file: File) => void;
  onExportSvg?: () => void;
  onExportPng?: () => void;
  onExportSpec?: () => void;
  onCopySpec?: () => void;
  zoom?: number;
  onZoomIn?: () => void;
  onZoomOut?: () => void;
  onResetZoom?: () => void;
  isSimulatingFlow?: boolean;
  onToggleSimulateFlow?: () => void;
  onStartPresentation?: () => void;
  onOpenTemplates?: () => void;
  onOpenMermaid?: () => void;
  onOpenAiGenerator?: () => void;
  viewPerspective?: ViewPerspective;
  onViewPerspectiveChange?: (perspective: ViewPerspective) => void;
  totalMonthlyCost?: number;
  healthScore?: number;
  criticalIssueCount?: number;
  onOpenAudit?: (tab?: 'audit' | 'cost') => void;
}

export const Toolbar: React.FC<ToolbarProps> = ({
  currentTool,
  onSelectTool,
  canUndo = false,
  canRedo = false,
  onUndo,
  onRedo,
  onExportJson,
  onImportJson,
  onExportSvg,
  onExportPng,
  onExportSpec,
  onCopySpec,
  zoom = 1,
  onZoomIn,
  onZoomOut,
  onResetZoom,
  isSimulatingFlow = false,
  onToggleSimulateFlow,
  onStartPresentation,
  onOpenTemplates,
  onOpenMermaid,
  onOpenAiGenerator,
  viewPerspective = 'all',
  onViewPerspectiveChange,
  totalMonthlyCost = 0,
  healthScore = 100,
  criticalIssueCount = 0,
  onOpenAudit,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const tools: { mode: ToolMode; label: string; icon: React.ReactNode }[] = [
    { mode: 'select', label: 'Select & Move (V)', icon: <MousePointer size={18} /> },
    { mode: 'hand', label: 'Pan Hand (H)', icon: <Hand size={18} /> },
    { mode: 'pen', label: 'Pen / Freehand (P)', icon: <Pencil size={18} /> },
    { mode: 'arrow', label: 'Arrow / Connector (A)', icon: <ArrowUpRight size={18} /> },
    { mode: 'text', label: 'Text (T)', icon: <Type size={18} /> },
  ];

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && onImportJson) {
      onImportJson(file);
      e.target.value = '';
    }
  };

  return (
    <div className="canvas-toolbar">
      {/* Primary Interaction Tools */}
      <div className="toolbar-section primary-tools">
        {tools.map((t) => {
          const isActive = currentTool === t.mode;
          return (
            <button
              key={t.mode}
              className={`toolbar-btn ${isActive ? 'active' : ''}`}
              title={t.label}
              onClick={() => onSelectTool(t.mode)}
              aria-label={t.label}
            >
              {t.icon}
            </button>
          );
        })}
      </div>

      <div className="toolbar-divider" />

      {/* History (Undo / Redo) */}
      <div className="toolbar-section history-tools">
        <button
          className="toolbar-btn"
          title="Undo (Ctrl+Z)"
          disabled={!canUndo}
          onClick={onUndo}
          aria-label="Undo"
        >
          <Undo2 size={18} />
        </button>
        <button
          className="toolbar-btn"
          title="Redo (Ctrl+Y)"
          disabled={!canRedo}
          onClick={onRedo}
          aria-label="Redo"
        >
          <Redo2 size={18} />
        </button>
      </div>

      <div className="toolbar-divider" />

      {/* Zoom Controls */}
      <div className="toolbar-section zoom-tools">
        <button
          className="toolbar-btn"
          title="Zoom Out (-)"
          onClick={onZoomOut}
          aria-label="Zoom Out"
        >
          <ZoomOut size={16} />
        </button>
        <button
          className="toolbar-btn zoom-level-btn"
          title="Reset Zoom"
          onClick={onResetZoom}
          aria-label="Reset Zoom"
        >
          <span>{Math.round(zoom * 100)}%</span>
        </button>
        <button
          className="toolbar-btn"
          title="Zoom In (+)"
          onClick={onZoomIn}
          aria-label="Zoom In"
        >
          <ZoomIn size={16} />
        </button>
      </div>

      <div className="toolbar-divider" />

      {/* Interactive Data Flow Simulation Toggle */}
      <div className="toolbar-section flow-simulation-tools">
        <button
          className={`toolbar-btn simulate-flow-btn ${isSimulatingFlow ? 'active' : ''}`}
          onClick={onToggleSimulateFlow}
          title={isSimulatingFlow ? 'Pause Flow Simulation' : 'Play / Simulate Data Flow'}
          aria-label={isSimulatingFlow ? 'Pause Flow Simulation' : 'Simulate Data Flow'}
        >
          {isSimulatingFlow ? (
            <>
              <Pause size={15} />
              <span className="btn-label-sm">Pause Flow</span>
              <div className="simulate-flow-pulse" />
            </>
          ) : (
            <>
              <Play size={15} fill="currentColor" />
              <span className="btn-label-sm">Simulate Flow</span>
            </>
          )}
        </button>

        {onStartPresentation && (
          <button
            id="toolbar-presentation-btn"
            className="toolbar-btn presentation-btn"
            onClick={onStartPresentation}
            title="Interactive Request Walkthrough / Presentation Mode (P)"
            aria-label="Present Walkthrough"
          >
            <Tv size={15} color="#38bdf8" />
            <span className="btn-label-sm">Present</span>
          </button>
        )}
      </div>

      <div className="toolbar-divider" />

      {/* View Perspective Switcher: [All | Frontend | Backend] */}
      {onViewPerspectiveChange && (
        <>
          <div className="toolbar-section perspective-tools">
            <div className="perspective-segmented-pill" role="group" aria-label="View Perspective">
              <button
                id="perspective-all-btn"
                className={`perspective-btn ${viewPerspective === 'all' ? 'active' : ''}`}
                onClick={() => onViewPerspectiveChange('all')}
                title="View All Components at 100% opacity"
                aria-label="View All"
              >
                <Layers size={13} />
                <span>All</span>
              </button>
              <button
                id="perspective-frontend-btn"
                className={`perspective-btn ${viewPerspective === 'frontend' ? 'active' : ''}`}
                onClick={() => onViewPerspectiveChange('frontend')}
                title="Frontend Perspective: Focus on UI, client components, and browser flow"
                aria-label="View Frontend"
              >
                <Monitor size={13} />
                <span>Frontend</span>
              </button>
              <button
                id="perspective-backend-btn"
                className={`perspective-btn ${viewPerspective === 'backend' ? 'active' : ''}`}
                onClick={() => onViewPerspectiveChange('backend')}
                title="Backend Perspective: Focus on services, databases, queues, and gateways"
                aria-label="View Backend"
              >
                <Server size={13} />
                <span>Backend</span>
              </button>
            </div>
          </div>

          <div className="toolbar-divider" />
        </>
      )}

      {/* Architecture Blueprints, AI Generator & Diagram-as-Code */}
      <div className="toolbar-section blueprint-tools">
        <button
          id="toolbar-ai-generate-btn"
          className="toolbar-btn ai-generate-btn"
          onClick={onOpenAiGenerator}
          title="AI Prompt-to-Diagram: Automatically generate architecture from natural language"
          aria-label="AI Prompt to Diagram"
        >
          <Sparkles size={16} color="#38bdf8" />
          <span className="btn-label-sm">AI Generate</span>
        </button>

        <button
          className="toolbar-btn blueprint-btn"
          onClick={onOpenTemplates}
          title="Starter Architecture Blueprints (3-Tier, Microservices, AI/ML)"
          aria-label="Architecture Templates"
        >
          <LayoutTemplate size={16} color="#38bdf8" />
          <span className="btn-label-sm">Templates</span>
        </button>

        <button
          className="toolbar-btn mermaid-btn"
          onClick={onOpenMermaid}
          title="Diagram-as-Code: Export & Copy Mermaid.js Syntax"
          aria-label="Mermaid Code"
        >
          <Code2 size={16} color="#818cf8" />
          <span className="btn-label-sm">Mermaid</span>
        </button>
      </div>

      <div className="toolbar-divider" />

      {/* Architecture Audit & Cloud Cost Pill */}
      {onOpenAudit && (
        <>
          <div className="toolbar-section audit-tools">
            <button
              id="toolbar-audit-btn"
              className="toolbar-btn audit-btn"
              onClick={() => onOpenAudit('audit')}
              title={`Architecture Graph Audit (Health Score: ${healthScore}%)`}
              aria-label="Audit Architecture"
            >
              <Shield
                size={16}
                color={
                  criticalIssueCount > 0
                    ? '#ef4444'
                    : healthScore >= 80
                    ? '#10b981'
                    : '#f59e0b'
                }
              />
              <span className="btn-label-sm">Audit</span>
              {criticalIssueCount > 0 ? (
                <span className="toolbar-badge-pill critical">{criticalIssueCount}</span>
              ) : healthScore < 80 ? (
                <span className="toolbar-badge-pill warning">!</span>
              ) : (
                <span className="toolbar-badge-pill ok">{healthScore}%</span>
              )}
            </button>

            <button
              id="toolbar-cost-btn"
              className="toolbar-btn cost-pill-btn"
              onClick={() => onOpenAudit('cost')}
              title="Click to view detailed itemized Cloud Cost Breakdown"
              aria-label="Estimated Cloud Cost"
            >
              <DollarSign size={14} color="#10b981" />
              <span className="cost-pill-text">~${totalMonthlyCost.toFixed(0)}/mo</span>
            </button>
          </div>

          <div className="toolbar-divider" />
        </>
      )}

      {/* Import / Export File Actions */}
      <div className="toolbar-section persistence-tools">
        <input
          ref={fileInputRef}
          type="file"
          accept=".json"
          style={{ display: 'none' }}
          onChange={handleFileInputChange}
        />

        <button
          className="toolbar-btn"
          title="Import JSON Diagram"
          onClick={() => fileInputRef.current?.click()}
          aria-label="Import JSON"
        >
          <Upload size={16} />
          <span className="btn-label-sm">Import</span>
        </button>

        <button
          className="toolbar-btn"
          title="Export JSON Diagram File"
          onClick={onExportJson}
          aria-label="Export JSON"
        >
          <FileCode size={16} />
          <span className="btn-label-sm">JSON</span>
        </button>

        <button
          className="toolbar-btn"
          title="Export SVG Vector File"
          onClick={onExportSvg}
          aria-label="Export SVG"
        >
          <Download size={16} />
          <span className="btn-label-sm">SVG</span>
        </button>

        <div className="spec-export-group" title="Architecture Specification / ADR">
          <button
            id="toolbar-export-spec-btn"
            className="toolbar-btn spec-btn"
            title="Download Architecture Specification (Markdown / ADR)"
            onClick={onExportSpec}
            aria-label="Export Spec Markdown"
          >
            <FileText size={16} color="#38bdf8" />
            <span className="btn-label-sm">Spec (MD)</span>
          </button>
          {onCopySpec && (
            <button
              id="toolbar-copy-spec-btn"
              className="toolbar-btn spec-copy-btn"
              title="Copy Architecture Specification Markdown to Clipboard"
              onClick={onCopySpec}
              aria-label="Copy Spec to Clipboard"
            >
              <Copy size={13} color="#94a3b8" />
            </button>
          )}
        </div>

        <button
          className="toolbar-btn primary-action"
          title="Export PNG High-Res Image"
          onClick={onExportPng}
          aria-label="Export PNG"
        >
          <Image size={16} />
          <span className="btn-label">Export PNG</span>
        </button>
      </div>
    </div>
  );
};
