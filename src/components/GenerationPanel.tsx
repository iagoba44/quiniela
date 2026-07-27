import React, { useMemo } from 'react';
import { Settings, Download, Calculator, CheckCircle2, Dices, BarChart2, ShieldCheck } from 'lucide-react';
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

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 flex flex-col h-full gap-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center">
          <Calculator className="w-5 h-5 text-emerald-600" />
        </div>
        <div>
          <h3 className="font-bold text-lg text-slate-800">Generación y Descarga</h3>
          <p className="text-sm text-slate-500">Genera las columnas y exporta en formato txt</p>
        </div>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center py-4">
        <div className="text-center mb-6">
          <div className="text-5xl font-extrabold text-slate-800 mb-2">{tickets.length}</div>
          <div className="text-sm font-medium text-slate-500 uppercase tracking-wider">Columnas Generadas</div>
        </div>

        <div className={`text-2xl font-bold mb-6 ${isWithinBudget ? 'text-emerald-600' : 'text-red-600'}`}>
          Coste Total: {cost} €
        </div>

        <button
          onClick={onGenerate}
          disabled={isGenerating}
          className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-medium py-3 px-8 rounded-xl transition-colors mb-3 flex items-center justify-center gap-2"
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

      {/* Monte Carlo Simulation Results Widget */}
      {monteCarloStats && (
        <div className="bg-indigo-50/70 border border-indigo-200 rounded-2xl p-4 space-y-3">
          <div className="flex items-center justify-between border-b border-indigo-100 pb-2">
            <div className="flex items-center gap-2 font-bold text-indigo-900 text-sm">
              <Dices className="w-4 h-4 text-indigo-600" />
              Simulación Monte Carlo (1.000 iteraciones)
            </div>
            <span className="text-[10px] font-bold bg-indigo-200 text-indigo-800 px-2 py-0.5 rounded-full">
              Real-time
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="bg-white p-2.5 rounded-xl border border-indigo-100">
              <div className="text-indigo-400 font-semibold text-[10px] uppercase">Aciertos Medios / Boleto</div>
              <div className="text-lg font-bold text-indigo-950 mt-0.5">
                {monteCarloStats.mean.toFixed(2)} <span className="text-xs font-normal text-slate-500">aciertos</span>
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
