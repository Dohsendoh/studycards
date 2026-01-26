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

// Fonction pour générer un dégradé de couleur
const getColorByLevel = (niveau: number, baseColor: string = '#6366f1'): string => {
  const colors = {
    '#6366f1': [ // Indigo (par défaut)
      '#6366f1', // Niveau 0 - Indigo foncé
      '#818cf8', // Niveau 1 - Indigo moyen
      '#a5b4fc', // Niveau 2 - Indigo clair
      '#c7d2fe', // Niveau 3 - Indigo très clair
      '#e0e7ff'  // Niveau 4 - Indigo ultra clair
    ],
    '#ef4444': [ // Rouge
      '#ef4444',
      '#f87171',
      '#fca5a5',
      '#fecaca',
      '#fee2e2'
    ],
    '#10b981': [ // Vert
      '#10b981',
      '#34d399',
      '#6ee7b7',
      '#a7f3d0',
      '#d1fae5'
    ],
    '#f59e0b': [ // Orange
      '#f59e0b',
      '#fbbf24',
      '#fcd34d',
      '#fde68a',
      '#fef3c7'
    ],
    '#8b5cf6': [ // Violet
      '#8b5cf6',
      '#a78bfa',
      '#c4b5fd',
      '#ddd6fe',
      '#ede9fe'
    ],
  };

  const colorArray = colors[baseColor] || colors['#6366f1'];
  return colorArray[Math.min(niveau, colorArray.length - 1)];
};

const MindMap: React.FC<MindMapProps> = ({ structure, mode, visualisation }) => {
  
  // Conversion de la structure en nœuds React Flow
  const { nodes: initialNodes, edges: initialEdges } = useMemo(() => {
    if (!structure) return { nodes: [], edges: [] };
    
    const nodes: Node[] = [];
    const edges: Edge[] = [];
    let nodeId = 0;
    
    // Couleur de base (peut être modifiée plus tard)
    const baseColor = '#6366f1';
    
    function convertToNodes(
      noeud: any,
      parentId: string | null = null,
      niveau: number = 0,
      position: { x: number; y: number } = { x: 0, y: 0 }
    ) {
      const currentId = `node-${nodeId++}`;
      
      // Déterminer le contenu selon le mode
      let contentToShow = '';
      if (mode === 'light') {
        // Mode léger : seulement le titre
        contentToShow = '';
      } else if (mode === 'semi') {
        // Mode semi : titre + début du contenu
        contentToShow = noeud.contenu?.substring(0, 80) + '...' || '';
      } else {
        // Mode full : tout le contenu
        contentToShow = noeud.contenu || '';
      }
      
      // Largeur selon le mode
      const nodeWidth = mode === 'light' ? 150 : mode === 'semi' ? 250 : 350;
      
      nodes.push({
        id: currentId,
        type: 'default',
        position,
        data: {
          label: (
            <div 
              style={{
                padding: '12px',
                width: `${nodeWidth}px`,
                textAlign: 'center',
                overflow: 'hidden',
                wordWrap: 'break-word'
              }}
            >
              <div style={{ 
                fontWeight: 'bold', 
                marginBottom: contentToShow ? '8px' : '0',
                fontSize: niveau === 0 ? '16px' : '14px'
              }}>
                {noeud.titre}
              </div>
              {contentToShow && (
                <div style={{ 
                  fontSize: '12px', 
                  color: niveau === 0 ? '#e0e7ff' : '#4b5563',
                  lineHeight: '1.4'
                }}>
                  {contentToShow}
                </div>
              )}
            </div>
          ),
        },
        style: {
          background: getColorByLevel(niveau, baseColor),
          color: niveau === 0 ? 'white' : '#1f2937',
          border: `2px solid ${baseColor}`,
          borderRadius: '12px',
          fontSize: '13px',
          boxShadow: niveau === 0 ? '0 4px 6px rgba(0,0,0,0.1)' : '0 2px 4px rgba(0,0,0,0.05)',
          width: `${nodeWidth}px`,
        },
      });
      
      if (parentId) {
        // Déterminer les handles source/target selon la visualisation
        let sourceHandle = undefined;
        let targetHandle = undefined;
        
        if (visualisation === 'toile' && niveau > 0) {
          // En mode toile, calculer l'angle pour déterminer les handles
          const childCount = noeud.enfants?.length || 0;
          const angle = (index / childCount) * 2 * Math.PI - Math.PI / 2;
          
          // Déterminer le handle source (d'où part la connexion du parent)
          if (angle >= -Math.PI / 4 && angle < Math.PI / 4) {
            sourceHandle = 'right'; // Droite
          } else if (angle >= Math.PI / 4 && angle < 3 * Math.PI / 4) {
            sourceHandle = 'bottom'; // Bas
          } else if (angle >= 3 * Math.PI / 4 || angle < -3 * Math.PI / 4) {
            sourceHandle = 'left'; // Gauche
          } else {
            sourceHandle = 'top'; // Haut
          }
          
          // Le handle target est l'opposé
          const oppositeHandles = {
            'right': 'left',
            'bottom': 'top',
            'left': 'right',
            'top': 'bottom'
          };
          targetHandle = oppositeHandles[sourceHandle];
        }
        
        edges.push({
          id: `edge-${parentId}-${currentId}`,
          source: parentId,
          target: currentId,
          sourceHandle,
          targetHandle,
          type: 'smoothstep',
          animated: false,
          style: { 
            stroke: getColorByLevel(niveau - 1, baseColor), 
            strokeWidth: 2 
          },
        });
      }
      
      if (noeud.enfants && noeud.enfants.length > 0) {
        const childCount = noeud.enfants.length;
        
        noeud.enfants.forEach((enfant: any, index: number) => {
          let childX, childY;
          
          if (visualisation === 'arbre') {
            // Disposition en arbre vertical
            const spacing = nodeWidth + 80;
            childX = position.x + (index - (childCount - 1) / 2) * spacing;
            childY = position.y + 180;
          } else {
            // Disposition en toile (radiale)
            // Le nœud central est au centre
            const angle = (index / childCount) * 2 * Math.PI - Math.PI / 2;
            const radius = 280 + niveau * 40;
            childX = position.x + Math.cos(angle) * radius;
            childY = position.y + Math.sin(angle) * radius;
          }
          
          convertToNodes(enfant, currentId, niveau + 1, { x: childX, y: childY });
        });
      }
    }
    
    // Position de départ
    const startX = visualisation === 'arbre' ? 400 : 600;
    const startY = visualisation === 'arbre' ? 50 : 400;
    
    convertToNodes(structure, null, 0, { x: startX, y: startY });
    
    return { nodes, edges };
  }, [structure, mode, visualisation]);
  
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  
  // Mettre à jour les nœuds quand les props changent
  React.useEffect(() => {
    setNodes(initialNodes);
    setEdges(initialEdges);
  }, [initialNodes, initialEdges, setNodes, setEdges]);
  
  return (
    <div style={{ width: '100%', height: '600px', border: '1px solid #e5e7eb', borderRadius: '8px', overflow: 'hidden' }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        fitView
        attributionPosition="bottom-left"
        minZoom={0.2}
        maxZoom={2}
      >
        <Background color="#f3f4f6" gap={16} />
        <Controls />
        <MiniMap 
          nodeColor={(node) => {
            const bgColor = node.style?.background as string;
            return bgColor || '#6366f1';
          }}
          maskColor="rgba(0, 0, 0, 0.1)"
        />
      </ReactFlow>
    </div>
  );
};

export default MindMap;
