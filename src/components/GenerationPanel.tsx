import React from 'react';
import { Settings, Download, Calculator, CheckCircle2 } from 'lucide-react';
import { GeneratedTicket } from '../types';

interface GenerationPanelProps {
  tickets: GeneratedTicket[];
  isGenerating: boolean;
  onGenerate: () => void;
  onDownload: () => void;
  budget: number;
}

export function GenerationPanel({ tickets, isGenerating, onGenerate, onDownload, budget }: GenerationPanelProps) {
  const cost = (tickets.length * 0.75).toFixed(2);
  const isWithinBudget = parseFloat(cost) <= budget;

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 flex flex-col h-full">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center">
          <Calculator className="w-5 h-5 text-emerald-600" />
        </div>
        <div>
          <h3 className="font-bold text-lg text-slate-800">Generación y Descarga</h3>
          <p className="text-sm text-slate-500">Genera las columnas y exporta en formato txt</p>
        </div>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center py-8">
        <div className="text-center mb-8">
          <div className="text-5xl font-extrabold text-slate-800 mb-2">{tickets.length}</div>
          <div className="text-sm font-medium text-slate-500 uppercase tracking-wider">Columnas Generadas</div>
        </div>

        <div className={`text-2xl font-bold mb-8 ${isWithinBudget ? 'text-emerald-600' : 'text-red-600'}`}>
          Coste Total: {cost} €
        </div>

        <button
          onClick={onGenerate}
          disabled={isGenerating}
          className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-medium py-3 px-8 rounded-xl transition-colors mb-4 flex items-center justify-center gap-2"
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

      {tickets.length > 0 && (
        <div className="mt-6 p-4 bg-emerald-50 text-emerald-700 rounded-xl flex items-start gap-3 text-sm">
          <CheckCircle2 className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <p>
            Las columnas han sido optimizadas para maximizar la esperanza matemática y adaptarse al algoritmo seleccionado. 
            El archivo TXT es 100% compatible con Loterías y Apuestas del Estado y EduardoLosilla.es.
          </p>
        </div>
      )}
    </div>
  );
}
