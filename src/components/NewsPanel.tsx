import React, { useState, useEffect, useMemo } from 'react';
import { 
  Stethoscope, AlertCircle, RefreshCw, UserMinus, ShieldAlert, FileWarning, 
  Info, Search, Bell, Activity, Newspaper, ChevronRight, TrendingDown, 
  CheckCircle2, UserCheck, Flame, ExternalLink, Filter
} from 'lucide-react';
import { Match, PlayerImpact, TeamBajasDetail, AlertItem } from '../types';
import { calculatePlayerImpactScore, calculateTeamBajasImpact } from '../lib/probabilities';
import { db } from '../lib/db';

interface NewsPanelProps {
  matches: Match[];
}

interface RSSNewsItem {
  title: string;
  link: string;
  pubDate: string;
  snippet: string;
  affectedTeam: string;
  penalty: number;
}

export function NewsPanel({ matches }: NewsPanelProps) {
  const [subTab, setSubTab] = useState<'jornada' | 'team' | 'alerts' | 'rss'>('jornada');
  const [selectedTeam, setSelectedTeam] = useState<string>('');
  const [teamSearchQuery, setTeamSearchQuery] = useState<string>('');
  const [teamBajasDetail, setTeamBajasDetail] = useState<TeamBajasDetail | null>(null);
  const [loadingTeam, setLoadingTeam] = useState(false);
  const [rssNews, setRssNews] = useState<RSSNewsItem[]>([]);
  const [loadingRss, setLoadingRss] = useState(false);
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>('default');

  // List of all unique teams
  const allTeams = useMemo(() => {
    return Array.from(new Set(matches.flatMap(m => [m.homeTeam, m.awayTeam]))).sort();
  }, [matches]);

  const filteredTeams = useMemo(() => {
    if (!teamSearchQuery.trim()) return allTeams;
    return allTeams.filter(t => t.toLowerCase().includes(teamSearchQuery.toLowerCase()));
  }, [allTeams, teamSearchQuery]);

  // Load RSS & Alerts on mount
  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      setNotificationPermission(Notification.permission);
    }

    const fetchRSS = async () => {
      setLoadingRss(true);
      try {
        const teamsParam = allTeams.length > 0 ? `?teams=${encodeURIComponent(allTeams.join(','))}` : '';
        const res = await fetch(`/api/news/rss${teamsParam}`);
        if (res.ok) {
          const data = await res.json();
          if (data.success) {
            setRssNews(data.news || []);
          }
        }
      } catch (e) {
        console.error('Error fetching RSS:', e);
      } finally {
        setLoadingRss(false);
      }
    };

    const loadLocalAlerts = async () => {
      try {
        const saved = await db.getAlerts();
        if (saved && saved.length > 0) {
          setAlerts(saved);
        } else {
          // Default initial alerts
          const sampleAlerts: AlertItem[] = [
            {
              id: '1',
              playerName: 'Jude Bellingham',
              teamName: 'Real Madrid',
              oldStatus: 'duda',
              newStatus: 'baja_confirmada',
              timestamp: new Date(Date.now() - 2 * 3600 * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
              source: 'Marca / RSS',
              seen: false
            },
            {
              id: '2',
              playerName: 'Pedri',
              teamName: 'FC Barcelona',
              oldStatus: 'sancionado',
              newStatus: 'recuperado',
              timestamp: new Date(Date.now() - 5 * 3600 * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
              source: 'FutbolFantasy',
              seen: false
            }
          ];
          setAlerts(sampleAlerts);
          sampleAlerts.forEach(a => db.saveAlert(a));
        }
      } catch (e) {
        console.error('Error loading alerts:', e);
      }
    };

    fetchRSS();
    loadLocalAlerts();
  }, []);

  // Request Notification permission
  const requestNotificationPermission = async () => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      const perm = await Notification.requestPermission();
      setNotificationPermission(perm);
      if (perm === 'granted') {
        new Notification('Quiniela Optimizer', {
          body: 'Notificaciones activadas. Recibirás alertas de bajas de última hora.',
          icon: '/favicon.ico'
        });
      }
    }
  };

  // Fetch team detail when selecting a team
  useEffect(() => {
    if (!selectedTeam) return;

    const fetchTeamDetail = async () => {
      setLoadingTeam(true);
      try {
        const res = await fetch(`/api/bajas/${encodeURIComponent(selectedTeam)}`);
        if (res.ok) {
          const raw = await res.json();
          // Transform raw API data into rich PlayerImpact items
          const players: PlayerImpact[] = [
            ...(raw.bajas_confirmadas || []).map((name: string) => ({
              name,
              status: 'confirmed_out' as const,
              position: (name.includes('Courtois') || name.includes('Oblak') || name.includes('Ter Stegen')) ? 'GK' as const :
                        (name.includes('Carvajal') || name.includes('Araujo') || name.includes('Militão') || name.includes('Giménez')) ? 'DEF' as const :
                        (name.includes('Vinicius') || name.includes('Lewandowski') || name.includes('Griezmann')) ? 'FWD' as const : 'MID' as const,
              role: (name.includes('Bellingham') || name.includes('Vinicius') || name.includes('Pedri') || name.includes('Griezmann')) ? 'star' as const : 'starter' as const,
              impactScore: calculatePlayerImpactScore({ role: 'starter', position: 'MID', status: 'confirmed_out' })
            })),
            ...(raw.sancionados || []).map((name: string) => ({
              name,
              status: 'suspended' as const,
              position: 'DEF' as const,
              role: 'starter' as const,
              impactScore: calculatePlayerImpactScore({ role: 'starter', position: 'DEF', status: 'suspended' })
            })),
            ...(raw.dudas || []).map((name: string) => ({
              name,
              status: 'doubtful' as const,
              position: 'MID' as const,
              role: 'rotation' as const,
              impactScore: calculatePlayerImpactScore({ role: 'rotation', position: 'MID', status: 'doubtful' })
            }))
          ];

          const impact = calculateTeamBajasImpact(players);

          setTeamBajasDetail({
            equipo: selectedTeam,
            players,
            factor_penalizacion: impact.penaltyFactor,
            fragilityFlags: impact.fragilityFlags,
            lastUpdated: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          });
        }
      } catch (e) {
        console.error('Error fetching team detail:', e);
      } finally {
        setLoadingTeam(false);
      }
    };

    fetchTeamDetail();
  }, [selectedTeam]);

  // Match list enriched with parallel columns
  const matchBajasList = useMemo(() => {
    return matches.map(m => {
      const homeConfirmadas = m.bajasHome?.confirmadas || [];
      const homeSancionados = m.bajasHome?.sancionados || [];
      const homeDudas = m.bajasHome?.dudas || [];

      const awayConfirmadas = m.bajasAway?.confirmadas || [];
      const awaySancionados = m.bajasAway?.sancionados || [];
      const awayDudas = m.bajasAway?.dudas || [];

      const homeTotal = homeConfirmadas.length + homeSancionados.length + homeDudas.length;
      const awayTotal = awayConfirmadas.length + awaySancionados.length + awayDudas.length;

      const homeImpactScore = Math.min(0.12, (homeConfirmadas.length * 0.035) + (homeSancionados.length * 0.025) + (homeDudas.length * 0.015));
      const awayImpactScore = Math.min(0.12, (awayConfirmadas.length * 0.035) + (awaySancionados.length * 0.025) + (awayDudas.length * 0.015));

      const homeFragility: string[] = [];
      if (homeConfirmadas.length >= 2) homeFragility.push('⚠️ Defensa mermada');
      if (homeConfirmadas.some(n => n.toLowerCase().includes('portero') || n.toLowerCase().includes('courtois'))) homeFragility.push('⚠️ Sin portero tit.');

      const awayFragility: string[] = [];
      if (awayConfirmadas.length >= 2) awayFragility.push('⚠️ Defensa mermada');

      return {
        match: m,
        homeTotal,
        awayTotal,
        homeImpactScore,
        awayImpactScore,
        homeFragility,
        awayFragility,
        homeConfirmadas,
        homeSancionados,
        homeDudas,
        awayConfirmadas,
        awaySancionados,
        awayDudas
      };
    });
  }, [matches]);

  const unreadAlertsCount = alerts.filter(a => !a.seen).length;

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 flex flex-col h-full min-h-[650px]">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6 pb-4 border-b border-slate-100">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center text-amber-600 font-bold">
            <Stethoscope className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-lg text-slate-800">Centro de Noticias y Bajas v2</h3>
            <p className="text-xs text-slate-500">API-Football + FutbolFantasy + Gemini NLP + Matchday Multi-Source</p>
          </div>
        </div>

        {/* Sub-Tabs */}
        <div className="flex bg-slate-100 p-1 rounded-xl gap-1 text-xs font-semibold text-slate-600">
          <button
            onClick={() => setSubTab('jornada')}
            className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
              subTab === 'jornada' ? 'bg-white text-slate-900 shadow-sm' : 'hover:text-slate-900'
            }`}
          >
            <Activity className="w-3.5 h-3.5 text-blue-600" />
            Vista Jornada
          </button>
          <button
            onClick={() => setSubTab('team')}
            className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
              subTab === 'team' ? 'bg-white text-slate-900 shadow-sm' : 'hover:text-slate-900'
            }`}
          >
            <Search className="w-3.5 h-3.5 text-amber-600" />
            Buscador Equipo
          </button>
          <button
            onClick={() => setSubTab('rss')}
            className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
              subTab === 'rss' ? 'bg-white text-slate-900 shadow-sm' : 'hover:text-slate-900'
            }`}
          >
            <Newspaper className="w-3.5 h-3.5 text-emerald-600" />
            Prensa & NLP
          </button>
          <button
            onClick={() => setSubTab('alerts')}
            className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 relative ${
              subTab === 'alerts' ? 'bg-white text-slate-900 shadow-sm' : 'hover:text-slate-900'
            }`}
          >
            <Bell className="w-3.5 h-3.5 text-rose-600" />
            Alertas 12h
            {unreadAlertsCount > 0 && (
              <span className="w-4 h-4 bg-rose-500 text-white text-[10px] rounded-full flex items-center justify-center font-bold">
                {unreadAlertsCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* SUB-TAB 1: VISTA JORNADA PARTIDO A PARTIDO */}
      {subTab === 'jornada' && (
        <div className="space-y-4 flex-1 overflow-y-auto pr-1">
          <div className="p-3 bg-blue-50 text-blue-800 text-xs rounded-xl flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Info className="w-4 h-4 flex-shrink-0 text-blue-600" />
              <span>Comparativa paralelizada de bajas entre rivales directos de la jornada.</span>
            </div>
            <span className="font-semibold text-blue-900">15 Partidos Monitoreados</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {matchBajasList.map(({ match, homeTotal, awayTotal, homeImpactScore, awayImpactScore, homeFragility, awayFragility, homeConfirmadas, homeSancionados, homeDudas, awayConfirmadas, awaySancionados, awayDudas }) => (
              <div key={match.id} className="bg-slate-50 border border-slate-200 rounded-xl p-4 shadow-sm hover:border-blue-300 transition-all">
                {/* Match Header */}
                <div className="flex justify-between items-center border-b border-slate-200 pb-2 mb-3">
                  <span className="text-xs font-bold text-slate-400">Partido #{match.id}</span>
                  <div className="flex items-center gap-2">
                    {homeImpactScore > 0 && (
                      <span className="text-[10px] bg-rose-100 text-rose-700 font-bold px-2 py-0.5 rounded">
                        L: -{(homeImpactScore * 100).toFixed(1)}%
                      </span>
                    )}
                    {awayImpactScore > 0 && (
                      <span className="text-[10px] bg-rose-100 text-rose-700 font-bold px-2 py-0.5 rounded">
                        V: -{(awayImpactScore * 100).toFixed(1)}%
                      </span>
                    )}
                  </div>
                </div>

                {/* Matchup Columns */}
                <div className="grid grid-cols-2 gap-3 text-xs">
                  {/* Home Team */}
                  <div className="border-r border-slate-200 pr-2">
                    <div className="font-bold text-slate-800 flex items-center justify-between mb-1">
                      <span className="truncate">{match.homeTeam}</span>
                      <span className="text-[10px] text-slate-400">({homeTotal})</span>
                    </div>

                    {homeFragility.map((flag, idx) => (
                      <div key={idx} className="text-[10px] text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded font-bold mb-1">
                        {flag}
                      </div>
                    ))}

                    <div className="space-y-1 mt-2">
                      {homeConfirmadas.map((player, idx) => (
                        <div key={idx} className="flex items-center gap-1 bg-white border border-rose-100 p-1 rounded text-rose-800 text-[11px]">
                          <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
                          <span className="truncate">{player}</span>
                        </div>
                      ))}
                      {homeSancionados.map((player, idx) => (
                        <div key={idx} className="flex items-center gap-1 bg-white border border-amber-100 p-1 rounded text-amber-800 text-[11px]">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                          <span className="truncate">{player}</span>
                        </div>
                      ))}
                      {homeDudas.map((player, idx) => (
                        <div key={idx} className="flex items-center gap-1 bg-white border border-slate-200 p-1 rounded text-slate-600 text-[11px]">
                          <span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span>
                          <span className="truncate">{player}</span>
                        </div>
                      ))}
                      {homeTotal === 0 && (
                        <span className="text-[10px] text-emerald-600 font-medium">Sin bajas reportadas</span>
                      )}
                    </div>
                  </div>

                  {/* Away Team */}
                  <div className="pl-1">
                    <div className="font-bold text-slate-800 flex items-center justify-between mb-1">
                      <span className="truncate">{match.awayTeam}</span>
                      <span className="text-[10px] text-slate-400">({awayTotal})</span>
                    </div>

                    {awayFragility.map((flag, idx) => (
                      <div key={idx} className="text-[10px] text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded font-bold mb-1">
                        {flag}
                      </div>
                    ))}

                    <div className="space-y-1 mt-2">
                      {awayConfirmadas.map((player, idx) => (
                        <div key={idx} className="flex items-center gap-1 bg-white border border-rose-100 p-1 rounded text-rose-800 text-[11px]">
                          <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
                          <span className="truncate">{player}</span>
                        </div>
                      ))}
                      {awaySancionados.map((player, idx) => (
                        <div key={idx} className="flex items-center gap-1 bg-white border border-amber-100 p-1 rounded text-amber-800 text-[11px]">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                          <span className="truncate">{player}</span>
                        </div>
                      ))}
                      {awayDudas.map((player, idx) => (
                        <div key={idx} className="flex items-center gap-1 bg-white border border-slate-200 p-1 rounded text-slate-600 text-[11px]">
                          <span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span>
                          <span className="truncate">{player}</span>
                        </div>
                      ))}
                      {awayTotal === 0 && (
                        <span className="text-[10px] text-emerald-600 font-medium">Sin bajas reportadas</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SUB-TAB 2: BUSCADOR Y FICHA DE EQUIPO */}
      {subTab === 'team' && (
        <div className="space-y-4 flex-1 overflow-y-auto pr-1">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
            <input
              type="text"
              placeholder="Buscar equipo por nombre (ej: Real Madrid, Betis, Girona...)"
              className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-amber-500"
              value={teamSearchQuery}
              onChange={(e) => setTeamSearchQuery(e.target.value)}
            />
          </div>

          <div className="flex flex-wrap gap-1.5">
            {filteredTeams.map(team => (
              <button
                key={team}
                onClick={() => setSelectedTeam(team)}
                className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${
                  selectedTeam === team 
                    ? 'bg-amber-600 text-white shadow-sm' 
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                {team}
              </button>
            ))}
          </div>

          {loadingTeam && (
            <div className="py-12 flex flex-col items-center justify-center text-slate-400">
              <RefreshCw className="w-7 h-7 animate-spin text-amber-500 mb-2" />
              <p className="text-xs">Consultando orquestador de bajas para {selectedTeam}...</p>
            </div>
          )}

          {!loadingTeam && teamBajasDetail && (
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 space-y-4">
              <div className="flex justify-between items-center border-b border-slate-200 pb-3">
                <div>
                  <h4 className="font-bold text-lg text-slate-800">{teamBajasDetail.equipo}</h4>
                  <p className="text-xs text-slate-400">Última actualización: {teamBajasDetail.lastUpdated}</p>
                </div>
                <div className="text-right">
                  <span className={`text-sm font-bold px-3 py-1 rounded-full ${
                    teamBajasDetail.factor_penalizacion < 0 ? 'bg-rose-100 text-rose-700' : 'bg-emerald-100 text-emerald-700'
                  }`}>
                    {(teamBajasDetail.factor_penalizacion * 100).toFixed(1)}% Pen.
                  </span>
                </div>
              </div>

              {teamBajasDetail.fragilityFlags.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {teamBajasDetail.fragilityFlags.map((flag, i) => (
                    <span key={i} className="text-xs bg-amber-100 text-amber-800 font-bold px-2.5 py-1 rounded-lg">
                      {flag}
                    </span>
                  ))}
                </div>
              )}

              <div className="space-y-2">
                <h5 className="font-bold text-xs uppercase text-slate-500 tracking-wider">Plantilla y Estado de Jugadores</h5>
                {teamBajasDetail.players.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {teamBajasDetail.players.map((p, idx) => (
                      <div key={idx} className="bg-white p-2.5 rounded-lg border border-slate-200 flex items-center justify-between text-xs">
                        <div>
                          <div className="font-bold text-slate-800 flex items-center gap-1.5">
                            {p.status === 'confirmed_out' && <span className="w-2 h-2 rounded-full bg-rose-500"></span>}
                            {p.status === 'suspended' && <span className="w-2 h-2 rounded-full bg-amber-500"></span>}
                            {p.status === 'doubtful' && <span className="w-2 h-2 rounded-full bg-slate-400"></span>}
                            {p.name}
                          </div>
                          <div className="text-[10px] text-slate-400 mt-0.5">
                            Pos: <span className="font-semibold text-slate-600">{p.position}</span> | Rol: <span className="font-semibold text-slate-600">{p.role}</span>
                          </div>
                        </div>
                        <div className="text-right">
                          <span className="text-[10px] font-bold text-rose-600 bg-rose-50 px-1.5 py-0.5 rounded">
                            Impacto: {(p.impactScore * 100).toFixed(0)}%
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-4 bg-white rounded-lg border border-slate-200 text-center text-xs text-slate-500">
                    No se han registrado bajas ni sanciones activas para este equipo.
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* SUB-TAB 3: PRENSA Y NLP GEMINI */}
      {subTab === 'rss' && (
        <div className="space-y-4 flex-1 overflow-y-auto pr-1">
          <div className="p-3 bg-emerald-50 text-emerald-800 text-xs rounded-xl flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Flame className="w-4 h-4 flex-shrink-0 text-emerald-600" />
              <span>Titulares deportivos de Marca & As filtrados para los equipos de la jornada (últimos 7 días) y procesados por Gemini NLP.</span>
            </div>
            <span className="text-[10px] font-bold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded">
              {allTeams.length} Equipos implicados
            </span>
          </div>

          {loadingRss && (
            <div className="py-12 flex flex-col items-center justify-center text-slate-400">
              <RefreshCw className="w-7 h-7 animate-spin text-emerald-500 mb-2" />
              <p className="text-xs">Analizando feeds RSS con el motor NLP Gemini...</p>
            </div>
          )}

          {!loadingRss && rssNews.length > 0 && (
            <div className="space-y-3">
              {rssNews.map((item, idx) => (
                <div key={idx} className="bg-slate-50 border border-slate-200 p-3.5 rounded-xl text-xs hover:border-emerald-300 transition-all">
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <a 
                      href={item.link} 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      className="font-bold text-slate-800 hover:text-emerald-700 flex items-center gap-1.5"
                    >
                      {item.title}
                      <ExternalLink className="w-3 h-3 text-slate-400 inline" />
                    </a>
                    {item.affectedTeam && (
                      <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded font-bold text-[10px]">
                        {item.affectedTeam}
                      </span>
                    )}
                  </div>
                  <p className="text-slate-600 text-[11px] line-clamp-2 mb-2">{item.snippet}</p>
                  <div className="flex items-center justify-between text-[10px] text-slate-400 pt-2 border-t border-slate-200">
                    <span>{new Date(item.pubDate).toLocaleString()}</span>
                    {item.penalty < 0 && (
                      <span className="font-bold text-rose-600 bg-rose-50 px-1.5 py-0.5 rounded">
                        Gemini NLP Impacto: {(item.penalty * 100).toFixed(1)}%
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* SUB-TAB 4: ALERTAS DE ULTIMA HORA (12H) */}
      {subTab === 'alerts' && (
        <div className="space-y-4 flex-1 overflow-y-auto pr-1">
          <div className="flex justify-between items-center bg-rose-50 p-3 rounded-xl">
            <div className="flex items-center gap-2 text-xs text-rose-800 font-medium">
              <Bell className="w-4 h-4 text-rose-600" />
              <span>Novedades y cambios de estado detectados en las últimas 12 horas.</span>
            </div>
            {notificationPermission !== 'granted' && (
              <button
                onClick={requestNotificationPermission}
                className="text-[11px] bg-rose-600 text-white px-2.5 py-1 rounded-lg font-bold hover:bg-rose-700"
              >
                Activar Notificaciones
              </button>
            )}
          </div>

          <div className="space-y-2">
            {alerts.map(a => (
              <div key={a.id} className="bg-slate-50 border border-slate-200 p-3 rounded-xl flex items-center justify-between text-xs">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center font-bold">
                    <UserMinus className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="font-bold text-slate-800">
                      {a.playerName} <span className="text-slate-400 font-normal">({a.teamName})</span>
                    </div>
                    <div className="text-[11px] text-slate-500 mt-0.5">
                      Cambio de estado: <span className="line-through text-slate-400">{a.oldStatus}</span> → <span className="font-bold text-rose-600 uppercase">{a.newStatus.replace('_', ' ')}</span>
                    </div>
                  </div>
                </div>
                <div className="text-right text-[10px] text-slate-400">
                  <div>{a.timestamp}</div>
                  <div className="text-slate-500">{a.source}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
