import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import type {
  ToolMode,
  ViewportTransform,
  NodeElement,
  NodeShapeType,
  ViewPerspective,
  Point,
  AnchorPosition,
  ArrowElement,
  FreehandStroke as FreehandStrokeType,
  DiagramData,
} from './types/canvas';
import { getNodeDomain } from './types/canvas';
import { Toolbar } from './components/Toolbar';
import { LeftSidebar } from './components/LeftSidebar';
import { Canvas } from './components/Canvas';
import { ArchitectureNode } from './components/ArchitectureNode';
import { ArrowRenderer } from './components/ArrowRenderer';
import { FreehandStroke } from './components/FreehandStroke';
import { ContextActionBar } from './components/ContextActionBar';
import { InspectorDrawer } from './components/InspectorDrawer';
import { TemplatesModal } from './components/TemplatesModal';
import { DiagramAsCodeModal } from './components/DiagramAsCodeModal';
import { AiGeneratorModal } from './components/AiGeneratorModal';
import { AuditModal } from './components/AuditModal';
import { PresentationBar } from './components/PresentationBar';
import { CollaborationBar } from './components/CollaborationBar';
import { RemoteCursors } from './components/RemoteCursors';
import { UpgradeToProModal } from './components/UpgradeToProModal';
import { getUserTier, setUserTier } from './utils/tierManager';
import type { UserTier, ProFeature } from './utils/tierManager';
import {
  CollaborationClient,
  getLocalUser,
  getRoomId,
  setRoomIdInHash,
} from './utils/collaboration';
import type { PeerUser } from './utils/collaboration';
import {
  inferWalkthroughSequence,
  calculateStepViewport,
} from './utils/walkthroughEngine';
import type { WalkthroughStep } from './utils/walkthroughEngine';
import { auditArchitectureGraph } from './utils/architectureLinter';
import { estimateArchitectureCost } from './utils/costEstimator';
import {
  generateArchitectureSpec,
  downloadMarkdownFile,
  copyToClipboard,
} from './utils/specGenerator';
import { saveFileLocally } from './utils/electronBridge';
import { CheckCircle2, AlertCircle, X as CloseIcon } from 'lucide-react';
import type { GeneratedDiagramResult } from './utils/aiDiagramGenerator';
import type { ArchitectureTemplate } from './data/templates';
import { clamp, screenToCanvas, getNodeAnchorPoint, snapToGrid, computeSmartGuides } from './utils/math';
import type { GuideLine } from './utils/math';

interface DraggingArrowState {
  startNodeId: string;
  startAnchor: AnchorPosition;
  startPoint: Point;
  currentEndPoint: Point;
}

interface CanvasSnapshot {
  nodes: NodeElement[];
  arrows: ArrowElement[];
  strokes: FreehandStrokeType[];
}

const LOCAL_STORAGE_KEY = 'architecture_whiteboard_diagram_v1';

const DEFAULT_NODES: NodeElement[] = [
  {
    id: 'node-client-1',
    type: 'node',
    shape: 'browser',
    domain: 'frontend',
    x: 60,
    y: 180,
    width: 170,
    height: 90,
    label: 'React Web Client',
    subtitle: 'WEB CLIENT',
    strokeColor: '#0ea5e9',
    fillColor: '#1e293b',
    strokeWidth: 2,
    metadata: {
      techStack: 'React / Vite SPA',
      port: '443 / HTTPS',
      environment: 'production',
      notes: 'Customer-facing frontend application.',
    },
  },
  {
    id: 'node-service-1',
    type: 'node',
    shape: 'api-gateway',
    domain: 'backend',
    x: 340,
    y: 180,
    width: 180,
    height: 90,
    label: 'API Gateway',
    subtitle: 'GATEWAY',
    strokeColor: '#6366f1',
    fillColor: '#1e293b',
    strokeWidth: 2,
    metadata: {
      techStack: 'Go / Gin v1.9',
      port: '443 / HTTPS',
      environment: 'production',
      notes: 'Ingress reverse proxy handling SSL termination and rate limiting.',
    },
  },
  {
    id: 'node-db-1',
    type: 'node',
    shape: 'database',
    domain: 'backend',
    x: 640,
    y: 180,
    width: 180,
    height: 90,
    label: 'PostgreSQL Primary',
    subtitle: 'DATABASE',
    strokeColor: '#10b981',
    fillColor: '#1e293b',
    strokeWidth: 2,
    metadata: {
      techStack: 'PostgreSQL 16',
      port: '5432 / TCP',
      environment: 'production',
      notes: 'Primary transactional database with WAL replication to standby.',
    },
  },
  {
    id: 'node-queue-1',
    type: 'node',
    shape: 'queue',
    domain: 'backend',
    x: 480,
    y: 350,
    width: 180,
    height: 90,
    label: 'Event Broker',
    subtitle: 'QUEUE',
    strokeColor: '#f59e0b',
    fillColor: '#1e293b',
    strokeWidth: 2,
    metadata: {
      techStack: 'Apache Kafka 3.6',
      port: '9092 / TCP',
      environment: 'staging',
      notes: 'Partitioned event stream for microservices communication.',
    },
  },
];

const DEFAULT_ARROWS: ArrowElement[] = [
  {
    id: 'arrow-init-1',
    type: 'arrow',
    startNodeId: 'node-client-1',
    startAnchor: 'right',
    endNodeId: 'node-service-1',
    endAnchor: 'left',
    startPoint: { x: 230, y: 225 },
    endPoint: { x: 351, y: 225 },
    color: '#0ea5e9',
    strokeWidth: 2,
    arrowHead: 'arrow',
    label: 'HTTPS / REST',
  },
  {
    id: 'arrow-init-2',
    type: 'arrow',
    startNodeId: 'node-service-1',
    startAnchor: 'right',
    endNodeId: 'node-db-1',
    endAnchor: 'left',
    startPoint: { x: 509, y: 225 },
    endPoint: { x: 640, y: 225 },
    color: '#10b981',
    strokeWidth: 2,
    arrowHead: 'arrow',
    label: 'SQL Query :5432',
  },
  {
    id: 'arrow-init-3',
    type: 'arrow',
    startNodeId: 'node-service-1',
    startAnchor: 'bottom',
    endNodeId: 'node-queue-1',
    endAnchor: 'top',
    startPoint: { x: 430, y: 270 },
    endPoint: { x: 570, y: 350 },
    color: '#f59e0b',
    strokeWidth: 2,
    arrowHead: 'arrow',
    label: 'Publish Event',
    strokeStyle: 'dashed',
  },
];

