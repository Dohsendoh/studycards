export interface AnalyseResultat {
  source: 'gemini' | 'mistral' | 'deepseek' | 'consensus';
  structure: any;
  confiance: number;
  duree: number;
}

export class AIService {
  private geminiKey = import.meta.env.VITE_GOOGLE_API_KEY;
  private hfToken = import.meta.env.VITE_HUGGINGFACE_TOKEN;
  private deepseekKey = import.meta.env.VITE_DEEPSEEK_API_KEY;

  // ============================================
  // 1️⃣ GEMINI
  // ============================================
  async analyserAvecGemini(texte: string): Promise<AnalyseResultat> {
    const startTime = Date.now();
    
    try {
      console.log('🤖 Gemini : Analyse en cours...');
      
      if (!this.geminiKey) {
        throw new Error('Clé API Gemini manquante');
      }
      
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

FORMAT REQUIS (STRICTEMENT RESPECTER) :
{
  "titre": "Titre principal du sujet",
  "niveau": 0,
  "contenu": "Description brève du sujet principal (2-3 phrases maximum)",
  "enfants": [
    {
      "titre": "Sous-thème 1",
      "niveau": 1,
      "contenu": "Description du sous-thème (2-3 phrases)",
      "enfants": [
        {
          "titre": "Détail 1.1",
          "niveau": 2,
          "contenu": "Explication détaillée",
          "enfants": []
        }
      ]
    }
  ]
}

RÈGLES IMPORTANTES :
1. Identifie le thème principal et donne-lui un titre clair
2. Décompose en 3-5 sous-thèmes logiques maximum
3. Maximum 3 niveaux de profondeur (niveau 0, 1, 2)
4. Chaque "contenu" doit être court (50-150 caractères)
5. Retourne UNIQUEMENT le JSON, sans texte avant ou après, sans backticks

TEXTE À ANALYSER :
${texte.substring(0, 25000)}`
              }]
            }],
            generationConfig: {
              temperature: 0.3,
              maxOutputTokens: 8192
            }
          })
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Gemini API error ${response.status}: ${errorText}`);
      }

      const data = await response.json();
      const content = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
      
