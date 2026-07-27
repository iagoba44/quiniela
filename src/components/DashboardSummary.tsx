import React, { useState, useMemo } from 'react';
import { GeneratedTicket, Match, Selection } from '../types';
import { 
  TrendingUp, 
  Target, 
  Coins, 
  Zap, 
  Sparkles, 
  BarChart2, 
  Filter, 
  ArrowUpRight, 
  CheckCircle2, 
  Info,
  ChevronDown,
  ChevronUp
} from 'lucide-react';

interface DashboardSummaryProps {
  tickets: GeneratedTicket[];
  matches: Match[];
}

export function DashboardSummary({ tickets, matches }: DashboardSummaryProps) {
  const [filterMode, setFilterMode] = useState<'all' | 'ev_plus'>('all');
  const [showOddsDetails, setShowOddsDetails] = useState<boolean>(true);

  // Overall Ticket Statistics
  const stats = useMemo(() => {
    if (!tickets.length || !matches.length) {
      return { avgEv: 0, cost: 0, avgProb: 0, maxEv: 0, totalEvPlusCount: 0 };
    }

    let totalEv = 0;
    let maxEv = 0;
    let totalProb = 0;

    for (const ticket of tickets) {
      let ticketEv = 1;
      let ticketProb = 1;

      for (let i = 0; i < matches.length; i++) {
        const match = matches[i];
        if (i >= ticket.picks.length) break;
        
        const pick = ticket.picks[i];
        
        if (match.ev) {
          ticketEv *= (match.ev[pick] || 1);
        }
        
        if (match.trueProbabilities) {
          ticketProb *= (match.trueProbabilities[pick] || 0.33);
        }
      }

      totalEv += ticketEv;
      maxEv = Math.max(maxEv, ticketEv);
      totalProb += ticketProb;
    }

    // Count overall EV+ options in matchday
    let totalEvPlusCount = 0;
    matches.forEach(m => {
      (['1', 'X', '2'] as Selection[]).forEach(sel => {
        const evVal = m.ev?.[sel] ?? 0;
        if (evVal > 1.0) totalEvPlusCount++;
      });
    });

    return {
      avgEv: totalEv / tickets.length,
      maxEv: maxEv,
      avgProb: totalProb / tickets.length,
      cost: tickets.length * 0.75,
      totalEvPlusCount
    };
  }, [tickets, matches]);

  // Match comparison analysis
  const matchComparisons = useMemo(() => {
    return matches.map((match, index) => {
      const selections: Selection[] = ['1', 'X', '2'];
      
      const picksAnalysis = selections.map(sel => {
        const odd = match.odds?.[sel] || 0;
        // Implied market probability from odds (1 / odd)
        const marketProb = odd > 0 ? (1 / odd) : 0;
        
        // Calculated real probability
        const realProb = match.trueProbabilities?.[sel] || 0;
        
        // SELAE official probability
        const laeProb = match.laeProbabilities?.[sel] || 0;

        // EV value (Real Prob / LAE Prob or Real Prob * Odd)
        const evValue = match.ev?.[sel] ?? (laeProb > 0 ? realProb / laeProb : (realProb * odd));
        
        // Difference between real prob and market implied prob
        const probDiffPct = (realProb - marketProb) * 100;
        
        const isEvPlus = evValue > 1.0;
        const isHighValue = evValue >= 1.15;

        return {
          sel,
          odd,
          marketProb,
          realProb,
          laeProb,
          evValue,
          probDiffPct,
          isEvPlus,
          isHighValue
        };
      });

      const hasEvPlus = picksAnalysis.some(p => p.isEvPlus);
      const topEvPick = [...picksAnalysis].sort((a, b) => b.evValue - a.evValue)[0];

      return {
        matchIndex: index + 1,
        match,
        picksAnalysis,
        hasEvPlus,
        topEvPick
      };
    });
  }, [matches]);

  const filteredMatches = useMemo(() => {
    if (filterMode === 'ev_plus') {
      return matchComparisons.filter(m => m.hasEvPlus);
    }
    return matchComparisons;
  }, [matchComparisons, filterMode]);

  return (
    <div className="space-y-6">
      {/* 1. Metric Cards Summary */}
      {tickets.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 hover:border-slate-300 transition-colors">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 bg-blue-50 text-blue-600 rounded-lg flex items-center justify-center">
                <Coins className="w-4 h-4" />
              </div>
              <p className="text-sm font-medium text-slate-500">Inversión Generada</p>
            </div>
            <p className="text-2xl font-bold text-slate-800">{stats.cost.toFixed(2)} €</p>
            <p className="text-xs text-slate-400 mt-1">{tickets.length} columnas a 0,75 €</p>
          </div>

          <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 hover:border-slate-300 transition-colors">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 bg-emerald-50 text-emerald-600 rounded-lg flex items-center justify-center">
                <Target className="w-4 h-4" />
              </div>
              <p className="text-sm font-medium text-slate-500">Prob. Media Boleto</p>
            </div>
            <p className="text-2xl font-bold text-slate-800">
              {(stats.avgProb * 100).toFixed(4)}%
            </p>
            <p className="text-xs text-slate-400 mt-1">Estimación combinada de acierto</p>
          </div>

          <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 hover:border-slate-300 transition-colors">
            <div className="flex items-center gap-2 mb-2">
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                stats.avgEv > 1 ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'
              }`}>
                <TrendingUp className="w-4 h-4" />
              </div>
              <p className="text-sm font-medium text-slate-500">EV Medio Rentabilidad</p>
            </div>
            <div className="flex items-baseline gap-2">
              <p className={`text-2xl font-bold ${stats.avgEv > 1 ? 'text-emerald-600' : 'text-slate-800'}`}>
                {stats.avgEv.toFixed(2)}x
              </p>
              {stats.avgEv > 1 && (
                <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">
                  EV+ Positivo
                </span>
              )}
            </div>
            <p className="text-xs text-slate-400 mt-1">
              {stats.avgEv > 1 ? 'Rentable vs estimación de masa' : 'Sin sobreprecio de masa'}
            </p>
          </div>

          <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 hover:border-slate-300 transition-colors">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 bg-purple-50 text-purple-600 rounded-lg flex items-center justify-center">
                <Sparkles className="w-4 h-4" />
              </div>
              <p className="text-sm font-medium text-slate-500">Opciones con EV+ (Valor)</p>
            </div>
            <p className="text-2xl font-bold text-slate-800">
              {stats.totalEvPlusCount} <span className="text-sm font-normal text-slate-400">/ {matches.length * 3}</span>
            </p>
            <p className="text-xs text-purple-600 font-medium mt-1">Opciones con valor matemático</p>
          </div>
        </div>
      ) : (
        <div className="bg-gradient-to-r from-blue-50 via-indigo-50 to-purple-50 p-4 rounded-2xl border border-indigo-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-600 text-white rounded-xl flex items-center justify-center font-bold">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-bold text-slate-800 text-sm sm:text-base">Análisis de Esperanza Matemática (EV+) de la Jornada</h4>
              <p className="text-xs text-slate-600 mt-0.5">
                Hay <strong className="text-indigo-700 font-bold">{stats.totalEvPlusCount} opciones con EV+</strong> detectadas en las cuotas actuales. Genera tus boletos para calcular las métricas promedio de tus columnas.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* 2. Visual Comparison: Market Odds vs Calculated True Probabilities */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        {/* Panel Header */}
        <div className="p-5 border-b border-slate-100 bg-slate-50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center">
              <BarChart2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-800 text-base sm:text-lg flex items-center gap-2">
                Comparativa: Cuotas de Mercado vs Probabilidades Reales
                <span className="text-xs bg-indigo-100 text-indigo-800 font-semibold px-2.5 py-0.5 rounded-full">
                  Detección EV+
                </span>
              </h3>
              <p className="text-xs sm:text-sm text-slate-500">
                Análisis de valor matemático comparando la probabilidad real (con ajuste de bajas y overround) frente al mercado.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Filter Toggle */}
            <div className="inline-flex bg-slate-200/70 p-1 rounded-xl text-xs font-semibold text-slate-600">
              <button
                onClick={() => setFilterMode('all')}
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  filterMode === 'all'
                    ? 'bg-white text-slate-800 shadow-xs font-bold'
                    : 'hover:text-slate-900'
                }`}
              >
                Todos los partidos ({matches.length})
              </button>
              <button
                onClick={() => setFilterMode('ev_plus')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
                  filterMode === 'ev_plus'
                    ? 'bg-emerald-600 text-white shadow-xs font-bold'
                    : 'hover:text-slate-900'
                }`}
              >
                <Zap className="w-3.5 h-3.5" />
                Solo EV+ ({matchComparisons.filter(m => m.hasEvPlus).length})
              </button>
            </div>

            <button
              onClick={() => setShowOddsDetails(!showOddsDetails)}
              className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-200/50 rounded-lg transition-colors"
              title={showOddsDetails ? 'Colapsar detalles' : 'Expandir detalles'}
            >
              {showOddsDetails ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Informative Legend */}
        <div className="bg-slate-50/80 px-5 py-3 border-b border-slate-100 flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-slate-600">
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-blue-500" />
            <span><strong>Cuota Mercado</strong> (Probabilidad implícita en apuestas)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-emerald-500" />
            <span><strong>Probabilidad Real</strong> (Calculada sin margen + bajas)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold text-[10px]">
              EV+ &gt; 1.0
            </span>
            <span>Esperanza Matemática Positiva (Mayor Rentabilidad)</span>
          </div>
        </div>

        {/* Match Comparison List */}
        {showOddsDetails && (
          <div className="divide-y divide-slate-100 p-4 space-y-4">
            {filteredMatches.length === 0 ? (
              <div className="p-8 text-center text-slate-500 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                <Filter className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                <p className="font-semibold text-slate-700">No hay partidos con selecciones EV+ en la quiniela actual.</p>
                <p className="text-xs text-slate-400 mt-1">Cambia el filtro a "Todos los partidos" para revisar la comparativa completa.</p>
              </div>
            ) : (
              filteredMatches.map(({ matchIndex, match, picksAnalysis }) => (
                <div 
                  key={match.id} 
                  className="p-4 rounded-xl border border-slate-100 hover:border-slate-200 bg-white transition-all space-y-3"
                >
                  {/* Match Title */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded-md bg-slate-800 text-white text-xs font-bold flex items-center justify-center">
                        {matchIndex}
                      </span>
                      <h4 className="font-bold text-slate-800 text-sm sm:text-base">
                        {match.homeTeam} <span className="text-slate-400 font-normal">vs</span> {match.awayTeam}
                      </h4>
                    </div>

                    {/* Top EV badge for match */}
                    {picksAnalysis.some(p => p.isEvPlus) && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                        <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                        Opciones EV+ Detectadas
                      </span>
                    )}
                  </div>

                  {/* 3 Outcome Options (1, X, 2) */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    {picksAnalysis.map(({ sel, odd, marketProb, realProb, laeProb, evValue, isEvPlus, isHighValue }) => (
                      <div
                        key={sel}
                        className={`p-3 rounded-xl border transition-all flex flex-col justify-between ${
                          isHighValue
                            ? 'bg-emerald-50/70 border-emerald-300 shadow-xs'
                            : isEvPlus
                            ? 'bg-emerald-50/30 border-emerald-200'
                            : 'bg-slate-50/50 border-slate-100'
                        }`}
                      >
                        {/* Option Top row */}
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <span className={`w-7 h-7 rounded-lg text-xs font-extrabold flex items-center justify-center ${
                              sel === '1' ? 'bg-blue-600 text-white' :
                              sel === 'X' ? 'bg-amber-500 text-white' :
                              'bg-purple-600 text-white'
                            }`}>
                              {sel}
                            </span>
                            <span className="text-xs font-semibold text-slate-600">
                              Cuota: <span className="text-slate-900 font-bold">@{odd > 0 ? odd.toFixed(2) : '-.--'}</span>
                            </span>
                          </div>

                          {/* EV Indicator */}
                          <div className="text-right">
                            <span className={`inline-flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-md ${
                              isHighValue
                                ? 'bg-emerald-600 text-white shadow-2xs'
                                : isEvPlus
                                ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                                : 'bg-slate-200 text-slate-600'
                            }`}>
                              {isEvPlus && <ArrowUpRight className="w-3 h-3" />}
                              EV {evValue.toFixed(2)}x
                            </span>
                          </div>
                        </div>

                        {/* Probabilities Comparison Progress Bars */}
                        <div className="space-y-1.5 text-xs pt-1">
                          {/* Real Prob vs Market Implied */}
                          <div className="flex justify-between text-slate-600">
                            <span>Prob. Real:</span>
                            <span className="font-bold text-slate-800">{(realProb * 100).toFixed(1)}%</span>
                          </div>
                          <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                            <div 
                              className="bg-emerald-500 h-full rounded-full transition-all duration-500" 
                              style={{ width: `${Math.min(100, realProb * 100)}%` }} 
                            />
                          </div>

                          <div className="flex justify-between text-slate-500 text-[11px] pt-0.5">
                            <span>Mercado (Implícita):</span>
                            <span>{(marketProb * 100).toFixed(1)}%</span>
                          </div>
                          <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                            <div 
                              className="bg-blue-400 h-full rounded-full transition-all duration-500" 
                              style={{ width: `${Math.min(100, marketProb * 100)}%` }} 
                            />
                          </div>

                          {laeProb > 0 && (
                            <div className="flex justify-between text-[11px] text-slate-400 pt-0.5">
                              <span>Apuestas SELAE:</span>
                              <span>{(laeProb * 100).toFixed(1)}%</span>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}