export function App() {
  const [toolMode, setToolMode] = useState<ToolMode>('select');
  const [isSimulatingFlow, setIsSimulatingFlow] = useState<boolean>(false);
  const [viewport, setViewport] = useState<ViewportTransform>({
    x: 0,
    y: 0,
    scale: 1,
  });

  // Initial load from localStorage
  const loadInitialData = (): CanvasSnapshot => {
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (saved) {
        const parsed: DiagramData = JSON.parse(saved);
        if (parsed.nodes && parsed.arrows && parsed.strokes) {
          const nodesWithMeta = parsed.nodes.map((n) => {
            const defaultMatch = DEFAULT_NODES.find((dn) => dn.id === n.id);
            const domain = n.domain || defaultMatch?.domain || getNodeDomain(n.shape);
            if (!n.metadata && defaultMatch?.metadata) {
              return { ...n, domain, metadata: defaultMatch.metadata };
            }
            return { ...n, domain };
          });
          return {
            nodes: nodesWithMeta,
            arrows: parsed.arrows,
            strokes: parsed.strokes,
          };
        }
      }
    } catch (e) {
      console.warn('Failed to load diagram from localStorage:', e);
    }
    return {
      nodes: DEFAULT_NODES,
      arrows: DEFAULT_ARROWS,
      strokes: [],
    };
  };

  const initialData = useMemo(() => loadInitialData(), []);

  // View Perspective State ('all' | 'frontend' | 'backend')
  const [viewPerspective, setViewPerspective] = useState<ViewPerspective>('all');

  // Main Canvas State
  const [nodes, setNodes] = useState<NodeElement[]>(initialData.nodes);
  const [arrows, setArrows] = useState<ArrowElement[]>(initialData.arrows);
  const [strokes, setStrokes] = useState<FreehandStrokeType[]>(initialData.strokes);

  // Active in-progress stroke
  const [activeStroke, setActiveStroke] = useState<FreehandStrokeType | null>(null);

  // Selected element IDs (Multi-select support)
  const [selectedNodeIds, setSelectedNodeIds] = useState<string[]>([]);
  const selectedNodeId = selectedNodeIds.length === 1 ? selectedNodeIds[0] : null;
  const setSelectedNodeId = useCallback((id: string | null) => {
    setSelectedNodeIds(id ? [id] : []);
  }, []);
  const [selectedArrowId, setSelectedArrowId] = useState<string | null>(null);
  const [selectedStrokeId, setSelectedStrokeId] = useState<string | null>(null);

  // Technical Metadata Inspector Drawer state
  const [isInspectorOpen, setIsInspectorOpen] = useState(true);

  // Starter Templates & Diagram-as-Code Modals state
  const [isTemplatesModalOpen, setIsTemplatesModalOpen] = useState(false);
  const [isMermaidModalOpen, setIsMermaidModalOpen] = useState(false);
  const [isAiModalOpen, setIsAiModalOpen] = useState(false);

  // Architecture Audit & Cloud Cost Suite state
  const [isAuditModalOpen, setIsAuditModalOpen] = useState(false);
  const [auditInitialTab, setAuditInitialTab] = useState<'audit' | 'cost'>('audit');

  // Temporary Toast Notification state
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'info' | 'error' } | null>(null);
  const toastTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = useCallback((message: string, type: 'success' | 'info' | 'error' = 'success') => {
    if (toastTimeoutRef.current) {
      clearTimeout(toastTimeoutRef.current);
    }
    setToast({ message, type });
    toastTimeoutRef.current = setTimeout(() => {
      setToast(null);
    }, 3500);
  }, []);

  // User Tier Gate & Feature Flag State ('free' | 'pro')
  const [userTier, setUserTierState] = useState<UserTier>(() => getUserTier());
  const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState(false);
  const [upgradeTargetFeature, setUpgradeTargetFeature] = useState<ProFeature | null>(null);

  const handleOpenUpgradeModal = useCallback((feature: ProFeature) => {
    setUpgradeTargetFeature(feature);
    setIsUpgradeModalOpen(true);
  }, []);

  const handleTierChange = useCallback((newTier: UserTier) => {
    setUserTier(newTier);
    setUserTierState(newTier);
    showToast(
      newTier === 'pro'
        ? '⚡ Pro Tier activated! All enterprise features are unlocked.'
        : 'Switched to Free Tier.',
      'info'
    );
  }, [showToast]);

  // Live Multi-User Collaboration State
  const [localUser] = useState<PeerUser>(() => getLocalUser());
  const [roomId] = useState<string>(() => {
    const rid = getRoomId();
    setRoomIdInHash(rid);
    return rid;
  });
  const [peers, setPeers] = useState<PeerUser[]>([]);
  const collabClientRef = useRef<CollaborationClient | null>(null);
  const isRemoteUpdateRef = useRef(false);
  const prevSyncPayloadRef = useRef<string>('');

  // Initialize Collaboration BroadcastChannel client
  useEffect(() => {
    const client = new CollaborationClient({
      onPeersChange: (updatedPeers) => {
        setPeers(updatedPeers);
      },
      onRemoteStateChange: (remoteNodes, remoteArrows) => {
        isRemoteUpdateRef.current = true;
        prevSyncPayloadRef.current = JSON.stringify({ nodes: remoteNodes, arrows: remoteArrows });
        setNodes(remoteNodes);
        setArrows(remoteArrows);
      },
      onPeerCursorMove: () => {
        // Handled through peers update
      },
    });

    collabClientRef.current = client;

    return () => {
      client.destroy();
      collabClientRef.current = null;
    };
  }, []);

  // Broadcast state changes (nodes and arrows) to connected peers
  useEffect(() => {
    if (isRemoteUpdateRef.current) {
      isRemoteUpdateRef.current = false;
      return;
    }
    const serialized = JSON.stringify({ nodes, arrows });
    if (serialized === prevSyncPayloadRef.current) return;
    prevSyncPayloadRef.current = serialized;

    collabClientRef.current?.broadcastState(nodes, arrows);
  }, [nodes, arrows]);

  // Pointer coordinate broadcast handler
  const handleCursorMove = useCallback((pt: Point | null) => {
    collabClientRef.current?.broadcastCursor(pt);
  }, []);

  // Share Board link handler
  const handleShareBoard = useCallback(() => {
    const shareUrl = `${window.location.origin}${window.location.pathname}#room=${roomId}`;
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard
        .writeText(shareUrl)
        .then(() => {
          showToast(`Share link copied to clipboard! Room: ${roomId}`, 'success');
        })
        .catch(() => {
          copyToClipboard(shareUrl);
          showToast(`Share link copied to clipboard! Room: ${roomId}`, 'success');
        });
    } else {
      copyToClipboard(shareUrl);
      showToast(`Share link copied to clipboard! Room: ${roomId}`, 'success');
    }
  }, [roomId, showToast]);

  // Interactive Presentation / Request Walkthrough Mode state
  const [isPresentationActive, setIsPresentationActive] = useState(false);
  const [presentationSteps, setPresentationSteps] = useState<WalkthroughStep[]>([]);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);

  // Jump to specific step
  const handleSelectPresentationStep = useCallback(
    (index: number) => {
      if (index < 0 || index >= presentationSteps.length) return;
      setCurrentStepIndex(index);
      const targetStep = presentationSteps[index];
      const targetViewport = calculateStepViewport(targetStep, window.innerWidth, window.innerHeight);
      setViewport(targetViewport);
    },
    [presentationSteps]
  );

  // Start Presentation Mode
  const handleStartPresentation = useCallback(() => {
    const steps = inferWalkthroughSequence(nodes, arrows);
    if (steps.length === 0) {
      showToast('No architecture components found to present.', 'info');
      return;
    }
    setPresentationSteps(steps);
    setCurrentStepIndex(0);
    setIsPresentationActive(true);
    setSelectedNodeIds([]);
    setSelectedArrowId(null);
    setSelectedStrokeId(null);
    setIsInspectorOpen(false);

    // Frame the first step
    const firstStep = steps[0];
    const targetViewport = calculateStepViewport(firstStep, window.innerWidth, window.innerHeight);
    setViewport(targetViewport);
    showToast(`Started Walkthrough (${steps.length} Steps)`, 'info');
  }, [nodes, arrows, showToast]);

  const handleNextPresentationStep = useCallback(() => {
    if (currentStepIndex < presentationSteps.length - 1) {
      handleSelectPresentationStep(currentStepIndex + 1);
    }
  }, [currentStepIndex, presentationSteps.length, handleSelectPresentationStep]);

  const handlePrevPresentationStep = useCallback(() => {
    if (currentStepIndex > 0) {
      handleSelectPresentationStep(currentStepIndex - 1);
    }
  }, [currentStepIndex, handleSelectPresentationStep]);

  const handleExitPresentation = useCallback(() => {
    setIsPresentationActive(false);
    setViewport((prev) => ({ ...prev, scale: 1 }));
  }, []);

  const handleRestartPresentation = useCallback(() => {
    handleSelectPresentationStep(0);
  }, [handleSelectPresentationStep]);

  // Live Architecture Audit & Cloud Cost Engine
  const liveAudit = useMemo(() => auditArchitectureGraph(nodes, arrows), [nodes, arrows]);
  const liveCost = useMemo(() => estimateArchitectureCost(nodes), [nodes]);

  // Handle one-click node highlight from audit drawer
  const handleHighlightNode = useCallback((nodeId: string) => {
    const targetNode = nodes.find((n) => n.id === nodeId);
    if (targetNode) {
      setSelectedNodeIds([nodeId]);
      setSelectedArrowId(null);
      setSelectedStrokeId(null);
      setIsInspectorOpen(true);
      const nodeCenterX = targetNode.x + targetNode.width / 2;
      const nodeCenterY = targetNode.y + targetNode.height / 2;
      setViewport({
        x: Math.round(window.innerWidth / 2 - nodeCenterX),
        y: Math.round(window.innerHeight / 2 - nodeCenterY),
        scale: 1,
      });
    }
  }, [nodes]);

  // Marquee selection box state
  const [marqueeBox, setMarqueeBox] = useState<{ x: number; y: number; width: number; height: number } | null>(null);
  const marqueeStartPointRef = useRef<Point | null>(null);

  // Interactive Arrow Creation State (drag line)
  const [draggingArrow, setDraggingArrow] = useState<DraggingArrowState | null>(null);
  const draggingArrowRef = useRef<DraggingArrowState | null>(null);
  draggingArrowRef.current = draggingArrow;

  // Track hovered target anchor during arrow creation
  const hoveredTargetAnchorRef = useRef<{ nodeId: string; anchor: AnchorPosition } | null>(null);

  // Node Dragging State (Unified Group Drag)
  const draggingNodeRef = useRef<{
    primaryNodeId: string;
    startMouseX: number;
    startMouseY: number;
    primaryNodeStartX: number;
    primaryNodeStartY: number;
    nodeStartPositions: Map<string, { x: number; y: number }>;
    hasMoved: boolean;
  } | null>(null);

  // Undo / Redo History Stack
  const [historyPast, setHistoryPast] = useState<CanvasSnapshot[]>([]);
  const [historyFuture, setHistoryFuture] = useState<CanvasSnapshot[]>([]);

  // Smart guide lines shown during drag
  const [activeGuides, setActiveGuides] = useState<GuideLine[]>([]);

  // Push snapshot to history
  const pushHistorySnapshot = useCallback(
    (customSnapshot?: CanvasSnapshot) => {
      const currentSnapshot: CanvasSnapshot = customSnapshot || {
        nodes,
        arrows,
        strokes,
      };
      setHistoryPast((prev) => [...prev.slice(-30), currentSnapshot]);
      setHistoryFuture([]);
    },
    [nodes, arrows, strokes]
  );

  // Fast map lookup of nodes for dynamic arrow re-anchoring
  const nodesMap = useMemo(() => {
    const map = new Map<string, NodeElement>();
    nodes.forEach((n) => map.set(n.id, n));
    return map;
  }, [nodes]);

  // View Perspective filtering helpers
  const isNodeDimmed = useCallback(
    (node: NodeElement): boolean => {
      if (viewPerspective === 'all') return false;
      const domain = getNodeDomain(node.shape, node.domain);
      if (domain === 'boundary') return false;
      return domain !== viewPerspective;
    },
    [viewPerspective]
  );

  const isArrowDimmed = useCallback(
    (arrow: ArrowElement): boolean => {
      if (viewPerspective === 'all') return false;
      const startNode = arrow.startNodeId ? nodesMap.get(arrow.startNodeId) : null;
      const endNode = arrow.endNodeId ? nodesMap.get(arrow.endNodeId) : null;

      if (startNode && endNode) {
        const startDomain = getNodeDomain(startNode.shape, startNode.domain);
        const endDomain = getNodeDomain(endNode.shape, endNode.domain);

        if (viewPerspective === 'frontend') {
          // Full opacity for all 'frontend' nodes and arrows connecting them
          return !(startDomain === 'frontend' && endDomain === 'frontend');
        }
        if (viewPerspective === 'backend') {
          // Full opacity for backend nodes and arrows connecting backend components
          return !(startDomain === 'backend' && endDomain === 'backend');
        }
      } else if (startNode) {
        const startDomain = getNodeDomain(startNode.shape, startNode.domain);
        return startDomain !== viewPerspective;
      } else if (endNode) {
        const endDomain = getNodeDomain(endNode.shape, endNode.domain);
        return endDomain !== viewPerspective;
      }

      return false;
    },
    [viewPerspective, nodesMap]
  );

  // Unified Deletion Handler with Cascade Cleanup
  const handleDeleteSelected = useCallback(() => {
    if (selectedNodeIds.length > 0) {
      // 1. Delete all selected nodes & Cascade clean any connected arrows
      pushHistorySnapshot();
      const idsToDelete = new Set(selectedNodeIds);
      setNodes((prev) => prev.filter((n) => !idsToDelete.has(n.id)));
      setArrows((prev) =>
        prev.filter(
          (a) =>
            (!a.startNodeId || !idsToDelete.has(a.startNodeId)) &&
            (!a.endNodeId || !idsToDelete.has(a.endNodeId))
        )
      );
      setSelectedNodeIds([]);
    } else if (selectedArrowId) {
      // 2. Delete Arrow
      pushHistorySnapshot();
      setArrows((prev) => prev.filter((a) => a.id !== selectedArrowId));
      setSelectedArrowId(null);
    } else if (selectedStrokeId) {
      // 3. Delete Freehand Stroke
      pushHistorySnapshot();
      setStrokes((prev) => prev.filter((s) => s.id !== selectedStrokeId));
      setSelectedStrokeId(null);
    }
  }, [selectedNodeIds, selectedArrowId, selectedStrokeId, pushHistorySnapshot]);

  // Duplicate Selected Element Handler (+25px offset)
  const handleDuplicateSelected = useCallback(() => {
    if (selectedNodeIds.length > 0) {
      pushHistorySnapshot();
      const idMap = new Map<string, string>();
      const newNodes: NodeElement[] = [];

      selectedNodeIds.forEach((id) => {
        const nodeToDup = nodes.find((n) => n.id === id);
        if (nodeToDup) {
          const newId = `node-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
          idMap.set(id, newId);
          newNodes.push({
            ...nodeToDup,
            id: newId,
            x: nodeToDup.x + 25,
            y: nodeToDup.y + 25,
            label: `${nodeToDup.label} (Copy)`,
          });
        }
      });

      // Also duplicate any arrows connecting nodes within the selected group
      const newArrows: ArrowElement[] = [];
      arrows.forEach((arr) => {
        if (arr.startNodeId && arr.endNodeId) {
          const newStart = idMap.get(arr.startNodeId);
          const newEnd = idMap.get(arr.endNodeId);
          if (newStart && newEnd) {
            newArrows.push({
              ...arr,
              id: `arrow-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
              startNodeId: newStart,
              endNodeId: newEnd,
              startPoint: { x: arr.startPoint.x + 25, y: arr.startPoint.y + 25 },
              endPoint: { x: arr.endPoint.x + 25, y: arr.endPoint.y + 25 },
            });
          }
        }
      });

      setNodes((prev) => [...prev, ...newNodes]);
      if (newArrows.length > 0) {
        setArrows((prev) => [...prev, ...newArrows]);
      }
      setSelectedNodeIds(newNodes.map((n) => n.id));
    } else if (selectedArrowId) {
      const arrowToDup = arrows.find((a) => a.id === selectedArrowId);
      if (!arrowToDup) return;
      pushHistorySnapshot();

      const newId = `arrow-${Date.now()}`;
      const duplicatedArrow: ArrowElement = {
        ...arrowToDup,
        id: newId,
        startNodeId: undefined, // Detach from node IDs so it remains an independent copy
        endNodeId: undefined,
        startPoint: {
          x: arrowToDup.startPoint.x + 25,
          y: arrowToDup.startPoint.y + 25,
        },
        endPoint: {
          x: arrowToDup.endPoint.x + 25,
          y: arrowToDup.endPoint.y + 25,
        },
      };

      setArrows((prev) => [...prev, duplicatedArrow]);
      setSelectedArrowId(newId);
    } else if (selectedStrokeId) {
      const strokeToDup = strokes.find((s) => s.id === selectedStrokeId);
      if (!strokeToDup) return;
      pushHistorySnapshot();

      const newId = `stroke-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
      const duplicatedStroke: FreehandStrokeType = {
        ...strokeToDup,
        id: newId,
        points: strokeToDup.points.map((p) => ({
          x: p.x + 25,
          y: p.y + 25,
          pressure: p.pressure,
        })),
      };

      setStrokes((prev) => [...prev, duplicatedStroke]);
      setSelectedStrokeId(newId);
    }
  }, [selectedNodeIds, selectedArrowId, selectedStrokeId, nodes, arrows, strokes, pushHistorySnapshot]);

  // Undo Action
  const handleUndo = useCallback(() => {
    if (historyPast.length === 0) return;
    const previous = historyPast[historyPast.length - 1];
    const newPast = historyPast.slice(0, -1);

    const currentSnapshot: CanvasSnapshot = { nodes, arrows, strokes };
    setHistoryFuture((prev) => [currentSnapshot, ...prev]);
    setHistoryPast(newPast);

    setNodes(previous.nodes);
    setArrows(previous.arrows);
    setStrokes(previous.strokes);
    setSelectedNodeIds([]);
    setSelectedArrowId(null);
    setSelectedStrokeId(null);
  }, [historyPast, nodes, arrows, strokes]);

  // Redo Action
  const handleRedo = useCallback(() => {
    if (historyFuture.length === 0) return;
    const next = historyFuture[0];
    const newFuture = historyFuture.slice(1);

    const currentSnapshot: CanvasSnapshot = { nodes, arrows, strokes };
    setHistoryPast((prev) => [...prev, currentSnapshot]);
    setHistoryFuture(newFuture);

    setNodes(next.nodes);
    setArrows(next.arrows);
    setStrokes(next.strokes);
    setSelectedNodeIds([]);
    setSelectedArrowId(null);
    setSelectedStrokeId(null);
  }, [historyFuture, nodes, arrows, strokes]);

  // Keyboard Shortcuts: Ctrl+Z (Undo), Ctrl+Y (Redo), Delete / Backspace (Delete selected element)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Do NOT trigger shortcuts or deletions if user is currently editing text inside an input or textarea
      const target = e.target as HTMLElement;
      if (
        target?.tagName === 'INPUT' ||
        target?.tagName === 'TEXTAREA' ||
        target?.isContentEditable
      ) {
        return;
      }

      // Undo / Redo
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        if (e.shiftKey) {
          e.preventDefault();
          handleRedo();
        } else {
          e.preventDefault();
          handleUndo();
        }
        return;
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        handleRedo();
        return;
      }

      // Deletion: Delete or Backspace key
      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedNodeIds.length > 0 || selectedArrowId || selectedStrokeId) {
          e.preventDefault();
          handleDeleteSelected();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleUndo, handleRedo, handleDeleteSelected, selectedNodeIds, selectedArrowId, selectedStrokeId]);

  // Auto-save to localStorage on every change
  useEffect(() => {
    const payload: DiagramData = {
      version: 1,
      timestamp: Date.now(),
      nodes,
      arrows,
      strokes,
      viewport,
    };
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(payload));
    } catch (e) {
      console.warn('LocalStorage save error:', e);
    }
  }, [nodes, arrows, strokes, viewport]);

  // Zoom controls
  const handleZoomIn = () => {
    setViewport((prev) => ({
      ...prev,
      scale: clamp(prev.scale * 1.2, 0.1, 5.0),
    }));
  };

  const handleZoomOut = () => {
    setViewport((prev) => ({
      ...prev,
      scale: clamp(prev.scale * 0.8, 0.1, 5.0),
    }));
  };

  const handleResetZoom = () => {
    setViewport({
      x: 0,
      y: 0,
      scale: 1,
    });
  };

  // Add components at viewport center or specific drop coordinate
  const handleInsertComponent = useCallback(
    (
      shape: NodeShapeType,
      label: string,
      subtitle: string,
      strokeColor: string,
      customWidth?: number,
      customHeight?: number,
      dropPoint?: Point
    ) => {
      pushHistorySnapshot();

      const width = customWidth || 180;
      const height = customHeight || 90;

      let targetX = 0;
      let targetY = 0;

      if (dropPoint) {
        targetX = Math.round(dropPoint.x - width / 2);
        targetY = Math.round(dropPoint.y - height / 2);
      } else {
        const screenCenter: Point = {
          x: window.innerWidth / 2,
          y: window.innerHeight / 2,
        };
        const canvasCenter = screenToCanvas(screenCenter, viewport);
        targetX = Math.round(canvasCenter.x - width / 2);
        targetY = Math.round(canvasCenter.y - height / 2);
      }

      const newNode: NodeElement = {
        id: `node-${Date.now()}`,
        type: 'node',
        shape,
        domain: getNodeDomain(shape),
        x: targetX,
        y: targetY,
        width,
        height,
        label,
        subtitle,
        strokeColor,
        fillColor: shape === 'group-container' ? 'rgba(15, 23, 42, 0.25)' : '#1e293b',
        strokeWidth: 2,
      };

      setNodes((prev) => {
        // If it's a container, place it at the beginning of the array so other nodes render on top of it!
        if (shape === 'group-container') {
          return [newNode, ...prev];
        }
        return [...prev, newNode];
      });

      setSelectedNodeId(newNode.id);
      setSelectedArrowId(null);
      setSelectedStrokeId(null);
      setToolMode('select');
    },
    [pushHistorySnapshot, viewport]
  );

  // Drop component on canvas
  const handleDropComponent = useCallback(
    (itemData: any, canvasPoint: Point) => {
      if (!itemData || !itemData.shape) return;
      handleInsertComponent(
        itemData.shape,
        itemData.label || 'Component',
        itemData.subtitle || 'NODE',
        itemData.strokeColor || '#6366f1',
        itemData.defaultWidth,
        itemData.defaultHeight,
        canvasPoint
      );
    },
    [handleInsertComponent]
  );

  // Selection handlers
  const handleSelectNode = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (e.shiftKey) {
      setSelectedNodeIds((prev) =>
        prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
      );
    } else {
      setSelectedNodeIds((prev) => (prev.includes(id) && prev.length > 1 ? prev : [id]));
    }
    setSelectedArrowId(null);
    setSelectedStrokeId(null);
    setIsInspectorOpen(true);
  };

  const handleSelectArrow = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setSelectedArrowId(id);
    setSelectedNodeIds([]);
    setSelectedStrokeId(null);
  };

  const handleSelectStroke = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setSelectedStrokeId(id);
    setSelectedNodeIds([]);
    setSelectedArrowId(null);
  };

  // Drag node initiation (Unified group drag)
  const handleStartDragNode = (e: React.MouseEvent, node: NodeElement) => {
    if (e.button !== 0 || toolMode !== 'select') return;
    e.stopPropagation();

    let effectiveIds = selectedNodeIds;
    if (!effectiveIds.includes(node.id)) {
      effectiveIds = [node.id];
      setSelectedNodeIds([node.id]);
    }

    const nodePositions = new Map<string, { x: number; y: number }>();
    nodes.forEach((n) => {
      if (effectiveIds.includes(n.id)) {
        nodePositions.set(n.id, { x: n.x, y: n.y });
      }
    });

    draggingNodeRef.current = {
      primaryNodeId: node.id,
      startMouseX: e.clientX,
      startMouseY: e.clientY,
      primaryNodeStartX: node.x,
      primaryNodeStartY: node.y,
      nodeStartPositions: nodePositions,
      hasMoved: false,
    };
  };

  // Marquee Selection Handlers
  const handleMarqueeStart = useCallback((canvasPoint: Point) => {
    marqueeStartPointRef.current = canvasPoint;
    setSelectedArrowId(null);
    setSelectedStrokeId(null);
    setMarqueeBox({ x: canvasPoint.x, y: canvasPoint.y, width: 0, height: 0 });
  }, []);

  const handleMarqueeMove = useCallback(
    (currentPoint: Point) => {
      if (!marqueeStartPointRef.current) return;
      const start = marqueeStartPointRef.current;
      const boxX = Math.min(start.x, currentPoint.x);
      const boxY = Math.min(start.y, currentPoint.y);
      const boxW = Math.abs(currentPoint.x - start.x);
      const boxH = Math.abs(currentPoint.y - start.y);

      setMarqueeBox({ x: boxX, y: boxY, width: boxW, height: boxH });

      // Highlight/select intersecting nodes in real time
      if (boxW > 3 || boxH > 3) {
        const matchingIds: string[] = [];
        nodes.forEach((n) => {
          const intersects = !(
            n.x + n.width < boxX ||
            n.x > boxX + boxW ||
            n.y + n.height < boxY ||
            n.y > boxY + boxH
          );
          if (intersects) {
            matchingIds.push(n.id);
          }
        });
        setSelectedNodeIds(matchingIds);
      }
    },
    [nodes]
  );

  const handleMarqueeEnd = useCallback(() => {
    setMarqueeBox(null);
    marqueeStartPointRef.current = null;
  }, []);

  // Node label editing
  const handleUpdateLabel = (id: string, newLabel: string) => {
    pushHistorySnapshot();
    setNodes((prev) =>
      prev.map((n) => (n.id === id ? { ...n, label: newLabel } : n))
    );
  };

  // Node properties & metadata update from Inspector Drawer
  const handleUpdateNode = useCallback(
    (id: string, updates: Partial<NodeElement>) => {
      pushHistorySnapshot();
      setNodes((prev) =>
        prev.map((n) => (n.id === id ? { ...n, ...updates } : n))
      );
    },
    [pushHistorySnapshot]
  );

  const selectedNodeForInspector = useMemo(() => {
    if (selectedNodeIds.length === 1) {
      return nodes.find((n) => n.id === selectedNodeIds[0]) || null;
    }
    return null;
  }, [selectedNodeIds, nodes]);

  // Load starter architecture blueprint
  const handleSelectTemplate = useCallback(
    (template: ArchitectureTemplate, mode: 'replace' | 'append') => {
      pushHistorySnapshot();

      if (mode === 'replace') {
        setNodes(template.nodes);
        setArrows(template.arrows);
        setStrokes([]);
        setSelectedNodeIds([]);
        setSelectedArrowId(null);
        setSelectedStrokeId(null);
        setViewport({ x: 40, y: 30, scale: 1 });
      } else {
        const offsetX = 60;
        const offsetY =
          nodes.length > 0
            ? Math.max(...nodes.map((n) => n.y + n.height)) + 80
            : 60;

        const idMap = new Map<string, string>();
        const appendedNodes: NodeElement[] = template.nodes.map((n) => {
          const newId = `node-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
          idMap.set(n.id, newId);
          return {
            ...n,
            id: newId,
            x: n.x + offsetX,
            y: n.y + offsetY,
          };
        });

        const appendedArrows: ArrowElement[] = template.arrows.map((arr) => {
          const newStart = arr.startNodeId ? idMap.get(arr.startNodeId) : undefined;
          const newEnd = arr.endNodeId ? idMap.get(arr.endNodeId) : undefined;
          return {
            ...arr,
            id: `arrow-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
            startNodeId: newStart || arr.startNodeId,
            endNodeId: newEnd || arr.endNodeId,
            startPoint: { x: arr.startPoint.x + offsetX, y: arr.startPoint.y + offsetY },
            endPoint: { x: arr.endPoint.x + offsetX, y: arr.endPoint.y + offsetY },
          };
        });

        setNodes((prev) => [...prev, ...appendedNodes]);
        setArrows((prev) => [...prev, ...appendedArrows]);
        setSelectedNodeIds(appendedNodes.map((n) => n.id));
      }

      setIsTemplatesModalOpen(false);
    },
    [nodes, pushHistorySnapshot]
  );

  // Handle AI Generated Diagram Drop & Auto-Pan
  const handleDiagramGenerated = useCallback(
    (result: GeneratedDiagramResult, mode: 'append' | 'replace') => {
      pushHistorySnapshot();

      if (mode === 'replace') {
        setNodes(result.nodes);
        setArrows(result.arrows);
        setStrokes([]);
        setSelectedNodeIds(result.nodes.map((n) => n.id));
        setSelectedArrowId(null);
        setSelectedStrokeId(null);
      } else {
        setNodes((prev) => [...prev, ...result.nodes]);
        setArrows((prev) => [...prev, ...result.arrows]);
        setSelectedNodeIds(result.nodes.map((n) => n.id));
      }

      // Auto-pan viewport to focus on the newly generated cluster
      if (result.nodes.length > 0) {
        let minX = Infinity;
        let maxX = -Infinity;
        let minY = Infinity;
        let maxY = -Infinity;

        result.nodes.forEach((n) => {
          if (n.x < minX) minX = n.x;
          if (n.x + n.width > maxX) maxX = n.x + n.width;
          if (n.y < minY) minY = n.y;
          if (n.y + n.height > maxY) maxY = n.y + n.height;
        });

        const clusterCenterX = (minX + maxX) / 2;
        const clusterCenterY = (minY + maxY) / 2;

        setViewport({
          x: Math.round(window.innerWidth / 2 - clusterCenterX),
          y: Math.round(window.innerHeight / 2 - clusterCenterY),
          scale: 1,
        });
      }
    },
    [pushHistorySnapshot]
  );

  // Arrow label editing
  const handleArrowLabelChange = useCallback(
    (id: string, label: string) => {
      pushHistorySnapshot();
      setArrows((prev) =>
        prev.map((a) => (a.id === id ? { ...a, label } : a))
      );
    },
    [pushHistorySnapshot]
  );

  // Arrow style toggle (solid / dashed)
  const handleArrowStyleChange = useCallback(
    (id: string, style: 'solid' | 'dashed') => {
      pushHistorySnapshot();
      setArrows((prev) =>
        prev.map((a) => (a.id === id ? { ...a, strokeStyle: style } : a))
      );
    },
    [pushHistorySnapshot]
  );

  // Arrow: trigger label edit from context action bar
  const [editingArrowLabelId, setEditingArrowLabelId] = useState<string | null>(null);
  const handleArrowLabelEditTrigger = useCallback((id: string) => {
    setEditingArrowLabelId(id);
  }, []);

  // Background click deselects
  const handleCanvasClick = useCallback(() => {
    setSelectedNodeIds([]);
    setSelectedArrowId(null);
    setSelectedStrokeId(null);
  }, []);

  // Freehand Pen Tool Handlers
  const handlePenStart = useCallback((canvasPoint: Point) => {
    const strokeId =
      typeof crypto !== 'undefined' && crypto.randomUUID
        ? `stroke-${crypto.randomUUID()}`
        : `stroke-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

    const newStroke: FreehandStrokeType = {
      id: strokeId,
      type: 'stroke',
      points: [canvasPoint],
      color: '#f43f5e',
      strokeWidth: 3,
    };
    setActiveStroke(newStroke);
    setSelectedNodeId(null);
    setSelectedArrowId(null);
    setSelectedStrokeId(null);
  }, []);

  const handlePenMove = useCallback((canvasPoint: Point) => {
    setActiveStroke((prev) => {
      if (!prev) return null;
      return {
        ...prev,
        points: [...prev.points, canvasPoint],
      };
    });
  }, []);

  const handlePenEnd = useCallback(() => {
    setActiveStroke((current) => {
      if (current && current.points.length > 0) {
        pushHistorySnapshot();
        setStrokes((prev) => [...prev, current]);
      }
      return null;
    });
  }, [pushHistorySnapshot]);

  // Arrow Connection Drag Initiation
  const handleAnchorMouseDown = (
    e: React.MouseEvent,
    nodeId: string,
    anchor: AnchorPosition,
    point: Point
  ) => {
    if (e.button !== 0) return;
    e.stopPropagation();

    const initialState: DraggingArrowState = {
      startNodeId: nodeId,
      startAnchor: anchor,
      startPoint: point,
      currentEndPoint: point,
    };
    setDraggingArrow(initialState);
  };

  // Target anchor hover tracking
  const handleAnchorHover = (
    nodeId: string,
    anchor: AnchorPosition | null
  ) => {
    if (anchor) {
      hoveredTargetAnchorRef.current = { nodeId, anchor };
    } else {
      hoveredTargetAnchorRef.current = null;
    }
  };

  // Target anchor drop handler
  const handleAnchorMouseUp = (
    e: React.MouseEvent,
    targetNodeId: string,
    targetAnchor: AnchorPosition
  ) => {
    e.stopPropagation();
    const activeDrag = draggingArrowRef.current;
    if (!activeDrag) return;

    if (activeDrag.startNodeId !== targetNodeId) {
      pushHistorySnapshot();
      const newArrow: ArrowElement = {
        id: `arrow-${Date.now()}`,
        type: 'arrow',
        startNodeId: activeDrag.startNodeId,
        startAnchor: activeDrag.startAnchor,
        endNodeId: targetNodeId,
        endAnchor: targetAnchor,
        startPoint: activeDrag.startPoint,
        endPoint: activeDrag.currentEndPoint,
        color: '#38bdf8',
        strokeWidth: 2,
        arrowHead: 'arrow',
      };

      setArrows((prev) => [...prev, newArrow]);
      setSelectedArrowId(newArrow.id);
    }

    setDraggingArrow(null);
  };

  // Global mousemove and mouseup listeners
  useEffect(() => {
    const handleGlobalMouseMove = (e: MouseEvent) => {
      // 1. Update Arrow Drag Line
      if (draggingArrowRef.current) {
        const mouseCanvas = screenToCanvas(
          { x: e.clientX, y: e.clientY },
          viewport
        );
        setDraggingArrow((prev) =>
          prev ? { ...prev, currentEndPoint: mouseCanvas } : null
        );
      }

      // 2. Update Node Dragging with Snap-to-Grid + Smart Guides (Unified Group Drag)
      if (draggingNodeRef.current) {
        const {
          primaryNodeId,
          startMouseX,
          startMouseY,
          primaryNodeStartX,
          primaryNodeStartY,
          nodeStartPositions,
        } = draggingNodeRef.current;

        const dx = (e.clientX - startMouseX) / viewport.scale;
        const dy = (e.clientY - startMouseY) / viewport.scale;

        if (Math.abs(dx) > 2 || Math.abs(dy) > 2) {
          if (!draggingNodeRef.current.hasMoved) {
            pushHistorySnapshot();
            draggingNodeRef.current.hasMoved = true;
          }
        }

        // Raw position of primary node before snapping
        const rawX = primaryNodeStartX + dx;
        const rawY = primaryNodeStartY + dy;

        setNodes((prev) => {
          const primaryNode = prev.find((n) => n.id === primaryNodeId);
          if (!primaryNode) return prev;

          // Compute smart guides against nodes outside the dragged group
          const nonDraggedNodes = prev.filter((n) => !nodeStartPositions.has(n.id));
          const tentativeNode: NodeElement = { ...primaryNode, x: rawX, y: rawY };
          const { snappedX: gx, snappedY: gy, guides } = computeSmartGuides(
            tentativeNode,
            nonDraggedNodes
          );

          // Grid snap (secondary)
          const finalX = guides.some((g) => g.axis === 'v') ? gx : snapToGrid(rawX);
          const finalY = guides.some((g) => g.axis === 'h') ? gy : snapToGrid(rawY);

          setActiveGuides(guides);

          const deltaX = Math.round(finalX - primaryNodeStartX);
          const deltaY = Math.round(finalY - primaryNodeStartY);

          return prev.map((n) => {
            const startPos = nodeStartPositions.get(n.id);
            if (startPos) {
              return {
                ...n,
                x: startPos.x + deltaX,
                y: startPos.y + deltaY,
              };
            }
            return n;
          });
        });
      }
    };

    const handleGlobalMouseUp = () => {
      // Clear smart guides on release
      setActiveGuides([]);

      // If arrow was released
      if (draggingArrowRef.current) {
        const target = hoveredTargetAnchorRef.current;
        if (target && target.nodeId !== draggingArrowRef.current.startNodeId) {
          pushHistorySnapshot();
          const newArrow: ArrowElement = {
            id: `arrow-${Date.now()}`,
            type: 'arrow',
            startNodeId: draggingArrowRef.current.startNodeId,
            startAnchor: draggingArrowRef.current.startAnchor,
            endNodeId: target.nodeId,
            endAnchor: target.anchor,
            startPoint: draggingArrowRef.current.startPoint,
            endPoint: draggingArrowRef.current.currentEndPoint,
            color: '#38bdf8',
            strokeWidth: 2,
            arrowHead: 'arrow',
          };
          setArrows((prev) => [...prev, newArrow]);
          setSelectedArrowId(newArrow.id);
        }
        setDraggingArrow(null);
      }

      draggingNodeRef.current = null;
    };

    window.addEventListener('mousemove', handleGlobalMouseMove);
    window.addEventListener('mouseup', handleGlobalMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleGlobalMouseMove);
      window.removeEventListener('mouseup', handleGlobalMouseUp);
    };
  }, [viewport, pushHistorySnapshot]);

  // Export JSON functionality
  const handleExportJson = async () => {
    const data: DiagramData = {
      version: 1,
      timestamp: Date.now(),
      nodes,
      arrows,
      strokes,
      viewport,
    };
    const jsonContent = JSON.stringify(data, null, 2);
    const result = await saveFileLocally(
      `architecture-diagram-${Date.now()}.json`,
      jsonContent,
      [{ name: 'Architecture Diagram (JSON)', extensions: ['json'] }]
    );
    if (result.success) {
      showToast(
        result.filePath ? `Saved diagram to ${result.filePath}` : 'Diagram JSON downloaded!',
        'success'
      );
    }
  };

  // Import JSON functionality
  const handleImportJson = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const parsed: DiagramData = JSON.parse(content);

        if (parsed && Array.isArray(parsed.nodes)) {
          pushHistorySnapshot();
          setNodes(parsed.nodes || []);
          setArrows(parsed.arrows || []);
          setStrokes(parsed.strokes || []);
          if (parsed.viewport) {
            setViewport(parsed.viewport);
          }
          setSelectedNodeId(null);
          setSelectedArrowId(null);
          setSelectedStrokeId(null);
        } else {
          alert('Invalid diagram file format');
        }
      } catch (err) {
        console.error('Failed to import JSON diagram:', err);
        alert('Could not parse JSON diagram file');
      }
    };
    reader.readAsText(file);
  };

  // Helper to extract clean SVG content with inline styling
  const getPreparedSvgElement = (): SVGSVGElement | null => {
    const svgElem = document.getElementById(
      'architecture-canvas-svg'
    ) as SVGSVGElement | null;
    if (!svgElem) return null;

    const clone = svgElem.cloneNode(true) as SVGSVGElement;
    clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
    clone.setAttribute('xmlns:xlink', 'http://www.w3.org/1999/xlink');
    return clone;
  };

  // Export SVG Vector File
  const handleExportSvg = async () => {
    const clone = getPreparedSvgElement();
    if (!clone) return;

    const svgString = new XMLSerializer().serializeToString(clone);
    const result = await saveFileLocally(
      `architecture-diagram-${Date.now()}.svg`,
      svgString,
      [{ name: 'Vector Graphic (SVG)', extensions: ['svg'] }]
    );
    if (result.success) {
      showToast(
        result.filePath ? `Saved SVG to ${result.filePath}` : 'SVG downloaded!',
        'success'
      );
    }
  };

  // Export PNG High-Res Image
  const handleExportPng = () => {
    const clone = getPreparedSvgElement();
    if (!clone) return;

    const svgString = new XMLSerializer().serializeToString(clone);
    const encodedData = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svgString);

    const img = new window.Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        const width = window.innerWidth;
        const height = window.innerHeight;
        const scale = 2; // High-DPI 2x scale for crystal clear render
        canvas.width = width * scale;
        canvas.height = height * scale;

        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.scale(scale, scale);
          // Fill canvas dark background
          ctx.fillStyle = '#0f172a';
          ctx.fillRect(0, 0, width, height);
          ctx.drawImage(img, 0, 0, width, height);

          const pngUrl = canvas.toDataURL('image/png');
          saveFileLocally(
            `architecture-diagram-${Date.now()}.png`,
            pngUrl,
            [{ name: 'High-Res Image (PNG)', extensions: ['png'] }],
            true
          ).then((result) => {
            if (result.success) {
              showToast(
                result.filePath ? `Saved PNG to ${result.filePath}` : 'High-Res PNG downloaded!',
                'success'
              );
            }
          });
        }
      } catch (err) {
        console.warn('Canvas export tainted or restricted, falling back to SVG vector download:', err);
        handleExportSvg();
      }
    };
    img.onerror = () => {
      handleExportSvg();
    };
    img.src = encodedData;
  };

  // Export Architecture Specification / ADR in Markdown format (Downloads .md & copies to clipboard)
  const handleExportSpec = useCallback(async () => {
    try {
      const markdown = generateArchitectureSpec({
        nodes,
        arrows,
        totalMonthlyCost: liveCost.totalMonthlyCost,
        healthScore: liveAudit.healthScore,
      });

      downloadMarkdownFile(markdown, 'architecture-specification.md');
      await copyToClipboard(markdown);
      showToast('Architecture Spec (.md) downloaded & copied to clipboard!', 'success');
    } catch (err) {
      console.error('Failed to export architecture specification:', err);
      showToast('Failed to export architecture specification', 'error');
    }
  }, [nodes, arrows, liveCost, liveAudit, showToast]);

  // Copy Architecture Specification / ADR Markdown to Clipboard
  const handleCopySpec = useCallback(async () => {
    try {
      const markdown = generateArchitectureSpec({
        nodes,
        arrows,
        totalMonthlyCost: liveCost.totalMonthlyCost,
        healthScore: liveAudit.healthScore,
      });

      const success = await copyToClipboard(markdown);
      if (success) {
        showToast('Architecture Spec (.md) copied to clipboard!', 'success');
      } else {
        showToast('Could not copy to clipboard', 'error');
      }
    } catch (err) {
      console.error('Failed to copy architecture specification:', err);
      showToast('Failed to copy architecture specification', 'error');
    }
  }, [nodes, arrows, liveCost, liveAudit, showToast]);

  // Compute selected element position and label for floating Context Action Bar
  const selectedContextInfo = useMemo(() => {
    if (selectedNodeIds.length > 0) {
      const selectedNodes = nodes.filter((n) => selectedNodeIds.includes(n.id));
      if (selectedNodes.length > 0) {
        let minX = Infinity;
        let maxX = -Infinity;
        let minY = Infinity;
        selectedNodes.forEach((n) => {
          if (n.x < minX) minX = n.x;
          if (n.x + n.width > maxX) maxX = n.x + n.width;
          if (n.y < minY) minY = n.y;
        });

        const typeLabel =
          selectedNodes.length === 1
            ? selectedNodes[0].subtitle || selectedNodes[0].shape.toUpperCase()
            : `${selectedNodes.length} SELECTED`;

        return {
          position: { x: (minX + maxX) / 2, y: minY },
          typeLabel,
        };
      }
    } else if (selectedArrowId) {
      const arrow = arrows.find((a) => a.id === selectedArrowId);
      if (arrow) {
        let p1 = arrow.startPoint;
        let p2 = arrow.endPoint;
        if (arrow.startNodeId && arrow.startAnchor) {
          const n1 = nodesMap.get(arrow.startNodeId);
          if (n1) p1 = getNodeAnchorPoint(n1, arrow.startAnchor);
        }
        if (arrow.endNodeId && arrow.endAnchor) {
          const n2 = nodesMap.get(arrow.endNodeId);
          if (n2) p2 = getNodeAnchorPoint(n2, arrow.endAnchor);
        }
        return {
          position: { x: (p1.x + p2.x) / 2, y: Math.min(p1.y, p2.y) },
          typeLabel: 'ARROW',
        };
      }
    } else if (selectedStrokeId) {
      const stroke = strokes.find((s) => s.id === selectedStrokeId);
      if (stroke && stroke.points.length > 0) {
        let minX = Infinity;
        let maxX = -Infinity;
        let minY = Infinity;
        stroke.points.forEach((p) => {
          if (p.x < minX) minX = p.x;
          if (p.x > maxX) maxX = p.x;
          if (p.y < minY) minY = p.y;
        });
        return {
          position: { x: (minX + maxX) / 2, y: minY },
          typeLabel: 'STROKE',
        };
      }
    }
    return null;
  }, [selectedNodeIds, selectedArrowId, selectedStrokeId, nodes, arrows, strokes, nodesMap]);

  const activeWalkthroughStep = isPresentationActive && presentationSteps.length > 0
    ? presentationSteps[currentStepIndex]
    : null;

  return (
    <div className={`app-container ${isPresentationActive ? 'presentation-mode-active' : ''}`}>
      {/* Collapsible Left Sidebar for rich component insertion */}
      {!isPresentationActive && (
        <LeftSidebar onInsertComponent={handleInsertComponent} />
      )}

      {/* Floating Top Toolbar with Undo/Redo, Navigation, and Export */}
      {!isPresentationActive && (
        <Toolbar
          currentTool={toolMode}
          onSelectTool={setToolMode}
          canUndo={historyPast.length > 0}
          canRedo={historyFuture.length > 0}
          onUndo={handleUndo}
          onRedo={handleRedo}
          onExportJson={handleExportJson}
          onImportJson={handleImportJson}
          onExportSvg={handleExportSvg}
          onExportPng={handleExportPng}
          onExportSpec={handleExportSpec}
          onCopySpec={handleCopySpec}
          zoom={viewport.scale}
          onZoomIn={handleZoomIn}
          onZoomOut={handleZoomOut}
          onResetZoom={handleResetZoom}
          isSimulatingFlow={isSimulatingFlow}
          onToggleSimulateFlow={() => setIsSimulatingFlow((prev) => !prev)}
          onStartPresentation={handleStartPresentation}
          onOpenTemplates={() => setIsTemplatesModalOpen(true)}
          onOpenMermaid={() => setIsMermaidModalOpen(true)}
          onOpenAiGenerator={() => setIsAiModalOpen(true)}
          viewPerspective={viewPerspective}
          onViewPerspectiveChange={setViewPerspective}
          totalMonthlyCost={liveCost.totalMonthlyCost}
          healthScore={liveAudit.healthScore}
          criticalIssueCount={liveAudit.criticalCount}
          onOpenAudit={(tab = 'audit') => {
            setAuditInitialTab(tab);
            setIsAuditModalOpen(true);
          }}
          userTier={userTier}
          onOpenUpgradeModal={handleOpenUpgradeModal}
        />
      )}

      {/* Floating Top Collaboration Bar: Avatars & Share Board */}
      {!isPresentationActive && (
        <CollaborationBar
          localUser={localUser}
          peers={peers}
          roomId={roomId}
          onShareBoard={handleShareBoard}
        />
      )}

      {/* Floating Context Action Bar (Delete & Duplicate, Arrow style/label) */}
      {!isPresentationActive && selectedContextInfo && (
        <ContextActionBar
          canvasPosition={selectedContextInfo.position}
          viewport={viewport}
          onDelete={handleDeleteSelected}
          onDuplicate={handleDuplicateSelected}
          itemTypeLabel={selectedContextInfo.typeLabel}
          selectedArrow={selectedArrowId ? arrows.find((a) => a.id === selectedArrowId) ?? null : null}
          onArrowStyleChange={handleArrowStyleChange}
          onArrowLabelEdit={handleArrowLabelEditTrigger}
        />
      )}

      {/* Technical Metadata Inspector Drawer */}
      {!isPresentationActive && (
        <InspectorDrawer
          node={selectedNodeForInspector}
          isOpen={isInspectorOpen && selectedNodeForInspector !== null}
          onClose={() => setIsInspectorOpen(false)}
          onUpdateNode={handleUpdateNode}
          onDeleteNode={handleDeleteSelected}
          onDuplicateNode={handleDuplicateSelected}
          userTier={userTier}
          onTierChange={handleTierChange}
        />
      )}

      {/* Starter Architecture Blueprints Modal */}
      <TemplatesModal
        isOpen={isTemplatesModalOpen}
        onClose={() => setIsTemplatesModalOpen(false)}
        onSelectTemplate={handleSelectTemplate}
      />

      {/* Diagram-as-Code (Mermaid.js) Modal */}
      <DiagramAsCodeModal
        isOpen={isMermaidModalOpen}
        onClose={() => setIsMermaidModalOpen(false)}
        nodes={nodes}
        arrows={arrows}
      />

      {/* AI Prompt-to-Diagram Generator Modal */}
      <AiGeneratorModal
        isOpen={isAiModalOpen}
        onClose={() => setIsAiModalOpen(false)}
        existingNodes={nodes}
        onDiagramGenerated={handleDiagramGenerated}
      />

      {/* Architecture Health Audit & Cloud Cost Modal */}
      <AuditModal
        isOpen={isAuditModalOpen}
        onClose={() => setIsAuditModalOpen(false)}
        nodes={nodes}
        arrows={arrows}
        onHighlightNode={handleHighlightNode}
        initialTab={auditInitialTab}
        userTier={userTier}
        onOpenUpgradeModal={handleOpenUpgradeModal}
      />

      {/* Pro Tier Upgrade Access Modal */}
      <UpgradeToProModal
        isOpen={isUpgradeModalOpen}
        onClose={() => setIsUpgradeModalOpen(false)}
        targetFeature={upgradeTargetFeature}
        onTierChange={handleTierChange}
      />

      {/* SVG Pan & Zoom Canvas */}
      <Canvas
        viewport={viewport}
        toolMode={toolMode}
        onViewportChange={setViewport}
        onCanvasClick={handleCanvasClick}
        onPenStart={handlePenStart}
        onPenMove={handlePenMove}
        onPenEnd={handlePenEnd}
        onDropComponent={handleDropComponent}
        onMarqueeStart={handleMarqueeStart}
        onMarqueeMove={handleMarqueeMove}
        onMarqueeEnd={handleMarqueeEnd}
        marqueeBox={marqueeBox}
        onCursorMove={handleCursorMove}
      >
        {/* Render Connected Arrows Layer */}
        {arrows.map((arrow) => (
          <ArrowRenderer
            key={arrow.id}
            arrow={arrow}
            nodesMap={nodesMap}
            isSelected={selectedArrowId === arrow.id}
            isSimulatingFlow={isSimulatingFlow}
            isDimmed={isPresentationActive ? (activeWalkthroughStep?.targetId !== arrow.id) : isArrowDimmed(arrow)}
            isPresentationActive={isPresentationActive}
            isWalkthroughFocused={isPresentationActive && activeWalkthroughStep?.targetId === arrow.id}
            stepNumber={isPresentationActive && activeWalkthroughStep?.targetId === arrow.id ? activeWalkthroughStep.stepNumber : undefined}
            onSelect={handleSelectArrow}
            onLabelChange={handleArrowLabelChange}
            triggerEditLabel={editingArrowLabelId === arrow.id ? (() => setEditingArrowLabelId(null)) : undefined}
          />
        ))}

        {/* Temporary Dragging Arrow Line when drawing a connection */}
        {draggingArrow && (
          <ArrowRenderer
            arrow={{
              id: 'dragging-temp-arrow',
              type: 'arrow',
              startNodeId: draggingArrow.startNodeId,
              startAnchor: draggingArrow.startAnchor,
              startPoint: draggingArrow.startPoint,
              endPoint: draggingArrow.currentEndPoint,
              color: '#38bdf8',
              strokeWidth: 2,
              arrowHead: 'arrow',
            }}
            nodesMap={nodesMap}
          />
        )}

        {/* Render Freehand Strokes */}
        {strokes.map((stroke) => (
          <FreehandStroke
            key={stroke.id}
            stroke={stroke}
            isSelected={selectedStrokeId === stroke.id}
            onSelect={handleSelectStroke}
          />
        ))}

        {/* Active In-Progress Freehand Stroke */}
        {activeStroke && (
          <FreehandStroke stroke={activeStroke} />
        )}

        {/* Architecture Node Cards */}
        {nodes.map((node) => (
          <ArchitectureNode
            key={node.id}
            node={node}
            isSelected={selectedNodeIds.includes(node.id)}
            isSelectMode={toolMode === 'select'}
            isPenMode={toolMode === 'pen'}
            isDimmed={isPresentationActive ? (activeWalkthroughStep?.targetId !== node.id) : isNodeDimmed(node)}
            isPresentationActive={isPresentationActive}
            isWalkthroughFocused={isPresentationActive && activeWalkthroughStep?.targetId === node.id}
            stepNumber={isPresentationActive && activeWalkthroughStep?.targetId === node.id ? activeWalkthroughStep.stepNumber : undefined}
            onSelect={handleSelectNode}
            onStartDrag={handleStartDragNode}
            onUpdateLabel={handleUpdateLabel}
            onAnchorMouseDown={handleAnchorMouseDown}
            onAnchorMouseUp={handleAnchorMouseUp}
            onAnchorHover={handleAnchorHover}
          />
        ))}

        {/* Smart Guide Lines – rendered on top of everything during drag */}
        {activeGuides.map((guide, idx) => (
          guide.axis === 'v' ? (
            <line
              key={`guide-v-${idx}`}
              x1={guide.position}
              y1={-99999}
              x2={guide.position}
              y2={99999}
              stroke={guide.kind === 'center' ? '#f59e0b' : '#38bdf8'}
              strokeWidth={1 / viewport.scale}
              strokeDasharray={`${4 / viewport.scale} ${3 / viewport.scale}`}
              opacity={0.85}
              pointerEvents="none"
            />
          ) : (
            <line
              key={`guide-h-${idx}`}
              x1={-99999}
              y1={guide.position}
              x2={99999}
              y2={guide.position}
              stroke={guide.kind === 'center' ? '#f59e0b' : '#38bdf8'}
              strokeWidth={1 / viewport.scale}
              strokeDasharray={`${4 / viewport.scale} ${3 / viewport.scale}`}
              opacity={0.85}
              pointerEvents="none"
            />
          )
        ))}

        {/* Live Remote Peer Cursors */}
        <RemoteCursors peers={peers} viewport={viewport} />
      </Canvas>

      {/* Bottom Status Indicator - hidden during presentation */}
      {!isPresentationActive && (
        <div className="canvas-status-bar">
          <div className="status-badge">
            <div className="status-dot" />
            <span>Active Tool: <strong>{toolMode.toUpperCase()}</strong></span>
          </div>
          <div className="status-badge perspective-status-badge">
            <div
              className="status-dot"
              style={{
                backgroundColor:
                  viewPerspective === 'frontend'
                    ? '#38bdf8'
                    : viewPerspective === 'backend'
                    ? '#a855f7'
                    : '#10b981',
              }}
            />
            <span>
              View:{' '}
              <strong
                style={{
                  color:
                    viewPerspective === 'frontend'
                      ? '#38bdf8'
                      : viewPerspective === 'backend'
                      ? '#a855f7'
                      : '#f1f5f9',
                }}
              >
                {viewPerspective.toUpperCase()}
              </strong>
            </span>
          </div>
          {isSimulatingFlow && (
            <div className="status-badge flow-active-badge">
              <div className="status-dot flow-pulse-dot" />
              <span>Traffic: <strong>LIVE SIMULATION</strong></span>
            </div>
          )}
          <div
            className="status-badge clickable-status-badge"
            onClick={() => {
              setAuditInitialTab('audit');
              setIsAuditModalOpen(true);
            }}
            title="Open Architecture Health & Security Audit"
          >
            <div
              className="status-dot"
              style={{
                backgroundColor:
                  liveAudit.criticalCount > 0
                    ? '#ef4444'
                    : liveAudit.healthScore >= 80
                    ? '#10b981'
                    : '#f59e0b',
              }}
            />
            <span>
              Health:{' '}
              <strong
                style={{
                  color:
                    liveAudit.criticalCount > 0
                      ? '#ef4444'
                      : liveAudit.healthScore >= 80
                      ? '#10b981'
                      : '#f59e0b',
                }}
              >
                {liveAudit.healthScore}%
              </strong>
            </span>
          </div>
          <div
            className="status-badge clickable-status-badge"
            onClick={() => {
              setAuditInitialTab('cost');
              setIsAuditModalOpen(true);
            }}
            title="Open Cloud Cost Estimator"
          >
            <div className="status-dot" style={{ backgroundColor: '#10b981' }} />
            <span>
              Cost: <strong style={{ color: '#10b981' }}>~${liveCost.totalMonthlyCost.toFixed(0)}/mo</strong>
            </span>
          </div>
          <span>Nodes: {nodes.length}</span>
          <span>Arrows: {arrows.length}</span>
          <span>Strokes: {strokes.length}</span>
          <span>Undo: {historyPast.length} | Redo: {historyFuture.length}</span>
          <span>
            Selected:{' '}
            {selectedNodeIds.length > 1
              ? `${selectedNodeIds.length} Nodes`
              : selectedNodeId
              ? nodes.find((n) => n.id === selectedNodeId)?.label
              : selectedArrowId
              ? 'Connected Arrow'
              : selectedStrokeId
              ? 'Freehand Stroke'
              : 'None'}
          </span>
          <span>Pan: ({Math.round(viewport.x)}, {Math.round(viewport.y)})</span>
          <span>Zoom: {Math.round(viewport.scale * 100)}%</span>
        </div>
      )}

      {/* Interactive Presentation Mode Bar */}
      {isPresentationActive && presentationSteps.length > 0 && (
        <PresentationBar
          steps={presentationSteps}
          currentStepIndex={currentStepIndex}
          onSelectStepIndex={handleSelectPresentationStep}
          onNextStep={handleNextPresentationStep}
          onPrevStep={handlePrevPresentationStep}
          onExit={handleExitPresentation}
          onRestart={handleRestartPresentation}
        />
      )}

      {/* Floating Toast Notification */}
      {toast && (
        <div
          className={`app-toast toast-${toast.type}`}
          role="status"
          aria-live="polite"
        >
          <div className="toast-content">
            {toast.type === 'error' ? (
              <AlertCircle size={17} color="#f87171" className="toast-icon" />
            ) : (
              <CheckCircle2 size={17} color="#34d399" className="toast-icon" />
            )}
            <span className="toast-text">{toast.message}</span>
          </div>
          <button
            type="button"
            className="toast-close-btn"
            onClick={() => setToast(null)}
            title="Dismiss notification"
            aria-label="Dismiss notification"
          >
            <CloseIcon size={14} />
          </button>
        </div>
      )}
    </div>
  );
}

export default App;
