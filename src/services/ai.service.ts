export interface AnalyseResultat {
  source: 'gemini' | 'mistral';
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
    console.log('🚀 Démarrage analyse Gemini + Mistral...');
    
    const [gemini, mistral] = await Promise.all([
      this.analyserAvecGemini(texte),
      this.analyserAvecMistral(texte)
    ]);

    return this.fusionnerAnalyses([gemini, mistral]);
  }

  private fusionnerAnalyses(resultats: AnalyseResultat[]): any {
    const analysesValides = resultats.filter(r => r.structure !== null);
    
    if (analysesValides.length === 0) {
      throw new Error('Aucune IA n\'a pu analyser le document');
    }

    if (analysesValides.length === 1) {
      return analysesValides[0].structure;
    }

    const meilleure = analysesValides.reduce((prev, current) => 
      current.confiance > prev.confiance ? current : prev
    );

    console.log(`✅ Meilleure analyse : ${meilleure.source}`);
    
    return meilleure.structure;
  }
}

export const aiService = new AIService();
