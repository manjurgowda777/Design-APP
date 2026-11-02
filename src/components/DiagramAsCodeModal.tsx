import React, { useState, useMemo } from 'react';
import {
  X,
  Code2,
  Copy,
  Check,
  Download,
  ArrowRightLeft,
  ArrowUpDown,
  FileText,
  ExternalLink,
} from 'lucide-react';
import type { NodeElement, ArrowElement } from '../types/canvas';
import { generateMermaidDiagram } from '../utils/mermaid';

interface DiagramAsCodeModalProps {
  isOpen: boolean;
  onClose: () => void;
  nodes: NodeElement[];
  arrows: ArrowElement[];
}

export const DiagramAsCodeModal: React.FC<DiagramAsCodeModalProps> = ({
  isOpen,
  onClose,
  nodes,
  arrows,
}) => {
  const [direction, setDirection] = useState<'LR' | 'TD'>('LR');
  const [includeMarkdownFence, setIncludeMarkdownFence] = useState(false);
  const [copied, setCopied] = useState(false);

  // Generate Mermaid code whenever nodes, arrows, or direction change
  const rawMermaidCode = useMemo(() => {
    return generateMermaidDiagram(nodes, arrows, direction);
  }, [nodes, arrows, direction]);

  const displayCode = useMemo(() => {
    if (includeMarkdownFence) {
      return `\`\`\`mermaid\n${rawMermaidCode}\n\`\`\``;
    }
    return rawMermaidCode;
  }, [rawMermaidCode, includeMarkdownFence]);

  if (!isOpen) return null;

  // Copy to clipboard
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(displayCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2200);
    } catch (err) {
      console.error('Failed to copy to clipboard:', err);
    }
  };

  // Download .mmd file
  const handleDownload = () => {
    const blob = new Blob([rawMermaidCode], { type: 'text/vnd.mermaid;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `architecture-${Date.now()}.mmd`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal-container mermaid-modal-container"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="mermaid-modal-title"
      >
        {/* Modal Header */}
        <div className="modal-header">
          <div className="modal-header-left">
            <div className="modal-header-icon mermaid-icon-glow">
              <Code2 size={20} color="#38bdf8" />
            </div>
            <div>
              <h2 id="mermaid-modal-title" className="modal-title">
                Diagram-as-Code (Mermaid.js)
              </h2>
              <p className="modal-subtitle">
                Export your visual architecture as declarative Mermaid syntax for GitHub READMEs, Notion, and Obsidian.
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

        {/* Toolbar & Options */}
        <div className="mermaid-controls-bar">
          <div className="mermaid-direction-group">
            <span className="control-label">Layout Flow:</span>
            <button
              type="button"
              className={`direction-toggle-btn ${direction === 'LR' ? 'active' : ''}`}
              onClick={() => setDirection('LR')}
              title="Horizontal Left-to-Right layout"
            >
              <ArrowRightLeft size={14} />
              <span>Left to Right (LR)</span>
            </button>
            <button
              type="button"
              className={`direction-toggle-btn ${direction === 'TD' ? 'active' : ''}`}
              onClick={() => setDirection('TD')}
              title="Vertical Top-to-Down layout"
            >
              <ArrowUpDown size={14} />
              <span>Top to Down (TD)</span>
            </button>
          </div>

          <div className="mermaid-fence-toggle">
            <label className="checkbox-label" title="Wrap in ```mermaid markdown fence">
              <input
                type="checkbox"
                checked={includeMarkdownFence}
                onChange={(e) => setIncludeMarkdownFence(e.target.checked)}
              />
              <span>Markdown Fence (```mermaid)</span>
            </label>
          </div>
        </div>

        {/* Code Preview Block */}
        <div className="mermaid-code-wrapper">
          <div className="code-header-bar">
            <div className="code-lang-tag">
              <FileText size={13} />
              <span>{includeMarkdownFence ? 'markdown' : 'mermaid'}</span>
              <span className="code-meta-stats">
                {nodes.length} nodes • {arrows.length} connectors
              </span>
            </div>
            <div className="code-header-actions">
              <button
                type="button"
                className={`code-header-btn ${copied ? 'copied' : ''}`}
                onClick={handleCopy}
                title="Copy code to clipboard"
              >
                {copied ? <Check size={14} /> : <Copy size={14} />}
                <span>{copied ? 'Copied to Clipboard!' : 'Copy Mermaid Code'}</span>
              </button>
              <button
                type="button"
                className="code-header-btn"
                onClick={handleDownload}
                title="Download .mmd file"
              >
                <Download size={14} />
                <span>Download .mmd</span>
              </button>
            </div>
          </div>
          <pre className="mermaid-code-block">
            <code>{displayCode}</code>
          </pre>
        </div>

        {/* Tips Footer */}
        <div className="mermaid-modal-footer">
          <div className="mermaid-tip">
            <span className="tip-badge">TIP</span>
            <span>
              Paste directly into any GitHub PR description, README.md, Notion page (/mermaid), or{' '}
              <a
                href="https://mermaid.live"
                target="_blank"
                rel="noreferrer"
                className="mermaid-link"
              >
                Mermaid Live Editor <ExternalLink size={11} className="inline-icon" />
              </a>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
