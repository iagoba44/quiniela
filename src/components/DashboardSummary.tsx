import React, { useMemo } from 'react';
import { GeneratedTicket, Match } from '../types';
import { TrendingUp, Target, Coins, Zap } from 'lucide-react';

interface DashboardSummaryProps {
  tickets: GeneratedTicket[];
  matches: Match[];
}

export function DashboardSummary({ tickets, matches }: DashboardSummaryProps) {
  const stats = useMemo(() => {
    if (!tickets.length || !matches.length) {
      return { avgEv: 0, cost: 0, avgProb: 0, maxEv: 0 };
    }

    let totalEv = 0;
    let maxEv = 0;
    let totalProb = 0;

    for (const ticket of tickets) {
      let ticketEv = 1;
      let ticketProb = 1;

      for (let i = 0; i < matches.length; i++) {
        const match = matches[i];
        // Ensure we only process picks that we have matches for
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

    return {
      avgEv: totalEv / tickets.length,
      maxEv: maxEv,
      avgProb: totalProb / tickets.length,
      cost: tickets.length * 0.75
    };
  }, [tickets, matches]);

  if (!tickets.length) return null;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-8 h-8 bg-blue-50 text-blue-600 rounded-lg flex items-center justify-center">
            <Coins className="w-4 h-4" />
          </div>
          <p className="text-sm font-medium text-slate-500">Inversión</p>
        </div>
        <p className="text-2xl font-bold text-slate-800">{stats.cost.toFixed(2)} €</p>
        <p className="text-xs text-slate-400 mt-1">{tickets.length} apuestas generadas</p>
      </div>

      <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-8 h-8 bg-emerald-50 text-emerald-600 rounded-lg flex items-center justify-center">
            <Target className="w-4 h-4" />
          </div>
          <p className="text-sm font-medium text-slate-500">Prob. Media (14)</p>
        </div>
        <p className="text-2xl font-bold text-slate-800">
          {(stats.avgProb * 100).toFixed(4)}%
        </p>
        <p className="text-xs text-slate-400 mt-1">Por columna jugada</p>
      </div>

      <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-8 h-8 bg-indigo-50 text-indigo-600 rounded-lg flex items-center justify-center">
            <TrendingUp className="w-4 h-4" />
          </div>
          <p className="text-sm font-medium text-slate-500">EV Medio (Rentabilidad)</p>
        </div>
        <p className={`text-2xl font-bold ${stats.avgEv > 1 ? 'text-emerald-600' : 'text-rose-600'}`}>
          {stats.avgEv.toFixed(2)}x
        </p>
        <p className="text-xs text-slate-400 mt-1">
          {stats.avgEv > 1 ? 'Esperanza matemática positiva' : 'Esperanza matemática negativa'}
        </p>
      </div>

      <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-8 h-8 bg-amber-50 text-amber-600 rounded-lg flex items-center justify-center">
            <Zap className="w-4 h-4" />
          </div>
          <p className="text-sm font-medium text-slate-500">EV Máximo</p>
        </div>
        <p className="text-2xl font-bold text-slate-800">
          {stats.maxEv.toFixed(2)}x
        </p>
        <p className="text-xs text-slate-400 mt-1">La apuesta más rentable</p>
      </div>
    </div>
  );
}
