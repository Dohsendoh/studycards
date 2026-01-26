export interface AnalyseResultat {
  source: 'gemini' | 'mistral' | 'deepseek' | 'consensus';
  structure: any;
  confiance: number;
  duree: number;
}

export class AIService {
  
  // ============================================
  // 🎯 ANALYSE VIA API BACKEND VERCEL
  // ============================================
  async analyseDualIA(texte: string): Promise<any> {
    console.log('🚀 Appel de l\'API backend pour analyse...');
    console.log('📝 Extrait du texte:', texte.substring(0, 300));
    
    try {
      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ texte })
      });
      
      if (!response.ok) {
        const error = await response.json();
        console.error('❌ Erreur API:', error);
        throw new Error(error.error || 'Erreur API');
      }
      
      const data = await response.json();
      
      console.log('✅ Réponse API reçue');
      console.log('📊 Source:', data.source);
      console.log('📊 Stats:', data.stats);
      
      return data.structure;
      
    } catch (error) {
      console.error('❌ Erreur lors de l\'appel API:', error);
      
      // Fallback : structure de base
      return this.creerStructureFallback(texte);
    }
  }

  // ============================================
  // 🆘 FALLBACK (si l'API échoue)
  // ============================================
  private creerStructureFallback(texte: string): any {
    console.log('⚠️ Utilisation de la structure de fallback');
    
    const motsClés = this.extraireMots(texte);
    const thèmePrincipal = motsClés[0] || "Sujet d'étude";
    
    return {
      titre: thèmePrincipal,
      niveau: 0,
      contenu: `Analyse automatique du contenu. ${texte.substring(0, 100)}...`,
      enfants: [
        {
          titre: "Introduction",
          niveau: 1,
          contenu: "Présentation du sujet et contexte général.",
          enfants: []
        },
        {
          titre: "Concepts principaux",
          niveau: 1,
          contenu: "Idées centrales et théories présentées.",
          enfants: [
            {
              titre: "Premier concept",
              niveau: 2,
              contenu: `Analyse liée à ${motsClés[1] || 'ce thème'}.`,
              enfants: []
            },
            {
              titre: "Second concept",
              niveau: 2,
              contenu: `Développement autour de ${motsClés[2] || 'cette notion'}.`,
              enfants: []
            }
          ]
        },
        {
          titre: "Applications",
          niveau: 1,
          contenu: "Comment appliquer ces connaissances concrètement.",
          enfants: []
        },
        {
          titre: "Synthèse",
          niveau: 1,
          contenu: "Points essentiels à retenir.",
          enfants: []
        }
      ]
    };
  }
  
  // Fonction utilitaire pour extraire des mots-clés
  private extraireMots(texte: string): string[] {
    const mots = texte
      .toLowerCase()
      .replace(/[^\w\sàâäéèêëïîôùûüÿç]/g, ' ')
      .split(/\s+/)
      .filter(mot => mot.length > 5);
    
    const compteur: { [key: string]: number } = {};
    mots.forEach(mot => {
      compteur[mot] = (compteur[mot] || 0) + 1;
    });
    
    return Object.entries(compteur)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([mot]) => mot);
  }
}

export const aiService = new AIService();
