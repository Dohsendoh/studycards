import React, { useMemo, useState, useCallback, useEffect } from 'react';
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

const MindMapContent: React.FC<MindMapProps> = ({ structure, mode }) => {
  const [colorTheme, setColorTheme] = useState<keyof typeof COLOR_THEMES>('indigo');
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [zoomedNodeId, setZoomedNodeId] = useState<string | null>(null);
  const [nodesInfoMap, setNodesInfoMap] = useState<Map<string, NodeInfo>>(new Map());
  const [contextMenu, setContextMenu] = useState<ContextMenu | null>(null);
  const [nodeColors, setNodeColors] = useState<Map<string, string>>(new Map());
  const reactFlow = useReactFlow();
  const { zoom } = useViewport();
  
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
        reactFlow.fitView({ duration: 500, padding: 0.2 });
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
        
        const centerX = (minX + maxX) / 2;
        const centerY = (minY + maxY) / 2;
        const width = maxX - minX;
        const height = maxY - minY;
        
        const windowWidth = window.innerWidth;
        const windowHeight = window.innerHeight;
        const zoomX = (windowWidth * 0.7) / width;
        const zoomY = (windowHeight * 0.7) / height;
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
      reactFlow.fitView({ duration: 800, padding: 0.2 });
    }, 500);
  }, [reactFlow]);
  
  const onNodeClick = useCallback((event: React.MouseEvent, node: Node) => {
    handleNodeClickInternal(node.id);
  }, [handleNodeClickInternal]);
  
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
            opacity = Math.max(0.4, (zoom - 0.5) / 0.5);
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
          },
        };
      })
    );
  }, [zoomedNodeId, nodesInfoMap, setNodes, colorTheme, zoom, getColorByLevel]);
  
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
                               }
