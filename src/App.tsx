import React, { useState, createContext, useContext } from 'react';
import { Upload, Brain, Menu, Globe, X, FileText, Trash2, Check, Link as LinkIcon, FolderOpen, Plus, BarChart3, Settings } from 'lucide-react';
import { aiService } from './services/ai.service';
import MindMap from './components/MindMap';

const LanguageContext = createContext<{
  lang: string;
  setLang: (lang: string) => void;
  t: (key: string) => string;
}>({
  lang: 'fr',
  setLang: () => {},
  t: (key: string) => key
});

const translations = {
  fr: {
    appName: 'StudyCards',
    tagline: 'Apprendre intelligemment',
    myProjects: 'Mes Projets',
    newProject: 'Nouveau Projet',
    statistics: 'Statistiques',
    settings: 'Paramètres',
    cancel: 'Annuler',
    language: 'Langue',
    uploadFiles: 'Uploader des fichiers',
    addLink: 'Ajouter un lien',
    projectName: 'Nom du projet',
    launchAI: 'Lancer l\'analyse IA',
    analyzing: 'Analyse en cours...',
    analyzing1: 'Extraction des documents...',
    analyzing2: 'Analyse Gemini en cours...',
    analyzing3: 'Analyse Mistral en cours...',
    analyzing4: 'Génération des memory cards...',
    viewMode: 'Mode d\'affichage',
    fullMode: 'Complet',
    semiMode: 'Résumé',
    lightMode: 'Léger',
    memoryCards: 'Memory Cards',
    synthesis: 'Synthèse',
    quiz: 'Quizz',
  },
  en: {
    appName: 'StudyCards',
    tagline: 'Learn Smarter',
    myProjects: 'My Projects',
    newProject: 'New Project',
    statistics: 'Statistics',
    settings: 'Settings',
    cancel: 'Cancel',
    language: 'Language',
    uploadFiles: 'Upload files',
    addLink: 'Add link',
    projectName: 'Project name',
    launchAI: 'Launch AI Analysis',
    analyzing: 'Analyzing...',
    analyzing1: 'Extracting documents...',
    analyzing2: 'Gemini analysis...',
    analyzing3: 'Mistral analysis...',
    analyzing4: 'Generating cards...',
    viewMode: 'Display mode',
    fullMode: 'Full',
    semiMode: 'Summary',
    lightMode: 'Light',
    memoryCards: 'Memory Cards',
    synthesis: 'Synthesis',
    quiz: 'Quiz',
  }
};

const useLanguage = () => useContext(LanguageContext);

interface Projet {
  id: string;
  titre: string;
  structure?: any;
  memoryCards?: any[];
}

interface Document {
  id: string;
  nom: string;
  type: 'pdf' | 'image' | 'link';
  taille?: string;
  fichier?: File;
  url?: string;
}

interface MemoryCard {
  id: string;
  question: string;
  reponse: string;
  theme: string;
  difficulte: 1 | 2 | 3;
  maitrise: boolean;
}

function genererMemoryCards(structure: any): MemoryCard[] {
  const cards: MemoryCard[] = [];
  
  function parcourirStructure(noeud: any, chemin: string[] = []) {
    if (!noeud || !noeud.titre) return;
    
    const nouveauChemin = [...chemin, noeud.titre];
    
    if (noeud.contenu && noeud.contenu.length > 10) {
      cards.push({
        id: `card_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        question: `Qu'est-ce que ${noeud.titre} ?`,
        reponse: noeud.contenu,
        theme: nouveauChemin.join(' › '),
        difficulte: Math.min((noeud.niveau || 0) + 1, 3) as 1 | 2 | 3,
        maitrise: false
      });
    }
    
    if (noeud.enfants && Array.isArray(noeud.enfants)) {
      noeud.enfants.forEach((enfant: any) => {
        parcourirStructure(enfant, nouveauChemin);
      });
    }
  }
  
  parcourirStructure(structure);
  return cards;
}

async function extraireTextePDF(fichier: File): Promise<string> {
  const pdfjsLib = await import('pdfjs-dist');
  pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;
  
  const arrayBuffer = await fichier.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  
  let texteComplet = '';
  
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const pageText = content.items.map((item: any) => item.str).join(' ');
    texteComplet += pageText + '\n\n';
  }
  
  return texteComplet;
}

