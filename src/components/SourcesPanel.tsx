import React, { useEffect, useState, useCallback } from 'react';
import { CheckCircle, XCircle, Clock, Activity, RefreshCw, Database, FileText, Download, AlertTriangle } from 'lucide-react';
import { db, SourceHealth } from '../lib/db';
import { exportRawServicesToTXT, exportDatabaseToTXT } from '../lib/export';

const CATEGORY_MAP: Record<string, string[]> = {
  'Partidos': ['SELAE (Próximos)', 'SELAE (Histórico)'],
  'Probabilidades y Apuestas': ['The Odds API', 'Dataradar'],
  'Noticias, Plantillas y Lesiones': ['API-Football (Bajas)', 'FutbolFantasy (Bajas)', 'TheSportsDB (Bajas)'],
};

const ALL_KNOWN_SOURCES = [
  'SELAE (Próximos)',
  'SELAE (Histórico)',
  'The Odds API',
  'Dataradar',
  'API-Football (Bajas)',
  'FutbolFantasy (Bajas)',
  'TheSportsDB (Bajas)'
];

function formatTimeAgo(dateString?: string) {
  if (!dateString) return 'Nunca ejecutado';
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return 'Nunca ejecutado';
  
  const now = new Date();
  const diffInSeconds = Math.max(0, Math.floor((now.getTime() - date.getTime()) / 1000));

  if (diffInSeconds < 10) return 'hace unos segundos';
  if (diffInSeconds < 60) return `hace ${diffInSeconds} s`;
  if (diffInSeconds < 3600) return `hace ${Math.floor(diffInSeconds / 60)} min`;
  if (diffInSeconds < 86400) return `hace ${Math.floor(diffInSeconds / 3600)} h`;
  return `hace ${Math.floor(diffInSeconds / 86400)} d`;
}

