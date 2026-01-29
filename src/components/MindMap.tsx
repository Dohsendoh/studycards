import React, { useMemo, useState, useCallback, useEffect, useRef } from 'react';
import ReactFlow, {
  Node,
  Edge,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  Position,
  NodeChange,
  useReactFlow,
  ReactFlowProvider,
  useViewport,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { Pencil } from 'lucide-react';

interface MindMapProps {
  structure: any;
  mode: 'full' | 'semi' | 'light';
}

const COLOR_THEMES = {
  indigo: ['#6366f1', '#7c87f5', '#96a0f9', '#a5b4fc', '#bac4fd', '#c7d2fe', '#dce3ff'],
  purple: ['#9333ea', '#a04eee', '#ae68f1', '#c084fc', '#cd9dfd', '#d8b4fe', '#e5cbff'],
  blue: ['#2563eb', '#3b7aef', '#5291f3', '#60a5fa', '#7db8fb', '#93c5fd', '#b0d5fe'],
  green: ['#059669', '#10a576', '#1eb383', '#34d399', '#52dca8', '#6ee7b7', '#8aedc6'],
  orange: ['#ea580c', '#ed6d23', '#f0823a', '#fb923c', '#fca455', '#fdba74', '#fec993'],
};

const DRAW_COLORS = ['#000000', '#ef4444', '#f59e0b', '#22c55e', '#3b82f6', '#8b5cf6', '#ec4899'];

interface NodeInfo {
  id: string;
  titre: string;
  niveau: number;
  parentId: string | null;
  x: number;
  y: number;
  width: number;
  height: number;
  childrenIds: string[];
  allDescendantsIds: string[];
}

interface ContextMenu {
  nodeId: string;
  x: number;
  y: number;
}

interface DrawingPath {
  points: { x: number; y: number }[];
  color: string;
  width: number;
  tool: 'pen' | 'pencil' | 'highlighter';
}

const MindMapContent: React.FC<MindMapProps> = ({ structure, mode }) => {
  const [colorTheme, setColorTheme] = useState<keyof typeof COLOR_THEMES>('indigo');
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [showDrawMenu, setShowDrawMenu] = useState(false);
  const [showDrawColors, setShowDrawColors] = useState(false);
  const [selectedTool, setSelectedTool] = useState<'pen' | 'pencil' | 'highlighter'>('pen');
  const [selectedDrawColor, setSelectedDrawColor] = useState('#000000');
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawingPaths, setDrawingPaths] = useState<DrawingPath[]>([]);
  const [currentPath, setCurrentPath] = useState<{ x: number; y: number }[]>([]);
  const [zoomedNodeId, setZoomedNodeId] = useState<string | null>(null);
  const [nodesInfoMap, setNodesInfoMap] = useState<Map<string, NodeInfo>>(new Map());
  const [contextMenu, setContextMenu] = useState<ContextMenu | null>(null);
  const [nodeColors, setNodeColors] = useState<Map<string, string>>(new Map());
  const [nodeNotes, setNodeNotes] = useState<Map<string, string>>(new Map());
  const reactFlow = useReactFlow();
  const { zoom } = useViewport();
  const svgRef = useRef<SVGSVGElement>(null);
  
  const getColorByLevel = useCallback((niveau: number, nodeId?: string): string => {
    if (nodeId && nodeColors.has(nodeId)) {
      return nodeColors.get(nodeId)!;
    }
    const colors = COLOR_THEMES[colorTheme];
    return colors[Math.min(niveau, colors.length - 1)];
  }, [colorTheme, nodeColors]);
  
  const getSizeByLevel = useCallback((niveau: number, currentMode: string) => {
    const sizes = {
      light: [
        { width: 200, height: 90 },
        { width: 180, height: 85 },
        { width: 160, height: 80 },
        { width: 140, height: 75 },
        { width: 120, height: 70 },
        { width: 100, height: 65 },
      ],
      semi: [
        { width: 280, height: 130 },
        { width: 240, height: 120 },
        { width: 200, height: 110 },
        { width: 170, height: 100 },
        { width: 140, height: 90 },
        { width: 120, height: 85 },
      ],
      full: [
        { width: 350, height: 160 },
        { width: 300, height: 150 },
        { width: 260, height: 140 },
        { width: 220, height: 130 },
        { width: 180, height: 120 },
        { width: 160, height: 110 },
      ],
    };
    
    const sizeArray = sizes[currentMode as keyof typeof sizes];
    return sizeArray[Math.min(niveau, sizeArray.length - 1)];
  }, []);
  
  const getAllDescendants = useCallback((nodeId: string, infoMap: Map<string, NodeInfo>): string[] => {
    const descendants: string[] = [];
    const queue = [nodeId];
    
    while (queue.length > 0) {
      const currentId = queue.shift()!;
      const info = infoMap.get(currentId);
      
      if (info) {
        info.childrenIds.forEach(childId => {
          descendants.push(childId);
          queue.push(childId);
        });
      }
    }
    
    return descendants;
  }, []);
  
  const handleNodeClickInternal = useCallback((nodeId: string) => {
    if (zoomedNodeId === nodeId) {
      setZoomedNodeId(null);
      setTimeout(() => {
        reactFlow.fitView({ duration: 500, padding: 0.15, maxZoom: 0.9 });
      }, 100);
    } else {
      setZoomedNodeId(nodeId);
      
      const info = nodesInfoMap.get(nodeId);
      if (info) {
        const allDescendants = info.allDescendantsIds;
        let minX = info.x;
        let maxX = info.x + info.width;
        let minY = info.y;
        let maxY = info.y + info.height;
        
        allDescendants.forEach(descId => {
          const descInfo = nodesInfoMap.get(descId);
          if (descInfo) {
            minX = Math.min(minX, descInfo.x);
            maxX = Math.max(maxX, descInfo.x + descInfo.width);
            minY = Math.min(minY, descInfo.y);
            maxY = Math.max(maxY, descInfo.y + descInfo.height);
          }
        });
        
        const padding = 50;
        minX -= padding;
        maxX += padding;
        minY -= padding;
        maxY += padding;
        
        const centerX = (minX + maxX) / 2;
        const centerY = (minY + maxY) / 2;
        const width = maxX - minX;
        const height = maxY - minY;
        
        const windowWidth = window.innerWidth;
        const windowHeight = window.innerHeight - 150;
        const zoomX = (windowWidth * 0.9) / width;
        const zoomY = (windowHeight * 0.9) / height;
        const targetZoom = Math.min(zoomX, zoomY, 1.5);
        
        setTimeout(() => {
          reactFlow.setCenter(centerX, centerY, { zoom: targetZoom, duration: 500 });
        }, 100);
      }
    }
  }, [zoomedNodeId, nodesInfoMap, reactFlow]);
  
  const handleNodeDoubleClick = useCallback((event: React.MouseEvent, node: Node) => {
    event.stopPropagation();
    const rect = (event.target as HTMLElement).getBoundingClientRect();
    setContextMenu({
      nodeId: node.id,
      x: rect.left + rect.width / 2,
      y: rect.bottom + 10
    });
  }, []);
  
  const handleDrawStart = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing) return;
    
    const svg = svgRef.current;
    if (!svg) return;
    
    const rect = svg.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    
    const x = (clientX - rect.left) / zoom;
    const y = (clientY - rect.top) / zoom;
    
    setCurrentPath([{ x, y }]);
  };
  
  const handleDrawMove = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing || currentPath.length === 0) return;
    
    const svg = svgRef.current;
    if (!svg) return;
    
    const rect = svg.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    
    const x = (clientX - rect.left) / zoom;
    const y = (clientY - rect.top) / zoom;
    
    setCurrentPath(prev => [...prev, { x, y }]);
  };
  
  const handleDrawEnd = () => {
    if (currentPath.length > 1) {
      const newPath: DrawingPath = {
        points: currentPath,
        color: selectedDrawColor,
        width: selectedTool === 'highlighter' ? 20 : selectedTool === 'pencil' ? 2 : 3,
        tool: selectedTool
      };
      setDrawingPaths(prev => [...prev, newPath]);
    }
    setCurrentPath([]);
  };
  
  const { nodes: initialNodes, edges: initialEdges } = useMemo(() => {
    if (!structure) return { nodes: [], edges: [] };
    
    const nodes: Node[] = [];
    const edges: Edge[] = [];
    const infoMap = new Map<string, NodeInfo>();
    let nodeId = 0;
    
    const horizontalGap = 20;
    const verticalGap = 200;
    
    function calculateTreeWidth(noeud: any, niveau: number): number {
      const { width } = getSizeByLevel(niveau, mode);
      
      if (!noeud.enfants || noeud.enfants.length === 0) {
        return width;
      }
      
      if (niveau === 0 || niveau === 1) {
        return width;
      }
      
      const childrenWidths = noeud.enfants.map((child: any) => calculateTreeWidth(child, niveau + 1));
      const totalChildWidth = childrenWidths.reduce((sum: number, w: number) => sum + w, 0);
      const gaps = (noeud.enfants.length - 1) * horizontalGap;
      
      return Math.max(width, totalChildWidth + gaps);
    }
    
    function createNode(noeud: any, x: number, y: number, niveau: number, parentId: string | null, nodeWidth: number): string {
      const currentId = `node-${nodeId++}`;
      const { width: defaultWidth, height: nodeHeight } = getSizeByLevel(niveau, mode);
      const actualWidth = (niveau === 0 || niveau === 1) ? defaultWidth : nodeWidth;
      
      infoMap.set(currentId, {
        id: currentId,
        titre: noeud.titre,
        niveau: niveau,
        parentId: parentId,
        x: x,
        y: y,
        width: actualWidth,
        height: nodeHeight,
        childrenIds: [],
        allDescendantsIds: []
      });
      
      let contentToShow = '';
      let maxChars = 0;
      
      if (mode === 'semi') {
        maxChars = niveau === 0 ? 120 : niveau === 1 ? 100 : 80;
        contentToShow = noeud.contenu?.substring(0, maxChars) || '';
      } else if (mode === 'full') {
        maxChars = niveau === 0 ? 200 : niveau === 1 ? 180 : niveau === 2 ? 150 : 120;
        contentToShow = noeud.contenu?.substring(0, maxChars) || '';
      }
      
      if (contentToShow && noeud.contenu?.length > maxChars) {
        contentToShow += '...';
      }
      
      const titleSize = niveau === 0 ? '16px' : niveau === 1 ? '15px' : niveau === 2 ? '14px' : '13px';
      const contentSize = niveau === 0 ? '12px' : niveau === 1 ? '11px' : '10px';
      
      nodes.push({
        id: currentId,
        type: 'default',
        position: { x, y },
        sourcePosition: Position.Bottom,
        targetPosition: Position.Top,
        data: {
          label: (
            <div style={{
              width: `${actualWidth}px`,
              height: `${nodeHeight}px`,
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              alignItems: 'center',
              padding: niveau === 0 ? '16px' : niveau === 1 ? '14px' : '12px',
              boxSizing: 'border-box',
              cursor: 'pointer',
            }}>
              <div style={{ 
                fontWeight: niveau <= 2 ? 'bold' : '600',
                fontSize: titleSize,
                marginBottom: contentToShow ? '6px' : '0',
                width: '100%',
                textAlign: 'center',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                display: '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical',
              }}>
                {noeud.titre}
              </div>
              {contentToShow && (
                <div style={{ 
                  fontSize: contentSize,
                  color: niveau === 0 ? '#e0e7ff' : '#4b5563',
                  lineHeight: '1.3',
                  width: '100%',
                  textAlign: 'center',
                  overflow: 'hidden',
                  display: '-webkit-box',
                  WebkitLineClamp: mode === 'semi' ? 3 : 5,
                  WebkitBoxOrient: 'vertical',
                }}>
                  {contentToShow}
                </div>
              )}
            </div>
          ),
          niveau: niveau,
        },
        style: {
          background: getColorByLevel(niveau, currentId),
          color: niveau === 0 ? 'white' : '#1f2937',
          border: `3px solid ${COLOR_THEMES[colorTheme][0]}`,
          borderRadius: niveau === 0 ? '12px' : niveau === 1 ? '10px' : '8px',
          fontSize: '13px',
          boxShadow: niveau === 0 
            ? '0 6px 12px rgba(0,0,0,0.15)' 
            : niveau === 1 
              ? '0 4px 8px rgba(0,0,0,0.12)'
              : '0 2px 6px rgba(0,0,0,0.08)',
          width: `${actualWidth}px`,
          height: `${nodeHeight}px`,
          padding: 0,
        },
        draggable: false,
      });
      
      return currentId;
    }
    
    function buildTree(
      noeud: any, 
      parentId: string | null, 
      niveau: number, 
      centerX: number, 
      currentY: number,
      showEdges: boolean = false
    ): void {
      const treeWidth = calculateTreeWidth(noeud, niveau);
      const currentX = centerX - (treeWidth / 2);
      const currentId = createNode(noeud, currentX, currentY, niveau, parentId, treeWidth);
      
      if (parentId) {
        const parentInfo = infoMap.get(parentId);
        if (parentInfo) {
          parentInfo.childrenIds.push(currentId);
        }
        
        if (showEdges) {
          edges.push({
            id: `edge-${parentId}-${currentId}`,
            source: parentId,
            target: currentId,
            type: 'straight',
            animated: false,
            style: { 
              stroke: getColorByLevel(niveau - 1), 
              strokeWidth: 3 
            },
          });
        }
      }
      
      if (noeud.enfants && noeud.enfants.length > 0) {
        if (niveau === 0) {
          const introIndex = noeud.enfants.findIndex((child: any) => 
            child.titre?.toLowerCase().includes('introduction')
          );
          
          if (introIndex !== -1) {
            const introduction = noeud.enfants[introIndex];
            const autresEnfants = noeud.enfants.filter((_: any, i: number) => i !== introIndex);
            
            const introY = currentY + verticalGap;
            const introId = buildTreeAndReturnId(introduction, currentId, 1, centerX, introY, true);
            
            if (autresEnfants.length > 0) {
              const axesY = introY + verticalGap;
              const childrenWidths = autresEnfants.map((child: any) => calculateTreeWidth(child, 2));
              const totalWidth = childrenWidths.reduce((sum: number, w: number) => sum + w, 0);
              const totalGaps = (autresEnfants.length - 1) * horizontalGap;
              const totalTreeWidth = totalWidth + totalGaps;
              
              let currentChildX = centerX - (totalTreeWidth / 2);
              
              autresEnfants.forEach((child: any, index: number) => {
                const childWidth = childrenWidths[index];
                const childCenterX = currentChildX + (childWidth / 2);
                buildTree(child, introId, 2, childCenterX, axesY, true);
                currentChildX += childWidth + horizontalGap;
              });
            }
          }
        } else {
          const childY = currentY + verticalGap;
          const childrenWidths = noeud.enfants.map((child: any) => calculateTreeWidth(child, niveau + 1));
          const totalWidth = childrenWidths.reduce((sum: number, w: number) => sum + w, 0);
          const totalGaps = (noeud.enfants.length - 1) * horizontalGap;
          const totalTreeWidth = totalWidth + totalGaps;
          
          let currentChildX = centerX - (totalTreeWidth / 2);
          
          noeud.enfants.forEach((child: any, index: number) => {
            const childWidth = childrenWidths[index];
            const childCenterX = currentChildX + (childWidth / 2);
            buildTree(child, currentId, niveau + 1, childCenterX, childY, false);
            currentChildX += childWidth + horizontalGap;
          });
        }
      }
    }
    
    function buildTreeAndReturnId(
      noeud: any, 
      parentId: string | null, 
      niveau: number, 
      centerX: number, 
      currentY: number,
      showEdges: boolean = false
    ): string {
      const treeWidth = calculateTreeWidth(noeud, niveau);
      const currentX = centerX - (treeWidth / 2);
      const currentId = createNode(noeud, currentX, currentY, niveau, parentId, treeWidth);
      
      if (parentId) {
        const parentInfo = infoMap.get(parentId);
        if (parentInfo) {
          parentInfo.childrenIds.push(currentId);
        }
        
        if (showEdges) {
          edges.push({
            id: `edge-${parentId}-${currentId}`,
            source: parentId,
            target: currentId,
            type: 'straight',
            animated: false,
            style: { 
              stroke: getColorByLevel(niveau - 1), 
              strokeWidth: 3 
            },
          });
        }
      }
      
      if (noeud.enfants && noeud.enfants.length > 0) {
        const childY = currentY + verticalGap;
        const childrenWidths = noeud.enfants.map((child: any) => calculateTreeWidth(child, niveau + 1));
        const totalWidth = childrenWidths.reduce((sum: number, w: number) => sum + w, 0);
        const totalGaps = (noeud.enfants.length - 1) * horizontalGap;
        const totalTreeWidth = totalWidth + totalGaps;
        
        let currentChildX = centerX - (totalTreeWidth / 2);
        
        noeud.enfants.forEach((child: any, index: number) => {
          const childWidth = childrenWidths[index];
          const childCenterX = currentChildX + (childWidth / 2);
          buildTree(child, currentId, niveau + 1, childCenterX, childY, false);
          currentChildX += childWidth + horizontalGap;
        });
      }
      
      return currentId;
    }
    
    const treeWidth = calculateTreeWidth(structure, 0);
    const startX = Math.max(800, treeWidth / 2 + 200);
    buildTree(structure, null, 0, startX, 50, true);
    
    infoMap.forEach((info, nodeId) => {
      info.allDescendantsIds = getAllDescendants(nodeId, infoMap);
    });
    
    setNodesInfoMap(infoMap);
    
    return { nodes, edges };
  }, [structure, mode, colorTheme, getColorByLevel, getSizeByLevel, getAllDescendants]);
  
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const [customPositions, setCustomPositions] = useState<Map<string, {x: number, y: number}>>(new Map());
  
  useEffect(() => {
    setTimeout(() => {
      reactFlow.fitView({ duration: 800, padding: 0.15, maxZoom: 0.9 });
    }, 500);
  }, [reactFlow]);
  
  const onNodeClick = useCallback((event: React.MouseEvent, node: Node) => {
    if (!isDrawing) {
      handleNodeClickInternal(node.id);
    }
  }, [handleNodeClickInternal, isDrawing]);
  
  useEffect(() => {
    setEdges((eds) => {
      if (!zoomedNodeId) return initialEdges;
      
      const zoomedInfo = nodesInfoMap.get(zoomedNodeId);
      if (!zoomedInfo) return eds;
      
      const visibleNodeIds = new Set([zoomedNodeId, ...zoomedInfo.allDescendantsIds]);
      
      const visibleEdges = initialEdges.filter(edge => {
        return visibleNodeIds.has(edge.source) && visibleNodeIds.has(edge.target);
      });
      
      return visibleEdges;
    });
  }, [zoomedNodeId, nodesInfoMap, initialEdges, setEdges]);
  
  useEffect(() => {
    setNodes((nds) =>
      nds.map((node) => {
        const isZoomed = node.id === zoomedNodeId;
        const info = nodesInfoMap.get(node.id);
        const isParent = zoomedNodeId && info?.id === nodesInfoMap.get(zoomedNodeId)?.parentId;
        const isDescendant = zoomedNodeId && nodesInfoMap.get(zoomedNodeId)?.allDescendantsIds.includes(node.id);
        
        let opacity = 1;
        let boxShadow = node.data.niveau === 0 
          ? '0 6px 12px rgba(0,0,0,0.15)' 
          : node.data.niveau === 1 
            ? '0 4px 8px rgba(0,0,0,0.12)'
            : '0 2px 6px rgba(0,0,0,0.08)';
        
        if (zoomedNodeId) {
          if (isZoomed) {
            const baseColor = COLOR_THEMES[colorTheme][0];
            const r = parseInt(baseColor.slice(1, 3), 16);
            const g = parseInt(baseColor.slice(3, 5), 16);
            const b = parseInt(baseColor.slice(5, 7), 16);
            boxShadow = `0 0 0 6px rgba(${r}, ${g}, ${b}, 0.3), 0 0 0 14px rgba(${r}, ${g}, ${b}, 0.15), 0 0 0 24px rgba(${r}, ${g}, ${b}, 0.08), 0 0 0 36px rgba(${r}, ${g}, ${b}, 0.03)`;
          } else if (isParent) {
            opacity = Math.max(0.3, Math.min(1, (zoom - 0.3) / 0.7));
          } else if (!isDescendant) {
            opacity = 0;
          }
        }
        
        return {
          ...node,
          style: {
            ...node.style,
            background: getColorByLevel(node.data.niveau, node.id),
            opacity,
            boxShadow,
            transition: 'opacity 0.3s ease, box-shadow 0.3s ease',
            pointerEvents: isDrawing ? 'none' : 'auto',
          },
        };
      })
    );
  }, [zoomedNodeId, nodesInfoMap, setNodes, colorTheme, zoom, getColorByLevel, isDrawing]);
  
  const getSiblings = useCallback(() => {
    if (!zoomedNodeId) return [];
    
    const current = nodesInfoMap.get(zoomedNodeId);
    if (!current || !current.parentId) return [];
    
    return Array.from(nodesInfoMap.values())
      .filter(n => n.parentId === current.parentId)
      .sort((a, b) => a.x - b.x);
  }, [zoomedNodeId, nodesInfoMap]);
  
  const navigateToPrevious = () => {
    const siblings = getSiblings();
    const idx = siblings.findIndex(s => s.id === zoomedNodeId);
    if (idx > 0) {
      handleNodeClickInternal(siblings[idx - 1].id);
    }
  };
  
  const navigateToNext = () => {
    const siblings = getSiblings();
    const idx = siblings.findIndex(s => s.id === zoomedNodeId);
    if (idx < siblings.length - 1) {
      handleNodeClickInternal(siblings[idx + 1].id);
    }
  };
  
  const handleNodesChange = useCallback((changes: NodeChange[]) => {
    changes.forEach((change) => {
      if (change.type === 'position' && change.position && change.dragging === false) {
        setCustomPositions(prev => {
          const newMap = new Map(prev);
          newMap.set(change.id, change.position!);
          return newMap;
        });
        
        setNodesInfoMap(prev => {
          const newMap = new Map(prev);
          const info = newMap.get(change.id);
          if (info) {
            info.x = change.position!.x;
            info.y = change.position!.y;
          }
          return newMap;
        });
      }
    });
    onNodesChange(changes);
  }, [onNodesChange]);
  
  useEffect(() => {
    const updatedNodes = initialNodes.map(node => {
      const customPos = customPositions.get(node.id);
      if (customPos) {
        return { ...node, position: customPos };
      }
      return node;
    });
    setNodes(updatedNodes);
    setEdges(initialEdges);
  }, [initialNodes, initialEdges, setNodes, setEdges, customPositions]);
  
  const siblings = getSiblings();
  const currentIndex = siblings.findIndex(s => s.id === zoomedNodeId);
  
  return (
    <div style={{ position: 'relative', height: '100%', width: '100%', overflow: 'hidden' }}>
      <svg
        ref={svgRef}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          pointerEvents: isDrawing ? 'auto' : 'none',
          zIndex: isDrawing ? 1000 : 1,
        }}
        onMouseDown={handleDrawStart}
        onMouseMove={handleDrawMove}
        onMouseUp={handleDrawEnd}
        onMouseLeave={handleDrawEnd}
        onTouchStart={handleDrawStart}
        onTouchMove={handleDrawMove}
        onTouchEnd={handleDrawEnd}
      >
        {drawingPaths.map((path, index) => (
          <path
            key={index}
            d={`M ${path.points.map(p => `${p.x},${p.y}`).join(' L ')}`}
            stroke={path.color}
            strokeWidth={path.width}
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity={path.tool === 'highlighter' ? 0.4 : 1}
          />
        ))}
        {currentPath.length > 0 && (
          <path
            d={`M ${currentPath.map(p => `${p.x},${p.y}`).join(' L ')}`}
            stroke={selectedDrawColor}
            strokeWidth={selectedTool === 'highlighter' ? 20 : selectedTool === 'pencil' ? 2 : 3}
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity={selectedTool === 'highlighter' ? 0.4 : 1}
          />
        )}
      </svg>
      
      <div style={{ 
        position: 'absolute', 
        top: '10px', 
        left: '10px', 
        zIndex: 10,
      }}>
        <MiniMap 
          nodeColor={(node) => node.style?.background as string || '#6366f1'}
          maskColor="rgba(0, 0, 0, 0.1)"
          style={{
            background: 'white',
            border: '2px solid #e5e7eb',
            borderRadius: '8px',
            width: '120px',
            height: '80px'
          }}
        />
      </div>
      
      <div style={{ 
        position: 'absolute', 
        top: '10px', 
        right: '10px', 
        zIndex: 10,
        display: 'flex',
        gap: '8px'
      }}>
        <button
          onClick={() => {
            setShowDrawMenu(!showDrawMenu);
            setShowColorPicker(false);
          }}
          style={{
            width: '36px',
            height: '36px',
            borderRadius: '8px',
            border: '2px solid #e5e7eb',
            background: isDrawing ? '#22c55e' : 'white',
            cursor: 'pointer',
            boxShadow: '0 2px 6px rgba(0,0,0,0.1)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          <Pencil size={18} style={{ color: isDrawing ? 'white' : '#6b7280' }} />
        </button>
        
        {showDrawMenu && (
          <div style={{
            position: 'absolute',
            top: '45px',
            right: '0',
            background: 'white',
            padding: '8px',
            borderRadius: '8px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            display: 'flex',
            flexDirection: 'column',
            gap: '6px',
            minWidth: '150px'
          }}>
            <button
              onClick={() => {
                setSelectedTool('pen');
                setShowDrawColors(true);
              }}
              style={{
                padding: '8px 12px',
                border: selectedTool === 'pen' ? '2px solid #6366f1' : '1px solid #e5e7eb',
                borderRadius: '6px',
                background: selectedTool === 'pen' ? '#e0e7ff' : 'white',
                cursor: 'pointer',
                textAlign: 'left'
              }}
            >
              🖊️ Stylo
            </button>
            <button
              onClick={() => {
                setSelectedTool('pencil');
                setShowDrawColors(true);
              }}
              style={{
                padding: '8px 12px',
                border: selectedTool === 'pencil' ? '2px solid #6366f1' : '1px solid #e5e7eb',
                borderRadius: '6px',
                background: selectedTool === 'pencil' ? '#e0e7ff' : 'white',
                cursor: 'pointer',
                textAlign: 'left'
              }}
            >
              ✏️ Crayon
            </button>
            <button
              onClick={() => {
                setSelectedTool('highlighter');
                setShowDrawColors(true);
              }}
              style={{
                padding: '8px 12px',
                border: selectedTool === 'highlighter' ? '2px solid #6366f1' : '1px solid #e5e7eb',
                borderRadius: '6px',
                background: selectedTool === 'highlighter' ? '#e0e7ff' : 'white',
                cursor: 'pointer',
                textAlign: 'left'
              }}
            >
              🖍️ Surligneur
            </button>
            
            {showDrawColors && (
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(4, 1fr)',
                gap: '6px',
                marginTop: '8px',
                padding: '8px',
                borderTop: '1px solid #e5e7eb'
              }}>
                {DRAW_COLORS.map((color) => (
                  <button
                    key={color}
                    onClick={() => {
                      setSelectedDrawColor(color);
                      setIsDrawing(true);
                      setShowDrawMenu(false);
                    }}
                    style={{
                      width: '28px',
                      height: '28px',
                      borderRadius: '6px',
                      border: selectedDrawColor === color ? '2px solid #1f2937' : '1px solid #e5e7eb',
                      background: color,
                      cursor: 'pointer',
                    }}
                  />
                ))}
              </div>
            )}
            
            {isDrawing && (
              <button
                onClick={() => {
                  setIsDrawing(false);
                  setShowDrawMenu(false);
                }}
                style={{
                  padding: '8px 12px',
                  border: 'none',
                  borderRadius: '6px',
                  background: '#ef4444',
                  color: 'white',
                  cursor: 'pointer',
                  fontWeight: '600'
                }}
              >
                ❌ Arrêter dessin
              </button>
            )}
          </div>
        )}
        
        <button
          onClick={() => {
            setShowColorPicker(!showColorPicker);
            setShowDrawMenu(false);
          }}
          style={{
            width: '36px',
            height: '36px',
            borderRadius: '8px',
            border: '2px solid #e5e7eb',
            background: COLOR_THEMES[colorTheme][0],
            cursor: 'pointer',
            boxShadow: '0 2px 6px rgba(0,0,0,0.1)'
          }}
        />
        
        {showColorPicker && (
          <div style={{
            position: 'absolute',
            top: '45px',
            right: '0',
            background: 'white',
            padding: '8px',
            borderRadius: '8px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            display: 'flex',
            gap: '6px'
          }}>
            {Object.keys(COLOR_THEMES).map((theme) => (
              <button
                key={theme}
                onClick={() => {
                  setColorTheme(theme as keyof typeof COLOR_THEMES);
                  setShowColorPicker(false);
                }}
                style={{
                  width: '28px',
                  height: '28px',
                  borderRadius: '6px',
                  border: colorTheme === theme ? '2px solid #1f2937' : '1px solid #e5e7eb',
                  background: COLOR_THEMES[theme as keyof typeof COLOR_THEMES][0],
                  cursor: 'pointer',
                }}
              />
            ))}
          </div>
        )}
      </div>
      
      {contextMenu && (
        <>
          <div 
            style={{
              position: 'fixed',
              inset: 0,
              zIndex: 999
            }}
            onClick={() => setContextMenu(null)}
          />
          <div style={{
            position: 'fixed',
            top: contextMenu.y,
            left: contextMenu.x,
            transform: 'translateX(-50%)',
            background: 'white',
            borderRadius: '8px',
            boxShadow: '0 4px 16px rgba(0,0,0,0.15)',
            padding: '8px',
            zIndex: 1000,
            minWidth: '200px'
          }}>
            <button
              onClick={() => {
                const newText = prompt('Nouveau texte:');
                if (newText) {
                  alert('Modification du texte: ' + newText);
                }
                setContextMenu(null);
              }}
              style={{
                width: '100%',
                padding: '10px',
                border: 'none',
                background: 'transparent',
                textAlign: 'left',
                cursor: 'pointer',
                borderRadius: '4px',
                fontSize: '14px'
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = '#f3f4f6'}
              onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
            >
              ✏️ Modifier le texte
            </button>
            <button
              onClick={() => {
                const color = prompt('Couleur (hex):');
                if (color) {
                  setNodeColors(prev => {
                    const newMap = new Map(prev);
                    newMap.set(contextMenu.nodeId, color);
                    return newMap;
                  });
                }
                setContextMenu(null);
              }}
              style={{
                width: '100%',
                padding: '10px',
                border: 'none',
                background: 'transparent',
                textAlign: 'left',
                cursor: 'pointer',
                borderRadius: '4px',
                fontSize: '14px'
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = '#f3f4f6'}
              onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
            >
              🎨 Changer la couleur
            </button>
            <button
              onClick={() => {
                const note = prompt('Ajouter une note:');
                if (note) {
                  setNodeNotes(prev => {
                    const newMap = new Map(prev);
                    newMap.set(contextMenu.nodeId, note);
                    return newMap;
                  });
                }
                setContextMenu(null);
              }}
              style={{
                width: '100%',
                padding: '10px',
                border: 'none',
                background: 'transparent',
                textAlign: 'left',
                cursor: 'pointer',
                borderRadius: '4px',
                fontSize: '14px'
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = '#f3f4f6'}
              onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
            >
              📝 Ajouter une note
            </button>
            <button
              onClick={() => setContextMenu(null)}
              style={{
                width: '100%',
                padding: '10px',
                border: 'none',
                background: 'transparent',
                textAlign: 'left',
                cursor: 'pointer',
                borderRadius: '4px',
                fontSize: '14px',
                color: '#dc2626'
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = '#fef2f2'}
              onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
            >
              ❌ Annuler
            </button>
          </div>
        </>
      )}
      
      {zoomedNodeId && (
        <div style={{
          position: 'absolute',
          bottom: '20px',
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 10,
          display: 'flex',
          gap: '8px',
          background: 'white',
          padding: '6px 10px',
          borderRadius: '8px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
          fontSize: '13px'
        }}>
          <button
            onClick={navigateToPrevious}
            disabled={currentIndex === 0}
            style={{
              background: 'transparent',
              border: 'none',
              cursor: currentIndex === 0 ? 'not-allowed' : 'pointer',
              padding: '4px 8px',
              fontSize: '13px',
              opacity: currentIndex === 0 ? 0.4 : 1
            }}
          >
            ← Précédent
          </button>
          <button
            onClick={() => {
              setZoomedNodeId(null);
              setTimeout(() => {
                reactFlow.fitView({ duration: 500, padding: 0.15, maxZoom: 0.9 });
              }, 100);
            }}
            style={{
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              padding: '4px 8px',
              fontSize: '16px'
            }}
          >
            🏠
          </button>
          <button
            onClick={navigateToNext}
            disabled={currentIndex === siblings.length - 1}
            style={{
              background: 'transparent',
              border: 'none',
              cursor: currentIndex === siblings.length - 1 ? 'not-allowed' : 'pointer',
              padding: '4px 8px',
              fontSize: '13px',
              opacity: currentIndex === siblings.length - 1 ? 0.4 : 1
            }}
          >
            Suivant →
          </button>
        </div>
      )}
      
      <div style={{ width: '100%', height: '100%', pointerEvents: isDrawing ? 'none' : 'auto' }}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={handleNodesChange}
          onEdgesChange={onEdgesChange}
          onNodeClick={onNodeClick}
          onNodeDoubleClick={handleNodeDoubleClick}
          fitView={false}
          attributionPosition="bottom-left"
          minZoom={0.1}
          maxZoom={2}
          nodesDraggable={false}
          nodesConnectable={false}
          panOnScroll={!isDrawing}
          zoomOnScroll={!isDrawing}
          zoomOnPinch={!isDrawing}
          panOnDrag={!isDrawing}
        >
          <Background color="#f3f4f6" gap={20} size={1} />
          <Controls />
        </ReactFlow>
      </div>
    </div>
  );
};

const MindMap: React.FC<MindMapProps> = (props) => {
  return (
    <ReactFlowProvider>
      <MindMapContent {...props} />
    </ReactFlowProvider>
  );
};

export default MindMap;
