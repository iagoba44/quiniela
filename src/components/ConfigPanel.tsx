import React from 'react';
import { TicketSettings } from '../types';
import { Settings, Filter, RefreshCw, BarChart2, Coins } from 'lucide-react';

interface Props {
  settings: TicketSettings;
  setSettings: (s: TicketSettings) => void;
  onGenerate: () => void;
  isGenerating?: boolean;
}

export const ConfigPanel: React.FC<Props> = ({ settings, setSettings, onGenerate, isGenerating }) => {
  const handleChange = (field: keyof TicketSettings, value: any) => {
    setSettings({ ...settings, [field]: value });
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
      <div className="flex items-center gap-2 mb-6">
        <Settings className="w-5 h-5 text-blue-600" />
        <h2 className="text-lg font-semibold text-slate-800">Configuración del Motor</h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Algoritmo de Generación</label>
            <div className="relative">
              <select
                className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg appearance-none focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                value={settings.algorithm}
                onChange={(e) => handleChange('algorithm', e.target.value)}
              >
                <option value="reduction">Reducción al 13 (Greedy Distance)</option>
                <option value="ev">Esperanza Matemática (EV Pura)</option>
                <option value="montecarlo">Cobertura Probabilística (Monte Carlo)</option>
                <option value="filters">Filtros Estadísticos (Condicionada)</option>
              </select>
              <RefreshCw className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Presupuesto Objetivo (Apuestas)
            </label>
            <div className="flex items-center gap-4">
              <input
                type="range"
                min="1"
                max="5000"
                step="1"
                className="flex-1 h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer"
                value={settings.budget}
                onChange={(e) => handleChange('budget', parseInt(e.target.value))}
              />
              <div className="w-24 px-3 py-1 bg-slate-100 border border-slate-200 rounded text-center font-mono text-slate-700">
                {settings.budget}
              </div>
            </div>
            <p className="text-xs text-slate-500 mt-2">
              Coste total estimado: <strong className="text-emerald-600">{(settings.budget * 0.75).toFixed(2)} €</strong>
            </p>
          </div>
        </div>

        <div className="space-y-4 bg-slate-50 p-4 rounded-lg border border-slate-100">
          <div className="flex items-center gap-2 mb-2">
            <Filter className="w-4 h-4 text-slate-600" />
            <h3 className="text-sm font-semibold text-slate-700">Filtros Activos (Alg. 1 y 4)</h3>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-slate-500 mb-1">Rango de Variantes (X, 2)</label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="0" max="15"
                  className="w-full px-2 py-1 text-sm border border-slate-200 rounded"
                  value={settings.minVariants}
                  onChange={(e) => handleChange('minVariants', parseInt(e.target.value))}
                />
                <span className="text-slate-400">-</span>
                <input
                  type="number"
                  min="0" max="15"
                  className="w-full px-2 py-1 text-sm border border-slate-200 rounded"
                  value={settings.maxVariants}
                  onChange={(e) => handleChange('maxVariants', parseInt(e.target.value))}
                />
              </div>
            </div>

            <div>
              <label className="block text-xs text-slate-500 mb-1">Rango de Equis (X)</label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="0" max="15"
                  className="w-full px-2 py-1 text-sm border border-slate-200 rounded"
                  value={settings.minX}
                  onChange={(e) => handleChange('minX', parseInt(e.target.value))}
                />
                <span className="text-slate-400">-</span>
                <input
                  type="number"
                  min="0" max="15"
                  className="w-full px-2 py-1 text-sm border border-slate-200 rounded"
                  value={settings.maxX}
                  onChange={(e) => handleChange('maxX', parseInt(e.target.value))}
                />
              </div>
            </div>
            
             <div>
              <label className="block text-xs text-slate-500 mb-1">Rango de Doses (2)</label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="0" max="15"
                  className="w-full px-2 py-1 text-sm border border-slate-200 rounded"
                  value={settings.min2}
                  onChange={(e) => handleChange('min2', parseInt(e.target.value))}
                />
                <span className="text-slate-400">-</span>
                <input
                  type="number"
                  min="0" max="15"
                  className="w-full px-2 py-1 text-sm border border-slate-200 rounded"
                  value={settings.max2}
                  onChange={(e) => handleChange('max2', parseInt(e.target.value))}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-8 pt-6 border-t border-slate-100 flex justify-end">
        <button
          onClick={onGenerate}
          disabled={isGenerating}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-lg font-medium transition-colors disabled:opacity-70 disabled:cursor-not-allowed"
        >
          {isGenerating ? (
            <RefreshCw className="w-5 h-5 animate-spin" />
          ) : (
            <Coins className="w-5 h-5" />
          )}
          {isGenerating ? 'Generando...' : 'Generar Combinaciones'}
        </button>
      </div>
    </div>
  );
};
