import { useState, useCallback, useMemo, useEffect } from 'react';
import { Match, Matchday, TicketSettings, GeneratedTicket, Selection } from './types';
import { MatchPanel } from './components/MatchPanel';
import { ConfigPanel } from './components/ConfigPanel';
import { ResultsTable } from './components/ResultsTable';
import { DistributionChart } from './components/DistributionChart';
import { DashboardSummary } from './components/DashboardSummary';
import { generateCombinations } from './lib/algorithms';
import { exportToTXT } from './lib/export';
import { Trophy, Save, RotateCcw, AlertCircle, RefreshCw } from 'lucide-react';
import { useIndexedDB } from './lib/useIndexedDB';
import { fetchSELAEData, enrichMatchesWithNews } from './lib/api';
import { TabsHeader, TabId } from './components/TabsHeader';
import { NewsPanel } from './components/NewsPanel';
import { GenerationPanel } from './components/GenerationPanel';
import { SourcesPanel } from './components/SourcesPanel';
import { BrainCircuit, Activity } from 'lucide-react';

export default function App() {
  const [matchdays, setMatchdays] = useIndexedDB<Matchday[]>('quiniela-matchdays', []);
  const [activeMatchdayId, setActiveMatchdayId] = useIndexedDB<string>('quiniela-active-matchday', '');
  const [isLoading, setIsLoading] = useState(true);
  const [isEnriching, setIsEnriching] = useState(false);
    const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabId>('general');

  const loadData = async (forceRefresh = false) => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await fetchSELAEData();
      
      const upcoming = data.find(m => m.status === 'upcoming') || data[data.length - 1];
      if (upcoming && forceRefresh) {
         try {
           setIsEnriching(true);
           const enrichedMatches = await enrichMatchesWithNews(upcoming.matches);
           upcoming.matches = enrichedMatches;
         } catch (e) {
           console.error(e);
         } finally {
           setIsEnriching(false);
         }
      }
      
      setMatchdays(data);
      if (upcoming) {
        setActiveMatchdayId(upcoming.id);
      }
    } catch (err: any) {
      setError(err.message || 'Error desconocido al conectar con SELAE.');
    } finally {
      setIsLoading(false);
    }
  };

  const enrichData = async () => {
    if (!activeMatchdayId) return;
    setIsEnriching(true);
    try {
      const md = matchdays.find((m: Matchday) => m.id === activeMatchdayId);
      if (md) {
        const enrichedMatches = await enrichMatchesWithNews(md.matches);
        setMatchdays(prev => prev.map(m => m.id === activeMatchdayId ? { ...m, matches: enrichedMatches } : m));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsEnriching(false);
    }
  };

  useEffect(() => {
    // Always fetch latest data on load to ensure we have current odds and SELAE data
    loadData(true);
  }, []);

  const activeMatchday = useMemo(() => {
    if (matchdays.length === 0) return null;
    return matchdays.find((m: Matchday) => m.id === activeMatchdayId) || matchdays[matchdays.length - 1];
  }, [matchdays, activeMatchdayId]);
  
  const matches = activeMatchday?.matches || [];

  const [settings, setSettings] = useIndexedDB<TicketSettings>('quiniela-settings', {
    algorithm: 'reduction',
    budget: 96,
    minVariants: 3,
    maxVariants: 9,
    minX: 1,
    maxX: 6,
    min2: 1,
    max2: 6,
  });
  
  const [tickets, setTickets] = useIndexedDB<GeneratedTicket[]>('quiniela-tickets', []);
  const [isGenerating, setIsGenerating] = useState(false);

  const handleUpdateMatch = useCallback((id: number, updatedMatch: Match) => {
    if (!activeMatchdayId) return;
    setMatchdays(prev => prev.map(md => {
      if (md.id !== activeMatchdayId) return md;
      return {
        ...md,
        matches: md.matches.map(m => m.id === id ? updatedMatch : m)
      };
    }));
  }, [activeMatchdayId, setMatchdays]);

  const handleGenerate = useCallback(() => {
    setIsGenerating(true);
    setTimeout(() => {
      const results = generateCombinations(matches, settings);
      setTickets(results);
      setIsGenerating(false);
      setActiveTab('generate');
    }, 500);
  }, [matches, settings, setTickets]);

  const handleDownload = () => {
    if (tickets.length === 0) return;
    exportToTXT(tickets);
  };

  const handleReset = () => {
    if (window.confirm('¿Estás seguro de que deseas borrar todas las selecciones?')) {
      if (activeMatchdayId) {
        setMatchdays(prev => prev.map(md => {
          if (md.id !== activeMatchdayId) return md;
          return {
            ...md,
            matches: md.matches.map(m => ({ ...m, selections: [] }))
          };
        }));
      }
      setTickets([]);
    }
  };

  if (error && matchdays.length === 0) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white max-w-md w-full p-8 rounded-2xl shadow-lg border border-red-100 text-center">
          <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-6">
            <AlertCircle className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold text-slate-800 mb-2">Error de conexión</h2>
          <p className="text-slate-600 mb-8 text-sm">{error}</p>
          <button 
            onClick={() => loadData(true)}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-4 rounded-xl transition-colors flex items-center justify-center gap-2"
          >
            <RefreshCw className="w-5 h-5" />
            Reintentar Conexión
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 pb-20">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center shadow-inner">
              <Trophy className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-slate-900">La Quiniela Optimizer</h1>
              <p className="text-xs font-medium text-slate-500">Motor de Fusión y Reducción</p>
            </div>
          </div>
          <div className="hidden md:flex items-center gap-4 text-sm font-medium">
             <div className="flex items-center gap-1 text-slate-600 bg-slate-100 px-3 py-1.5 rounded-full">
               <Save className="w-4 h-4 text-emerald-500" />
               Autoguardado Local
             </div>
             <button
                onClick={handleReset}
                className="flex items-center gap-1 text-slate-500 hover:text-slate-800 transition-colors"
                title="Restablecer todos los datos"
              >
                <RotateCcw className="w-4 h-4" />
                <span className="hidden lg:inline">Restablecer</span>
              </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        {isLoading && (
          <div className="fixed inset-0 bg-white/80 backdrop-blur-sm z-50 flex flex-col items-center justify-center">
            <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-4"></div>
            <p className="text-slate-700 font-medium animate-pulse">Conectando con servidores...</p>
          </div>
        )}

        {/* API Info and Matchday Selector */}
        <div className="mb-6 flex flex-col md:flex-row items-center justify-between gap-4 bg-white p-4 rounded-xl shadow-sm border border-slate-200">
          <div className="flex items-center gap-3 w-full md:w-auto">
            <label className="font-semibold text-slate-700 text-sm whitespace-nowrap">Seleccionar Jornada:</label>
            <select 
              className="bg-slate-50 border border-slate-200 text-slate-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full md:w-auto p-2 cursor-pointer"
              value={activeMatchdayId}
              onChange={(e) => setActiveMatchdayId(e.target.value)}
              disabled={isLoading}
            >
              {matchdays.map((md: Matchday) => (
                <option key={md.id} value={md.id}>
                  {md.name} {md.status === 'completed' ? '(Histórico)' : '(Próxima)'}
                </option>
              ))}
            </select>
            <button
              onClick={() => loadData(true)}
              disabled={isLoading}
              className="p-2 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-5 h-5 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
          </div>
          
          <div className="text-xs text-slate-500 flex flex-wrap items-center gap-2 font-medium">
            <span className="px-2 py-1 bg-slate-100 rounded text-slate-600 font-semibold border border-slate-200">APIs:</span>
            <span>Data Oficial: <strong className="text-blue-600">SELAE</strong></span>
            <span>Bajas: <strong className="text-amber-600">Cascada (FF/API-F)</strong></span>
            
            
            <button
              onClick={enrichData}
              disabled={isEnriching || isLoading}
              className="ml-auto flex items-center gap-1.5 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 px-3 py-1.5 rounded-lg transition-colors border border-indigo-200 disabled:opacity-50 font-bold"
            >
              <BrainCircuit className={`w-4 h-4 ${isEnriching ? 'animate-pulse' : ''}`} />
              {isEnriching ? 'Analizando Bajas (NLP)...' : 'Fusión Cuotas + NLP'}
            </button>
          </div>
        </div>

        <TabsHeader activeTab={activeTab} onTabChange={setActiveTab} />

        <div className="min-h-[500px]">
          {activeTab === 'general' && (
            <div className="space-y-6 animate-in fade-in duration-300">
              <MatchPanel matches={matches} updateMatch={handleUpdateMatch} />
            </div>
          )}

          {activeTab === 'dashboard' && (
            <div className="animate-in fade-in duration-300 space-y-6">
              <DashboardSummary tickets={tickets} matches={matches} />
            </div>
          )}

          {activeTab === 'news' && (
            <div className="animate-in fade-in duration-300 h-full">
              <NewsPanel matches={matches} />
            </div>
          )}

          {activeTab === 'config' && (
            <div className="animate-in fade-in duration-300">
              <ConfigPanel 
                settings={settings} 
                setSettings={setSettings} 
                onGenerate={handleGenerate}
                isGenerating={isGenerating}
              />
            </div>
          )}

          {activeTab === 'generate' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 animate-in fade-in duration-300">
              <div className="lg:col-span-4">
                <GenerationPanel 
                  tickets={tickets} 
                  matches={matches}
                  isGenerating={isGenerating}
                  onGenerate={handleGenerate}
                  onDownload={handleDownload}
                  budget={settings.budget}
                />
              </div>
              <div className="lg:col-span-8 space-y-6">
                <DashboardSummary tickets={tickets} matches={matches} />
                {tickets.length > 0 && (
                  <>
                    <DistributionChart tickets={tickets} matches={matches} />
                    <ResultsTable tickets={tickets} matches={matches} />
                  </>
                )}
              </div>
            </div>
          )}

          {activeTab === 'sources' && (
            <div className="animate-in fade-in duration-300">
              <SourcesPanel />
            </div>
          )}
        </div>
      </main>
      
      
    </div>
  );
}
