import React, { useMemo, useState, useCallback, useEffect } from ‘react’;
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
} from ‘reactflow’;
import ‘reactflow/dist/style.css’;

interface MindMapProps {
structure: any;
mode: ‘full’ | ‘semi’ | ‘light’;
}

const COLOR_THEMES = {
indigo: [’#6366f1’, ‘#7c87f5’, ‘#96a0f9’, ‘#a5b4fc’, ‘#bac4fd’, ‘#c7d2fe’, ‘#dce3ff’],
purple: [’#9333ea’, ‘#a04eee’, ‘#ae68f1’, ‘#c084fc’, ‘#cd9dfd’, ‘#d8b4fe’, ‘#e5cbff’],
blue: [’#2563eb’, ‘#3b7aef’, ‘#5291f3’, ‘#60a5fa’, ‘#7db8fb’, ‘#93c5fd’, ‘#b0d5fe’],
green: [’#059669’, ‘#10a576’, ‘#1eb383’, ‘#34d399’, ‘#52dca8’, ‘#6ee7b7’, ‘#8aedc6’],
orange: [’#ea580c’, ‘#ed6d23’, ‘#f0823a’, ‘#fb923c’, ‘#fca455’, ‘#fdba74’, ‘#fec993’],
};

interface NodeInfo {
id: string;
titre: string;
niveau: number;
parentId: string | null;
x: number;
y: number;
}

const MindMapContent: React.FC<MindMapProps> = ({ structure, mode }) => {
const [colorTheme, setColorTheme] = useState<keyof typeof COLOR_THEMES>(‘indigo’);
const [zoomedNodeId, setZoomedNodeId] = useState<string | null>(null);
const [breadcrumb, setBreadcrumb] = useState<NodeInfo[]>([]);
const [nodesInfo, setNodesInfo] = useState<Map<string, NodeInfo>>(new Map());
const reactFlow = useReactFlow();

const getColorByLevel = (niveau: number): string => {
const colors = COLOR_THEMES[colorTheme];
return colors[Math.min(niveau, colors.length - 1)];
};

const getSizeByLevel = (niveau: number, mode: string) => {
const sizes = {
light: [
{ width: 180, height: 80 },
{ width: 160, height: 75 },
{ width: 140, height: 70 },
{ width: 120, height: 65 },
{ width: 100, height: 60 },
{ width: 90, height: 55 },
],
semi: [
{ width: 260, height: 120 },
{ width: 220, height: 110 },
{ width: 180, height: 100 },
{ width: 150, height: 90 },
{ width: 130, height: 85 },
{ width: 110, height: 80 },
],
full: [
{ width: 320, height: 150 },
{ width: 280, height: 140 },
{ width: 240, height: 130 },
{ width: 200, height: 120 },
{ width: 170, height: 110 },
{ width: 150, height: 100 },
],
};

```
const sizeArray = sizes[mode as keyof typeof sizes];
return sizeArray[Math.min(niveau, sizeArray.length - 1)];
```

};

// Fonction de clic sur un nœud
const onNodeClick = useCallback((event: any, node: Node) => {
event.stopPropagation();

```
if (zoomedNodeId === node.id) {
  // Dézoom
  setZoomedNodeId(null);
  setBreadcrumb([]);
  setTimeout(() => {
    reactFlow.fitView({ duration: 500, padding: 0.2 });
  }, 100);
} else {
  // Zoom
  setZoomedNodeId(node.id);
  
  // Construire breadcrumb
  const path: NodeInfo[] = [];
  let currentId: string | null = node.id;
  
  while (currentId) {
    const info = nodesInfo.get(currentId);
    if (info) {
      path.unshift(info);
      currentId = info.parentId;
    } else {
      break;
    }
  }
  
  setBreadcrumb(path);
  
  // Centrer sur le nœud
  const info = nodesInfo.get(node.id);
  if (info) {
    setTimeout(() => {
      reactFlow.setCenter(info.x + 100, info.y + 50, { zoom: 1.2, duration: 500 });
    }, 100);
  }
}
```

}, [zoomedNodeId, nodesInfo, reactFlow]);

const { nodes: initialNodes, edges: initialEdges } = useMemo(() => {
if (!structure) return { nodes: [], edges: [] };

```
const nodes: Node[] = [];
const edges: Edge[] = [];
const infoMap = new Map<string, NodeInfo>();
let nodeId = 0;

const getHorizontalGap = (niveau: number) => {
  if (niveau <= 1) return 100;
  if (niveau === 2) return 80;
  if (niveau === 3) return 50;
  return 30;
};

const verticalGap = 250;

function createNode(noeud: any, x: number, y: number, niveau: number, parentId: string | null): string {
  const currentId = `node-${nodeId++}`;
  const { width: nodeWidth, height: nodeHeight } = getSizeByLevel(niveau, mode);
  
  // Stocker les infos
  infoMap.set(currentId, {
    id: currentId,
    titre: noeud.titre,
    niveau: niveau,
    parentId: parentId,
    x: x,
    y: y
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
  
  const titleSize = niveau === 0 ? '15px' : niveau === 1 ? '13px' : niveau === 2 ? '12px' : '11px';
  const contentSize = niveau === 0 ? '11px' : niveau === 1 ? '10px' : '9px';
  
  nodes.push({
    id: currentId,
    type: 'default',
    position: { x, y },
    sourcePosition: Position.Bottom,
    targetPosition: Position.Top,
    data: {
      label: (
        <div style={{
          width: `${nodeWidth}px`,
          height: `${nodeHeight}px`,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          padding: niveau === 0 ? '12px' : niveau === 1 ? '10px' : '8px',
          boxSizing: 'border-box',
          cursor: 'pointer',
        }}>
          <div style={{ 
            fontWeight: niveau <= 2 ? 'bold' : '600',
            fontSize: titleSize,
            marginBottom: contentToShow ? '4px' : '0',
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
              lineHeight: '1.2',
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
      background: getColorByLevel(niveau),
      color: niveau === 0 ? 'white' : '#1f2937',
      border: `2px solid ${COLOR_THEMES[colorTheme][0]}`,
      borderRadius: niveau === 0 ? '10px' : niveau === 1 ? '9px' : '8px',
      fontSize: '12px',
      boxShadow: niveau === 0 
        ? '0 4px 8px rgba(0,0,0,0.15)' 
        : niveau === 1 
          ? '0 3px 6px rgba(0,0,0,0.1)'
          : '0 2px 4px rgba(0,0,0,0.08)',
      width: `${nodeWidth}px`,
      height: `${nodeHeight}px`,
      padding: 0,
    },
    draggable: true,
  });
  
  return currentId;
}

function calculateTreeWidth(noeud: any, niveau: number): number {
  const { width } = getSizeByLevel(niveau, mode);
  
  if (!noeud.enfants || noeud.enfants.length === 0) {
    return width;
  }
  
  const horizontalGap = getHorizontalGap(niveau);
  const childrenWidths = noeud.enfants.map((child: any) => calculateTreeWidth(child, niveau + 1));
  const totalChildWidth = childrenWidths.reduce((sum: number, w: number) => sum + w, 0);
  const gaps = (noeud.enfants.length - 1) * horizontalGap;
  
  return Math.max(width, totalChildWidth + gaps);
}

function buildTree(
  noeud: any, 
  parentId: string | null, 
  niveau: number, 
  centerX: number, 
  currentY: number
): void {
  const { width: nodeWidth } = getSizeByLevel(niveau, mode);
  const currentX = centerX - (nodeWidth / 2);
  const currentId = createNode(noeud, currentX, currentY, niveau, parentId);
  
  if (parentId) {
    edges.push({
      id: `edge-${parentId}-${currentId}`,
      source: parentId,
      target: currentId,
      type: 'straight',
      animated: false,
      style: { 
        stroke: getColorByLevel(niveau - 1), 
        strokeWidth: 2 
      },
    });
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
        const introId = buildTreeAndReturnId(introduction, currentId, 1, centerX, introY);
        
        if (autresEnfants.length > 0) {
          const axesY = introY + verticalGap;
          const horizontalGap = getHorizontalGap(1);
          const childrenWidths = autresEnfants.map((child: any) => calculateTreeWidth(child, 2));
          const totalWidth = childrenWidths.reduce((sum: number, w: number) => sum + w, 0);
          const totalGaps = (autresEnfants.length - 1) * horizontalGap;
          const totalTreeWidth = totalWidth + totalGaps;
          
          let currentChildX = centerX - (totalTreeWidth / 2);
          
          autresEnfants.forEach((child: any, index: number) => {
            const childWidth = childrenWidths[index];
            const childCenterX = currentChildX + (childWidth / 2);
            buildTree(child, introId, 2, childCenterX, axesY);
            currentChildX += childWidth + horizontalGap;
          });
        }
      }
    } else {
      const childY = currentY + verticalGap;
      const horizontalGap = getHorizontalGap(niveau);
      const childrenWidths = noeud.enfants.map((child: any) => calculateTreeWidth(child, niveau + 1));
      const totalWidth = childrenWidths.reduce((sum: number, w: number) => sum + w, 0);
      const totalGaps = (noeud.enfants.length - 1) * horizontalGap;
      const totalTreeWidth = totalWidth + totalGaps;
      
      let currentChildX = centerX - (totalTreeWidth / 2);
      
      noeud.enfants.forEach((child: any, index: number) => {
        const childWidth = childrenWidths[index];
        const childCenterX = currentChildX + (childWidth / 2);
        buildTree(child, currentId, niveau + 1, childCenterX, childY);
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
  currentY: number
): string {
  const { width: nodeWidth } = getSizeByLevel(niveau, mode);
  const currentX = centerX - (nodeWidth / 2);
  const currentId = createNode(noeud, currentX, currentY, niveau, parentId);
  
  if (parentId) {
    edges.push({
      id: `edge-${parentId}-${currentId}`,
      source: parentId,
      target: currentId,
      type: 'straight',
      animated: false,
      style: { 
        stroke: getColorByLevel(niveau - 1), 
        strokeWidth: 2 
      },
    });
  }
  
  if (noeud.enfants && noeud.enfants.length > 0) {
    const childY = currentY + verticalGap;
    const horizontalGap = getHorizontalGap(niveau);
    const childrenWidths = noeud.enfants.map((child: any) => calculateTreeWidth(child, niveau + 1));
    const totalWidth = childrenWidths.reduce((sum: number, w: number) => sum + w, 0);
    const totalGaps = (noeud.enfants.length - 1) * horizontalGap;
    const totalTreeWidth = totalWidth + totalGaps;
    
    let currentChildX = centerX - (totalTreeWidth / 2);
    
    noeud.enfants.forEach((child: any, index: number) => {
      const childWidth = childrenWidths[index];
      const childCenterX = currentChildX + (childWidth / 2);
      buildTree(child, currentId, niveau + 1, childCenterX, childY);
      currentChildX += childWidth + horizontalGap;
    });
  }
  
  return currentId;
}

const treeWidth = calculateTreeWidth(structure, 0);
const startX = Math.max(800, treeWidth / 2 + 200);
buildTree(structure, null, 0, startX, 50);

// Sauvegarder la map
setNodesInfo(infoMap);

return { nodes, edges };
```

}, [structure, mode, colorTheme]);

const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
const [customPositions, setCustomPositions] = useState<Map<string, {x: number, y: number}>>(new Map());

// Appliquer le style zoom
useEffect(() => {
setNodes((nds) =>
nds.map((node) => {
const isZoomed = node.id === zoomedNodeId;
const shouldShow = !zoomedNodeId || isRelatedNode(node.id, zoomedNodeId, nodesInfo);

```
    return {
      ...node,
      style: {
        ...node.style,
        background: isZoomed ? '#fbbf24' : getColorByLevel(node.data.niveau),
        color: (node.data.niveau === 0 || isZoomed) ? 'white' : '#1f2937',
        border: isZoomed ? '3px solid #f59e0b' : node.style?.border,
        boxShadow: isZoomed 
          ? '0 8px 16px rgba(245, 158, 11, 0.4)'
          : node.style?.boxShadow,
        opacity: shouldShow ? 1 : 0.3,
        transition: 'all 0.3s ease',
      },
    };
  })
);
```

}, [zoomedNodeId, nodesInfo, setNodes]);

// Vérifier si un nœud est lié
function isRelatedNode(nodeId: string, zoomedId: string, infoMap: Map<string, NodeInfo>): boolean {
if (nodeId === zoomedId) return true;

```
// Parent
let current: string | null = zoomedId;
while (current) {
  if (current === nodeId) return true;
  const info = infoMap.get(current);
  current = info?.parentId || null;
}

// Enfant
const checkChild = (id: string): boolean => {
  if (id === zoomedId) return true;
  const children = Array.from(infoMap.values()).filter(n => n.parentId === id);
  return children.some(c => checkChild(c.id));
};

return checkChild(nodeId);
```

}

// Navigation entre frères
const getSiblings = useCallback(() => {
if (!zoomedNodeId) return [];

```
const current = nodesInfo.get(zoomedNodeId);
if (!current || !current.parentId) return [];

return Array.from(nodesInfo.values())
  .filter(n => n.parentId === current.parentId)
  .sort((a, b) => a.x - b.x);
```

}, [zoomedNodeId, nodesInfo]);

const navigateToPrevious = () => {
const siblings = getSiblings();
const idx = siblings.findIndex(s => s.id === zoomedNodeId);
if (idx > 0) {
const target = siblings[idx - 1];
setZoomedNodeId(target.id);

```
  // Breadcrumb
  const path: NodeInfo[] = [];
  let currentId: string | null = target.id;
  while (currentId) {
    const info = nodesInfo.get(currentId);
    if (info) {
      path.unshift(info);
      currentId = info.parentId;
    } else break;
  }
  setBreadcrumb(path);
  
  setTimeout(() => {
    reactFlow.setCenter(target.x + 100, target.y + 50, { zoom: 1.2, duration: 500 });
  }, 100);
}
```

};

const navigateToNext = () => {
const siblings = getSiblings();
const idx = siblings.findIndex(s => s.id === zoomedNodeId);
if (idx < siblings.length - 1) {
const target = siblings[idx + 1];
setZoomedNodeId(target.id);

```
  // Breadcrumb
  const path: NodeInfo[] = [];
  let currentId: string | null = target.id;
  while (currentId) {
    const info = nodesInfo.get(currentId);
    if (info) {
      path.unshift(info);
      currentId = info.parentId;
    } else break;
  }
  setBreadcrumb(path);
  
  setTimeout(() => {
    reactFlow.setCenter(target.x + 100, target.y + 50, { zoom: 1.2, duration: 500 });
  }, 100);
}
```

};

const handleNodesChange = useCallback((changes: NodeChange[]) => {
changes.forEach((change) => {
if (change.type === ‘position’ && change.position && change.dragging === false) {
setCustomPositions(prev => {
const newMap = new Map(prev);
newMap.set(change.id, change.position!);
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
return { …node, position: customPos };
}
return node;
});
setNodes(updatedNodes);
setEdges(initialEdges);
}, [initialNodes, initialEdges, setNodes, setEdges, customPositions]);

const siblings = getSiblings();
const currentIndex = siblings.findIndex(s => s.id === zoomedNodeId);

return (
<div style={{ position: ‘relative’, height: ‘100%’ }}>
{/* Sélecteur couleur */}
<div style={{
position: ‘absolute’,
top: ‘10px’,
right: ‘10px’,
zIndex: 10,
display: ‘flex’,
gap: ‘6px’,
background: ‘white’,
padding: ‘6px’,
borderRadius: ‘8px’,
boxShadow: ‘0 2px 8px rgba(0,0,0,0.1)’
}}>
{Object.keys(COLOR_THEMES).map((theme) => (
<button
key={theme}
onClick={() => setColorTheme(theme as keyof typeof COLOR_THEMES)}
style={{
width: ‘28px’,
height: ‘28px’,
borderRadius: ‘6px’,
border: colorTheme === theme ? ‘3px solid #1f2937’ : ‘2px solid #e5e7eb’,
background: COLOR_THEMES[theme as keyof typeof COLOR_THEMES][0],
cursor: ‘pointer’,
transition: ‘all 0.2s’
}}
/>
))}
</div>

```
  {/* Breadcrumb */}
  {breadcrumb.length > 0 && (
    <div style={{
      position: 'absolute',
      top: '10px',
      left: '10px',
      zIndex: 10,
      background: 'white',
      padding: '10px 16px',
      borderRadius: '8px',
      boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      maxWidth: '60%',
      overflow: 'hidden'
    }}>
      <span style={{ fontSize: '16px' }}>🏠</span>
      {breadcrumb.map((item, index) => (
        <React.Fragment key={item.id}>
          {index > 0 && <span style={{ color: '#9ca3af' }}>›</span>}
          <span style={{
            color: index === breadcrumb.length - 1 ? '#6366f1' : '#6b7280',
            fontWeight: index === breadcrumb.length - 1 ? 'bold' : 'normal',
            fontSize: '13px',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            maxWidth: '150px'
          }}>
            {item.titre}
          </span>
        </React.Fragment>
      ))}
    </div>
  )}
  
  {/* Navigation */}
  {zoomedNodeId && siblings.length > 1 && (
    <div style={{
      position: 'absolute',
      bottom: '20px',
      left: '50%',
      transform: 'translateX(-50%)',
      zIndex: 10,
      display: 'flex',
      gap: '10px',
      background: 'white',
      padding: '8px',
      borderRadius: '8px',
      boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
    }}>
      <button
        onClick={navigateToPrevious}
        disabled={currentIndex === 0}
        style={{
          background: currentIndex === 0 ? '#e5e7eb' : '#6366f1',
          color: 'white',
          border: 'none',
          padding: '8px 16px',
          borderRadius: '6px',
          cursor: currentIndex === 0 ? 'not-allowed' : 'pointer',
          fontWeight: '600',
          fontSize: '14px'
        }}
      >
        ← Précédent
      </button>
      <span style={{
        padding: '8px 12px',
        color: '#6b7280',
        fontSize: '14px',
        fontWeight: '600'
      }}>
        {currentIndex + 1} / {siblings.length}
      </span>
      <button
        onClick={navigateToNext}
        disabled={currentIndex === siblings.length - 1}
        style={{
          background: currentIndex === siblings.length - 1 ? '#e5e7eb' : '#6366f1',
          color: 'white',
          border: 'none',
          padding: '8px 16px',
          borderRadius: '6px',
          cursor: currentIndex === siblings.length - 1 ? 'not-allowed' : 'pointer',
          fontWeight: '600',
          fontSize: '14px'
        }}
      >
        Suivant →
      </button>
    </div>
  )}
  
  {/* Bouton vue globale */}
  {zoomedNodeId && (
    <button
      onClick={() => {
        setZoomedNodeId(null);
        setBreadcrumb([]);
        setTimeout(() => reactFlow.fitView({ duration: 500, padding: 0.2 }), 100);
      }}
      style={{
        position: 'absolute',
        bottom: '80px',
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 10,
        background: '#f59e0b',
        color: 'white',
        border: 'none',
        padding: '10px 20px',
        borderRadius: '8px',
        cursor: 'pointer',
        fontWeight: '600',
        fontSize: '14px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
      }}
    >
      🏠 Vue globale
    </button>
  )}
  
  <div style={{ width: '100%', height: '100%', border: '1px solid #e5e7eb', borderRadius: '8px', overflow: 'hidden' }}>
    <ReactFlow
      nodes={nodes}
      edges={edges}
      onNodesChange={handleNodesChange}
      onEdgesChange={onEdgesChange}
      onNodeClick={onNodeClick}
      fitView
      fitViewOptions={{ padding: 0.2, maxZoom: 1.5 }}
      attributionPosition="bottom-left"
      minZoom={0.1}
      maxZoom={2}
      nodesDraggable={true}
      nodesConnectable={false}
    >
      <Background color="#f3f4f6" gap={16} />
      <Controls />
      <MiniMap 
        nodeColor={(node) => {
          if (node.id === zoomedNodeId) return '#fbbf24';
          return node.style?.background as string || '#6366f1';
        }}
        maskColor="rgba(0, 0, 0, 0.1)"
        style={{
          background: 'white',
          border: '2px solid #e5e7eb',
          borderRadius: '8px'
        }}
      />
    </ReactFlow>
  </div>
</div>
```

);
};

const MindMap: React.FC<MindMapProps> = (props) => {
return (
<ReactFlowProvider>
<MindMapContent {…props} />
</ReactFlowProvider>
);
};

export default MindMap;
