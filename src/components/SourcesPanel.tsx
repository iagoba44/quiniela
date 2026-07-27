import React, { useEffect, useState } from 'react';
import { CheckCircle, XCircle, Clock, Activity, RefreshCw } from 'lucide-react';
import { db } from '../lib/db';

interface SourceStatus {
  lastUpdate: string;
  status: 'success' | 'error' | 'pending';
  error?: string;
}

const CATEGORY_MAP: Record<string, string[]> = {
  'Partidos': ['SELAE (Próximos)', 'SELAE (Histórico)'],
  'Probabilidades y Apuestas': ['The Odds API', 'Dataradar'],
  'Noticias, Plantillas y Lesiones': ['API-Football (Bajas)', 'FutbolFantasy (Bajas)', 'TheSportsDB (Bajas)'],
};


function formatTimeAgo(dateString: string) {
  const date = new Date(dateString);
  const now = new Date();
  const diffInSeconds = Math.max(0, Math.floor((now.getTime() - date.getTime()) / 1000));

  if (diffInSeconds < 60) return 'hace unos segundos';
  if (diffInSeconds < 3600) return `hace ${Math.floor(diffInSeconds / 60)} min`;
  if (diffInSeconds < 86400) return `hace ${Math.floor(diffInSeconds / 3600)} h`;
  return `hace ${Math.floor(diffInSeconds / 86400)} días`;
}

export function SourcesPanel() {
  const [statuses, setStatuses] = useState<Record<string, SourceStatus>>({});

  useEffect(() => {
    let interval: NodeJS.Timeout;
    const fetchStatus = async () => {
      try {
        const data = await db.getAllSourceHealth();
        setStatuses(data as Record<string, SourceStatus>);
      } catch (err) {
        console.error(err);
      }
    }
    fetchStatus();
    interval = setInterval(fetchStatus, 2000);
    return () => clearInterval(interval);
  }, []);

  const groupedStatuses: Record<string, [string, SourceStatus][]> = {
    'Partidos': [],
    'Probabilidades y Apuestas': [],
    'Noticias, Plantillas y Lesiones': [],
    'Otros': []
  };

  Object.entries(statuses).forEach(([name, status]) => {
    let foundCategory = 'Otros';
    for (const [cat, sources] of Object.entries(CATEGORY_MAP)) {
      if (sources.includes(name)) {
        foundCategory = cat;
        break;
      }
    }
    groupedStatuses[foundCategory].push([name, status as SourceStatus]);
  });

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col">
      <div className="flex items-center gap-2 p-4 border-b border-slate-100 bg-slate-50">
        <Activity className="w-5 h-5 text-blue-600" />
        <h3 className="font-bold text-slate-800">Estado de Fuentes de Datos en Tiempo Real</h3>
      </div>
      
      <div className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {Object.entries(groupedStatuses).map(([category, items]) => {
          if (items.length === 0) return null;
          return (
            <div key={category} className="mb-4">
              <h4 className="text-sm font-bold tracking-wider text-slate-400 uppercase mb-3 border-b border-slate-100 pb-2">{category}</h4>
              <div className="space-y-3">
                {items.map(([name, status]) => (
                  <div key={name} className="flex items-start justify-between p-3 border border-slate-100 rounded-xl hover:bg-slate-50 transition-colors bg-white shadow-sm">
                    <div>
                      <p className="font-semibold text-slate-700 text-sm">{name}</p>
                      <div className="flex items-center gap-1.5 text-xs text-slate-500 mt-1">
                        <Clock className="w-3.5 h-3.5" />
                        <span className={status.status === 'success' ? 'text-green-600 font-medium' : status.status === 'error' ? 'text-red-600 font-medium' : 'text-amber-600 font-medium'}>
                          {status.lastUpdate ? formatTimeAgo(status.lastUpdate) : 'Nunca ejecutado'}
                        </span>
                      </div>
                      {status.error && (
                        <p className="text-xs text-red-600 mt-1.5 bg-red-50 p-1.5 rounded border border-red-100 break-words max-w-[200px]">{status.error}</p>
                      )}
                    </div>
                    <div className="flex-shrink-0">
                      {status.status === 'success' && <CheckCircle className="w-5 h-5 text-green-500" />}
                      {status.status === 'error' && <XCircle className="w-5 h-5 text-red-500" />}
                      {status.status === 'pending' && <RefreshCw className="w-5 h-5 text-amber-500 animate-spin" />}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
        {Object.keys(statuses).length === 0 && (
          <div className="col-span-full">
            <p className="text-center text-slate-500 py-8 bg-slate-50 rounded-xl border border-slate-100 border-dashed">No hay datos de fuentes disponibles.</p>
          </div>
        )}
      </div>
    </div>
  );
}
