import React from 'react';
import {
  X,
  LayoutTemplate,
  Layers,
  Radio,
  Sparkles,
  ArrowRight,
  PlusCircle,
  RotateCcw,
} from 'lucide-react';
import { ARCHITECTURE_TEMPLATES } from '../data/templates';
import type { ArchitectureTemplate } from '../data/templates';

interface TemplatesModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectTemplate: (template: ArchitectureTemplate, mode: 'replace' | 'append') => void;
}

export const TemplatesModal: React.FC<TemplatesModalProps> = ({
  isOpen,
  onClose,
  onSelectTemplate,
}) => {
  if (!isOpen) return null;

  const getTemplateIcon = (id: string) => {
    switch (id) {
      case '3-tier-web-app':
        return <Layers size={22} color="#38bdf8" />;
      case 'event-driven-microservices':
        return <Radio size={22} color="#f59e0b" />;
      case 'ai-ml-pipeline':
        return <Sparkles size={22} color="#10b981" />;
      default:
        return <LayoutTemplate size={22} color="#818cf8" />;
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal-container templates-modal-container"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="templates-modal-title"
      >
        {/* Modal Header */}
        <div className="modal-header">
          <div className="modal-header-left">
            <div className="modal-header-icon">
              <LayoutTemplate size={20} color="#38bdf8" />
            </div>
            <div>
              <h2 id="templates-modal-title" className="modal-title">
                Architecture Blueprints
              </h2>
              <p className="modal-subtitle">
                Select a pre-configured, production-grade architecture blueprint to start designing.
              </p>
            </div>
          </div>
          <button
            type="button"
            className="modal-close-btn"
            onClick={onClose}
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Body / Template Grid */}
        <div className="templates-grid">
          {ARCHITECTURE_TEMPLATES.map((tpl) => (
            <div key={tpl.id} className="template-card">
              <div className="template-card-header">
                <div className="template-card-icon-wrap">{getTemplateIcon(tpl.id)}</div>
                <div className="template-card-meta">
                  <span className="template-category">{tpl.category}</span>
                  <h3 className="template-title">{tpl.title}</h3>
                </div>
              </div>

              <p className="template-description">{tpl.description}</p>

              {/* Tags & Count */}
              <div className="template-tags">
                <span className="template-node-count">{tpl.nodeCount} Components</span>
                {tpl.tags.map((tag) => (
                  <span key={tag} className="template-tag-pill">
                    {tag}
                  </span>
                ))}
              </div>

              {/* Action Buttons */}
              <div className="template-card-actions">
                <button
                  type="button"
                  className="template-action-btn load-replace-btn"
                  onClick={() => onSelectTemplate(tpl, 'replace')}
                  title="Replace canvas with this template"
                >
                  <RotateCcw size={14} />
                  <span>Load Template</span>
                  <ArrowRight size={14} />
                </button>
                <button
                  type="button"
                  className="template-action-btn append-btn"
                  onClick={() => onSelectTemplate(tpl, 'append')}
                  title="Add this template alongside existing canvas elements"
                >
                  <PlusCircle size={14} />
                  <span>Add to Canvas</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
