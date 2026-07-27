import React from 'react';
import { GeneratedTicket } from '../types';
import { exportToTXT } from '../lib/export';
import { Download, CheckCircle2 } from 'lucide-react';

interface Props {
  tickets: GeneratedTicket[];
}

export const ResultsTable: React.FC<Props> = ({ tickets }) => {
  if (tickets.length === 0) return null;

  const totalCost = tickets.length * 0.75;
  
  // Calculate average prob
  const avgProb = tickets.reduce((sum, t) => sum + t.probability, 0) / tickets.length;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col h-full max-h-[800px]">
      <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="w-5 h-5 text-emerald-500" />
          <h2 className="text-lg font-semibold text-slate-800">
            Resultados: {tickets.length} Apuestas
          </h2>
        </div>
        <button
          onClick={() => exportToTXT(tickets)}
          className="flex items-center gap-2 bg-slate-800 hover:bg-slate-900 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
        >
          <Download className="w-4 h-4" />
          Exportar TXT (.txt)
        </button>
      </div>

      <div className="grid grid-cols-2 gap-4 p-4 bg-white border-b border-slate-100">
        <div className="p-3 bg-blue-50 rounded-lg">
          <p className="text-xs text-blue-600 font-semibold uppercase tracking-wider mb-1">Coste Total LAE</p>
          <p className="text-2xl font-bold text-blue-900">{totalCost.toFixed(2)} €</p>
        </div>
        <div className="p-3 bg-purple-50 rounded-lg">
          <p className="text-xs text-purple-600 font-semibold uppercase tracking-wider mb-1">Probabilidad Media (Boleto)</p>
          <p className="text-2xl font-bold text-purple-900">{(avgProb * 100000).toFixed(4)}e-5</p>
        </div>
      </div>

      <div className="overflow-y-auto flex-1 p-0">
        <table className="w-full text-sm text-left">
          <thead className="bg-slate-50 text-slate-600 font-medium sticky top-0 z-10 shadow-sm">
            <tr>
              <th className="px-4 py-2">ID</th>
              <th className="px-4 py-2 font-mono">Combinación (1-15)</th>
              <th className="px-4 py-2 text-right">Probabilidad Real</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {tickets.map((ticket, index) => (
              <tr key={ticket.id} className="hover:bg-slate-50">
                <td className="px-4 py-2 text-slate-400">#{index + 1}</td>
                <td className="px-4 py-2">
                  <div className="flex gap-1 font-mono">
                    {ticket.picks.map((pick, i) => (
                      <span 
                        key={i} 
                        className={`inline-flex items-center justify-center w-5 h-5 rounded-sm text-xs font-bold ${
                          pick === '1' ? 'bg-blue-100 text-blue-700' :
                          pick === 'X' ? 'bg-amber-100 text-amber-700' :
                          'bg-emerald-100 text-emerald-700'
                        }`}
                      >
                        {pick}
                      </span>
                    ))}
                  </div>
                </td>
                <td className="px-4 py-2 text-right text-slate-600 font-mono text-xs">
                  {(ticket.probability * 100).toFixed(7)}%
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
