export default async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { texte } = req.body;
  
  if (!texte) {
    return res.status(400).json({ error: 'Missing texte' });
  }

  console.log('📝 Texte reçu, longueur:', texte.length);

  // Récupérer les clés API
  const geminiKey = process.env.VITE_GOOGLE_API_KEY;
  const deepseekKey = process.env.VITE_DEEPSEEK_API_KEY;
  const hfToken = process.env.VITE_HUGGINGFACE_TOKEN;

  console.log('🔑 Clés:', { 
    gemini: !!geminiKey, 
    deepseek: !!deepseekKey, 
    hf: !!hfToken 
  });

  const prompt = `Tu es un expert en structuration de contenu éducatif.

Analyse ce texte et crée une structure hiérarchique en JSON.

FORMAT STRICT :
{
  "titre": "Titre principal du sujet",
  "niveau": 0,
  "contenu": "Description courte (50-150 caractères)",
  "enfants": [
    {
      "titre": "Sous-thème 1",
      "niveau": 1,
      "contenu": "Description courte",
      "enfants": []
    }
  ]
}

RÈGLES :
- 3-5 branches principales max
- Max 3 niveaux (0, 1, 2)
- Contenu court et concis
- JSON uniquement, pas de backticks

TEXTE :
${texte.substring(0, 20000)}`;

  // ============================================
  // 1️⃣ GEMINI
  // ============================================
  async function callGemini() {
    if (!geminiKey) return { success: false, error: 'Clé manquante' };
    
    const startTime = Date.now();
    try {
      console.log('🤖 Gemini...');
      
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${geminiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { temperature: 0.3, maxOutputTokens: 8192 }
          })
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();
      const content = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
      
      let jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        const clean = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
        jsonMatch = clean.match(/\{[\s\S]*\}/);
      }
      
      if (!jsonMatch) throw new Error('Pas de JSON');
      
      const structure = JSON.parse(jsonMatch[0]);
      console.log('✅ Gemini OK');
      
      return { 
        success: true, 
        structure, 
        confiance: 0.92, 
        duree: Date.now() - startTime 
      };
    } catch (error) {
      console.error('❌ Gemini:', error.message);
      return { 
        success: false, 
        error: error.message, 
        duree: Date.now() - startTime 
      };
    }
  }

  // ============================================
  // 2️⃣ DEEPSEEK
  // ============================================
  async function callDeepSeek() {
    if (!deepseekKey) return { success: false, error: 'Clé manquante' };
    
    const startTime = Date.now();
    try {
      console.log('🤖 DeepSeek...');
      
      const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${deepseekKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'deepseek-chat',
          messages: [
            { role: 'system', content: 'Tu réponds UNIQUEMENT en JSON valide.' },
            { role: 'user', content: prompt }
          ],
          temperature: 0.3,
          max_tokens: 4000
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();
      const content = data.choices?.[0]?.message?.content || '';
      
      let jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        const clean = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
        jsonMatch = clean.match(/\{[\s\S]*\}/);
      }
      
      if (!jsonMatch) throw new Error('Pas de JSON');
      
      const structure = JSON.parse(jsonMatch[0]);
      console.log('✅ DeepSeek OK');
      
      return { 
        success: true, 
        structure, 
        confiance: 0.94, 
        duree: Date.now() - startTime 
      };
    } catch (error) {
      console.error('❌ DeepSeek:', error.message);
      return { 
        success: false, 
        error: error.message, 
        duree: Date.now() - startTime 
      };
    }
  }

  // ============================================
  // 3️⃣ MISTRAL
  // ============================================
  async function callMistral() {
    if (!hfToken) return { success: false, error: 'Token manquant' };
    
    const startTime = Date.now();
    try {
      console.log('🤖 Mistral...');
      
      const response = await fetch(
        'https://api-inference.huggingface.co/models/mistralai/Mistral-7B-Instruct-v0.2',
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${hfToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            inputs: `<s>[INST] ${prompt.substring(0, 10000)} [/INST]`,
            parameters: {
              max_new_tokens: 2000,
              temperature: 0.3,
              return_full_text: false
            }
          })
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();
      const content = Array.isArray(data) ? data[0]?.generated_text : data.generated_text;
      
      if (!content) throw new Error('Pas de contenu');
      
      let jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        const clean = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
        jsonMatch = clean.match(/\{[\s\S]*\}/);
      }
      
      if (!jsonMatch) throw new Error('Pas de JSON');
      
      const structure = JSON.parse(jsonMatch[0]);
      console.log('✅ Mistral OK');
      
      return { 
        success: true, 
        structure, 
        confiance: 0.88, 
        duree: Date.now() - startTime 
      };
    } catch (error) {
      console.error('❌ Mistral:', error.message);
      return { 
        success: false, 
        error: error.message, 
        duree: Date.now() - startTime 
      };
    }
  }

  // ============================================
  // 🎯 EXÉCUTION PARALLÈLE
  // ============================================
  console.log('🚀 Lancement des 3 IA...');
  
  const [gemini, deepseek, mistral] = await Promise.all([
    callGemini(),
    callDeepSeek(),
    callMistral()
  ]);

  console.log('📊 Résultats:');
  console.log('  Gemini:', gemini.success ? '✅' : '❌', gemini.duree + 'ms');
  console.log('  DeepSeek:', deepseek.success ? '✅' : '❌', deepseek.duree + 'ms');
  console.log('  Mistral:', mistral.success ? '✅' : '❌', mistral.duree + 'ms');

  // Sélectionner la meilleure
  const resultats = [
    { ...gemini, source: 'gemini' },
    { ...deepseek, source: 'deepseek' },
    { ...mistral, source: 'mistral' }
  ]
    .filter(r => r.success)
    .sort((a, b) => b.confiance - a.confiance);

  if (resultats.length === 0) {
    console.error('❌ Toutes les IA ont échoué');
    return res.status(500).json({
      error: 'Toutes les IA ont échoué',
      details: {
        gemini: gemini.error,
        deepseek: deepseek.error,
        mistral: mistral.error
      }
    });
  }

  const meilleur = resultats[0];
  console.log(`✅ Meilleur: ${meilleur.source} (${meilleur.confiance})`);

  return res.status(200).json({
    success: true,
    source: meilleur.source,
    structure: meilleur.structure,
    stats: {
      gemini: gemini.success,
      deepseek: deepseek.success,
      mistral: mistral.success,
      durees: {
        gemini: gemini.duree,
        deepseek: deepseek.duree,
        mistral: mistral.duree
      }
    }
  });
}
