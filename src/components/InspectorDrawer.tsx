import React, { useState, useEffect } from 'react';
import type { NodeElement, NodeEnvironment, NodeDomain } from '../types/canvas';
import { getNodeDomain } from '../types/canvas';
import {
  X,
  Layers,
  Cpu,
  Server,
  Monitor,
  Zap,
  Database,
  Radio,
  Lock,
  Shield,
  Box,
  FolderDot,
  Cloud,
  Globe,
  Smartphone,
  Network,
  Copy,
  Trash2,
  HardDrive,
  Tag,
  Hash,
  Terminal,
  FileText,
  CheckCircle2,
} from 'lucide-react';

interface InspectorDrawerProps {
  node: NodeElement | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdateNode: (nodeId: string, updates: Partial<NodeElement>) => void;
  onDeleteNode?: (nodeId: string) => void;
  onDuplicateNode?: (nodeId: string) => void;
}

const TECH_STACK_SUGGESTIONS = [
  'PostgreSQL 16',
  'Go / Gin v1.9',
  'Redis v7.2',
  'Node / Express',
  'Python / FastAPI',
  'Apache Kafka 3.6',
  'Envoy / Envoy Gateway',
  'AWS Lambda / ARM64',
  'Docker / K8s Pod',
];

const PORT_SUGGESTIONS = [
  '443 / HTTPS',
  '80 / HTTP',
  '8080 / HTTP',
  '5432 / TCP',
  '6379 / TCP',
  '9092 / TCP',
  '3306 / TCP',
  '27017 / TCP',
];

const ENVIRONMENTS: { id: NodeEnvironment; label: string; color: string; border: string; bg: string }[] = [
  {
    id: 'production',
    label: 'Production',
    color: '#10b981',
    border: 'rgba(16, 185, 129, 0.4)',
    bg: 'rgba(16, 185, 129, 0.12)',
  },
  {
    id: 'staging',
    label: 'Staging',
    color: '#f59e0b',
    border: 'rgba(245, 158, 11, 0.4)',
    bg: 'rgba(245, 158, 11, 0.12)',
  },
  {
    id: 'internal',
    label: 'Internal',
    color: '#a855f7',
    border: 'rgba(168, 85, 247, 0.4)',
    bg: 'rgba(168, 85, 247, 0.12)',
  },
  {
    id: 'development',
    label: 'Development',
    color: '#38bdf8',
    border: 'rgba(56, 189, 248, 0.4)',
    bg: 'rgba(56, 189, 248, 0.12)',
  },
];

