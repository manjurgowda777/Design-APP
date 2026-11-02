import React, { useState } from 'react';
import type { NodeShapeType } from '../types/canvas';
import {
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Globe,
  Smartphone,
  Network,
  Cpu,
  Server,
  Zap,
  Database,
  HardDrive,
  Layers,
  Radio,
  Lock,
  Shield,
  Square,
  Circle,
  Diamond,
  Cloud,
  FolderDot,
} from 'lucide-react';

interface ComponentItem {
  shape: NodeShapeType;
  label: string;
  subtitle: string;
  icon: React.ReactNode;
  defaultWidth?: number;
  defaultHeight?: number;
  strokeColor: string;
}

interface ComponentCategory {
  id: string;
  title: string;
  items: ComponentItem[];
}

interface LeftSidebarProps {
  onInsertComponent: (
    shape: NodeShapeType,
    label: string,
    subtitle: string,
    strokeColor: string,
    width?: number,
    height?: number,
    dropPoint?: { x: number; y: number }
  ) => void;
}

export const LeftSidebar: React.FC<LeftSidebarProps> = ({ onInsertComponent }) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    architecture: true,
    flowchart: true,
    boundaries: true,
  });

  const toggleSection = (section: string) => {
    setOpenSections((prev) => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  const categories: ComponentCategory[] = [
    {
      id: 'architecture',
      title: 'Architecture Elements',
      items: [
        // Client
        {
          shape: 'browser',
          label: 'Web Browser',
          subtitle: 'CLIENT',
          icon: <Globe size={16} color="#38bdf8" />,
          strokeColor: '#0ea5e9',
        },
        {
          shape: 'mobile',
          label: 'Mobile App',
          subtitle: 'CLIENT',
          icon: <Smartphone size={16} color="#a855f7" />,
          strokeColor: '#a855f7',
          defaultWidth: 100,
          defaultHeight: 140,
        },
        // Gateways
        {
          shape: 'api-gateway',
          label: 'API Gateway',
          subtitle: 'GATEWAY',
          icon: <Network size={16} color="#818cf8" />,
          strokeColor: '#6366f1',
        },
        {
          shape: 'load-balancer',
          label: 'Load Balancer',
          subtitle: 'GATEWAY',
          icon: <Cpu size={16} color="#6366f1" />,
          strokeColor: '#6366f1',
        },
        {
          shape: 'cdn',
          label: 'CDN Edge',
          subtitle: 'GATEWAY',
          icon: <Cloud size={16} color="#06b6d4" />,
          strokeColor: '#06b6d4',
        },
        // Compute
        {
          shape: 'service',
          label: 'Backend Service',
          subtitle: 'COMPUTE',
          icon: <Server size={16} color="#818cf8" />,
          strokeColor: '#6366f1',
        },
        {
          shape: 'serverless',
          label: 'Serverless (Lambda)',
          subtitle: 'COMPUTE',
          icon: <Zap size={16} color="#f59e0b" />,
          strokeColor: '#f59e0b',
        },
        // Data
        {
          shape: 'database',
          label: 'Database',
          subtitle: 'DATA',
          icon: <Database size={16} color="#34d399" />,
          strokeColor: '#10b981',
        },
        {
          shape: 'cache',
          label: 'Cache (Redis)',
          subtitle: 'DATA',
          icon: <Zap size={16} color="#ef4444" />,
          strokeColor: '#ef4444',
        },
        {
          shape: 'storage',
          label: 'Storage (S3)',
          subtitle: 'DATA',
          icon: <HardDrive size={16} color="#14b8a6" />,
          strokeColor: '#14b8a6',
        },
        // Messaging
        {
          shape: 'queue',
          label: 'Queue (Kafka/RabbitMQ)',
          subtitle: 'MESSAGING',
          icon: <Layers size={16} color="#f59e0b" />,
          strokeColor: '#f59e0b',
        },
        {
          shape: 'pubsub',
          label: 'PubSub / Event Bus',
          subtitle: 'MESSAGING',
          icon: <Radio size={16} color="#fb923c" />,
          strokeColor: '#fb923c',
        },
        // Security
        {
          shape: 'auth',
          label: 'Auth / Security',
          subtitle: 'SECURITY',
          icon: <Lock size={16} color="#ec4899" />,
          strokeColor: '#ec4899',
        },
        {
          shape: 'firewall',
          label: 'Firewall / WAF',
          subtitle: 'SECURITY',
          icon: <Shield size={16} color="#e11d48" />,
          strokeColor: '#e11d48',
        },
      ],
    },
    {
      id: 'flowchart',
      title: 'Flowchart Shapes',
      items: [
        {
          shape: 'rectangle',
          label: 'Process Rectangle',
          subtitle: 'FLOW',
          icon: <Square size={16} color="#94a3b8" />,
          strokeColor: '#64748b',
          defaultWidth: 160,
          defaultHeight: 80,
        },
        {
          shape: 'circle',
          label: 'Circle / State',
          subtitle: 'FLOW',
          icon: <Circle size={16} color="#38bdf8" />,
          strokeColor: '#38bdf8',
          defaultWidth: 90,
          defaultHeight: 90,
        },
        {
          shape: 'diamond',
          label: 'Decision Diamond',
          subtitle: 'FLOW',
          icon: <Diamond size={16} color="#eab308" />,
          strokeColor: '#eab308',
          defaultWidth: 110,
          defaultHeight: 110,
        },
      ],
    },
    {
      id: 'boundaries',
      title: 'System Boundaries',
      items: [
        {
          shape: 'group-container',
          label: 'VPC / Subnet Boundary',
          subtitle: 'BOUNDARY',
          icon: <FolderDot size={16} color="#94a3b8" />,
          strokeColor: 'rgba(148, 163, 184, 0.45)',
          defaultWidth: 420,
          defaultHeight: 280,
        },
      ],
    },
  ];

  return (
    <aside className={`left-sidebar ${isCollapsed ? 'collapsed' : ''}`}>
      {/* Sidebar Header & Collapse Toggle */}
      <div className="sidebar-header">
        {!isCollapsed && <span className="sidebar-title">Components</span>}
        <button
          className="sidebar-collapse-btn"
          onClick={() => setIsCollapsed(!isCollapsed)}
          title={isCollapsed ? 'Expand Component Library' : 'Collapse Sidebar'}
          aria-label="Toggle Sidebar"
        >
          {isCollapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
        </button>
      </div>

      {/* Accordion Categories */}
      {!isCollapsed && (
        <div className="sidebar-scroll-area">
          {categories.map((cat) => {
            const isOpen = openSections[cat.id];
            return (
              <div key={cat.id} className="sidebar-accordion">
                <button
                  className="sidebar-accordion-header"
                  onClick={() => toggleSection(cat.id)}
                >
                  <span className="accordion-title">{cat.title}</span>
                  <ChevronDown
                    size={16}
                    className={`accordion-chevron ${isOpen ? 'open' : ''}`}
                  />
                </button>

                {isOpen && (
                  <div className="sidebar-item-grid">
                    {cat.items.map((item) => (
                      <div
                        key={item.shape + item.label}
                        className="sidebar-component-card"
                        draggable
                        onDragStart={(e) => {
                          e.dataTransfer.setData(
                            'application/json',
                            JSON.stringify(item)
                          );
                        }}
                        onClick={() =>
                          onInsertComponent(
                            item.shape,
                            item.label,
                            item.subtitle,
                            item.strokeColor,
                            item.defaultWidth,
                            item.defaultHeight
                          )
                        }
                        title={`Click to add or drag to canvas: ${item.label}`}
                      >
                        <div className="component-card-icon">{item.icon}</div>
                        <span className="component-card-label">{item.label}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </aside>
  );
};
