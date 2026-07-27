import React, { useState, useEffect } from 'react';
import { Stethoscope, AlertCircle, RefreshCw, UserMinus, ShieldAlert, FileWarning, Info } from 'lucide-react';
import { Match } from '../types';

interface BajasData {
  equipo: string;
  bajas_confirmadas: string[];
  dudas: string[];
  sancionados: string[];
  factor_penalizacion: number;
}

interface NewsPanelProps {
  matches: Match[];
}

export function NewsPanel({ matches }: NewsPanelProps) {
  const [selectedTeam, setSelectedTeam] = useState<string>('');
  const [bajas, setBajas] = useState<BajasData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Extract unique teams
  const teams = Array.from(new Set(matches.flatMap(m => [m.homeTeam, m.awayTeam]))).sort();

  useEffect(() => {
    if (!selectedTeam) return;

    const fetchBajas = async () => {
      setLoading(true);
      setError(null);
      setBajas(null);
      try {
        const res = await fetch(`/api/bajas/${encodeURIComponent(selectedTeam)}`);
        if (!res.ok) throw new Error('Error al obtener bajas');
        const data = await res.json();
        setBajas(data);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchBajas();
  }, [selectedTeam]);

  const teamsWithBajas = React.useMemo(() => {
    const list: BajasData[] = [];
    
    matches.forEach(m => {
      const homePenalty = Math.min(8, ((m.bajasHome?.confirmadas?.length || 0) + (m.bajasHome?.sancionados?.length || 0)) * 1.5) / 100 * -1;
      const awayPenalty = Math.min(8, ((m.bajasAway?.confirmadas?.length || 0) + (m.bajasAway?.sancionados?.length || 0)) * 1.5) / 100 * -1;

      if ((m.bajasHome?.confirmadas?.length || 0) > 0 || (m.bajasHome?.sancionados?.length || 0) > 0 || (m.bajasHome?.dudas?.length || 0) > 0) {
        list.push({
          equipo: m.homeTeam,
          bajas_confirmadas: m.bajasHome?.confirmadas || [],
          dudas: m.bajasHome?.dudas || [], 
          sancionados: m.bajasHome?.sancionados || [],
          factor_penalizacion: homePenalty
        });
      }
      if ((m.bajasAway?.confirmadas?.length || 0) > 0 || (m.bajasAway?.sancionados?.length || 0) > 0 || (m.bajasAway?.dudas?.length || 0) > 0) {
        list.push({
          equipo: m.awayTeam,
          bajas_confirmadas: m.bajasAway?.confirmadas || [],
          dudas: m.bajasAway?.dudas || [],
          sancionados: m.bajasAway?.sancionados || [],
          factor_penalizacion: awayPenalty
        });
      }
    });
    
    return list;
  }, [matches]);

  const BajasCard: React.FC<{ data: BajasData }> = ({ data }) => (
    <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm mb-4">
      <div className="flex justify-between items-center mb-3">
        <h4 className="font-bold text-slate-800 text-lg">{data.equipo}</h4>
        <span className={`font-bold px-2 py-1 rounded text-xs ${data.factor_penalizacion < 0 ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
          {(data.factor_penalizacion * 100).toFixed(1)}% Pen.
        </span>
      </div>
      
      <div className="space-y-2">
        {data.bajas_confirmadas.length > 0 && (
          <div>
            <h5 className="flex items-center gap-1.5 font-bold text-red-600 text-xs uppercase mb-1">
              <UserMinus className="w-3 h-3" /> Bajas Confirmadas
            </h5>
            <div className="flex flex-wrap gap-1">
              {data.bajas_confirmadas.map((j, i) => (
                <span key={i} className="bg-slate-100 text-slate-700 text-xs px-2 py-1 rounded-md">{j}</span>
              ))}
            </div>
          </div>
        )}
        
        {data.dudas.length > 0 && (
          <div>
            <h5 className="flex items-center gap-1.5 font-bold text-amber-600 text-xs uppercase mb-1 mt-2">
              <ShieldAlert className="w-3 h-3" /> Dudas
            </h5>
            <div className="flex flex-wrap gap-1">
              {data.dudas.map((j, i) => (
                <span key={i} className="bg-slate-100 text-slate-700 text-xs px-2 py-1 rounded-md">{j}</span>
              ))}
            </div>
          </div>
        )}

        {data.sancionados.length > 0 && (
          <div>
            <h5 className="flex items-center gap-1.5 font-bold text-slate-700 text-xs uppercase mb-1 mt-2">
              <FileWarning className="w-3 h-3" /> Sancionados
            </h5>
            <div className="flex flex-wrap gap-1">
              {data.sancionados.map((j, i) => (
                <span key={i} className="bg-slate-100 text-slate-700 text-xs px-2 py-1 rounded-md">{j}</span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 flex flex-col h-full">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center">
          <Stethoscope className="w-5 h-5 text-amber-600" />
        </div>
        <div>
          <h3 className="font-bold text-lg text-slate-800">Centro de Bajas y Sanciones</h3>
          <p className="text-sm text-slate-500">API-Football / FF / TSDB</p>
        </div>
      </div>

      <div className="mb-6">
        <label className="block text-sm font-semibold text-slate-700 mb-2">Consultar Equipo Específico</label>
        <select
          value={selectedTeam}
          onChange={(e) => setSelectedTeam(e.target.value)}
          className="w-full bg-slate-50 border border-slate-200 text-slate-900 text-sm rounded-xl focus:ring-amber-500 focus:border-amber-500 p-3"
        >
          <option value="">-- Ver todas las bajas detectadas --</option>
          {teams.map(t => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
      </div>

      <div className="flex-1 overflow-y-auto min-h-[300px] pr-2">
        {!selectedTeam && (
          <div className="h-full">
            <div className="mb-4 p-3 bg-blue-50 text-blue-700 rounded-xl flex items-start gap-3 text-sm">
               <Info className="w-5 h-5 flex-shrink-0 mt-0.5" />
               <p>
                 Mostrando las bajas y sanciones detectadas en los datos enriquecidos de la jornada actual. 
                 Si no ves datos, asegúrate de haber hecho clic en <strong>"Enriquecer Datos"</strong>.
               </p>
            </div>

            {teamsWithBajas.length > 0 ? (
              <div className="space-y-4">
                {teamsWithBajas.map((tb, idx) => <BajasCard key={idx} data={tb} />)}
              </div>
            ) : (
              <div className="h-[200px] flex flex-col items-center justify-center text-slate-400">
                <UserMinus className="w-12 h-12 mb-3 opacity-20" />
                <p>No hay datos de bajas registrados aún.</p>
              </div>
            )}
          </div>
        )}

        {loading && (
          <div className="h-full flex flex-col items-center justify-center text-slate-400">
            <RefreshCw className="w-8 h-8 mb-3 animate-spin text-amber-500" />
            <p>Consultando Orquestador en cascada...</p>
          </div>
        )}

        {error && (
          <div className="p-4 bg-red-50 text-red-600 rounded-xl flex items-start gap-3">
            <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <p className="text-sm">{error}</p>
          </div>
        )}

        {!loading && !error && bajas && selectedTeam && (
          <div className="space-y-4">
            <BajasCard data={bajas} />
          </div>
        )}
      </div>
    </div>
  );
}
