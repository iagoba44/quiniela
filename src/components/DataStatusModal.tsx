import React, { useEffect, useState } from 'react';
import { X, CheckCircle, XCircle, Clock, Activity, RefreshCw } from 'lucide-react';

interface SourceStatus {
  lastUpdate: string;
  status: 'success' | 'error' | 'pending';
  error?: string;
}

interface DataStatusModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const CATEGORY_MAP: Record<string, string[]> = {
  'Partidos': ['SELAE (Próximos)', 'SELAE (Histórico)'],
  'Probabilidades y Apuestas': ['The Odds API', 'Dataradar'],
  'Noticias, Plantillas y Lesiones': ['API-Football (Bajas)', 'FutbolFantasy (Bajas)', 'TheSportsDB (Bajas)'],
};

export function DataStatusModal({ isOpen, onClose }: DataStatusModalProps) {
  const [statuses, setStatuses] = useState<Record<string, SourceStatus>>({});

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isOpen) {
      const fetchStatus = () => {
        fetch('/api/status')
          .then(res => res.json())
          .then(data => setStatuses(data))
          .catch(console.error);
      }
      fetchStatus();
      interval = setInterval(fetchStatus, 2000);
    }
    return () => clearInterval(interval);
  }, [isOpen]);

  if (!isOpen) return null;

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
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between p-4 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <Activity className="w-5 h-5 text-blue-600" />
            <h3 className="font-bold text-slate-800">Estado de Fuentes de Datos</h3>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-slate-100 rounded-lg transition-colors text-slate-400">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="p-4 overflow-y-auto">
          {Object.entries(groupedStatuses).map(([category, items]) => {
            if (items.length === 0) return null;
            return (
              <div key={category} className="mb-6 last:mb-0">
                <h4 className="text-sm font-bold tracking-wider text-slate-400 uppercase mb-3">{category}</h4>
                <div className="space-y-3">
                  {items.map(([name, status]) => (
                    <div key={name} className="flex items-start justify-between p-3 border border-slate-100 rounded-xl hover:bg-slate-50 transition-colors">
                      <div>
                        <p className="font-semibold text-slate-700">{name}</p>
                        <div className="flex items-center gap-1.5 text-xs text-slate-500 mt-1">
                          <Clock className="w-3.5 h-3.5" />
                          <span>
                            {status.lastUpdate 
                              ? new Date(status.lastUpdate).toLocaleString() 
                              : 'Nunca ejecutado'}
                          </span>
                        </div>
                        {status.error && (
                          <p className="text-xs text-red-600 mt-1.5 bg-red-50 p-1.5 rounded">{status.error}</p>
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
            <p className="text-center text-slate-500 py-4">No hay datos de fuentes disponibles.</p>
          )}
        </div>
      </div>
    </div>
  );
}