      // Extraction du JSON
      let jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        // Essayer de nettoyer le contenu
        const cleanContent = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
        jsonMatch = cleanContent.match(/\{[\s\S]*\}/);
      }
      
      if (!jsonMatch) {
        throw new Error('Format de réponse Gemini invalide - pas de JSON trouvé');
      }
      
      const structure = JSON.parse(jsonMatch[0]);
      
      console.log('✅ Gemini : Structure extraite avec succès');

      return {
        source: 'gemini',
        structure,
        confiance: 0.92,
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

  // ============================================
  // 2️⃣ DEEPSEEK
  // ============================================
  async analyserAvecDeepSeek(texte: string): Promise<AnalyseResultat> {
    const startTime = Date.now();
    
    try {
      console.log('🤖 DeepSeek : Analyse en cours...');
      
      if (!this.deepseekKey) {
        throw new Error('Clé API DeepSeek manquante');
      }
      
      const response = await fetch(
        'https://api.deepseek.com/v1/chat/completions',
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.deepseekKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            model: 'deepseek-chat',
            messages: [
              {
                role: 'system',
                content: 'Tu es un expert en structuration de contenu éducatif. Tu réponds UNIQUEMENT avec du JSON valide, sans aucun texte avant ou après.'
              },
              {
                role: 'user',
                content: `Analyse ce texte et crée une structure hiérarchique en JSON :

FORMAT :
{
  "titre": "Titre principal",
  "niveau": 0,
  "contenu": "Description courte (50-150 caractères)",
  "enfants": [
    {
      "titre": "Sous-thème",
      "niveau": 1,
      "contenu": "Description",
      "enfants": []
    }
  ]
}

RÈGLES :
- 3-5 branches principales maximum
- Maximum 3 niveaux de profondeur
- Contenu court et concis
- JSON uniquement, pas de backticks

TEXTE :
${texte.substring(0, 20000)}`
              }
            ],
            temperature: 0.3,
            max_tokens: 4000
          })
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`DeepSeek API error ${response.status}: ${errorText}`);
      }

      const data = await response.json();
      const content = data.choices?.[0]?.message?.content || '';
      
      // Extraction du JSON
      let jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        const cleanContent = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
        jsonMatch = cleanContent.match(/\{[\s\S]*\}/);
      }
      
      if (!jsonMatch) {
        throw new Error('Format de réponse DeepSeek invalide');
      }
      
      const structure = JSON.parse(jsonMatch[0]);
      
      console.log('✅ DeepSeek : Structure extraite avec succès');

      return {
        source: 'deepseek',
        structure,
        confiance: 0.94,
        duree: Date.now() - startTime
      };
    } catch (error) {
      console.error('❌ Erreur DeepSeek:', error);
      return {
        source: 'deepseek',
        structure: null,
        confiance: 0,
        duree: Date.now() - startTime
      };
    }
  }

  // ============================================
  // 3️⃣ MISTRAL (via Hugging Face)
  // ============================================
  async analyserAvecMistral(texte: string): Promise<AnalyseResultat> {
    const startTime = Date.now();
    
    try {
      console.log('🤖 Mistral : Analyse en cours...');
      
      if (!this.hfToken) {
        throw new Error('Token Hugging Face manquant');
      }
      
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
  "contenu": "Description courte",
  "enfants": [...]
}

Texte : ${texte.substring(0, 12000)} [/INST]`,
            parameters: {
              max_new_tokens: 2000,
              temperature: 0.3,
              return_full_text: false
            }
          })
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Mistral API error ${response.status}: ${errorText}`);
      }

      const data = await response.json();
      const content = Array.isArray(data) ? data[0]?.generated_text : data.generated_text;
      
      if (!content) {
        throw new Error('Pas de contenu retourné par Mistral');
      }
      
      // Extraction du JSON
      let jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        const cleanContent = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
        jsonMatch = cleanContent.match(/\{[\s\S]*\}/);
      }
      
      if (!jsonMatch) {
        throw new Error('Format de réponse Mistral invalide');
      }
      
      const structure = JSON.parse(jsonMatch[0]);
      
      console.log('✅ Mistral : Structure extraite avec succès');

      return {
        source: 'mistral',
        structure,
        confiance: 0.88,
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

  // ============================================
  // 🎯 ANALYSE TRIPLE IA (Consensus)
  // ============================================
  async analyseDualIA(texte: string): Promise<any> {
    console.log('🚀 Lancement de l\'analyse triple IA...');
    console.log('📝 Extrait du texte:', texte.substring(0, 300));
    
    // Lancer les 3 IA en parallèle
    const [resultGemini, resultDeepSeek, resultMistral] = await Promise.all([
      this.analyserAvecGemini(texte),
      this.analyserAvecDeepSeek(texte),
      this.analyserAvecMistral(texte)
    ]);
    
    console.log('📊 Résultats :');
    console.log('  - Gemini:', resultGemini.confiance > 0 ? '✅' : '❌', `(${resultGemini.duree}ms)`);
    console.log('  - DeepSeek:', resultDeepSeek.confiance > 0 ? '✅' : '❌', `(${resultDeepSeek.duree}ms)`);
    console.log('  - Mistral:', resultMistral.confiance > 0 ? '✅' : '❌', `(${resultMistral.duree}ms)`);
    
    // Sélectionner la meilleure structure
    const resultats = [resultGemini, resultDeepSeek, resultMistral]
      .filter(r => r.structure !== null)
      .sort((a, b) => b.confiance - a.confiance);
    
    if (resultats.length === 0) {
      console.error('❌ Aucune IA n\'a réussi à analyser le texte');
      // Fallback : structure de base
      return this.creerStructureFallback(texte);
    }
    
    // Prendre la meilleure structure
    const meilleur = resultats[0];
    console.log(`✅ Meilleure analyse : ${meilleur.source} (confiance: ${meilleur.confiance})`);
    
    return meilleur.structure;
  }

  // ============================================
  // 🆘 FALLBACK (si toutes les IA échouent)
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
          
