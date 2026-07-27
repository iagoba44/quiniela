import React, { useMemo } from 'react';
import { Match, GeneratedTicket } from '../types';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine
} from 'recharts';
import { BarChart2 } from 'lucide-react';

interface Props {
  matches: Match[];
  tickets: GeneratedTicket[];
}

export const DistributionChart: React.FC<Props> = ({ matches, tickets }) => {
  const chartData = useMemo(() => {
    if (tickets.length === 0) return [];

    return matches.map((match, index) => {
      let count1 = 0;
      let countX = 0;
      let count2 = 0;

      tickets.forEach((ticket) => {
        const pick = ticket.picks[index];
        if (pick === '1') count1++;
        if (pick === 'X') countX++;
        if (pick === '2') count2++;
      });

      const total = tickets.length;
      return {
        name: `M${match.id}`,
        fullTeamName: `${match.homeTeam} - ${match.awayTeam}`,
        'Gen 1': (count1 / total) * 100,
        'Real 1': match.trueProbabilities['1'] * 100,
        'Gen X': (countX / total) * 100,
        'Real X': match.trueProbabilities['X'] * 100,
        'Gen 2': (count2 / total) * 100,
        'Real 2': match.trueProbabilities['2'] * 100,
      };
    });
  }, [matches, tickets]);

  if (tickets.length === 0) return null;

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white p-3 border border-slate-200 shadow-lg rounded-lg text-sm">
          <p className="font-bold text-slate-800 mb-1">{data.fullTeamName}</p>
          <div className="grid grid-cols-3 gap-4">
             <div>
                <p className="font-semibold text-blue-600 border-b pb-1 mb-1">1</p>
                <p>Gen: {data['Gen 1'].toFixed(1)}%</p>
                <p className="text-slate-500 text-xs">Real: {data['Real 1'].toFixed(1)}%</p>
             </div>
             <div>
                <p className="font-semibold text-amber-600 border-b pb-1 mb-1">X</p>
                <p>Gen: {data['Gen X'].toFixed(1)}%</p>
                <p className="text-slate-500 text-xs">Real: {data['Real X'].toFixed(1)}%</p>
             </div>
             <div>
                <p className="font-semibold text-emerald-600 border-b pb-1 mb-1">2</p>
                <p>Gen: {data['Gen 2'].toFixed(1)}%</p>
                <p className="text-slate-500 text-xs">Real: {data['Real 2'].toFixed(1)}%</p>
             </div>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 mt-8">
      <div className="flex items-center gap-2 mb-6">
        <BarChart2 className="w-5 h-5 text-blue-600" />
        <h2 className="text-lg font-semibold text-slate-800">
          Distribución de Probabilidades: Generadas vs Reales
        </h2>
      </div>
      <div className="h-80 w-full text-sm">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={chartData}
            margin={{ top: 20, right: 30, left: 0, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
            <XAxis dataKey="name" tick={{ fill: '#64748b', fontSize: 12 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: '#64748b', fontSize: 12 }} axisLine={false} tickLine={false} unit="%" />
            <Tooltip content={<CustomTooltip />} />
            <Legend wrapperStyle={{ paddingTop: '20px', fontSize: '12px' }} />
            
            <Bar dataKey="Gen 1" name="Gen 1" fill="#3b82f6" radius={[4, 4, 0, 0]} maxBarSize={30} />
            <Bar dataKey="Gen X" name="Gen X" fill="#f59e0b" radius={[4, 4, 0, 0]} maxBarSize={30} />
            <Bar dataKey="Gen 2" name="Gen 2" fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={30} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
