import React, { useState, createContext, useContext } from 'react';
import { Upload, FolderOpen, Brain, BarChart3, Settings, Plus, FileText, Trash2, Check, X, Globe, Menu, Link as LinkIcon } from 'lucide-react';
import { aiService } from './services/ai.service';

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
    organizeStudy: 'Organisez et révisez vos cours',
    all: 'Tous',
    cards: 'cards',
    progression: 'Progression',
    launchAI: 'Lancer l\'analyse IA',
    analyzing: 'Analyse en cours...',
    cancel: 'Annuler',
    language: 'Langue',
    uploadFiles: 'Uploader des fichiers',
    addLink: 'Ajouter un lien',
    projectName: 'Nom du projet',
    analyzing1: 'Extraction des documents...',
    analyzing2: 'Analyse Gemini en cours...',
    analyzing3: 'Analyse Mistral en cours...',
    analyzing4: 'Génération des memory cards...'
  },
  en: {
    appName: 'StudyCards',
    tagline: 'Learn Smarter',
    myProjects: 'My Projects',
    newProject: 'New Project',
    statistics: 'Statistics',
    settings: 'Settings',
    organizeStudy: 'Organize and review',
    all: 'All',
    cards: 'cards',
    progression: 'Progress',
    launchAI: 'Launch AI Analysis',
    analyzing: 'Analyzing...',
    cancel: 'Cancel',
    language: 'Language',
    uploadFiles: 'Upload files',
    addLink: 'Add link',
    projectName: 'Project name',
    analyzing1: 'Extracting documents...',
    analyzing2: 'Gemini analysis...',
    analyzing3: 'Mistral analysis...',
    analyzing4: 'Generating cards...'
  }
};

const useLanguage = () => useContext(LanguageContext);

