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

  // TEST SIMPLE : retourner une structure de base
  return res.status(200).json({
    success: true,
    source: 'test',
    structure: {
      titre: "Test API fonctionnelle",
      niveau: 0,
      contenu: "L'API backend fonctionne correctement !",
      enfants: [
        {
          titre: "Sous-thème 1",
          niveau: 1,
          contenu: "Premier sous-thème de test",
          enfants: []
        },
        {
          titre: "Sous-thème 2",
          niveau: 1,
          contenu: "Deuxième sous-thème de test",
          enfants: []
        }
      ]
    }
  });
}
