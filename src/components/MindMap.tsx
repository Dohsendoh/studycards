import React, { useCallback, useMemo } from 'react';
import ReactFlow, {
  Node,
  Edge,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  Position,
} from 'reactflow';
import 'reactflow/dist/style.css';

interface MindMapProps {
  structure: any;
  mode: 'full' | 'semi' | 'light';
  visualisation: 'arbre' | 'toile';
}

const MindMap: React.FC<MindMapProps> = ({ structure, mode, visualisation }) => {
  
  // Conversion de la structure en nœuds React Flow
  const { nodes: initialNodes, edges: initialEdges } = useMemo(() => {
    if (!structure) return { nodes: [], edges: [] };
    
    const nodes: Node[] = [];
    const edges: Edge[] = [];
    let nodeId = 0;
    
    function convertToNodes(
      noeud: any,
      parentId: string | null = null,
      niveau: number = 0,
      position: { x: number; y: number } = { x: 0, y: 0 }
    ) {
      const currentId = `node-${nodeId++}`;
      
      // Contenu selon le mode
      let label = '';
      if (mode === 'light') {
        label = noeud.titre;
      } else if (mode === 'semi') {
        label = `${noeud.titre}\n${noeud.contenu?.substring(0, 50)}...`;
      } else {
        label = `${noeud.titre}\n\n${noeud.contenu || ''}`;
      }
      
      nodes.push({
        id: currentId,
        type: 'default',
        position,
        data: {
          label: (
            <div style={{
              padding: '10px',
              minWidth: mode === 'light' ? '120px' : mode === 'semi' ? '200px' : '300px',
              maxWidth: '400px',
              textAlign: 'center'
            }}>
              <div style={{ fontWeight: 'bold', marginBottom: '5px' }}>
                {noeud.titre}
              </div>
              {mode !== 'light' && (
                <div style={{ fontSize: '12px', color: '#666' }}>
                  {mode === 'semi' 
                    ? noeud.contenu?.substring(0, 60) + '...'
                    : noeud.contenu
                  }
                </div>
              )}
            </div>
          ),
        },
        style: {
          background: niveau === 0 ? '#6366f1' : '#e0e7ff',
          color: niveau === 0 ? 'white' : '#1f2937',
          border: '2px solid #6366f1',
          borderRadius: '10px',
          fontSize: mode === 'light' ? '14px' : '12px',
        },
      });
      
      if (parentId) {
        edges.push({
          id: `edge-${parentId}-${currentId}`,
          source: parentId,
          target: currentId,
          type: 'smoothstep',
          animated: false,
          style: { stroke: '#6366f1', strokeWidth: 2 },
        });
      }
      
      if (noeud.enfants && noeud.enfants.length > 0) {
        const childCount = noeud.enfants.length;
        const spacing = visualisation === 'arbre' ? 250 : 300;
        
        noeud.enfants.forEach((enfant: any, index: number) => {
          let childX, childY;
          
          if (visualisation === 'arbre') {
            // Disposition en arbre vertical
            childX = position.x + (index - childCount / 2) * spacing;
            childY = position.y + 200;
          } else {
            // Disposition en toile (radiale)
            const angle = (index / childCount) * 2 * Math.PI;
            const radius = 250 + niveau * 50;
            childX = position.x + Math.cos(angle) * radius;
            childY = position.y + Math.sin(angle) * radius;
          }
          
          convertToNodes(enfant, currentId, niveau + 1, { x: childX, y: childY });
        });
      }
    }
    
    const startX = visualisation === 'arbre' ? 400 : 500;
    const startY = visualisation === 'arbre' ? 50 : 300;
    
    convertToNodes(structure, null, 0, { x: startX, y: startY });
    
    return { nodes, edges };
  }, [structure, mode, visualisation]);
  
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  
  return (
    <div style={{ width: '100%', height: '600px' }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        fitView
        attributionPosition="bottom-left"
      >
        <Background />
        <Controls />
        <MiniMap />
      </ReactFlow>
    </div>
  );
};

export default MindMap;
