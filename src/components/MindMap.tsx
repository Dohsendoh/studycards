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

const MindMap: React.FC<MindMapProps> = ({ structure, mode }) => {
const [colorTheme, setColorTheme] = useState<keyof typeof COLOR_THEMES>(‘indigo’);

const getColorByLevel = (niveau: number): string => {
const colors = COLOR_THEMES[colorTheme];
return colors[Math.min(niveau, colors.length - 1)];
};

const getSizeByLevel = (niveau: number, mode: string) => {
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

```
const sizeArray = sizes[mode as keyof typeof sizes];
return sizeArray[Math.min(niveau, sizeArray.length - 1)];
```

};

const { nodes: initialNodes, edges: initialEdges } = useMemo(() => {
if (!structure) return { nodes: [], edges: [] };

```
const nodes: Node[] = [];
const edges: Edge[] = [];
let nodeId = 0;

const getHorizontalGap = (niveau: number) => {
  if (niveau <= 1) return 120;
  if (niveau === 2) return 100;
  if (niveau === 3) return 60;
  return 40;
};

const verticalGap = 280;

function createNode(noeud: any, x: number, y: number, niveau: number): string {
  const currentId = `node-${nodeId++}`;
  const { width: nodeWidth, height: nodeHeight } = getSizeByLevel(niveau, mode);
  
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
          width: `${nodeWidth}px`,
          height: `${nodeHeight}px`,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          padding: niveau === 0 ? '16px' : niveau === 1 ? '14px' : '12px',
          boxSizing: 'border-box',
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
      background: getColorByLevel(niveau),
      color: niveau === 0 ? 'white' : '#1f2937',
      border: `3px solid ${COLOR_THEMES[colorTheme][0]}`,
      borderRadius: niveau === 0 ? '12px' : niveau === 1 ? '10px' : '8px',
      fontSize: '13px',
      boxShadow: niveau === 0 
        ? '0 6px 12px rgba(0,0,0,0.15)' 
        : niveau === 1 
          ? '0 4px 8px rgba(0,0,0,0.12)'
          : '0 2px 6px rgba(0,0,0,0.08)',
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
  const currentId = createNode(noeud, currentX, currentY, niveau);
  
  if (parentId) {
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
  const currentId = createNode(noeud, currentX, currentY, niveau);
  
  if (parentId) {
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

return { nodes, edges };
```

}, [structure, mode, colorTheme]);

const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

const [customPositions, setCustomPositions] = useState<Map<string, {x: number, y: number}>>(new Map());

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

return (
<div style={{ position: ‘relative’, height: ‘100%’ }}>
<div style={{
position: ‘absolute’,
top: ‘10px’,
right: ‘10px’,
zIndex: 10,
display: ‘flex’,
gap: ‘8px’,
background: ‘white’,
padding: ‘8px’,
borderRadius: ‘10px’,
boxShadow: ‘0 4px 12px rgba(0,0,0,0.1)’
}}>
{Object.keys(COLOR_THEMES).map((theme) => (
<button
key={theme}
onClick={() => setColorTheme(theme as keyof typeof COLOR_THEMES)}
style={{
width: ‘32px’,
height: ‘32px’,
borderRadius: ‘8px’,
border: colorTheme === theme ? ‘3px solid #1f2937’ : ‘2px solid #e5e7eb’,
background: COLOR_THEMES[theme as keyof typeof COLOR_THEMES][0],
cursor: ‘pointer’,
transition: ‘all 0.2s’,
boxShadow: colorTheme === theme ? ‘0 2px 6px rgba(0,0,0,0.15)’ : ‘none’
}}
/>
))}
</div>

```
  <div style={{ width: '100%', height: '100%', border: '1px solid #e5e7eb', borderRadius: '12px', overflow: 'hidden' }}>
    <ReactFlow
      nodes={nodes}
      edges={edges}
      onNodesChange={handleNodesChange}
      onEdgesChange={onEdgesChange}
      fitView
      fitViewOptions={{ padding: 0.2, maxZoom: 1.5 }}
      attributionPosition="bottom-left"
      minZoom={0.1}
      maxZoom={2}
      nodesDraggable={true}
      nodesConnectable={false}
    >
      <Background color="#f3f4f6" gap={20} size={1} />
      <Controls />
      <MiniMap 
        nodeColor={(node) => node.style?.background as string || '#6366f1'}
        maskColor="rgba(0, 0, 0, 0.1)"
        style={{
          background: 'white',
          border: '2px solid #e5e7eb',
          borderRadius: '10px'
        }}
      />
    </ReactFlow>
  </div>
</div>
```

);
};

export default MindMap;
