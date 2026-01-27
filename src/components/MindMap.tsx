import React, { useMemo, useState } from 'react';
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

const COLOR_THEMES = {
  indigo: ['#6366f1', '#818cf8', '#a5b4fc', '#c7d2fe', '#e0e7ff'],
  purple: ['#9333ea', '#a855f7', '#c084fc', '#d8b4fe', '#e9d5ff'],
  blue: ['#2563eb', '#3b82f6', '#60a5fa', '#93c5fd', '#bfdbfe'],
  green: ['#059669', '#10b981', '#34d399', '#6ee7b7', '#a7f3d0'],
  orange: ['#ea580c', '#f97316', '#fb923c', '#fdba74', '#fed7aa'],
};

const MindMap: React.FC<MindMapProps> = ({ structure, mode, visualisation }) => {
  const [colorTheme, setColorTheme] = useState<keyof typeof COLOR_THEMES>('indigo');
  const [customColor, setCustomColor] = useState('#6366f1');
  const [useCustomColor, setUseCustomColor] = useState(false);
  
  const getColorByLevel = (niveau: number): string => {
    if (useCustomColor) {
      // Générer des nuances à partir de la couleur custom
      const baseColor = customColor;
      const opacity = [1, 0.85, 0.7, 0.55, 0.4][Math.min(niveau, 4)];
      return baseColor + Math.round(opacity * 255).toString(16).padStart(2, '0');
    }
    const colors = COLOR_THEMES[colorTheme];
    return colors[Math.min(niveau, colors.length - 1)];
  };
  
  const getBorderColor = (): string => {
    return useCustomColor ? customColor : COLOR_THEMES[colorTheme][0];
  };
  
  const { nodes: initialNodes, edges: initialEdges } = useMemo(() => {
    if (!structure) return { nodes: [], edges: [] };
    
    const nodes: Node[] = [];
    const edges: Edge[] = [];
    let nodeId = 0;
    
    // Largeur réduite
    const nodeWidth = mode === 'light' ? 160 : mode === 'semi' ? 200 : 280;
    const nodeHeight = mode === 'light' ? 80 : mode === 'semi' ? 120 : 150;
    
    // Espacements ajustés
    const horizontalGap = 100;  // Réduit de 150 à 100
    const verticalGap = 220;    // Augmenté de 160 à 220
    
    // Créer un nœud
    function createNode(noeud: any, x: number, y: number, niveau: number, isIntroduction: boolean = false): string {
      const currentId = `node-${nodeId++}`;
      
      let contentToShow = '';
      let maxChars = 0;
      
      if (mode === 'semi') {
        maxChars = 100;
        contentToShow = noeud.contenu?.substring(0, maxChars) || '';
      } else if (mode === 'full') {
        maxChars = 200;
        contentToShow = noeud.contenu?.substring(0, maxChars) || '';
      }
      
      if (contentToShow && noeud.contenu?.length > maxChars) {
        contentToShow += '...';
      }
      
      nodes.push({
        id: currentId,
        type: 'default',
        position: { x, y },
        data: {
          label: (
            <div style={{
              width: `${nodeWidth}px`,
              height: `${nodeHeight}px`,
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              alignItems: 'center',
              padding: '12px',
              boxSizing: 'border-box'
            }}>
              <div style={{ 
                fontWeight: 'bold',
                fontSize: niveau === 0 ? '15px' : '13px',
                marginBottom: contentToShow ? '8px' : '0',
                textAlign: 'center',
                width: '100%',
                lineHeight: '1.2'
              }}>
                {noeud.titre}
              </div>
              {contentToShow && (
                <div style={{ 
                  fontSize: '11px',
                  color: niveau === 0 ? '#e0e7ff' : '#4b5563',
                  lineHeight: '1.3',
                  textAlign: 'center',
                  width: '100%',
                  overflow: 'hidden',
                  display: '-webkit-box',
                  WebkitLineClamp: mode === 'semi' ? 3 : 4,
                  WebkitBoxOrient: 'vertical'
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
          border: `2px solid ${getBorderColor()}`,
          borderRadius: '10px',
          fontSize: '13px',
          boxShadow: niveau === 0 ? '0 4px 8px rgba(0,0,0,0.15)' : '0 2px 4px rgba(0,0,0,0.08)',
          width: `${nodeWidth}px`,
          height: `${nodeHeight}px`,
          padding: 0,
        },
        draggable: !isIntroduction && niveau !== 2, // Bloquer déplacement vertical niveau 2
      });
      
      return currentId;
    }
    
    function calculateTreeWidth(noeud: any): number {
      if (!noeud.enfants || noeud.enfants.length === 0) {
        return nodeWidth;
      }
      
      const childrenWidths = noeud.enfants.map((child: any) => calculateTreeWidth(child));
      const totalChildWidth = childrenWidths.reduce((sum: number, w: number) => sum + w, 0);
      const gaps = (noeud.enfants.length - 1) * horizontalGap;
      
      return Math.max(nodeWidth, totalChildWidth + gaps);
    }
    
    function buildTree(noeud: any, parentId: string | null, niveau: number, centerX: number, startY: number, forceY?: number): void {
      const currentY = forceY !== undefined ? forceY : startY + (niveau * verticalGap);
      const currentX = centerX - (nodeWidth / 2);
      
      // Vérifier si c'est l'introduction
      const isIntroduction = niveau === 1 && noeud.titre?.toLowerCase().includes('introduction');
      
      const currentId = createNode(noeud, currentX, currentY, niveau, isIntroduction);
      
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
      
      if (noeud.enfants && noeud.enfants.length > 0) {
        // Séparer l'introduction des autres enfants
        const introduction = noeud.enfants.find((child: any) => 
          child.titre?.toLowerCase().includes('introduction')
        );
        const autresEnfants = noeud.enfants.filter((child: any) => 
          !child.titre?.toLowerCase().includes('introduction')
        );
        
        // Traiter l'introduction seule si elle existe
        if (introduction && niveau === 0) {
          const introY = currentY + verticalGap;
          buildTree(introduction, currentId, niveau + 1, centerX, startY, introY);
          
          // Traiter les autres enfants après l'introduction
          if (autresEnfants.length > 0) {
            const autresY = introY + verticalGap;
            const childrenWidths = autresEnfants.map((child: any) => calculateTreeWidth(child));
            const totalWidth = childrenWidths.reduce((sum: number, w: number) => sum + w, 0);
            const totalGaps = (autresEnfants.length - 1) * horizontalGap;
            const totalTreeWidth = totalWidth + totalGaps;
            
            let currentChildX = centerX - (totalTreeWidth / 2);
            
            autresEnfants.forEach((child: any, index: number) => {
              const childWidth = childrenWidths[index];
              const childCenterX = currentChildX + (childWidth / 2);
              buildTree(child, currentId, niveau + 1, childCenterX, startY, autresY);
              currentChildX += childWidth + horizontalGap;
            });
          }
        } else {
          // Traitement normal pour les autres niveaux
          const childrenWidths = noeud.enfants.map((child: any) => calculateTreeWidth(child));
          const totalWidth = childrenWidths.reduce((sum: number, w: number) => sum + w, 0);
          const totalGaps = (noeud.enfants.length - 1) * horizontalGap;
          const totalTreeWidth = totalWidth + totalGaps;
          
          let currentChildX = centerX - (totalTreeWidth / 2);
          const childY = currentY + verticalGap;
          
          noeud.enfants.forEach((child: any, index: number) => {
            const childWidth = childrenWidths[index];
            const childCenterX = currentChildX + (childWidth / 2);
            
            // Forcer Y pour niveau 2 (axes principaux)
            if (niveau === 1) {
              buildTree(child, currentId, niveau + 1, childCenterX, startY, childY);
            } else {
              buildTree(child, currentId, niveau + 1, childCenterX, startY);
            }
            
            currentChildX += childWidth + horizontalGap;
          });
        }
      }
    }
    
    function buildWeb(noeud: any, parentId: string | null, niveau: number, centerX: number, centerY: number, startAngle: number): void {
      const radius = 250 + (niveau * 80);
      
      if (niveau === 0) {
        const currentId = createNode(noeud, centerX - nodeWidth / 2, centerY - nodeHeight / 2, niveau);
        
        if (noeud.enfants && noeud.enfants.length > 0) {
          const angleStep = (2 * Math.PI) / noeud.enfants.length;
          
          noeud.enfants.forEach((child: any, index: number) => {
            const angle = index * angleStep - Math.PI / 2;
            buildWeb(child, currentId, niveau + 1, centerX, centerY, angle);
          });
        }
      } else {
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
        
        if (noeud.enfants && noeud.enfants.length > 0) {
          noeud.enfants.forEach((child: any, index: number) => {
            const childAngle = startAngle + ((index - (noeud.enfants.length - 1) / 2) * 0.3);
            buildWeb(child, currentId, niveau + 1, centerX, centerY, childAngle);
          });
        }
      }
    }
    
    if (visualisation === 'arbre') {
      const treeWidth = calculateTreeWidth(structure);
      const startX = Math.max(800, treeWidth / 2 + 200);
      buildTree(structure, null, 0, startX, 50);
    } else {
      buildWeb(structure, null, 0, 600, 400, 0);
    }
    
    return { nodes, edges };
  }, [structure, mode, visualisation, colorTheme, customColor, useCustomColor]);
  
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  
  React.useEffect(() => {
    setNodes(initialNodes);
    setEdges(initialEdges);
  }, [initialNodes, initialEdges, setNodes, setEdges]);
  
  return (
    <div style={{ position: 'relative' }}>
      <div style={{ 
        position: 'absolute', 
        top: '10px', 
        right: '10px', 
        zIndex: 10,
        display: 'flex',
        gap: '8px',
        background: 'white',
        padding: '8px',
        borderRadius: '8px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
      }}>
        {Object.keys(COLOR_THEMES).map((theme) => (
          <button
            key={theme}
            onClick={() => {
              setColorTheme(theme as keyof typeof COLOR_THEMES);
              setUseCustomColor(false);
            }}
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '6px',
              border: !useCustomColor && colorTheme === theme ? '3px solid #1f2937' : '2px solid #e5e7eb',
              background: COLOR_THEMES[theme as keyof typeof COLOR_THEMES][0],
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
            title={theme.charAt(0).toUpperCase() + theme.slice(1)}
          />
        ))}
        
        <div style={{ position: 'relative' }}>
          <input
            type="color"
            value={customColor}
            onChange={(e) => {
              setCustomColor(e.target.value);
              setUseCustomColor(true);
            }}
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '6px',
              border: useCustomColor ? '3px solid #1f2937' : '2px solid #e5e7eb',
              cursor: 'pointer',
              background: 'linear-gradient(45deg, #ff0000 0%, #ff7f00 16.67%, #ffff00 33.33%, #00ff00 50%, #0000ff 66.67%, #4b0082 83.33%, #9400d3 100%)'
            }}
            title="Couleur personnalisée"
          />
        </div>
      </div>
      
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
          nodesDraggable={true}
          nodesConnectable={false}
          elementsSelectable={true}
        >
          <Background color="#f3f4f6" gap={16} />
          <Controls />
          <MiniMap 
            nodeColor={(node) => node.style?.background as string || '#6366f1'}
            maskColor="rgba(0, 0, 0, 0.1)"
          />
        </ReactFlow>
      </div>
    </div>
  );
};

export default MindMap;
