import React, { useState, useRef, useEffect } from 'react';
import type { NodeElement, AnchorPosition, Point } from '../types/canvas';
import { getNodeAnchors } from '../utils/math';
import {
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
  Box,
  FolderDot,
  Cloud,
  Info,
} from 'lucide-react';

interface ArchitectureNodeProps {
  node: NodeElement;
  isSelected: boolean;
  isSelectMode: boolean;
  isPenMode?: boolean;
  isDimmed?: boolean;
  isPresentationActive?: boolean;
  isWalkthroughFocused?: boolean;
  stepNumber?: number;
  onSelect: (e: React.MouseEvent, id: string) => void;
  onStartDrag: (e: React.MouseEvent, node: NodeElement) => void;
  onUpdateLabel: (id: string, newLabel: string) => void;
  onAnchorMouseDown?: (e: React.MouseEvent, nodeId: string, anchor: AnchorPosition, point: Point) => void;
  onAnchorMouseUp?: (e: React.MouseEvent, nodeId: string, anchor: AnchorPosition) => void;
  onAnchorHover?: (nodeId: string, anchor: AnchorPosition | null, pos: Point | null) => void;
}

export const ArchitectureNode: React.FC<ArchitectureNodeProps> = ({
  node,
  isSelected,
  isSelectMode,
  isPenMode = false,
  isDimmed = false,
  isPresentationActive = false,
  isWalkthroughFocused = false,
  stepNumber,
  onSelect,
  onStartDrag,
  onUpdateLabel,
  onAnchorMouseDown,
  onAnchorMouseUp,
  onAnchorHover,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(node.label);
  const [hoveredAnchor, setHoveredAnchor] = useState<AnchorPosition | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setEditText(node.label);
  }, [node.label]);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleFinishEditing = () => {
    setIsEditing(false);
    if (editText.trim() && editText !== node.label) {
      onUpdateLabel(node.id, editText.trim());
    } else {
      setEditText(node.label);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleFinishEditing();
    } else if (e.key === 'Escape') {
      setIsEditing(false);
      setEditText(node.label);
    }
  };

  const anchors = getNodeAnchors(node);
  const anchorKeys: AnchorPosition[] = ['top', 'right', 'bottom', 'left'];

  // Categorized themes and icons
  const getNodeTheme = () => {
    switch (node.shape) {
      // Client
      case 'browser':
        return {
          icon: <Globe size={18} color="#38bdf8" />,
          badgeColor: '#0ea5e9',
          tag: 'WEB CLIENT',
          defaultBorder: '#0ea5e9',
        };
      case 'mobile':
        return {
          icon: <Smartphone size={18} color="#a855f7" />,
          badgeColor: '#a855f7',
          tag: 'MOBILE APP',
          defaultBorder: '#a855f7',
        };

      // Gateway
      case 'api-gateway':
        return {
          icon: <Network size={18} color="#818cf8" />,
          badgeColor: '#6366f1',
          tag: 'GATEWAY',
          defaultBorder: '#6366f1',
        };
      case 'load-balancer':
        return {
          icon: <Cpu size={18} color="#6366f1" />,
          badgeColor: '#6366f1',
          tag: 'LOAD BALANCER',
          defaultBorder: '#6366f1',
        };
      case 'cdn':
        return {
          icon: <Cloud size={18} color="#06b6d4" />,
          badgeColor: '#06b6d4',
          tag: 'CDN / EDGE',
          defaultBorder: '#06b6d4',
        };

      // Compute
      case 'service':
        return {
          icon: <Server size={18} color="#818cf8" />,
          badgeColor: '#6366f1',
          tag: 'SERVICE',
          defaultBorder: '#6366f1',
        };
      case 'serverless':
        return {
          icon: <Zap size={18} color="#f59e0b" />,
          badgeColor: '#f59e0b',
          tag: 'SERVERLESS',
          defaultBorder: '#f59e0b',
        };

      // Database
      case 'database':
        return {
          icon: <Database size={18} color="#34d399" />,
          badgeColor: '#10b981',
          tag: 'DATABASE',
          defaultBorder: '#10b981',
        };
      case 'cache':
        return {
          icon: <Zap size={18} color="#ef4444" />,
          badgeColor: '#ef4444',
          tag: 'REDIS CACHE',
          defaultBorder: '#ef4444',
        };
      case 'storage':
        return {
          icon: <HardDrive size={18} color="#14b8a6" />,
          badgeColor: '#14b8a6',
          tag: 'S3 / BLOB',
          defaultBorder: '#14b8a6',
        };

      // Messaging
      case 'queue':
        return {
          icon: <Layers size={18} color="#f59e0b" />,
          badgeColor: '#f59e0b',
          tag: 'QUEUE',
          defaultBorder: '#f59e0b',
        };
      case 'pubsub':
        return {
          icon: <Radio size={18} color="#fb923c" />,
          badgeColor: '#fb923c',
          tag: 'PUBSUB',
          defaultBorder: '#fb923c',
        };

      // Security
      case 'auth':
        return {
          icon: <Lock size={18} color="#ec4899" />,
          badgeColor: '#ec4899',
          tag: 'AUTH / OAUTH',
          defaultBorder: '#ec4899',
        };
      case 'firewall':
        return {
          icon: <Shield size={18} color="#e11d48" />,
          badgeColor: '#e11d48',
          tag: 'WAF / FIREWALL',
          defaultBorder: '#e11d48',
        };

      // Flowchart & Containers
      case 'rectangle':
        return {
          icon: null,
          badgeColor: '#64748b',
          tag: 'PROCESS',
          defaultBorder: '#64748b',
        };
      case 'circle':
        return {
          icon: null,
          badgeColor: '#38bdf8',
          tag: 'FLOW',
          defaultBorder: '#38bdf8',
        };
      case 'diamond':
        return {
          icon: null,
          badgeColor: '#eab308',
          tag: 'DECISION',
          defaultBorder: '#eab308',
        };
      case 'group-container':
        return {
          icon: <FolderDot size={16} color="#94a3b8" />,
          badgeColor: '#94a3b8',
          tag: 'VPC / SUBNET',
          defaultBorder: 'rgba(148, 163, 184, 0.4)',
        };

      default:
        return {
          icon: <Box size={18} color="#38bdf8" />,
          badgeColor: '#0ea5e9',
          tag: 'COMPONENT',
          defaultBorder: '#38bdf8',
        };
    }
  };

  const theme = getNodeTheme();

  // Reusable inline title editor
  const renderTitleEditor = (
    className: string = '',
    customStyle?: React.CSSProperties
  ) => (
    <div className={`arch-node-title-container ${className}`} style={customStyle}>
      {isEditing ? (
        <input
          ref={inputRef}
          type="text"
          value={editText}
          onChange={(e) => setEditText(e.target.value)}
          onBlur={handleFinishEditing}
          onKeyDown={handleKeyDown}
          className="arch-node-input"
        />
      ) : (
        <div className="arch-node-title" title="Double click to edit title">
          {node.label}
        </div>
      )}
    </div>
  );

  // Compact Metadata Badge in the bottom corner (Port, Env, Info)
  const renderMetadataBadge = () => {
    const meta = node.metadata;
    if (!meta || (!meta.port && !meta.techStack && !meta.environment && !meta.notes)) {
      return null;
    }

    let portDisplay = '';
    if (meta.port) {
      const rawPort = meta.port.split('/')[0].trim();
      portDisplay = rawPort.startsWith(':') ? rawPort : `:${rawPort}`;
    }

    const envColorMap: Record<string, string> = {
      production: '#10b981',
      staging: '#f59e0b',
      internal: '#a855f7',
      development: '#38bdf8',
    };
    const envColor = meta.environment ? envColorMap[meta.environment] : undefined;

    const tooltipText = [
      node.label,
      meta.techStack ? `Engine: ${meta.techStack}` : null,
      meta.port ? `Port: ${meta.port}` : null,
      meta.environment ? `Env: ${meta.environment.toUpperCase()}` : null,
      meta.notes ? `Notes: ${meta.notes}` : null,
    ]
      .filter(Boolean)
      .join('\n');

    const badgeW = portDisplay ? Math.min(Math.max(portDisplay.length * 7 + 16, 44), 78) : 24;
    let badgeX = node.width - badgeW - 8;
    let badgeY = node.height - 24;

    if (node.shape === 'api-gateway' || node.shape === 'load-balancer') {
      const inset = Math.min(22, node.width * 0.14);
      badgeX = node.width - inset - badgeW - 6;
      badgeY = node.height - 22;
    } else if (node.shape === 'mobile') {
      badgeX = Math.round((node.width - badgeW) / 2);
      badgeY = node.height - 30;
    } else if (node.shape === 'serverless') {
      const dx = Math.min(22, node.width * 0.16);
      badgeX = node.width - dx - badgeW - 4;
      badgeY = node.height - 22;
    } else if (node.shape === 'queue' || node.shape === 'pubsub') {
      const pillRadius = node.height / 2;
      badgeX = node.width - pillRadius * 0.7 - badgeW;
      badgeY = node.height - 24;
    } else if (node.shape === 'database' || node.shape === 'cache') {
      badgeY = node.height - 24;
      badgeX = node.width - badgeW - 12;
    }

    return (
      <foreignObject
        x={badgeX}
        y={badgeY}
        width={badgeW}
        height={18}
        style={{ overflow: 'visible', pointerEvents: 'none' }}
      >
        <div className="arch-node-meta-badge" title={tooltipText}>
          {envColor && (
            <span
              className="meta-badge-env-dot"
              style={{ backgroundColor: envColor }}
            />
          )}
          {portDisplay ? (
            <span className="meta-badge-text">{portDisplay}</span>
          ) : (
            <Info size={10} className="meta-badge-info-icon" />
          )}
        </div>
      </foreignObject>
    );
  };

  // Render Tailored SVG Silhouettes based on Component Type
  const renderShapeBody = () => {
    const stroke = isSelected ? '#38bdf8' : node.strokeColor || theme.defaultBorder;
    const strokeWidth = isSelected ? 2.5 : node.strokeWidth || 1.5;
    const w = node.width;
    const h = node.height;

    // 1. Group Container (VPC / Subnet dashed boundary box)
    if (node.shape === 'group-container') {
      return (
        <g>
          {isSelected && (
            <rect
              x={-5}
              y={-5}
              width={w + 10}
              height={h + 10}
              rx={16}
              fill="none"
              stroke="#38bdf8"
              strokeWidth={2}
              strokeDasharray="6 4"
              opacity={0.8}
            />
          )}
          <rect
            x={0}
            y={0}
            width={w}
            height={h}
            rx={12}
            fill={node.fillColor || 'rgba(15, 23, 42, 0.25)'}
            stroke={stroke}
            strokeWidth={strokeWidth}
            strokeDasharray="8 6"
            className="arch-container-body"
          />
          {/* Container Header Banner */}
          <rect
            x={12}
            y={12}
            width={Math.min(w - 24, 200)}
            height={26}
            rx={6}
            fill="rgba(30, 41, 59, 0.85)"
            stroke="rgba(255, 255, 255, 0.08)"
          />
          <foreignObject x={16} y={15} width={Math.min(w - 32, 192)} height={20}>
            <div className="arch-container-header">
              <span className="arch-container-icon">{theme.icon}</span>
              <span className="arch-container-label">{node.label}</span>
            </div>
          </foreignObject>
          {renderMetadataBadge()}
        </g>
      );
    }

    // 2. Circle / Flowchart State
    if (node.shape === 'circle') {
      const r = Math.min(w, h) / 2;
      const cx = w / 2;
      const cy = h / 2;
      return (
        <g>
          {isSelected && (
            <circle
              cx={cx}
              cy={cy}
              r={r + 5}
              fill="none"
              stroke="#38bdf8"
              strokeWidth={2}
              strokeDasharray="5 3"
              opacity={0.9}
            />
          )}
          <circle
            cx={cx}
            cy={cy}
            r={r}
            fill={node.fillColor || '#1e293b'}
            stroke={stroke}
            strokeWidth={strokeWidth}
            filter="drop-shadow(0 8px 16px rgba(0,0,0,0.45))"
          />
          <foreignObject
            x={cx - r * 0.7}
            y={cy - r * 0.7}
            width={r * 1.4}
            height={r * 1.4}
            onDoubleClick={(e) => {
              e.stopPropagation();
              setIsEditing(true);
            }}
          >
            {renderTitleEditor()}
          </foreignObject>
          {renderMetadataBadge()}
        </g>
      );
    }

    // 3. Diamond / Flowchart Decision
    if (node.shape === 'diamond') {
      const cx = w / 2;
      const cy = h / 2;
      const points = `${cx},0 ${w},${cy} ${cx},${h} 0,${cy}`;
      const haloPoints = `${cx},-5 ${w + 5},${cy} ${cx},${h + 5} -5,${cy}`;

      return (
        <g>
          {isSelected && (
            <polygon
              points={haloPoints}
              fill="none"
              stroke="#38bdf8"
              strokeWidth={2}
              strokeDasharray="5 3"
              opacity={0.9}
            />
          )}
          <polygon
            points={points}
            fill={node.fillColor || '#1e293b'}
            stroke={stroke}
            strokeWidth={strokeWidth}
            filter="drop-shadow(0 8px 16px rgba(0,0,0,0.45))"
          />
          <foreignObject
            x={w * 0.18}
            y={h * 0.22}
            width={w * 0.64}
            height={h * 0.56}
            onDoubleClick={(e) => {
              e.stopPropagation();
              setIsEditing(true);
            }}
          >
            {renderTitleEditor()}
          </foreignObject>
          {renderMetadataBadge()}
        </g>
      );
    }

    // 4. Database & Cache: 3D Cylinder / Drum
    if (node.shape === 'database' || node.shape === 'cache') {
      const ry = Math.min(13, h * 0.16);
      const rx = w / 2;
      const cx = w / 2;
      const cy = ry;

      return (
        <g>
          {isSelected && (
            <g>
              <ellipse
                cx={cx}
                cy={cy}
                rx={rx + 4}
                ry={ry + 3}
                fill="none"
                stroke="#38bdf8"
                strokeWidth={2}
                strokeDasharray="5 3"
                opacity={0.9}
              />
              <path
                d={`M -4,${cy} L -4,${h - ry + 4} A ${rx + 4},${ry + 3} 0 0,0 ${w + 4},${h - ry + 4} L ${w + 4},${cy}`}
                fill="none"
                stroke="#38bdf8"
                strokeWidth={2}
                strokeDasharray="5 3"
                opacity={0.9}
              />
            </g>
          )}

          {/* 3D Cylinder Body Wall */}
          <path
            d={`M 0,${cy} A ${rx},${ry} 0 0,0 ${w},${cy} L ${w},${h - ry} A ${rx},${ry} 0 0,1 0,${h - ry} Z`}
            fill={node.fillColor || '#1e293b'}
            stroke={stroke}
            strokeWidth={strokeWidth}
            filter="drop-shadow(0 8px 16px rgba(0,0,0,0.45))"
          />

          {/* Bottom Rim */}
          <path
            d={`M 0,${h - ry} A ${rx},${ry} 0 0,0 ${w},${h - ry}`}
            fill="none"
            stroke={stroke}
            strokeWidth={strokeWidth}
          />

          {/* Mid Groove Divider (disk platter segment line) */}
          <path
            d={`M 0,${cy + (h - 2 * ry) * 0.48} A ${rx},${ry} 0 0,0 ${w},${cy + (h - 2 * ry) * 0.48}`}
            fill="none"
            stroke="rgba(255, 255, 255, 0.08)"
            strokeWidth={1.5}
          />

          {/* Top Elliptical Lid */}
          <ellipse
            cx={cx}
            cy={cy}
            rx={rx}
            ry={ry}
            fill="rgba(255, 255, 255, 0.07)"
            stroke={stroke}
            strokeWidth={strokeWidth}
          />

          {/* Component Icon & Category Badge */}
          {theme.icon && (
            <foreignObject x={16} y={ry + 6} width={w - 32} height={20}>
              <div className="arch-node-header">
                <div className="arch-node-icon">{theme.icon}</div>
                <span
                  className="arch-node-badge"
                  style={{ color: theme.badgeColor, borderColor: `${theme.badgeColor}40` }}
                >
                  {node.subtitle || theme.tag}
                </span>
              </div>
            </foreignObject>
          )}

          {/* Editable Title */}
          <foreignObject
            x={14}
            y={theme.icon ? ry + 28 : ry + 12}
            width={w - 28}
            height={h - ry * 2 - (theme.icon ? 32 : 16)}
            onDoubleClick={(e) => {
              e.stopPropagation();
              setIsEditing(true);
            }}
          >
            {renderTitleEditor()}
          </foreignObject>

          {renderMetadataBadge()}
        </g>
      );
    }

    // 5. Queue & Pub/Sub: Pipe / Full Capsule
    if (node.shape === 'queue' || node.shape === 'pubsub') {
      const pillRadius = h / 2;

      return (
        <g>
          {isSelected && (
            <rect
              x={-5}
              y={-5}
              width={w + 10}
              height={h + 10}
              rx={pillRadius + 5}
              fill="none"
              stroke="#38bdf8"
              strokeWidth={2}
              strokeDasharray="5 3"
              opacity={0.9}
            />
          )}

          {/* Pill Capsule Body */}
          <rect
            x={0}
            y={0}
            width={w}
            height={h}
            rx={pillRadius}
            fill={node.fillColor || '#1e293b'}
            stroke={stroke}
            strokeWidth={strokeWidth}
            filter="drop-shadow(0 8px 16px rgba(0,0,0,0.45))"
          />

          {/* Pipe segment ring stripes */}
          <line
            x1={pillRadius * 0.7}
            y1={2}
            x2={pillRadius * 0.7}
            y2={h - 2}
            stroke="rgba(255, 255, 255, 0.12)"
            strokeWidth={2}
            strokeDasharray="3 3"
          />
          <line
            x1={w - pillRadius * 0.7}
            y1={2}
            x2={w - pillRadius * 0.7}
            y2={h - 2}
            stroke="rgba(255, 255, 255, 0.12)"
            strokeWidth={2}
            strokeDasharray="3 3"
          />

          {/* Header Accent Pill */}
          {theme.icon && (
            <rect
              x={pillRadius * 0.75}
              y={10}
              width={w - pillRadius * 1.5}
              height={26}
              rx={6}
              fill="rgba(255, 255, 255, 0.04)"
            />
          )}

          {/* Component Icon & Category Badge */}
          {theme.icon && (
            <foreignObject
              x={pillRadius * 0.75 + 4}
              y={13}
              width={w - pillRadius * 1.5 - 8}
              height={20}
            >
              <div className="arch-node-header">
                <div className="arch-node-icon">{theme.icon}</div>
                <span
                  className="arch-node-badge"
                  style={{ color: theme.badgeColor, borderColor: `${theme.badgeColor}40` }}
                >
                  {node.subtitle || theme.tag}
                </span>
              </div>
            </foreignObject>
          )}

          {/* Editable Title */}
          <foreignObject
            x={pillRadius * 0.75}
            y={theme.icon ? 40 : 12}
            width={w - pillRadius * 1.5}
            height={h - (theme.icon ? 48 : 24)}
            onDoubleClick={(e) => {
              e.stopPropagation();
              setIsEditing(true);
            }}
          >
            {renderTitleEditor()}
          </foreignObject>

          {renderMetadataBadge()}
        </g>
      );
    }

    // 6. Gateways: Inverted Trapezoid / Funnel
    if (node.shape === 'api-gateway' || node.shape === 'load-balancer') {
      const inset = Math.min(22, w * 0.14);
      const points = `0,0 ${w},0 ${w - inset},${h} ${inset},${h}`;
      const haloPoints = `-5,-5 ${w + 5},-5 ${w - inset + 5},${h + 5} ${inset - 5},${h + 5}`;

      return (
        <g>
          {isSelected && (
            <polygon
              points={haloPoints}
              fill="none"
              stroke="#38bdf8"
              strokeWidth={2}
              strokeDasharray="5 3"
              opacity={0.9}
            />
          )}

          {/* Inverted Trapezoid Body */}
          <polygon
            points={points}
            fill={node.fillColor || '#1e293b'}
            stroke={stroke}
            strokeWidth={strokeWidth}
            filter="drop-shadow(0 8px 16px rgba(0,0,0,0.45))"
          />

          {/* Top Funnel Chevron Guide Line */}
          <line
            x1={inset * 0.5}
            y1={32}
            x2={w - inset * 0.5}
            y2={32}
            stroke="rgba(255, 255, 255, 0.08)"
            strokeWidth={1}
          />

          {/* Component Icon & Category Badge */}
          {theme.icon && (
            <foreignObject x={16} y={8} width={w - 32} height={20}>
              <div className="arch-node-header">
                <div className="arch-node-icon">{theme.icon}</div>
                <span
                  className="arch-node-badge"
                  style={{ color: theme.badgeColor, borderColor: `${theme.badgeColor}40` }}
                >
                  {node.subtitle || theme.tag}
                </span>
              </div>
            </foreignObject>
          )}

          {/* Editable Title */}
          <foreignObject
            x={inset + 4}
            y={theme.icon ? 38 : 12}
            width={w - 2 * (inset + 4)}
            height={h - (theme.icon ? 44 : 20)}
            onDoubleClick={(e) => {
              e.stopPropagation();
              setIsEditing(true);
            }}
          >
            {renderTitleEditor()}
          </foreignObject>

          {renderMetadataBadge()}
        </g>
      );
    }

    // 7. Serverless / Lambda: Hexagon
    if (node.shape === 'serverless') {
      const dx = Math.min(22, w * 0.16);
      const points = `${dx},0 ${w - dx},0 ${w},${h * 0.5} ${w - dx},${h} ${dx},${h} 0,${h * 0.5}`;
      const haloPoints = `${dx - 3},-5 ${w - dx + 3},-5 ${w + 5},${h * 0.5} ${w - dx + 3},${h + 5} ${dx - 3},${h + 5} -5,${h * 0.5}`;

      return (
        <g>
          {isSelected && (
            <polygon
              points={haloPoints}
              fill="none"
              stroke="#38bdf8"
              strokeWidth={2}
              strokeDasharray="5 3"
              opacity={0.9}
            />
          )}

          {/* Hexagon Body */}
          <polygon
            points={points}
            fill={node.fillColor || '#1e293b'}
            stroke={stroke}
            strokeWidth={strokeWidth}
            filter="drop-shadow(0 8px 16px rgba(0,0,0,0.45))"
          />

          {/* Inner Accent Line */}
          <polygon
            points={`${dx + 4},4 ${w - dx - 4},4 ${w - 5},${h * 0.5} ${w - dx - 4},${h - 4} ${dx + 4},${h - 4} 5,${h * 0.5}`}
            fill="none"
            stroke="rgba(255, 255, 255, 0.05)"
            strokeWidth={1}
          />

          {/* Component Icon & Category Badge */}
          {theme.icon && (
            <foreignObject x={dx + 4} y={10} width={w - 2 * (dx + 4)} height={20}>
              <div className="arch-node-header">
                <div className="arch-node-icon">{theme.icon}</div>
                <span
                  className="arch-node-badge"
                  style={{ color: theme.badgeColor, borderColor: `${theme.badgeColor}40` }}
                >
                  {node.subtitle || theme.tag}
                </span>
              </div>
            </foreignObject>
          )}

          {/* Editable Title */}
          <foreignObject
            x={dx + 4}
            y={theme.icon ? 38 : 12}
            width={w - 2 * (dx + 4)}
            height={h - (theme.icon ? 44 : 20)}
            onDoubleClick={(e) => {
              e.stopPropagation();
              setIsEditing(true);
            }}
          >
            {renderTitleEditor()}
          </foreignObject>

          {renderMetadataBadge()}
        </g>
      );
    }

    // 8. Mobile Client: Tall Portrait Smartphone with speaker pill & home bar
    if (node.shape === 'mobile') {
      const radius = 18;

      return (
        <g>
          {isSelected && (
            <rect
              x={-5}
              y={-5}
              width={w + 10}
              height={h + 10}
              rx={radius + 4}
              fill="none"
              stroke="#38bdf8"
              strokeWidth={2}
              strokeDasharray="5 3"
              opacity={0.9}
            />
          )}

          {/* Phone Body */}
          <rect
            x={0}
            y={0}
            width={w}
            height={h}
            rx={radius}
            fill={node.fillColor || '#1e293b'}
            stroke={stroke}
            strokeWidth={strokeWidth}
            filter="drop-shadow(0 8px 16px rgba(0,0,0,0.45))"
          />

          {/* Top Camera Speaker Pill & Front Lens */}
          <rect
            x={w / 2 - 14}
            y={7}
            width={28}
            height={4}
            rx={2}
            fill="rgba(255, 255, 255, 0.25)"
          />
          <circle
            cx={w / 2 + 18}
            cy={9}
            r={1.8}
            fill="rgba(255, 255, 255, 0.2)"
          />

          {/* Bottom Home Indicator Bar */}
          <rect
            x={w / 2 - 18}
            y={h - 10}
            width={36}
            height={3}
            rx={1.5}
            fill="rgba(255, 255, 255, 0.25)"
          />

          {/* Component Icon & Category Badge */}
          {theme.icon && (
            <foreignObject x={8} y={18} width={w - 16} height={20}>
              <div className="arch-node-header" style={{ justifyContent: 'center' }}>
                <div className="arch-node-icon">{theme.icon}</div>
                <span
                  className="arch-node-badge"
                  style={{ color: theme.badgeColor, borderColor: `${theme.badgeColor}40` }}
                >
                  {node.subtitle || theme.tag}
                </span>
              </div>
            </foreignObject>
          )}

          {/* Editable Title */}
          <foreignObject
            x={8}
            y={theme.icon ? 44 : 16}
            width={w - 16}
            height={h - (theme.icon ? 66 : 30)}
            onDoubleClick={(e) => {
              e.stopPropagation();
              setIsEditing(true);
            }}
          >
            {renderTitleEditor()}
          </foreignObject>

          {renderMetadataBadge()}
        </g>
      );
    }

    // 9. Web Browser: Card with top header stripe and 3 colored window control dots
    if (node.shape === 'browser') {
      const radius = 12;

      return (
        <g>
          {isSelected && (
            <rect
              x={-5}
              y={-5}
              width={w + 10}
              height={h + 10}
              rx={radius + 4}
              fill="none"
              stroke="#38bdf8"
              strokeWidth={2}
              strokeDasharray="5 3"
              opacity={0.9}
            />
          )}

          {/* Browser Window Body */}
          <rect
            x={0}
            y={0}
            width={w}
            height={h}
            rx={radius}
            fill={node.fillColor || '#1e293b'}
            stroke={stroke}
            strokeWidth={strokeWidth}
            filter="drop-shadow(0 8px 16px rgba(0,0,0,0.45))"
          />

          {/* Top Window Header Bar */}
          <path
            d={`M 0,${radius} A ${radius},${radius} 0 0,1 ${radius},0 L ${w - radius},0 A ${radius},${radius} 0 0,1 ${w},${radius} L ${w},26 L 0,26 Z`}
            fill="rgba(255, 255, 255, 0.06)"
          />
          <line
            x1={0}
            y1={26}
            x2={w}
            y2={26}
            stroke="rgba(255, 255, 255, 0.08)"
            strokeWidth={1}
          />

          {/* 3 Colored Window Dots */}
          <circle cx={14} cy={13} r={3.5} fill="#ef4444" />
          <circle cx={25} cy={13} r={3.5} fill="#f59e0b" />
          <circle cx={36} cy={13} r={3.5} fill="#10b981" />

          {/* Mock URL / Address Bar */}
          <rect
            x={48}
            y={6}
            width={Math.max(w - 60, 40)}
            height={14}
            rx={4}
            fill="rgba(15, 23, 42, 0.6)"
            stroke="rgba(255, 255, 255, 0.07)"
            strokeWidth={1}
          />
          <text
            x={54}
            y={16.5}
            fill="#64748b"
            fontSize={8}
            fontFamily="monospace"
            pointerEvents="none"
          >
            https://app.io
          </text>

          {/* Component Icon & Category Badge */}
          {theme.icon && (
            <foreignObject x={16} y={32} width={w - 32} height={20}>
              <div className="arch-node-header">
                <div className="arch-node-icon">{theme.icon}</div>
                <span
                  className="arch-node-badge"
                  style={{ color: theme.badgeColor, borderColor: `${theme.badgeColor}40` }}
                >
                  {node.subtitle || theme.tag}
                </span>
              </div>
            </foreignObject>
          )}

          {/* Editable Title */}
          <foreignObject
            x={14}
            y={theme.icon ? 56 : 30}
            width={w - 28}
            height={h - (theme.icon ? 64 : 36)}
            onDoubleClick={(e) => {
              e.stopPropagation();
              setIsEditing(true);
            }}
          >
            {renderTitleEditor()}
          </foreignObject>

          {renderMetadataBadge()}
        </g>
      );
    }

    // 10. Standard Architecture Component / Rectangle Card
    const radius = 12;
    return (
      <g>
        {isSelected && (
          <rect
            x={-5}
            y={-5}
            width={w + 10}
            height={h + 10}
            rx={radius + 4}
            fill="none"
            stroke="#38bdf8"
            strokeWidth={2}
            strokeDasharray="5 3"
            opacity={0.9}
            className="node-selection-halo"
          />
        )}

        {/* Card Body */}
        <rect
          x={0}
          y={0}
          width={w}
          height={h}
          rx={radius}
          fill={node.fillColor || '#1e293b'}
          stroke={stroke}
          strokeWidth={strokeWidth}
          filter="drop-shadow(0 8px 16px rgba(0,0,0,0.45))"
          className="arch-node-body"
        />

        {/* Top Header Accent Pill */}
        {theme.icon && (
          <rect
            x={12}
            y={12}
            width={w - 24}
            height={28}
            rx={6}
            fill="rgba(255, 255, 255, 0.04)"
          />
        )}

        {/* Component Icon & Category Badge */}
        {theme.icon && (
          <foreignObject x={16} y={16} width={w - 32} height={20}>
            <div className="arch-node-header">
              <div className="arch-node-icon">{theme.icon}</div>
              <span
                className="arch-node-badge"
                style={{ color: theme.badgeColor, borderColor: `${theme.badgeColor}40` }}
              >
                {node.subtitle || theme.tag}
              </span>
            </div>
          </foreignObject>
        )}

        {/* Editable Title */}
        <foreignObject
          x={14}
          y={theme.icon ? 46 : 14}
          width={w - 28}
          height={theme.icon ? h - 54 : h - 28}
          onDoubleClick={(e) => {
            e.stopPropagation();
            setIsEditing(true);
          }}
        >
          {renderTitleEditor()}
        </foreignObject>
        {renderMetadataBadge()}
      </g>
    );
  };

  return (
    <g
      className={`arch-node-group shape-${node.shape} ${isSelected ? 'selected' : ''} ${isDimmed ? 'dimmed' : ''} ${isWalkthroughFocused ? 'walkthrough-focused' : ''}`}
      transform={`translate(${node.x}, ${node.y})`}
      onMouseDown={(e) => {
        if (!isPresentationActive && !isDimmed && isSelectMode && !isPenMode) {
          onSelect(e, node.id);
          onStartDrag(e, node);
        }
      }}
      style={{
        cursor: isPresentationActive || isDimmed ? 'default' : isPenMode ? 'crosshair' : isSelectMode ? 'move' : 'default',
        pointerEvents: isPresentationActive || isDimmed ? 'none' : isPenMode ? 'none' : 'auto',
        opacity: isDimmed ? 0.15 : 1,
        transition: 'opacity 0.3s ease, filter 0.3s ease',
      }}
    >
      {renderShapeBody()}

      {/* Floating Walkthrough Step Number Badge */}
      {isWalkthroughFocused && typeof stepNumber === 'number' && (
        <foreignObject
          x={node.width / 2 - 45}
          y={-34}
          width={90}
          height={30}
          style={{ overflow: 'visible', pointerEvents: 'none' }}
        >
          <div className="walkthrough-floating-step-badge">
            <span className="step-badge-dot" />
            <span>STEP {stepNumber}</span>
          </div>
        </foreignObject>
      )}

      {/* 4 Connection Anchor Points (hidden during presentation) */}
      {!isPresentationActive && anchorKeys.map((side) => {
        const anchorPt = anchors[side];
        // Relative to node top-left (node.x, node.y)
        const relX = anchorPt.x - node.x;
        const relY = anchorPt.y - node.y;
        const isHovered = hoveredAnchor === side;

        return (
          <g
            key={side}
            className={`anchor-point-wrapper ${isHovered ? 'hovered' : ''}`}
            onMouseDown={(e) => {
              e.stopPropagation();
              if (onAnchorMouseDown) {
                onAnchorMouseDown(e, node.id, side, anchorPt);
              }
            }}
            onMouseUp={(e) => {
              e.stopPropagation();
              if (onAnchorMouseUp) {
                onAnchorMouseUp(e, node.id, side);
              }
            }}
            onMouseEnter={() => {
              setHoveredAnchor(side);
              if (onAnchorHover) onAnchorHover(node.id, side, anchorPt);
            }}
            onMouseLeave={() => {
              setHoveredAnchor(null);
              if (onAnchorHover) onAnchorHover(node.id, null, null);
            }}
          >
            {/* Extended invisible hit area */}
            <circle
              cx={relX}
              cy={relY}
              r={12}
              fill="transparent"
              style={{ cursor: 'crosshair' }}
            />
            {/* Visual anchor dot */}
            <circle
              cx={relX}
              cy={relY}
              r={isHovered ? 6 : 4}
              fill={isHovered ? '#38bdf8' : '#94a3b8'}
              stroke="#0f172a"
              strokeWidth={2}
              className="anchor-dot"
            />
          </g>
        );
      })}
    </g>
  );
};
