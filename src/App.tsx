import React, { useState, createContext, useContext } from 'react';
import { Upload, FolderOpen, Brain, BarChart3, Settings, Plus, FileText, Trash2, Check, X, Download, Globe, Menu } from 'lucide-react';
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
    language: 'Langue'
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
    language: 'Language'
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
  type: 'pdf' | 'word' | 'image' | 'photo';
  taille: string;
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

const Sidebar = ({ activeView, setActiveView, isOpen, setIsOpen }) => {
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

const AccueilProjets = ({ setActiveView, setProjetActif }) => {
  const { t } = useLanguage();
  const [projets] = useState<Projet[]>([]);

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

const NouveauProjet = ({ setActiveView, setProjetActif }) => {
  const { t } = useLanguage();
  const [etape, setEtape] = useState(1);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [nomProjet, setNomProjet] = useState('');

  const ajouterDocument = () => {
    const nouveauDoc: Document = {
      id: Date.now().toString(),
      nom: `Document_test_${documents.length + 1}.txt`,
      type: 'pdf',
      taille: '2.4 MB'
    };
    setDocuments([...documents, nouveauDoc]);
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
      const texteTest = `
      Contenu éducatif sur ${nomProjet}
      
      Introduction:
      Ceci est une introduction au sujet principal.
      
      Chapitre 1: Concepts de base
      Les concepts fondamentaux sont essentiels.
      
      Chapitre 2: Concepts avancés
      Les notions avancées approfondissent le sujet.
      `;
      
      const structure = await aiService.analyseDualIA(texteTest);
      const cards = genererMemoryCards(structure);
      
      const nouveauProjet: Projet = {
        id: Date.now().toString(),
        titre: nomProjet,
        dossier: 'Test',
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
              placeholder="Nom du projet"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg mb-4"
            />
            
            <div
              onClick={ajouterDocument}
              className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center cursor-pointer hover:border-indigo-400"
            >
              <Upload className="w-10 h-10 mx-auto mb-2 text-gray-400" />
              <p>Ajouter un document</p>
            </div>

            {documents.length > 0 && (
              <div className="space-y-2 mt-4">
                {documents.map(doc => (
                  <div key={doc.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <FileText className="text-red-500" />
                      <span>{doc.nom}</span>
                    </div>
                    <button
                      onClick={() => supprimerDocument(doc.id)}
                      className="text-red-500 p-2"
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
              className="px-6 py-3 bg-indigo-600 text-white rounded-lg flex items-center gap-2"
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
          <p className="text-gray-600">Gemini + Mistral analysent...</p>
        </div>
      )}
    </div>
  );
};

const MemoryCards = ({ setActiveView, projetActif }) => {
  const cards = projetActif?.memoryCards || [];
  
  return (
    <div className="p-4 lg:p-8">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-800">Memory Cards</h2>
        <p className="text-gray-600">{cards.length} cartes générées</p>
      </div>

      <div className="grid gap-4">
        {cards.map((card) => (
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

  const t = (key: string) => translations[lang]?.[key] || key;

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
