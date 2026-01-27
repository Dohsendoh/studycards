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

// Fonction pour générer un dégradé de couleur
const getColorByLevel = (niveau: number, baseColor: string = '#6366f1'): string => {
  const colors = {
    '#6366f1': [
      '#6366f1', // Niveau 0 - Indigo foncé
      '#818cf8', // Niveau 1
      '#a5b4fc', // Niveau 2
      '#c7d2fe', // Niveau 3
      '#e0e7ff'  // Niveau 4+
    ]
  };

  const colorArray = colors[baseColor] || colors['#6366f1'];
  return colorArray[Math.min(niveau, colorArray.length - 1)];
};

const MindMap: React.FC<MindMapProps> = ({ structure, mode, visualisation }) => {
  
  const { nodes: initialNodes, edges: initialEdges } = useMemo(() => {
    if (!structure) return { nodes: [], edges: [] };
    
    const nodes: Node[] = [];
    const edges: Edge[] = [];
    let nodeId = 0;
    const baseColor = '#6366f1';
    
    // Calculer la largeur d'une case selon le mode
    const getNodeWidth = (mode: string): number => {
      switch (mode) {
        case 'light': return 180;
        case 'semi': return 280;
        case 'full': return 380;
        default: return 280;
      }
    };
    
    const nodeWidth = getNodeWidth(mode);
    const horizontalSpacing = nodeWidth + 120; // Espacement horizontal entre les cases
    const verticalSpacing = 200; // Espacement vertical entre les niveaux
    
    // Fonction récursive pour calculer le nombre de feuilles (pour l'espacement)
    function countLeaves(noeud: any): number {
      if (!noeud.enfants || noeud.enfants.length === 0) return 1;
      return noeud.enfants.reduce((sum: number, child: any) => sum + countLeaves(child), 0);
    }
    
    // Fonction pour convertir la structure en nœuds
    function convertToNodes(
      noeud: any,
      parentId: string | null = null,
      niveau: number = 0,
      xOffset: number = 0,
      parentX: number = 0
    ): number {
      const currentId = `node-${nodeId++}`;
      
      // Contenu selon le mode
      let contentToShow = '';
      if (mode === 'light') {
        contentToShow = '';
      } else if (mode === 'semi') {
        contentToShow = noeud.contenu?.substring(0, 100) + '...' || '';
      } else {
        contentToShow = noeud.contenu || '';
      }
      
      // Position Y basée sur le niveau
      const y = niveau * verticalSpacing + 50;
      
      // Calculer la position X
      let x: number;
      if (niveau === 0) {
        // Nœud racine au centre
        x = 500;
      } else if (noeud.enfants && noeud.enfants.length > 0) {
        // Nœud avec enfants : centré sur ses enfants
        const childCount = noeud.enfants.length;
        const totalWidth = (childCount - 1) * horizontalSpacing;
        x = xOffset + totalWidth / 2;
      } else {
        // Feuille : position donnée
        x = xOffset;
      }
      
      // Créer le nœud
      nodes.push({
        id: currentId,
        type: 'default',
        position: { x, y },
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
      
      // Créer le lien vers le parent
      if (parentId) {
        edges.push({
          id: `edge-${parentId}-${currentId}`,
          source: parentId,
          target: currentId,
          type: 'smoothstep',
          animated: false,
          style: { 
            stroke: getColorByLevel(niveau - 1, baseColor), 
            strokeWidth: 2 
          },
        });
      }
      
      // Traiter les enfants
      if (noeud.enfants && noeud.enfants.length > 0) {
        let currentXOffset = xOffset;
        
        // Pour le mode arbre
        if (visualisation === 'arbre') {
          // Calculer l'espacement pour centrer les enfants
          const childCount = noeud.enfants.length;
          const totalWidth = (childCount - 1) * horizontalSpacing;
          currentXOffset = x - totalWidth / 2;
          
          noeud.enfants.forEach((enfant: any, index: number) => {
            const childX = currentXOffset + (index * horizontalSpacing);
            convertToNodes(enfant, currentId, niveau + 1, childX, x);
          });
        } else {
          // Mode toile (radial)
          const childCount = noeud.enfants.length;
          const radius = 300 + niveau * 50;
          
          noeud.enfants.forEach((enfant: any, index: number) => {
            const angle = (index / childCount) * 2 * Math.PI - Math.PI / 2;
            const childX = x + Math.cos(angle) * radius;
            const childY = y + Math.sin(angle) * radius;
            
            // Créer le nœud enfant
            const childId = `node-${nodeId++}`;
            
            let childContent = '';
            if (mode === 'semi') {
              childContent = enfant.contenu?.substring(0, 100) + '...' || '';
            } else if (mode === 'full') {
              childContent = enfant.contenu || '';
            }
            
            nodes.push({
              id: childId,
              type: 'default',
              position: { x: childX, y: childY },
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
                      marginBottom: childContent ? '8px' : '0',
                      fontSize: '14px'
                    }}>
                      {enfant.titre}
                    </div>
                    {childContent && (
                      <div style={{ 
                        fontSize: '12px', 
                        color: '#4b5563',
                        lineHeight: '1.4'
                      }}>
                        {childContent}
                      </div>
                    )}
                  </div>
                ),
              },
              style: {
                background: getColorByLevel(niveau + 1, baseColor),
                color: '#1f2937',
                border: `2px solid ${baseColor}`,
                borderRadius: '12px',
                fontSize: '13px',
                boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
                width: `${nodeWidth}px`,
              },
            });
            
            edges.push({
              id: `edge-${currentId}-${childId}`,
              source: currentId,
              target: childId,
              type: 'smoothstep',
              animated: false,
              style: { 
                stroke: getColorByLevel(niveau, baseColor), 
                strokeWidth: 2 
              },
            });
            
            // Traiter récursivement les sous-enfants
            if (enfant.enfants && enfant.enfants.length > 0) {
              // Repositionner pour mode toile
              convertToNodesRecursive(enfant.enfants, childId, niveau + 2, childX, childY);
            }
          });
        }
      }
      
      return x;
    }
    
    // Fonction auxiliaire pour le mode toile
    function convertToNodesRecursive(
      children: any[],
      parentId: string,
      niveau: number,
      parentX: number,
      parentY: number
    ) {
      const childCount = children.length;
      const radius = 250;
      
      children.forEach((enfant: any, index: number) => {
        const angle = (index / childCount) * 2 * Math.PI;
        const childX = parentX + Math.cos(angle) * radius;
        const childY = parentY + Math.sin(angle) * radius;
        
        const childId = `node-${nodeId++}`;
        
        let childContent = '';
        if (mode === 'semi') {
          childContent = enfant.contenu?.substring(0, 100) + '...' || '';
        } else if (mode === 'full') {
          childContent = enfant.contenu || '';
        }
        
        nodes.push({
          id: childId,
          type: 'default',
          position: { x: childX, y: childY },
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
                <div style={{ fontWeight: 'bold', marginBottom: childContent ? '8px' : '0', fontSize: '14px' }}>
                  {enfant.titre}
                </div>
                {childContent && (
                  <div style={{ fontSize: '12px', color: '#4b5563', lineHeight: '1.4' }}>
                    {childContent}
                  </div>
                )}
              </div>
            ),
          },
          style: {
            background: getColorByLevel(niveau, baseColor),
            color: '#1f2937',
            border: `2px solid ${baseColor}`,
            borderRadius: '12px',
            fontSize: '13px',
            boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
            width: `${nodeWidth}px`,
          },
        });
        
        edges.push({
          id: `edge-${parentId}-${childId}`,
          source: parentId,
          target: childId,
          type: 'smoothstep',
          animated: false,
          style: { stroke: getColorByLevel(niveau - 1, baseColor), strokeWidth: 2 },
        });
      });
    }
    
    // Lancer la conversion
    convertToNodes(structure);
    
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
        minZoom={0.1}
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
