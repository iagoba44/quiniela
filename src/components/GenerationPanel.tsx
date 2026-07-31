import React, { useMemo } from 'react';
import { Settings, Download, Calculator, CheckCircle2, Dices, BarChart2, ShieldCheck, Award, Target, Layers } from 'lucide-react';
import { GeneratedTicket, Match } from '../types';
import { runMonteCarloSimulation } from '../lib/algorithms';

interface GenerationPanelProps {
  tickets: GeneratedTicket[];
  matches: Match[];
  isGenerating: boolean;
  onGenerate: () => void;
  onDownload: () => void;
  budget: number;
}

export function GenerationPanel({ tickets, matches, isGenerating, onGenerate, onDownload, budget }: GenerationPanelProps) {
  const cost = (tickets.length * 0.75).toFixed(2);
  const isWithinBudget = parseFloat(cost) <= budget;

  // Run Monte Carlo simulation on generated tickets
  const monteCarloStats = useMemo(() => {
    if (!tickets || tickets.length === 0 || !matches || matches.length === 0) return null;
    return runMonteCarloSimulation(tickets, matches, 1000);
  }, [tickets, matches]);

  const avgTicketOddsRatio = useMemo(() => {
    if (!monteCarloStats?.avgTicketProb || monteCarloStats.avgTicketProb <= 0) return null;
    const ratio = Math.round(1 / monteCarloStats.avgTicketProb);
    return ratio.toLocaleString();
  }, [monteCarloStats]);

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 flex flex-col h-full gap-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center">
          <Calculator className="w-5 h-5 text-emerald-600" />
        </div>
        <div>
          <h3 className="font-bold text-lg text-slate-800">Generación y Descarga</h3>
          <p className="text-sm text-slate-500">Genera las columnas y analiza la cobertura matemática</p>
        </div>
      </div>

      <div className="flex flex-col items-center justify-center py-4 border-b border-slate-100">
        <div className="text-center mb-4">
          <div className="text-5xl font-extrabold text-slate-800 mb-2">{tickets.length}</div>
          <div className="text-sm font-medium text-slate-500 uppercase tracking-wider">Columnas Generadas</div>
        </div>

        <div className={`text-2xl font-bold mb-6 ${isWithinBudget ? 'text-emerald-600' : 'text-red-600'}`}>
          Coste Total: {cost} €
        </div>

        <div className="flex flex-wrap gap-3 justify-center w-full">
          <button
            onClick={onGenerate}
            disabled={isGenerating}
            className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-medium py-3 px-8 rounded-xl transition-colors flex items-center justify-center gap-2"
          >
            <Settings className={`w-5 h-5 ${isGenerating ? 'animate-spin' : ''}`} />
            {isGenerating ? 'Optimizando Columnas...' : 'Generar Apuestas'}
          </button>

          {tickets.length > 0 && (
            <button
              onClick={onDownload}
              className="w-full sm:w-auto bg-slate-800 hover:bg-slate-900 text-white font-medium py-3 px-8 rounded-xl transition-colors flex items-center justify-center gap-2"
            >
              <Download className="w-5 h-5" />
              Descargar Archivo TXT
            </button>
          )}
        </div>
      </div>

      {/* Probability & Coverage Breakdown Widgets */}
      {monteCarloStats && (
        <div className="space-y-4">
          {/* Card 1: Probabilidad Media por Boleto y del Conjunto */}
          <div className="bg-gradient-to-br from-blue-50/80 to-indigo-50/80 border border-blue-200 rounded-2xl p-4 space-y-3">
            <div className="flex items-center justify-between border-b border-blue-100 pb-2">
              <div className="flex items-center gap-2 font-bold text-blue-900 text-sm">
                <Target className="w-4 h-4 text-blue-600" />
                Probabilidad Media (Boleto) y Conjunto de Apuestas
              </div>
              <span className="text-[10px] font-bold bg-blue-200 text-blue-800 px-2.5 py-0.5 rounded-full">
                {tickets.length} boletos
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="bg-white p-3 rounded-xl border border-blue-100 shadow-xs">
                <div className="text-slate-500 font-semibold text-[10px] uppercase">Probabilidad Media (Boleto Individual)</div>
                <div className="text-xl font-bold text-blue-950 mt-1">
                  {((monteCarloStats.avgTicketProb || 0) * 100).toFixed(5)}%
                </div>
                {avgTicketOddsRatio && (
                  <div className="text-[11px] text-slate-500 mt-0.5">
                    1 en <strong className="text-slate-700">{avgTicketOddsRatio}</strong> combinaciones
                  </div>
                )}
              </div>

              <div className="bg-white p-3 rounded-xl border border-blue-100 shadow-xs">
                <div className="text-slate-500 font-semibold text-[10px] uppercase">Prob. Conjunta de Premio (≥10 Aciertos)</div>
                <div className="text-xl font-bold text-emerald-600 mt-1">
                  {(monteCarloStats.totalSetProb10Plus || 0).toFixed(1)}%
                </div>
                <div className="text-[11px] text-slate-500 mt-0.5">
                  Probabilidad de rentabilidad acumulada
                </div>
              </div>
            </div>
          </div>

          {/* Card 2: Cuántos resultados aseguramos con este modelo */}
          <div className="bg-emerald-50/70 border border-emerald-200 rounded-2xl p-4 space-y-3">
            <div className="flex items-center justify-between border-b border-emerald-200/60 pb-2">
              <div className="flex items-center gap-2 font-bold text-emerald-950 text-sm">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                ¿Cuántos resultados aseguramos con este modelo?
              </div>
              <span className="text-[10px] font-bold bg-emerald-200 text-emerald-800 px-2 py-0.5 rounded-full">
                Garantía y Cobertura
              </span>
            </div>

            {/* Guaranteed Hits & Match Coverage */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="bg-white p-3 rounded-xl border border-emerald-100 shadow-xs flex flex-col justify-between">
                <div>
                  <div className="text-slate-500 font-semibold text-[10px] uppercase">Aciertos Asegurados (Confianza 90%)</div>
                  <div className="text-2xl font-extrabold text-emerald-700 mt-1 flex items-baseline gap-1">
                    ≥ {monteCarloStats.guaranteedHits90 || 0}
                    <span className="text-xs font-normal text-slate-500">aciertos en boleto top</span>
                  </div>
                </div>
                <p className="text-[11px] text-slate-500 mt-2">
                  En el 90% de las simulaciones se obtiene como mínimo este número de aciertos.
                </p>
              </div>

              <div className="bg-white p-3 rounded-xl border border-emerald-100 shadow-xs">
                <div className="text-slate-500 font-semibold text-[10px] uppercase mb-1.5">Desglose de Cobertura (Partidos)</div>
                <div className="space-y-1.5">
                  <div className="flex justify-between items-center text-slate-700 font-medium">
                    <span className="flex items-center gap-1.5 text-slate-600">
                      <span className="w-2.5 h-2.5 rounded-full bg-blue-500" /> Fijos (100% único):
                    </span>
                    <strong className="text-slate-900">{monteCarloStats.coverageBreakdown?.fijos || 0} partidos</strong>
                  </div>
                  <div className="flex justify-between items-center text-slate-700 font-medium">
                    <span className="flex items-center gap-1.5 text-slate-600">
                      <span className="w-2.5 h-2.5 rounded-full bg-amber-500" /> Dobles (2 signos):
                    </span>
                    <strong className="text-slate-900">{monteCarloStats.coverageBreakdown?.dobles || 0} partidos</strong>
                  </div>
                  <div className="flex justify-between items-center text-slate-700 font-medium">
                    <span className="flex items-center gap-1.5 text-slate-600">
                      <span className="w-2.5 h-2.5 rounded-full bg-purple-500" /> Triples (100% cubiertos):
                    </span>
                    <strong className="text-slate-900">{monteCarloStats.coverageBreakdown?.triples || 0} partidos</strong>
                  </div>
                </div>
              </div>
            </div>

            {/* Category Breakdown Table */}
            {monteCarloStats.categoryWinProbabilities && (
              <div className="bg-white rounded-xl border border-emerald-100 p-3 overflow-x-auto space-y-2">
                <div className="text-[11px] font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1">
                  <Award className="w-3.5 h-3.5 text-emerald-600" />
                  Estimación de Premios por Categoría (Conjunto de Apuestas)
                </div>
                <table className="w-full text-xs text-left">
                  <thead>
                    <tr className="border-b border-slate-100 text-slate-400 font-semibold text-[10px] uppercase">
                      <th className="py-1">Categoría</th>
                      <th className="py-1 text-center">Prob. Obtener ≥1 Boleto</th>
                      <th className="py-1 text-right">Boletos Esperados</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50 font-medium text-slate-700">
                    {[15, 14, 13, 12, 11, 10].map((cat) => {
                      const prob = monteCarloStats.categoryWinProbabilities?.[cat] || 0;
                      const expectedHits = monteCarloStats.expectedCategoryHits?.[cat] || 0;
                      return (
                        <tr key={cat} className="hover:bg-slate-50/80">
                          <td className="py-1.5 flex items-center gap-1.5 font-bold text-slate-800">
                            {cat === 15 ? 'Pleno al 15' : `${cat} Aciertos`}
                          </td>
                          <td className="py-1.5 text-center font-bold text-emerald-600">
                            {prob < 0.01 && prob > 0 ? '< 0.01%' : `${prob.toFixed(2)}%`}
                          </td>
                          <td className="py-1.5 text-right font-semibold text-slate-600">
                            {expectedHits < 0.01 && expectedHits > 0 ? '< 0.01' : expectedHits.toFixed(2)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Card 3: Monte Carlo Raw Metrics */}
          <div className="bg-indigo-50/70 border border-indigo-200 rounded-2xl p-4 space-y-3">
            <div className="flex items-center justify-between border-b border-indigo-100 pb-2">
              <div className="flex items-center gap-2 font-bold text-indigo-900 text-sm">
                <Dices className="w-4 h-4 text-indigo-600" />
                Simulación Monte Carlo ({monteCarloStats.simulations.toLocaleString()} iteraciones)
              </div>
              <span className="text-[10px] font-bold bg-indigo-200 text-indigo-800 px-2 py-0.5 rounded-full">
                Real-time
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="bg-white p-2.5 rounded-xl border border-indigo-100">
                <div className="text-indigo-400 font-semibold text-[10px] uppercase">Boletos Premiados Medios</div>
                <div className="text-lg font-bold text-indigo-950 mt-0.5">
                  {monteCarloStats.mean.toFixed(2)} <span className="text-xs font-normal text-slate-500">boletos</span>
                </div>
              </div>

              <div className="bg-white p-2.5 rounded-xl border border-indigo-100">
                <div className="text-indigo-400 font-semibold text-[10px] uppercase">Desviación Típica (σ)</div>
                <div className="text-lg font-bold text-indigo-950 mt-0.5">
                  ±{monteCarloStats.stdDev.toFixed(2)}
                </div>
              </div>

              <div className="bg-white p-2.5 rounded-xl border border-indigo-100 col-span-2 flex justify-between items-center">
                <div>
                  <div className="text-indigo-400 font-semibold text-[10px] uppercase">Intervalo de Confianza (P10 - P90)</div>
                  <div className="text-sm font-bold text-indigo-900">
                    {monteCarloStats.p10} a {monteCarloStats.p90} boletos premiados (≥10 aciertos)
                  </div>
                </div>
                <BarChart2 className="w-5 h-5 text-indigo-400" />
              </div>
            </div>
          </div>
        </div>
      )}

      {tickets.length > 0 && (
        <div className="p-4 bg-emerald-50 text-emerald-700 rounded-xl flex items-start gap-3 text-sm border border-emerald-200">
          <CheckCircle2 className="w-5 h-5 flex-shrink-0 mt-0.5 text-emerald-600" />
          <p className="text-xs text-emerald-800">
            Las columnas han sido optimizadas para maximizar la esperanza matemática y adaptarse al algoritmo seleccionado. 
            El archivo TXT es 100% compatible con Loterías y Apuestas del Estado y EduardoLosilla.es.
          </p>
        </div>
      )}
    </div>
  );
}
