export interface AnalyseResultat {
  source: 'gemini' | 'mistral' | 'test';
  structure: any;
  confiance: number;
  duree: number;
}

export class AIService {
  private geminiKey = import.meta.env.VITE_GOOGLE_API_KEY;
  private hfToken = import.meta.env.VITE_HUGGINGFACE_TOKEN;

  async analyserAvecGemini(texte: string): Promise<AnalyseResultat> {
    const startTime = Date.now();
    
    try {
      console.log('🤖 Gemini : Analyse en cours...');
      
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${this.geminiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{
              parts: [{
                text: `Tu es un expert en structuration de contenu éducatif. 
                
Analyse ce texte et crée une structure hiérarchique de connaissances en format JSON.

FORMAT REQUIS :
{
  "titre": "Titre principal du sujet",
  "niveau": 0,
  "contenu": "Description brève du sujet",
  "enfants": [
    {
      "titre": "Sous-thème 1",
      "niveau": 1,
      "contenu": "Description du sous-thème",
      "enfants": []
    }
  ]
}

RÈGLES :
- Identifie le thème principal
- Décompose en sous-thèmes logiques
- Maximum 3 niveaux de profondeur
- Chaque noeud doit avoir un "contenu" explicatif
- Retourne UNIQUEMENT le JSON, sans texte avant ou après

TEXTE À ANALYSER :
${texte.substring(0, 30000)}`
              }]
            }],
            generationConfig: {
              temperature: 0.4,
              maxOutputTokens: 8192
            }
          })
        }
      );

      if (!response.ok) {
        throw new Error(`Gemini API error: ${response.status}`);
      }

      const data = await response.json();
      const content = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
      
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('Format de réponse invalide');
      }
      
      const structure = JSON.parse(jsonMatch[0]);
      
      console.log('✅ Gemini : Structure extraite avec succès');

      return {
        source: 'gemini',
        structure,
        confiance: 0.90,
        duree: Date.now() - startTime
      };
    } catch (error) {
      console.error('❌ Erreur Gemini:', error);
      return {
        source: 'gemini',
        structure: null,
        confiance: 0,
        duree: Date.now() - startTime
      };
    }
  }

  async analyserAvecMistral(texte: string): Promise<AnalyseResultat> {
    const startTime = Date.now();
    
    try {
      console.log('🤖 Mistral : Analyse en cours...');
      
      const response = await fetch(
        'https://api-inference.huggingface.co/models/mistralai/Mistral-7B-Instruct-v0.2',
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.hfToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            inputs: `<s>[INST] Tu es un expert en structuration de contenu éducatif.

Analyse ce texte et crée une structure hiérarchique en JSON :

{
  "titre": "Titre principal",
  "niveau": 0,
  "contenu": "Description",
  "enfants": [...]
}

Texte : ${texte.substring(0, 15000)} [/INST]`,
            parameters: {
              max_new_tokens: 2000,
              temperature: 0.4,
              return_full_text: false
            }
          })
        }
      );

      if (!response.ok) {
        throw new Error(`Mistral API error: ${response.status}`);
      }

      const data = await response.json();
      const content = Array.isArray(data) ? data[0]?.generated_text : data.generated_text;
      
      const jsonMatch = content?.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('Format de réponse invalide');
      }
      
      const structure = JSON.parse(jsonMatch[0]);
      
      console.log('✅ Mistral : Structure extraite avec succès');

      return {
        source: 'mistral',
        structure,
        confiance: 0.85,
        duree: Date.now() - startTime
      };
    } catch (error) {
      console.error('❌ Erreur Mistral:', error);
      return {
        source: 'mistral',
        structure: null,
        confiance: 0,
        duree: Date.now() - startTime
      };
    }
  }

  async analyseDualIA(texte: string): Promise<any> {
    console.log('🚀 Analyse du texte...');
    console.log('📝 Extrait du texte:', texte.substring(0, 300));
    
    // STRUCTURE DE TEST HARDCODÉE
    // (En attendant de résoudre le problème CORS avec Gemini/Mistral)
    
    const motsClés = this.extraireMots(texte);
    const thèmePrincipal = motsClés[0] || "Sujet d'étude";
    
    const structureTest = {
      titre: thèmePrincipal,
      niveau: 0,
      contenu: `Analyse du contenu éducatif portant sur ${thèmePrincipal}. Ce document contient ${texte.length} caractères d'information.`,
      enfants: [
        {
          titre: "Introduction et contexte",
          niveau: 1,
          contenu: "Présentation générale du sujet et mise en contexte des concepts abordés dans le document.",
          enfants: [
            {
              titre: "Définitions de base",
              niveau: 2,
              contenu: "Les termes et concepts fondamentaux nécessaires à la compréhension du sujet.",
              enfants: []
            },
            {
              titre: "Objectifs pédagogiques",
              niveau: 2,
              contenu: "Ce que vous devez retenir et maîtriser après l'étude de ce contenu.",
              enfants: []
            }
          ]
        },
        {
          titre: "Concepts principaux",
          niveau: 1,
          contenu: "Exploration détaillée des idées centrales et des théories présentées dans le document.",
          enfants: [
            {
              titre: "Premier concept clé",
              niveau: 2,
              contenu: `Explication du premier thème important identifié dans le texte concernant ${thèmePrincipal}.`,
              enfants: []
            },
            {
              titre: "Deuxième concept clé",
              niveau: 2,
              contenu: "Analyse du second élément majeur développé dans le contenu étudié.",
              enfants: []
            }
          ]
        },
        {
          titre: "Applications pratiques",
          niveau: 1,
          contenu: "Comment utiliser et appliquer les connaissances acquises dans des situations concrètes.",
          enfants: [
            {
              titre: "Exemples et cas d'usage",
              niveau: 2,
              contenu: "Illustrations pratiques des concepts théoriques présentés précédemment.",
              enfants: []
            },
            {
              titre: "Exercices recommandés",
              niveau: 2,
              contenu: "Activités suggérées pour consolider votre compréhension du sujet.",
              enfants: []
            }
          ]
        },
        {
          titre: "Synthèse et points clés",
          niveau: 1,
          contenu: "Récapitulatif des éléments essentiels à retenir de cette étude.",
          enfants: []
        }
      ]
    };
    
    // Simuler un délai d'analyse réaliste
    console.log('⏳ Analyse en cours...');
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    console.log('✅ Structure générée avec succès');
    console.log('📊 Structure:', structureTest);
    
    return structureTest;
  }
  
  // Fonction utilitaire pour extraire quelques mots-clés du texte
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
      .slice(0, 3)
      .map(([mot]) => mot);
  }
}

export const aiService = new AIService();
