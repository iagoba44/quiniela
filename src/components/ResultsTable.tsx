import React, { useState } from 'react';
import { GeneratedTicket } from '../types';
import { exportToTXT, exportToExcel } from '../lib/export';
import { Download, CheckCircle2, FileSpreadsheet, ChevronLeft, ChevronRight } from 'lucide-react';

interface Props {
  tickets: GeneratedTicket[];
}

export const ResultsTable: React.FC<Props> = ({ tickets }) => {
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 50;

  if (tickets.length === 0) return null;

  const totalCost = tickets.length * 0.75;
  const avgProb = tickets.reduce((sum, t) => sum + t.probability, 0) / tickets.length;

  const totalPages = Math.ceil(tickets.length / pageSize);
  const displayedTickets = tickets.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col h-full max-h-[800px]">
      <div className="p-4 border-b border-slate-200 bg-slate-50 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="w-5 h-5 text-emerald-500" />
          <h2 className="text-lg font-semibold text-slate-800">
            Resultados: {tickets.length} Apuestas
          </h2>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => exportToTXT(tickets)}
            className="flex items-center gap-2 bg-slate-800 hover:bg-slate-900 text-white px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
          >
            <Download className="w-4 h-4" />
            Exportar TXT (.txt)
          </button>
          <button
            onClick={() => exportToExcel(tickets)}
            className="flex items-center gap-2 bg-emerald-700 hover:bg-emerald-800 text-white px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
          >
            <FileSpreadsheet className="w-4 h-4" />
            Exportar Excel (.csv)
          </button>
        </div>
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
            {displayedTickets.map((ticket, index) => {
              const globalIdx = (currentPage - 1) * pageSize + index + 1;
              return (
                <tr key={ticket.id} className="hover:bg-slate-50">
                  <td className="px-4 py-2 text-slate-400">#{globalIdx}</td>
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
              );
            })}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="p-3 border-t border-slate-200 bg-slate-50 flex items-center justify-between text-xs text-slate-600">
          <span>
            Mostrando {((currentPage - 1) * pageSize) + 1} - {Math.min(currentPage * pageSize, tickets.length)} de {tickets.length}
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="p-1 rounded bg-white border border-slate-200 disabled:opacity-40"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span>Página {currentPage} de {totalPages}</span>
            <button
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="p-1 rounded bg-white border border-slate-200 disabled:opacity-40"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