async function extraireTexteImage(fichier: File): Promise<string> {
  const Tesseract = await import('tesseract.js');
  
  const { data: { text } } = await Tesseract.recognize(
    fichier,
    'fra+eng',
    {
      logger: (m: any) => console.log('OCR:', m)
    }
  );
  
  return text;
}

async function extraireTexteURL(url: string): Promise<string> {
  try {
    const response = await fetch(url);
    const html = await response.text();
    
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    return doc.body.textContent || '';
  } catch (error) {
    console.error('Erreur extraction URL:', error);
    return `Contenu du lien : ${url}`;
  }
}

const Sidebar = ({ activeView, setActiveView, isOpen, setIsOpen }: any) => {
  const { t } = useLanguage();
  const menuItems = [
    { id: 'projets', label: t('myProjects'), icon: FolderOpen },
    { id: 'nouveau', label: t('newProject'), icon: Plus },
    { id: 'statistiques', label: t('statistics'), icon: BarChart3 },
    { id: 'parametres', label: t('settings'), icon: Settings },
  ];

  return (
    <>
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40"
          onClick={() => setIsOpen(false)}
        />
      )}
      
      <div className={`
        fixed inset-y-0 left-0 z-50
        w-64 bg-gradient-to-b from-indigo-900 to-purple-900 text-white p-6 flex flex-col
        transform transition-transform duration-300 ease-in-out
        ${isOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Brain className="w-8 h-8" />
              {t('appName')}
            </h1>
            <p className="text-indigo-200 text-sm mt-1">{t('tagline')}</p>
          </div>
          <button 
            onClick={() => setIsOpen(false)}
            className="text-white hover:bg-white/10 p-2 rounded-lg"
          >
            <X size={24} />
          </button>
        </div>
        
        <nav className="flex-1">
          {menuItems.map(item => (
            <button
              key={item.id}
              onClick={() => {
                setActiveView(item.id);
                setIsOpen(false);
              }}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg mb-2 transition-all ${
                activeView === item.id 
                  ? 'bg-white/20 shadow-lg' 
                  : 'hover:bg-white/10'
              }`}
            >
              <item.icon className="w-5 h-5" />
              {item.label}
            </button>
          ))}
        </nav>
      </div>
    </>
  );
};