export function SourcesPanel() {
  const [statuses, setStatuses] = useState<Record<string, SourceHealth>>({});
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastCheckTime, setLastCheckTime] = useState<string>('');

  const loadHealthFromDB = useCallback(async () => {
    try {
      // 1. Fetch from IndexedDB
      const dbHealth: Record<string, SourceHealth> = await db.getAllSourceHealth();
      
      // 2. Also poll backend /api/status to sync server-logged statuses into IndexedDB
      try {
        const res = await fetch('/api/status');
        if (res.ok) {
          const apiStatuses: Record<string, { lastUpdate: string; status: 'success' | 'error' | 'pending'; error?: string }> = await res.json();
          for (const [sourceName, info] of Object.entries(apiStatuses)) {
            if (info.status && info.lastUpdate) {
              const current = dbHealth[sourceName];
              if (!current || new Date(info.lastUpdate) > new Date(current.lastUpdate)) {
                await db.updateSourceHealth(sourceName, info.status, info.error);
                dbHealth[sourceName] = {
                  source: sourceName,
                  status: info.status,
                  lastUpdate: info.lastUpdate,
                  error: info.error
                };
              }
            }
          }
        }
      } catch (e) {
        // Ignorar si el endpoint backend falla de manera aislada
      }

      // Merge with default sources so all monitored sources are always visible
      const merged: Record<string, SourceHealth> = {};
      for (const sourceName of ALL_KNOWN_SOURCES) {
        merged[sourceName] = dbHealth[sourceName] || {
          source: sourceName,
          status: 'pending',
          lastUpdate: ''
        };
      }

      // Include any other sources in IndexedDB not in default list
      for (const [key, val] of Object.entries(dbHealth)) {
        if (!merged[key]) {
          merged[key] = val as SourceHealth;
        }
      }

      setStatuses(merged);
      setLastCheckTime(new Date().toLocaleTimeString());
    } catch (err) {
      console.error('Error cargando estado de IndexedDB:', err);
    }
  }, []);

  useEffect(() => {
    loadHealthFromDB();
  }, [loadHealthFromDB]);

  const handleManualCheck = async () => {
    setIsRefreshing(true);
    try {
      // Simular verificación e invocar actualizadores de salud
      for (const source of ALL_KNOWN_SOURCES) {
        await db.updateSourceHealth(source, 'pending');
      }
      await loadHealthFromDB();

      // Trigger actual on-demand refreshes
      try {
        const selRes = await fetch('/api/selae/proximos?refresh=true');
        if (selRes.ok) {
          await db.updateSourceHealth('SELAE (Próximos)', 'success');
        } else {
          await db.updateSourceHealth('SELAE (Próximos)', 'error', `HTTP ${selRes.status}`);
        }
      } catch (e) {
        await db.updateSourceHealth('SELAE (Próximos)', 'error', 'Error de red con SELAE');
      }

      try {
        const oddsRes = await fetch('/api/odds?refresh=true');
        if (oddsRes.ok) {
          await db.updateSourceHealth('The Odds API', 'success');
          await db.updateSourceHealth('Dataradar', 'success');
        } else {
          await db.updateSourceHealth('The Odds API', 'error', `HTTP ${oddsRes.status}`);
          await db.updateSourceHealth('Dataradar', 'error', `HTTP ${oddsRes.status}`);
        }
      } catch (e) {
        await db.updateSourceHealth('The Odds API', 'error', 'Error al conectar con cuotas');
        await db.updateSourceHealth('Dataradar', 'error', 'Error al conectar con Dataradar');
      }

      await loadHealthFromDB();
    } finally {
      setIsRefreshing(false);
    }
  };

  const groupedStatuses: Record<string, [string, SourceHealth][]> = {
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
    if (!groupedStatuses[foundCategory]) {
      groupedStatuses[foundCategory] = [];
    }
    groupedStatuses[foundCategory].push([name, status as SourceHealth]);
  });

  const sourceValues: SourceHealth[] = Object.values(statuses);
  const totalSources = sourceValues.length;
  const successCount = sourceValues.filter(s => s?.status === 'success').length;
  const errorCount = sourceValues.filter(s => s?.status === 'error').length;
  const pendingCount = sourceValues.filter(s => s?.status === 'pending').length;

  return (
    <div className="space-y-6">
      {/* Resumen de salud global */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-lg text-slate-800 flex items-center gap-2">
                Estado de Fuentes de Datos (IndexedDB)
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">
                  Persistente
                </span>
              </h3>
              <p className="text-sm text-slate-500">
                Monitoreo en tiempo real almacenado en el navegador local. Último chequeo: {lastCheckTime || 'Iniciando...'}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handleManualCheck}
              disabled={isRefreshing}
              className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white font-medium text-sm rounded-xl transition-all shadow-sm"
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
              Verificar fuentes
            </button>

            <button
              onClick={() => exportRawServicesToTXT()}
              className="inline-flex items-center justify-center gap-2 px-3.5 py-2 bg-slate-800 hover:bg-slate-900 text-white font-medium text-sm rounded-xl transition-all shadow-sm"
              title="Descargar archivo TXT con las respuestas sin procesar de cada API"
            >
              <FileText className="w-4 h-4 text-slate-300" />
              Datos Raw (.txt)
            </button>

            <button
              onClick={() => exportDatabaseToTXT()}
              className="inline-flex items-center justify-center gap-2 px-3.5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white font-medium text-sm rounded-xl transition-all shadow-sm"
              title="Descargar volcado completo de IndexedDB y persistencia"
            >
              <Download className="w-4 h-4 text-emerald-200" />
              Exportar BD (.txt)
            </button>
          </div>
        </div>

        {/* Métricas rápidas */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-100">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Total Fuentes</p>
            <p className="text-2xl font-extrabold text-slate-800 mt-1">{totalSources}</p>
          </div>
          <div className="p-4 rounded-xl bg-emerald-50/60 border border-emerald-100">
            <p className="text-xs font-semibold uppercase tracking-wider text-emerald-600 flex items-center gap-1">
              <CheckCircle className="w-3.5 h-3.5" /> Conectadas
            </p>
            <p className="text-2xl font-extrabold text-emerald-700 mt-1">{successCount}</p>
          </div>
          <div className="p-4 rounded-xl bg-amber-50/60 border border-amber-100">
            <p className="text-xs font-semibold uppercase tracking-wider text-amber-600 flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" /> Pendientes
            </p>
            <p className="text-2xl font-extrabold text-amber-700 mt-1">{pendingCount}</p>
          </div>
          <div className="p-4 rounded-xl bg-rose-50/60 border border-rose-100">
            <p className="text-xs font-semibold uppercase tracking-wider text-rose-600 flex items-center gap-1">
              <XCircle className="w-3.5 h-3.5" /> Con Error
            </p>
            <p className="text-2xl font-extrabold text-rose-700 mt-1">{errorCount}</p>
          </div>
        </div>
      </div>

      {/* Grid por categorías */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="flex items-center gap-2 p-4 border-b border-slate-100 bg-slate-50">
          <Activity className="w-5 h-5 text-blue-600" />
          <h3 className="font-bold text-slate-800">Conexiones Activas por Categoría</h3>
        </div>

        <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Object.entries(groupedStatuses).map(([category, items]) => {
            if (items.length === 0) return null;
            return (
              <div key={category} className="space-y-3">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <h4 className="text-xs font-bold tracking-wider text-slate-400 uppercase">{category}</h4>
                  <span className="text-xs text-slate-400 font-medium">{items.length} fuentes</span>
                </div>
                
                <div className="space-y-3">
                  {items.map(([name, status]) => {
                    const isSuccess = status.status === 'success';
                    const isError = status.status === 'error';
                    const isPending = status.status === 'pending';

                    return (
                      <div
                        key={name}
                        className={`p-4 border rounded-xl transition-all shadow-xs flex flex-col justify-between gap-2 ${
                          isSuccess
                            ? 'border-emerald-100 bg-emerald-50/20 hover:bg-emerald-50/40'
                            : isError
                            ? 'border-rose-100 bg-rose-50/20 hover:bg-rose-50/40'
                            : 'border-slate-200 bg-slate-50/30 hover:bg-slate-50'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className="font-semibold text-slate-800 text-sm flex items-center gap-2">
                              {name}
                            </p>
                            
                            <div className="flex items-center gap-1.5 text-xs text-slate-500 mt-1.5">
                              <Clock className="w-3.5 h-3.5 text-slate-400" />
                              <span>Última actualización:</span>
                              <span
                                className={`font-semibold ${
                                  isSuccess
                                    ? 'text-emerald-700'
                                    : isError
                                    ? 'text-rose-700'
                                    : 'text-amber-700'
                                }`}
                              >
                                {formatTimeAgo(status.lastUpdate)}
                              </span>
                            </div>
                          </div>

                          {/* Indicador de estado */}
                          <div className="flex items-center gap-1.5 flex-shrink-0">
                            {isSuccess && (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-700 border border-emerald-200">
                                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                                Operativo
                              </span>
                            )}
                            {isError && (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-100 text-rose-700 border border-rose-200">
                                <XCircle className="w-3.5 h-3.5 text-rose-600" />
                                Error
                              </span>
                            )}
                            {isPending && (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-700 border border-amber-200">
                                <RefreshCw className="w-3 h-3 text-amber-600 animate-spin" />
                                Pendiente
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Detalle de error si existe */}
                        {status.error && (
                          <div className="mt-2 text-xs text-rose-700 bg-rose-50 border border-rose-200/80 p-2 rounded-lg flex items-start gap-1.5">
                            <AlertTriangle className="w-4 h-4 text-rose-500 flex-shrink-0 mt-0.5" />
                            <span className="break-words">{status.error}</span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

