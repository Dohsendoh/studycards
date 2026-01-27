import React, { useMemo } from 'react';
import ReactFlow, {
  Node,
  Edge,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
} from 'reactflow';
import 'reactflow/dist/style.css';

interface MindMapProps {
  structure: any;
  mode: 'full' | 'semi' | 'light';
  visualisation: 'arbre' | 'toile';
}

const getColorByLevel = (niveau: number): string => {
  const colors = ['#6366f1', '#818cf8', '#a5b4fc', '#c7d2fe', '#e0e7ff'];
  return colors[Math.min(niveau, colors.length - 1)];
};

const MindMap: React.FC<MindMapProps> = ({ structure, mode, visualisation }) => {
  
  const { nodes: initialNodes, edges: initialEdges } = useMemo(() => {
    if (!structure) return { nodes: [], edges: [] };
    
    const nodes: Node[] = [];
    const edges: Edge[] = [];
    let nodeId = 0;
    
    // Largeur selon le mode
    const nodeWidth = mode === 'light' ? 180 : mode === 'semi' ? 250 : 350;
    const nodeHeight = mode === 'light' ? 60 : mode === 'semi' ? 100 : 150;
    
    // Espacements
    const horizontalGap = 200; // Espace horizontal minimum entre cases
    const verticalGap = 180;   // Espace vertical entre niveaux
    
    // Créer un nœud
    function createNode(noeud: any, x: number, y: number, niveau: number): string {
      const currentId = `node-${nodeId++}`;
      
      let contentToShow = '';
      if (mode === 'semi') {
        contentToShow = noeud.contenu?.substring(0, 100) || '';
      } else if (mode === 'full') {
        contentToShow = noeud.contenu || '';
      }
      
      nodes.push({
        id: currentId,
        type: 'default',
        position: { x, y },
        data: {
          label: (
            <div style={{
              padding: '12px',
              width: `${nodeWidth}px`,
              minHeight: `${nodeHeight}px`,
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              textAlign: 'center',
              overflow: 'hidden',
            }}>
              <div style={{ 
                fontWeight: 'bold',
                fontSize: niveau === 0 ? '16px' : '14px',
                marginBottom: contentToShow ? '6px' : '0'
              }}>
                {noeud.titre}
              </div>
              {contentToShow && (
                <div style={{ 
                  fontSize: '11px',
                  color: niveau === 0 ? '#e0e7ff' : '#4b5563',
                  lineHeight: '1.3',
                  wordBreak: 'break-word'
                }}>
                  {contentToShow}
                </div>
              )}
            </div>
          ),
        },
        style: {
          background: getColorByLevel(niveau),
          color: niveau === 0 ? 'white' : '#1f2937',
          border: `2px solid #6366f1`,
          borderRadius: '10px',
          fontSize: '13px',
          boxShadow: niveau === 0 ? '0 4px 8px rgba(0,0,0,0.15)' : '0 2px 4px rgba(0,0,0,0.08)',
        },
      });
      
      return currentId;
    }
    
    // Calculer la largeur totale d'un sous-arbre
    function calculateTreeWidth(noeud: any): number {
      if (!noeud.enfants || noeud.enfants.length === 0) {
        return nodeWidth;
      }
      
      const childrenWidths = noeud.enfants.map((child: any) => calculateTreeWidth(child));
      const totalChildWidth = childrenWidths.reduce((sum: number, w: number) => sum + w, 0);
      const gaps = (noeud.enfants.length - 1) * horizontalGap;
      
      return Math.max(nodeWidth, totalChildWidth + gaps);
    }
    
    // Construire l'arbre de manière hiérarchique
    function buildTree(noeud: any, parentId: string | null, niveau: number, centerX: number, startY: number): void {
      const currentY = startY + (niveau * verticalGap);
      
      // Position X centrée
      const currentX = centerX - (nodeWidth / 2);
      
      // Créer le nœud actuel
      const currentId = createNode(noeud, currentX, currentY, niveau);
      
      // Créer le lien avec le parent
      if (parentId) {
        edges.push({
          id: `edge-${parentId}-${currentId}`,
          source: parentId,
          target: currentId,
          type: 'smoothstep',
          animated: false,
          style: { stroke: getColorByLevel(niveau - 1), strokeWidth: 2 },
        });
      }
      
      // Traiter les enfants
      if (noeud.enfants && noeud.enfants.length > 0) {
        const childrenWidths = noeud.enfants.map((child: any) => calculateTreeWidth(child));
        const totalWidth = childrenWidths.reduce((sum: number, w: number) => sum + w, 0);
        const totalGaps = (noeud.enfants.length - 1) * horizontalGap;
        const totalTreeWidth = totalWidth + totalGaps;
        
        let currentChildX = centerX - (totalTreeWidth / 2);
        
        noeud.enfants.forEach((child: any, index: number) => {
          const childWidth = childrenWidths[index];
          const childCenterX = currentChildX + (childWidth / 2);
          
          buildTree(child, currentId, niveau + 1, childCenterX, startY);
          
          currentChildX += childWidth + horizontalGap;
        });
      }
    }
    
    // Construire en mode toile (radial simplifié)
    function buildWeb(noeud: any, parentId: string | null, niveau: number, centerX: number, centerY: number, startAngle: number, angleSpan: number): void {
      const radius = 250 + (niveau * 80);
      
      if (niveau === 0) {
        // Nœud central
        const currentId = createNode(noeud, centerX - nodeWidth / 2, centerY - nodeHeight / 2, niveau);
        
        if (noeud.enfants && noeud.enfants.length > 0) {
          const angleStep = (2 * Math.PI) / noeud.enfants.length;
          
          noeud.enfants.forEach((child: any, index: number) => {
            const angle = index * angleStep - Math.PI / 2;
            buildWeb(child, currentId, niveau + 1, centerX, centerY, angle, angleStep);
          });
        }
      } else {
        // Nœuds en cercle
        const x = centerX + Math.cos(startAngle) * radius - nodeWidth / 2;
        const y = centerY + Math.sin(startAngle) * radius - nodeHeight / 2;
        
        const currentId = createNode(noeud, x, y, niveau);
        
        if (parentId) {
          edges.push({
            id: `edge-${parentId}-${currentId}`,
            source: parentId,
            target: currentId,
            type: 'smoothstep',
            animated: false,
            style: { stroke: getColorByLevel(niveau - 1), strokeWidth: 2 },
          });
        }
        
        // Enfants récursifs
        if (noeud.enfants && noeud.enfants.length > 0) {
          const childAngleSpan = angleSpan / noeud.enfants.length;
          
          noeud.enfants.forEach((child: any, index: number) => {
            const childAngle = startAngle + (index * childAngleSpan) - (angleSpan / 2) + (childAngleSpan / 2);
            buildWeb(child, currentId, niveau + 1, centerX, centerY, childAngle, childAngleSpan);
          });
        }
      }
    }
    
    // Construire selon le mode
    if (visualisation === 'arbre') {
      const treeWidth = calculateTreeWidth(structure);
      const startX = Math.max(800, treeWidth / 2 + 200);
      buildTree(structure, null, 0, startX, 50);
    } else {
      buildWeb(structure, null, 0, 600, 400, 0, 2 * Math.PI);
    }
    
    return { nodes, edges };
  }, [structure, mode, visualisation]);
  
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  
  React.useEffect(() => {
    setNodes(initialNodes);
    setEdges(initialEdges);
  }, [initialNodes, initialEdges, setNodes, setEdges]);
  
  return (
    <div style={{ width: '100%', height: '650px', border: '1px solid #e5e7eb', borderRadius: '8px', overflow: 'hidden' }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        fitView
        fitViewOptions={{ padding: 0.2, maxZoom: 1.5 }}
        attributionPosition="bottom-left"
        minZoom={0.1}
        maxZoom={2}
      >
        <Background color="#f3f4f6" gap={16} />
        <Controls />
        <MiniMap 
          nodeColor={(node) => node.style?.background as string || '#6366f1'}
          maskColor="rgba(0, 0, 0, 0.1)"
        />
      </ReactFlow>
    </div>
  );
};

export default MindMap;
