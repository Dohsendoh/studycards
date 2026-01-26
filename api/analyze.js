export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { texte } = req.body;

  if (!texte) {
    return res.status(400).json({ error: 'Missing texte parameter' });
  }

  console.log('📝 Analyse demandée, longueur:', texte.length);

  // Récupérer les clés API
  const geminiKey = process.env.VITE_GOOGLE_API_KEY;
  const deepseekKey = process.env.VITE_DEEPSEEK_API_KEY;
  const hfToken = process.env.VITE_HUGGINGFACE_TOKEN;

  console.log('🔑 Clés disponibles:', {
    gemini: !!geminiKey,
    deepseek: !!deepseekKey,
    hf: !!hfToken
  });

  // ============================================
  // 1️⃣ GEMINI
  // ============================================
  async function analyserAvecGemini(texte) {
    const startTime = Date.now();
    
    try {
      console.log('🤖 Gemini : Analyse en cours...');
      
      if (!geminiKey) {
        throw new Error('Clé API Gemini manquante');
      }
      
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${geminiKey}`,
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
        console.error('Gemini error:', errorText);
        throw new Error(`Gemini API error ${response.status}`);
      }

      const data = await response.json();
      const content = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
      
      let jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        const cleanContent = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
        jsonMatch = cleanContent.match(/\{[\s\S]*\}/);
      }
      
      if (!jsonMatch) {
        throw new Error('Format de réponse Gemini invalide');
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
      console.error('❌ Erreur Gemini:', error.message);
      return {
        source: 'gemini',
        structure: null,
        confiance: 0,
        duree: Date.now() - startTime,
        error: error.message
      };
    }
  }

  // ============================================
  // 2️⃣ DEEPSEEK
  // ============================================
  async function analyserAvecDeepSeek(texte) {
    const startTime = Date.now();
    
    try {
      console.log('🤖 DeepSeek : Analyse en cours...');
      
      if (!deepseekKey) {
        throw new Error('Clé API DeepSeek manquante');
      }
      
      const response = await fetch(
        'https://api.deepseek.com/v1/chat/completions',
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${deepseekKey}`,
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
  "enfants": [...]
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
        console.error('DeepSeek error:', errorText);
        throw new Error(`DeepSeek API error ${response.status}`);
      }

      const data = await response.json();
      const content = data.choices?.[0]?.message?.content || '';
      
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
      console.error('❌ Erreur DeepSeek:', error.message);
      return {
        source: 'deepseek',
        structure: null,
        confiance: 0,
        duree: Date.now() - startTime,
        error: error.message
      };
    }
  }

  // ============================================
  // 3️⃣ MISTRAL
  // ============================================
  async function analyserAvecMistral(texte) {
    const startTime = Date.now();
    
    try {
      console.log('🤖 Mistral : Analyse en cours...');
      
      if (!hfToken) {
        throw new Error('Token Hugging Face manquant');
      }
      
      const response = await fetch(
        'https://api-inference.huggingface.co/models/mistralai/Mistral-7B-Instruct-v0.2',
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${hfToken}`,
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
        console.error('Mistral error:', errorText);
        throw new Error(`Mistral API error ${response.status}`);
      }

      const data = await response.json();
      const content = Array.isArray(data) ? data[0]?.generated_text : data.generated_text;
      
      if (!content) {
        throw new Error('Pas de contenu retourné par Mistral');
      }
      
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
      console.error('❌ Erreur Mistral:', error.message);
      return {
        source: 'mistral',
        structure: null,
        confiance: 0,
        duree: Date.now() - startTime,
        error: error.message
      };
    }
  }

  // ============================================
  // 🎯 ANALYSE TRIPLE IA
  // ============================================
  console.log('🚀 Lancement de l\'analyse triple IA...');
  
  const [resultGemini, resultDeepSeek, resultMistral] = await Promise.all([
    analyserAvecGemini(texte),
    analyserAvecDeepSeek(texte),
    analyserAvecMistral(texte)
  ]);
  
  console.log('📊 Résultats :');
  console.log('  - Gemini:', resultGemini.confiance > 0 ? '✅' : '❌', `(${resultGemini.duree}ms)`, resultGemini.error || '');
  console.log('  - DeepSeek:', resultDeepSeek.confiance > 0 ? '✅' : '❌', `(${resultDeepSeek.duree}ms)`, resultDeepSeek.error || '');
  console.log('  - Mistral:', resultMistral.confiance > 0 ? '✅' : '❌', `(${resultMistral.duree}ms)`, resultMistral.error || '');
  
  const resultats = [resultGemini, resultDeepSeek, resultMistral]
    .filter(r => r.structure !== null)
    .sort((a, b) => b.confiance - a.confiance);
  
  if (resultats.length === 0) {
    console.error('❌ Aucune IA n\'a réussi');
    return res.status(500).json({ 
      error: 'Toutes les IA ont échoué',
      details: {
        gemini: resultGemini.error,
        deepseek: resultDeepSeek.error,
        mistral: resultMistral.error
      }
    });
  }
  
  const meilleur = resultats[0];
  console.log(`✅ Meilleure analyse : ${meilleur.source} (confiance: ${meilleur.confiance})`);
  
  return res.status(200).json({
    success: true,
    source: meilleur.source,
    structure: meilleur.structure,
    stats: {
      gemini: resultGemini.confiance > 0,
      deepseek: resultDeepSeek.confiance > 0,
      mistral: resultMistral.confiance > 0,
      dureeGemini: resultGemini.duree,
      dureeDeepSeek: resultDeepSeek.duree,
      dureeMistral: resultMistral.duree
    }
  });
}