interface Projet {
  id: string;
  titre: string;
  dossier: string;
  typeVisualisation: 'arbre' | 'toile';
  dateCreation: Date;
  nombreCards: number;
  progression: number;
  couleur: string;
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

// Fonction d'extraction de texte depuis PDF
async function extraireTextePDF(fichier: File): Promise<string> {
  // Utilisation de pdfjs-dist
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

// Fonction d'extraction OCR depuis image
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

// Fonction pour extraire texte d'une URL
async function extraireTexteURL(url: string): Promise<string> {
  try {
    const response = await fetch(url);
    const html = await response.text();
    
    // Extraction basique du texte (enlever les balises HTML)
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
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}
      
      <div className={`
        fixed lg:static inset-y-0 left-0 z-50
        w-64 bg-gradient-to-b from-indigo-900 to-purple-900 text-white p-6 flex flex-col
        transform transition-transform duration-300 ease-in-out
        ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
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
            className="lg:hidden text-white hover:bg-white/10 p-2 rounded-lg"
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

const AccueilProjets = ({ setActiveView, setProjetActif }: any) => {
  const { t } = useLanguage();

  return (
    <div className="p-4 lg:p-8">
      <div className="mb-6 lg:mb-8">
        <h2 className="text-2xl lg:text-3xl font-bold text-gray-800 mb-2">{t('myProjects')}</h2>
        <p className="text-sm lg:text-base text-gray-600">{t('organizeStudy')}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-6">
        <div
          onClick={() => setActiveView('nouveau')}
          className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-xl border-2 border-dashed border-indigo-300 hover:border-indigo-500 transition-all cursor-pointer flex items-center justify-center min-h-[200px]"
        >
          <div className="text-center p-4">
            <div className="w-12 h-12 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <Plus className="w-6 h-6 text-indigo-600" />
            </div>
            <h3 className="text-base font-semibold text-gray-700">{t('newProject')}</h3>
          </div>
        </div>
      </div>
    </div>
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
      // Étape 1: Extraction
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
      
      // Étape 2: Analyse IA
      setEtapeAnalyse(2);
      const structure = await aiService.analyseDualIA(texteComplet);
      
      // Étape 3: Génération cards
      setEtapeAnalyse(4);
      const cards = genererMemoryCards(structure);
      
      const nouveauProjet: Projet = {
        id: Date.now().toString(),
        titre: nomProjet,
        dossier: 'Mes projets',
        typeVisualisation: 'arbre',
        dateCreation: new Date(),
        nombreCards: cards.length,
        progression: 0,
        couleur: 'bg-blue-500',
        structure,
        memoryCards: cards
      };
      
      setProjetActif(nouveauProjet);
      
      setTimeout(() => {
        setActiveView('cards');
      }, 1000);
      
    } catch (error) {
      console.error('❌ Erreur:', error);
      alert('Erreur: ' + error);
      setEtape(1);
    }
  };

  return (
    <div className="p-4 lg:p-8 max-w-4xl mx-auto">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-800">{t('newProject')}</h2>
      </div>

      {etape === 1 && (
        <div className="space-y-6">
          <div className="bg-white rounded-xl shadow-md p-6">
            <input
              type="text"
              value={nomProjet}
              onChange={(e) => setNomProjet(e.target.value)}
              placeholder={t('projectName')}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg mb-4"
            />
            
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept=".pdf,image/*"
              onChange={handleFileUpload}
              className="hidden"
            />
            
            <div className="grid grid-cols-2 gap-4 mb-4">
              <button
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center cursor-pointer hover:border-indigo-400 flex flex-col items-center"
              >
                <Upload className="w-8 h-8 mb-2 text-gray-400" />
                <span className="text-sm">{t('uploadFiles')}</span>
              </button>
              
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-4">
                <LinkIcon className="w-8 h-8 mb-2 text-gray-400 mx-auto" />
                <input
                  type="url"
                  value={lienURL}
                  onChange={(e) => setLienURL(e.target.value)}
                  placeholder="https://..."
                  className="w-full text-sm px-2 py-1 border rounded mb-2"
                />
                <button
                  onClick={ajouterLien}
                  className="w-full text-sm bg-indigo-600 text-white py-1 rounded"
                >
                  {t('addLink')}
                </button>
              </div>
            </div>

            {documents.length > 0 && (
              <div className="space-y-2">
                {documents.map(doc => (
                  <div key={doc.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      {doc.type === 'link' ? <LinkIcon className="text-blue-500 flex-shrink-0" size={20} /> : <FileText className="text-red-500 flex-shrink-0" size={20} />}
                      <div className="min-w-0 flex-1">
                        <div className="font-medium text-sm truncate">{doc.nom}</div>
                        {doc.taille && <div className="text-xs text-gray-500">{doc.taille}</div>}
                      </div>
                    </div>
                    <button
                      onClick={() => supprimerDocument(doc.id)}
                      className="text-red-500 p-2 flex-shrink-0"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex justify-between">
            <button
              onClick={() => setActiveView('projets')}
              className="px-6 py-3 border rounded-lg"
            >
              {t('cancel')}
            </button>
            <button
              onClick={lancerAnalyse}
              disabled={!nomProjet || documents.length === 0}
              className="px-6 py-3 bg-indigo-600 text-white rounded-lg flex items-center gap-2 disabled:bg-gray-300"
            >
              <Brain size={20} />
              {t('launchAI')}
            </button>
          </div>
        </div>
      )}

      {etape === 2 && (
        <div className="bg-white rounded-xl shadow-md p-12 text-center">
          <div className="w-20 h-20 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-6 animate-pulse">
            <Brain className="w-10 h-10 text-indigo-600" />
          </div>
          <h3 className="text-2xl font-bold mb-3">{t('analyzing')}</h3>
          
          <div className="space-y-3 max-w-md mx-auto text-left">
            {[1, 2, 3, 4].map(num => (
              <div key={num} className="flex items-center gap-3">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
                  etapeAnalyse > num ? 'bg-green-500' : etapeAnalyse === num ? 'bg-indigo-500 animate-spin' : 'border-2 border-gray-300'
                }`}>
                  {etapeAnalyse > num && <Check size={16} className="text-white" />}
                </div>
                <span className={etapeAnalyse >= num ? 'font-medium' : 'text-gray-500'}>
                  {t(`analyzing${num}` as any)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

const MemoryCards = ({ setActiveView, projetActif }: any) => {
  const cards = projetActif?.memoryCards || [];
  
  return (
    <div className="p-4 lg:p-8">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-800">Memory Cards</h2>
        <p className="text-gray-600">{cards.length} cartes générées</p>
      </div>

      <div className="grid gap-4">
        {cards.map((card: any) => (
          <div key={card.id} className="bg-white rounded-xl shadow-md p-6">
            <div className="text-sm text-indigo-600 mb-1">{card.theme}</div>
            <div className="font-bold text-lg mb-2">{card.question}</div>
            <div className="text-gray-600">{card.reponse}</div>
          </div>
        ))}
      </div>

      <button
        onClick={() => setActiveView('projets')}
        className="mt-6 px-6 py-3 border rounded-lg"
      >
        Retour
      </button>
    </div>
  );
};

const Statistiques = () => (
  <div className="p-8">
    <h2 className="text-3xl font-bold mb-6">Statistiques</h2>
    <div className="bg-white rounded-xl p-6">
      <p className="text-gray-600">Pas encore de données</p>
    </div>
  </div>
);

export default function App() {
  const [activeView, setActiveView] = useState('projets');
  const [projetActif, setProjetActif] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [lang, setLang] = useState('fr');

  const t = (key: string) => (translations as any)[lang]?.[key] || key;

  const langContext = { lang, setLang, t };

  const languages = [
    { code: 'fr', name: 'Français', flag: '🇫🇷' },
    { code: 'en', name: 'English', flag: '🇬🇧' }
  ];

  return (
    <LanguageContext.Provider value={langContext}>
      <div className="flex h-screen bg-gray-50 overflow-hidden">
        <Sidebar 
          activeView={activeView} 
          setActiveView={setActiveView}
          isOpen={sidebarOpen}
          setIsOpen={setSidebarOpen}
        />
        
        <div className="flex-1 overflow-auto flex flex-col">
          <div className="bg-white border-b px-4 py-3 flex items-center justify-between sticky top-0 z-30">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-2 hover:bg-gray-100 rounded-lg"
            >
              <Menu className="w-6 h-6 text-indigo-600" />
            </button>
            <h1 className="text-lg font-bold lg:hidden">{t('appName')}</h1>
            
            <div className="relative group">
              <button className="flex items-center gap-2 px-3 py-2 hover:bg-gray-100 rounded-lg">
                <Globe size={20} />
                <span className="hidden sm:inline">{languages.find(l => l.code === lang)?.flag}</span>
              </button>
              
              <div className="absolute right-0 top-full mt-1 bg-white rounded-lg shadow-xl border py-2 min-w-[160px] opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all">
                {languages.map(language => (
                  <button
                    key={language.code}
                    onClick={() => setLang(language.code)}
                    className={`w-full px-4 py-2 text-left hover:bg-indigo-50 flex items-center gap-2 ${lang === language.code ? 'bg-indigo-100' : ''}`}
                  >
                    <span>{language.flag}</span>
                    <span className="text-sm">{language.name}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
          
          <div className="flex-1">
            {activeView === 'projets' && <AccueilProjets setActiveView={setActiveView} setProjetActif={setProjetActif} />}
            {activeView === 'nouveau' && <NouveauProjet setActiveView={setActiveView} setProjetActif={setProjetActif} />}
            {activeView === 'cards' && <MemoryCards setActiveView={setActiveView} projetActif={projetActif} />}
            {activeView === 'statistiques' && <Statistiques />}
            {activeView === 'parametres' && (
              <div className="p-8">
                <h2 className="text-2xl font-bold mb-4">Paramètres</h2>
                <div className="bg-white rounded-xl p-6">
                  <p className="text-gray-600">Configuration à venir...</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </LanguageContext.Provider>
  );
}