const NouveauProjet = ({ setActiveView, setProjetActif }: any) => {
  const { t } = useLanguage();
  const [etape, setEtape] = useState(1);
  const [etapeAnalyse, setEtapeAnalyse] = useState(1);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [nomProjet, setNomProjet] = useState('');
  const [lienURL, setLienURL] = useState('');
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    
    Array.from(files).forEach(file => {
      const type = file.type.includes('pdf') ? 'pdf' : 'image';
      const nouveauDoc: Document = {
        id: Date.now().toString() + Math.random(),
        nom: file.name,
        type,
        taille: `${(file.size / 1024 / 1024).toFixed(2)} MB`,
        fichier: file
      };
      setDocuments(prev => [...prev, nouveauDoc]);
    });
  };

  const ajouterLien = () => {
    if (!lienURL) return;
    
    const nouveauDoc: Document = {
      id: Date.now().toString(),
      nom: lienURL,
      type: 'link',
      url: lienURL
    };
    setDocuments(prev => [...prev, nouveauDoc]);
    setLienURL('');
  };

  const supprimerDocument = (id: string) => {
    setDocuments(documents.filter(d => d.id !== id));
  };

  const lancerAnalyse = async () => {
    if (!nomProjet || documents.length === 0) {
      alert('Veuillez remplir le nom et ajouter des documents');
      return;
    }
    
    setEtape(2);
    
    try {
      setEtapeAnalyse(1);
      const textesExtraits = await Promise.all(
        documents.map(async (doc) => {
          if (doc.type === 'pdf' && doc.fichier) {
            return await extraireTextePDF(doc.fichier);
          } else if (doc.type === 'image' && doc.fichier) {
            return await extraireTexteImage(doc.fichier);
          } else if (doc.type === 'link' && doc.url) {
            return await extraireTexteURL(doc.url);
          }
          return '';
        })
      );
      
      const texteComplet = textesExtraits.join('\n\n');
      
      setEtapeAnalyse(2);
      const structure = await aiService.analyseDualIA(texteComplet);
      
      setEtapeAnalyse(4);
      const cards = genererMemoryCards(structure);
      
      const nouveauProjet: Projet = {
        id: Date.now().toString(),
        titre: nomProjet,
        structure,
        memoryCards: cards
      };
      
      setProjetActif(nouveauProjet);
      
      setTimeout(() => {
        setActiveView('mindmap');
      }, 1000);
      
    } catch (error) {
      console.error('❌ Erreur:', error);
      alert('Erreur: ' + error);
      setEtape(1);
    }
  };

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <div style={{ flex: 1, overflowY: 'auto', padding: '20px' }}>
        {etape === 1 && (
          <div style={{ maxWidth: '800px', margin: '0 auto' }}>
            <h2 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '20px' }}>{t('newProject')}</h2>
            
            <div style={{ background: 'white', borderRadius: '12px', padding: '24px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
              <input
                type="text"
                value={nomProjet}
                onChange={(e) => setNomProjet(e.target.value)}
                placeholder={t('projectName')}
                style={{
                  width: '100%',
                  padding: '12px',
                  border: '1px solid #d1d5db',
                  borderRadius: '8px',
                  marginBottom: '16px'
                }}
              />
              
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept=".pdf,image/*"
                onChange={handleFileUpload}
                style={{ display: 'none' }}
              />
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  style={{
                    border: '2px dashed #d1d5db',
                    borderRadius: '8px',
                    padding: '24px',
                    cursor: 'pointer',
                    background: 'white',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center'
                  }}
                >
                  <Upload size={32} style={{ marginBottom: '8px', color: '#9ca3af' }} />
                  <span style={{ fontSize: '14px' }}>{t('uploadFiles')}</span>
                </button>
                
                <div style={{ border: '2px dashed #d1d5db', borderRadius: '8px', padding: '16px' }}>
                  <LinkIcon size={32} style={{ marginBottom: '8px', color: '#9ca3af', margin: '0 auto', display: 'block' }} />
                  <input
                    type="url"
                    value={lienURL}
                    onChange={(e) => setLienURL(e.target.value)}
                    placeholder="https://..."
                    style={{
                      width: '100%',
                      fontSize: '14px',
                      padding: '8px',
                      border: '1px solid #d1d5db',
                      borderRadius: '4px',
                      marginBottom: '8px'
                    }}
                  />
                  <button
                    onClick={ajouterLien}
                    style={{
                      width: '100%',
                      fontSize: '14px',
                      background: '#6366f1',
                      color: 'white',
                      padding: '8px',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer'
                    }}
                  >
                    {t('addLink')}
                  </button>
                </div>
              </div>

              {documents.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {documents.map(doc => (
                    <div key={doc.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px', background: '#f9fafb', borderRadius: '8px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1, minWidth: 0 }}>
                        {doc.type === 'link' ? <LinkIcon size={20} style={{ color: '#3b82f6', flexShrink: 0 }} /> : <FileText size={20} style={{ color: '#ef4444', flexShrink: 0 }} />}
                        <div style={{ minWidth: 0, flex: 1 }}>
                          <div style={{ fontWeight: '500', fontSize: '14px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{doc.nom}</div>
                          {doc.taille && <div style={{ fontSize: '12px', color: '#6b7280' }}>{doc.taille}</div>}
                        </div>
                      </div>
                      <button
                        onClick={() => supprimerDocument(doc.id)}
                        style={{ color: '#ef4444', padding: '8px', flexShrink: 0, background: 'none', border: 'none', cursor: 'pointer' }}
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '24px' }}>
              <button
                onClick={() => window.location.reload()}
                style={{
                  padding: '12px 24px',
                  border: '1px solid #d1d5db',
                  borderRadius: '8px',
                  background: 'white',
                  cursor: 'pointer'
                }}
              >
                {t('cancel')}
              </button>
              <button
                onClick={lancerAnalyse}
                disabled={!nomProjet || documents.length === 0}
                style={{
                  padding: '12px 24px',
                  background: (!nomProjet || documents.length === 0) ? '#d1d5db' : '#6366f1',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: (!nomProjet || documents.length === 0) ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}
              >
                <Brain size={20} />
                {t('launchAI')}
              </button>
            </div>
          </div>
        )}

        {etape === 2 && (
          <div style={{ background: 'white', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)', padding: '48px', textAlign: 'center', maxWidth: '600px', margin: '100px auto' }}>
            <div style={{ width: '80px', height: '80px', background: '#e0e7ff', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px' }}>
              <Brain size={40} style={{ color: '#6366f1', animation: 'pulse 2s infinite' }} />
            </div>
            <h3 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '12px' }}>{t('analyzing')}</h3>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxWidth: '400px', margin: '0 auto', textAlign: 'left' }}>
              {[1, 2, 3, 4].map(num => (
                <div key={num} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{
                    width: '24px',
                    height: '24px',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: etapeAnalyse > num ? '#22c55e' : etapeAnalyse === num ? '#6366f1' : 'transparent',
                    border: etapeAnalyse <= num ? '2px solid #d1d5db' : 'none'
                  }}>
                    {etapeAnalyse > num && <Check size={16} style={{ color: 'white' }} />}
                  </div>
                  <span style={{ fontWeight: etapeAnalyse >= num ? '500' : 'normal', color: etapeAnalyse >= num ? '#1f2937' : '#6b7280' }}>
                    {t(`analyzing${num}` as any)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const MindMapView = ({ projetActif, activeTab, setActiveTab, menuOpen, setMenuOpen }: any) => {
  const { t, lang, setLang } = useLanguage();
  const [mode, setMode] = useState<'full' | 'semi' | 'light'>('semi');

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        padding: '12px 20px',
        background: 'white',
        borderBottom: '1px solid #e5e7eb',
        boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '12px'
        }}>
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: '8px'
            }}
          >
            <Menu size={24} style={{ color: '#6b7280' }} />
          </button>
          
          <h1 style={{
            fontSize: '18px',
            fontWeight: 'bold',
            color: '#1f2937',
            flex: 1,
            textAlign: 'center'
          }}>
            {projetActif ? projetActif.titre : t('newProject')}
          </h1>
          
          <button
            onClick={() => setLang(lang === 'fr' ? 'en' : 'fr')}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: '8px'
            }}
          >
            <Globe size={24} style={{ color: '#6b7280' }} />
          </button>
        </div>
        
        <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
          <button
            onClick={() => setMode('light')}
            style={{
              padding: '8px 16px',
              borderRadius: '8px',
              border: 'none',
              background: mode === 'light' ? '#6366f1' : '#e5e7eb',
              color: mode === 'light' ? 'white' : '#4b5563',
              fontSize: '14px',
              fontWeight: '600',
              cursor: 'pointer'
            }}
          >
            {t('lightMode')}
          </button>
          <button
            onClick={() => setMode('semi')}
            style={{
              padding: '8px 16px',
              borderRadius: '8px',
              border: 'none',
              background: mode === 'semi' ? '#6366f1' : '#e5e7eb',
              color: mode === 'semi' ? 'white' : '#4b5563',
              fontSize: '14px',
              fontWeight: '600',
              cursor: 'pointer'
            }}
          >
            {t('semiMode')}
          </button>
          <button
            onClick={() => setMode('full')}
            style={{
              padding: '8px 16px',
              borderRadius: '8px',
              border: 'none',
              background: mode === 'full' ? '#6366f1' : '#e5e7eb',
              color: mode === 'full' ? 'white' : '#4b5563',
              fontSize: '14px',
              fontWeight: '600',
              cursor: 'pointer'
            }}
          >
            {t('fullMode')}
          </button>
        </div>
      </div>
      
      <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
        {activeTab === 'mindmap' && projetActif?.structure && (
          <MindMap structure={projetActif.structure} mode={mode} />
        )}
        
        {activeTab === 'synthesis' && (
          <div style={{ padding: '40px', textAlign: 'center' }}>
            <h2 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '16px' }}>Synthèse</h2>
            <p style={{ color: '#6b7280' }}>À implémenter</p>
          </div>
        )}
        
        {activeTab === 'quiz' && (
          <div style={{ padding: '40px', textAlign: 'center' }}>
            <h2 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '16px' }}>Quizz</h2>
            <p style={{ color: '#6b7280' }}>À implémenter</p>
          </div>
        )}
        
        {activeTab === 'memory' && (
          <div style={{ padding: '40px', overflow: 'auto', height: '100%' }}>
            <h2 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '24px' }}>Memory Cards</h2>
            {projetActif?.memoryCards && projetActif.memoryCards.length > 0 ? (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '16px' }}>
                {projetActif.memoryCards.map((card: MemoryCard) => (
                  <div key={card.id} style={{ background: 'white', borderRadius: '12px', padding: '20px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
                    <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '8px' }}>{card.theme}</div>
                    <div style={{ fontWeight: 'bold', marginBottom: '12px' }}>{card.question}</div>
                    <div style={{ fontSize: '14px', color: '#4b5563' }}>{card.reponse}</div>
                  </div>
                ))}
              </div>
            ) : (
              <p style={{ color: '#6b7280', textAlign: 'center' }}>Aucune memory card disponible</p>
            )}
          </div>
        )}
      </div>
      
      <div style={{
        display: 'flex',
        borderTop: '1px solid #e5e7eb',
        background: 'white',
        boxShadow: '0 -2px 8px rgba(0,0,0,0.05)'
      }}>
        <button
          onClick={() => setActiveTab('synthesis')}
          style={{
            flex: 1,
            padding: '16px',
            border: 'none',
            background: activeTab === 'synthesis' ? '#6366f1' : 'white',
            color: activeTab === 'synthesis' ? 'white' : '#6b7280',
            fontSize: '14px',
            fontWeight: '600',
            cursor: 'pointer',
            transition: 'all 0.2s'
          }}
        >
          {t('synthesis')}
        </button>
        <button
          onClick={() => setActiveTab('quiz')}
          style={{
            flex: 1,
            padding: '16px',
            border: 'none',
            borderLeft: '1px solid #e5e7eb',
            borderRight: '1px solid #e5e7eb',
            background: activeTab === 'quiz' ? '#6366f1' : 'white',
            color: activeTab === 'quiz' ? 'white' : '#6b7280',
            fontSize: '14px',
            fontWeight: '600',
            cursor: 'pointer',
            transition: 'all 0.2s'
          }}
        >
          {t('quiz')}
        </button>
        <button
          onClick={() => setActiveTab('memory')}
          style={{
            flex: 1,
            padding: '16px',
            border: 'none',
            background: activeTab === 'memory' ? '#6366f1' : 'white',
            color: activeTab === 'memory' ? 'white' : '#6b7280',
            fontSize: '14px',
            fontWeight: '600',
            cursor: 'pointer',
            transition: 'all 0.2s'
          }}
        >
          {t('memoryCards')}
        </button>
      </div>
    </div>
  );
};

function App() {
  const [lang, setLang] = useState('fr');
  const [activeView, setActiveView] = useState('nouveau');
  const [projetActif, setProjetActif] = useState<Projet | null>(null);
  const [activeTab, setActiveTab] = useState('mindmap');
  const [menuOpen, setMenuOpen] = useState(false);

  const t = (key: string) => translations[lang as keyof typeof translations][key as keyof typeof translations.fr] || key;

  return (
    <LanguageContext.Provider value={{ lang, setLang, t }}>
      <div style={{ height: '100vh', overflow: 'hidden', background: '#f9fafb' }}>
        <Sidebar 
          activeView={activeView} 
          setActiveView={setActiveView} 
          isOpen={menuOpen} 
          setIsOpen={setMenuOpen} 
        />
        
        {activeView === 'nouveau' && (
          <NouveauProjet setActiveView={setActiveView} setProjetActif={setProjetActif} />
        )}
        
        {activeView === 'mindmap' && projetActif && (
          <MindMapView 
            projetActif={projetActif} 
            activeTab={activeTab} 
            setActiveTab={setActiveTab}
            menuOpen={menuOpen}
            setMenuOpen={setMenuOpen}
          />
        )}
      </div>
    </LanguageContext.Provider>
  );
}

export default App;
