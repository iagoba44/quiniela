import React from 'react';
import { Match, Selection } from '../types';
import { calculateTrueProbabilities } from '../lib/probabilities';

interface Props {
  matches: Match[];
  updateMatch: (id: number, match: Match) => void;
}

export const MatchPanel: React.FC<Props> = ({ matches, updateMatch }) => {
  const handleSelectionToggle = (match: Match, selection: Selection) => {
    const newSelections = match.selections.includes(selection)
      ? match.selections.filter((s) => s !== selection)
      : [...match.selections, selection];
    updateMatch(match.id, { ...match, selections: newSelections });
  };

  const handleOddChange = (match: Match, key: '1' | 'X' | '2', value: string) => {
    const numValue = parseFloat(value);
    if (isNaN(numValue) || numValue <= 0) return;

    const newOdds = { ...match.odds, [key]: numValue };
    const newTrueProbs = calculateTrueProbabilities(newOdds);
    
    updateMatch(match.id, {
      ...match,
      odds: newOdds,
      trueProbabilities: newTrueProbs,
    });
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left">
          <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
            <tr>
              <th className="px-4 py-3">#</th>
              <th className="px-4 py-3">Partido</th>
              <th className="px-4 py-3 text-center" colSpan={3}>Cuotas (Decimales)</th>
              <th className="px-4 py-3 text-center" colSpan={3}>Probabilidad Neta</th>
              <th className="px-4 py-3 text-center">Pronóstico Base</th>
            </tr>
            <tr className="bg-slate-50 border-b border-slate-200 text-xs">
              <th colSpan={2}></th>
              <th className="px-2 py-2 text-center text-slate-400">1</th>
              <th className="px-2 py-2 text-center text-slate-400">X</th>
              <th className="px-2 py-2 text-center text-slate-400">2</th>
              <th className="px-2 py-2 text-center text-slate-400">1</th>
              <th className="px-2 py-2 text-center text-slate-400">X</th>
              <th className="px-2 py-2 text-center text-slate-400">2</th>
              <th></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {matches.map((match) => (
              <tr key={match.id} className="hover:bg-slate-50 transition-colors">
                <td className="px-4 py-3 font-medium text-slate-400">{match.id}</td>
                <td className="px-4 py-3 font-medium text-slate-800">
                  <div className="flex items-center gap-2">
                    <span className="flex-1 text-right">{match.homeTeam}</span>
                    {(match.bajasHome?.confirmadas?.length || 0) + (match.bajasHome?.sancionados?.length || 0) > 0 ? (
                      <span className="text-[10px] bg-red-100 text-red-700 px-1.5 py-0.5 rounded font-bold" title="Bajas afectan cuotas">-{Math.min(8, ((match.bajasHome?.confirmadas?.length || 0) + (match.bajasHome?.sancionados?.length || 0)) * 1.5).toFixed(1)}%</span>
                    ) : null}
                    <span className="text-slate-400">-</span>
                    {(match.bajasAway?.confirmadas?.length || 0) + (match.bajasAway?.sancionados?.length || 0) > 0 ? (
                      <span className="text-[10px] bg-red-100 text-red-700 px-1.5 py-0.5 rounded font-bold" title="Bajas afectan cuotas">-{Math.min(8, ((match.bajasAway?.confirmadas?.length || 0) + (match.bajasAway?.sancionados?.length || 0)) * 1.5).toFixed(1)}%</span>
                    ) : null}
                    <span className="flex-1">{match.awayTeam}</span>
                  </div>
                </td>
                
                {/* Cuotas Editables */}
                {(['1', 'X', '2'] as const).map((key) => (
                  <td key={`odd-${key}`} className="px-1 py-2 align-middle">
                    <input
                      type="number"
                      step="0.01"
                      min="1.01"
                      className="w-16 p-1 text-center border border-slate-200 rounded text-slate-700 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                      value={match.odds[key]}
                      onChange={(e) => handleOddChange(match, key, e.target.value)}
                    />
                  </td>
                ))}

                {/* Probabilidades Netas */}
                {(['1', 'X', '2'] as const).map((key) => (
                  <td key={`prob-${key}`} className="px-2 py-3 text-center align-middle">
                    <div className="flex flex-col items-center gap-1">
                      <span className="inline-block px-2 py-1 bg-blue-50 text-blue-700 rounded text-xs font-medium">
                      {(match.trueProbabilities[key] * 100).toFixed(1)}%
                      </span>
                      {match.ev && match.ev[key] > 1 && (
                        <span className="text-[10px] text-green-600 font-bold" title="Esperanza Matemática Positiva">
                          EV: {match.ev[key].toFixed(2)}
                        </span>
                      )}
                    </div>
                  </td>
                ))}

                {/* Botones de Pronóstico */}
                <td className="px-4 py-2 align-middle">
                  <div className="flex justify-center gap-2 items-center">
                    {match.result && (
                       <span className="inline-block px-2 py-1 bg-green-100 text-green-800 rounded font-bold text-xs mr-2" title="Resultado Real">
                          Res: {match.result}
                       </span>
                    )}
                    <div className="flex justify-center gap-1">
                    {(['1', 'X', '2'] as const).map((sel) => {
                      const isSelected = match.selections.includes(sel);
                      return (
                        <button
                          key={sel}
                          onClick={() => handleSelectionToggle(match, sel)}
                          className={`w-8 h-8 rounded font-bold text-sm transition-all ${
                            isSelected 
                              ? 'bg-blue-600 text-white shadow-md' 
                              : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                          }`}
                        >
                          {sel}
                        </button>
                      );
                    })}
                  </div>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