export const InspectorDrawer: React.FC<InspectorDrawerProps> = ({
  node,
  isOpen,
  onClose,
  onUpdateNode,
  onDeleteNode,
  onDuplicateNode,
}) => {
  // Local form state
  const [label, setLabel] = useState('');
  const [subtitle, setSubtitle] = useState('');
  const [domain, setDomain] = useState<NodeDomain>('backend');
  const [techStack, setTechStack] = useState('');
  const [port, setPort] = useState('');
  const [environment, setEnvironment] = useState<NodeEnvironment>('production');
  const [notes, setNotes] = useState('');

  // Sync state whenever selected node changes
  useEffect(() => {
    if (node) {
      setLabel(node.label || '');
      setSubtitle(node.subtitle || '');
      setDomain(node.domain || getNodeDomain(node.shape));
      setTechStack(node.metadata?.techStack || '');
      setPort(node.metadata?.port || '');
      setEnvironment(node.metadata?.environment || 'production');
      setNotes(node.metadata?.notes || '');
    }
  }, [node]);

  if (!isOpen || !node) {
    return null;
  }

  // Update handlers
  const handleUpdate = (updates: {
    label?: string;
    subtitle?: string;
    domain?: NodeDomain;
    techStack?: string;
    port?: string;
    environment?: NodeEnvironment;
    notes?: string;
  }) => {
    const updatedMetadata = {
      ...(node.metadata || {}),
      ...(updates.techStack !== undefined ? { techStack: updates.techStack } : {}),
      ...(updates.port !== undefined ? { port: updates.port } : {}),
      ...(updates.environment !== undefined ? { environment: updates.environment } : {}),
      ...(updates.notes !== undefined ? { notes: updates.notes } : {}),
    };

    onUpdateNode(node.id, {
      ...(updates.label !== undefined ? { label: updates.label } : {}),
      ...(updates.subtitle !== undefined ? { subtitle: updates.subtitle } : {}),
      ...(updates.domain !== undefined ? { domain: updates.domain } : {}),
      metadata: updatedMetadata,
    });
  };

  // Node icon helper
  const getNodeIcon = () => {
    switch (node.shape) {
      case 'browser':
        return <Globe size={18} color="#38bdf8" />;
      case 'mobile':
        return <Smartphone size={18} color="#a855f7" />;
      case 'api-gateway':
        return <Network size={18} color="#818cf8" />;
      case 'load-balancer':
        return <Cpu size={18} color="#6366f1" />;
      case 'cdn':
        return <Cloud size={18} color="#06b6d4" />;
      case 'service':
        return <Server size={18} color="#818cf8" />;
      case 'serverless':
        return <Zap size={18} color="#f59e0b" />;
      case 'database':
        return <Database size={18} color="#34d399" />;
      case 'cache':
        return <Layers size={18} color="#f43f5e" />;
      case 'storage':
        return <HardDrive size={18} color="#a855f7" />;
      case 'queue':
        return <Layers size={18} color="#f59e0b" />;
      case 'pubsub':
        return <Radio size={18} color="#06b6d4" />;
      case 'auth':
        return <Lock size={18} color="#10b981" />;
      case 'firewall':
        return <Shield size={18} color="#ef4444" />;
      case 'group-container':
        return <FolderDot size={18} color="#94a3b8" />;
      default:
        return <Box size={18} color="#38bdf8" />;
    }
  };

  return (
    <aside className="inspector-drawer" aria-label="Technical Metadata Inspector">
      {/* Drawer Header */}
      <div className="inspector-header">
        <div className="inspector-header-left">
          <div className="inspector-node-icon">{getNodeIcon()}</div>
          <div className="inspector-title-wrap">
            <span className="inspector-title">Inspector</span>
            <span className="inspector-node-id">{node.id}</span>
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="inspector-close-btn"
          title="Close Inspector"
          aria-label="Close"
        >
          <X size={16} />
        </button>
      </div>

      {/* Drawer Scrollable Content */}
      <div className="inspector-body">
        {/* Section 1: Identity */}
        <div className="inspector-section">
          <label className="inspector-section-label">
            <Tag size={13} className="section-icon" />
            <span>Identity & Role</span>
          </label>

          <div className="inspector-field">
            <label htmlFor="inspector-label-input" className="inspector-field-label">Component Title</label>
            <input
              id="inspector-label-input"
              type="text"
              value={label}
              onChange={(e) => {
                setLabel(e.target.value);
                handleUpdate({ label: e.target.value });
              }}
              placeholder="e.g. Auth Gateway, Postgres Main"
              className="inspector-input"
            />
          </div>

          <div className="inspector-field">
            <label htmlFor="inspector-subtitle-input" className="inspector-field-label">Subtitle / Category Tag</label>
            <input
              id="inspector-subtitle-input"
              type="text"
              value={subtitle}
              onChange={(e) => {
                setSubtitle(e.target.value);
                handleUpdate({ subtitle: e.target.value });
              }}
              placeholder="e.g. SERVICE, PRIMARY DB, INGRESS"
              className="inspector-input"
            />
          </div>

          <div className="inspector-field">
            <label className="inspector-field-label">Architecture Domain (Perspective)</label>
            <div className="inspector-domain-chips">
              {(
                [
                  { id: 'frontend', label: 'Frontend', icon: <Monitor size={12} />, color: '#38bdf8' },
                  { id: 'backend', label: 'Backend', icon: <Server size={12} />, color: '#a855f7' },
                  { id: 'boundary', label: 'Boundary', icon: <FolderDot size={12} />, color: '#94a3b8' },
                ] as const
              ).map((d) => (
                <button
                  key={d.id}
                  type="button"
                  className={`inspector-domain-chip ${domain === d.id ? 'active' : ''}`}
                  onClick={() => {
                    setDomain(d.id);
                    handleUpdate({ domain: d.id });
                  }}
                  style={{
                    borderColor: domain === d.id ? d.color : undefined,
                    color: domain === d.id ? d.color : undefined,
                  }}
                >
                  {d.icon}
                  <span>{d.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Section 2: Tech Stack / Engine */}
        <div className="inspector-section">
          <label className="inspector-section-label">
            <Terminal size={13} className="section-icon" />
            <span>Tech Stack / Engine</span>
          </label>

          <div className="inspector-field">
            <input
              type="text"
              value={techStack}
              onChange={(e) => {
                setTechStack(e.target.value);
                handleUpdate({ techStack: e.target.value });
              }}
              placeholder="e.g. PostgreSQL 16, Go / Gin, Redis v7"
              className="inspector-input"
            />
          </div>

          {/* Quick preset chips */}
          <div className="inspector-preset-chips">
            {TECH_STACK_SUGGESTIONS.map((preset) => (
              <button
                key={preset}
                type="button"
                className={`inspector-chip ${techStack === preset ? 'active' : ''}`}
                onClick={() => {
                  setTechStack(preset);
                  handleUpdate({ techStack: preset });
                }}
              >
                {preset}
              </button>
            ))}
          </div>
        </div>

        {/* Section 3: Port & Protocol */}
        <div className="inspector-section">
          <label className="inspector-section-label">
            <Hash size={13} className="section-icon" />
            <span>Port / Protocol</span>
          </label>

          <div className="inspector-field">
            <input
              type="text"
              value={port}
              onChange={(e) => {
                setPort(e.target.value);
                handleUpdate({ port: e.target.value });
              }}
              placeholder="e.g. 443 / HTTPS, 5432 / TCP, 8080"
              className="inspector-input"
            />
          </div>

          {/* Quick port preset chips */}
          <div className="inspector-preset-chips">
            {PORT_SUGGESTIONS.map((preset) => (
              <button
                key={preset}
                type="button"
                className={`inspector-chip ${port === preset ? 'active' : ''}`}
                onClick={() => {
                  setPort(preset);
                  handleUpdate({ port: preset });
                }}
              >
                {preset}
              </button>
            ))}
          </div>
        </div>

        {/* Section 4: Environment Tag */}
        <div className="inspector-section">
          <label className="inspector-section-label">
            <CheckCircle2 size={13} className="section-icon" />
            <span>Environment Tag</span>
          </label>

          <div className="inspector-env-grid">
            {ENVIRONMENTS.map((env) => {
              const isActive = environment === env.id;
              return (
                <button
                  key={env.id}
                  type="button"
                  className={`inspector-env-btn ${isActive ? 'active' : ''}`}
                  style={{
                    color: isActive ? env.color : '#94a3b8',
                    borderColor: isActive ? env.border : 'rgba(255, 255, 255, 0.08)',
                    backgroundColor: isActive ? env.bg : 'rgba(255, 255, 255, 0.02)',
                  }}
                  onClick={() => {
                    setEnvironment(env.id);
                    handleUpdate({ environment: env.id });
                  }}
                >
                  <span
                    className="env-indicator-dot"
                    style={{ backgroundColor: env.color }}
                  />
                  <span>{env.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Section 5: Notes & Specification */}
        <div className="inspector-section">
          <label className="inspector-section-label">
            <FileText size={13} className="section-icon" />
            <span>Notes & Technical Specs</span>
          </label>

          <div className="inspector-field">
            <textarea
              rows={4}
              value={notes}
              onChange={(e) => {
                setNotes(e.target.value);
                handleUpdate({ notes: e.target.value });
              }}
              placeholder="Describe failover policies, scaling characteristics, JWT auth requirements, replication lag SLAs, etc..."
              className="inspector-textarea"
            />
          </div>
        </div>
      </div>

      {/* Drawer Action Footer */}
      <div className="inspector-footer">
        {onDuplicateNode && (
          <button
            type="button"
            className="inspector-action-btn duplicate-btn"
            onClick={() => onDuplicateNode(node.id)}
            title="Duplicate Node (+25px offset)"
          >
            <Copy size={14} />
            <span>Duplicate</span>
          </button>
        )}
        {onDeleteNode && (
          <button
            type="button"
            className="inspector-action-btn delete-btn"
            onClick={() => onDeleteNode(node.id)}
            title="Delete this Node"
          >
            <Trash2 size={14} />
            <span>Delete</span>
          </button>
        )}
      </div>
    </aside>
  );
};
