import { Matchday, Match } from '../types';
import { calculateTrueProbabilities } from './probabilities';
import { findBestMatch } from './fuzzy';

const SELAE_FECHAS_URL = '/api/selae/fechas';
const SELAE_PROXIMOS_URL = '/api/selae/proximos';
const SELAE_HISTORICO_URL = '/api/selae/historico';
import { fuseProbabilities } from './probabilities';

export async function enrichMatchesWithNews(matches: Match[]): Promise<Match[]> {
  const enriched = [...matches];
  
  // To avoid hammering the API, process in chunks
  for (let i = 0; i < enriched.length; i++) {
    const m = enriched[i];
    
    try {
      const resHome = await fetch(`/api/bajas/${encodeURIComponent(m.homeTeam)}`);
      const dataHome = await resHome.json();
      
      const resAway = await fetch(`/api/bajas/${encodeURIComponent(m.awayTeam)}`);
      const dataAway = await resAway.json();
      
      m.bajasHome = { 
        confirmadas: dataHome.bajas_confirmadas || [], 
        dudas: dataHome.dudas || [],
        sancionados: dataHome.sancionados || [] 
      };
      
      m.bajasAway = { 
        confirmadas: dataAway.bajas_confirmadas || [], 
        dudas: dataAway.dudas || [],
        sancionados: dataAway.sancionados || [] 
      };
      
      m.trueProbabilities = fuseProbabilities(
        calculateTrueProbabilities(m.odds),
        m.statsOdds,
        m.bajasHome,
        m.bajasAway
      );
    } catch (e) {
      console.warn('Error enriching match', m.id, e);
    }
  }
  
  return enriched;
}

export async function fetchOddsData(): Promise<any[]> {
  let realOddsData: any[] = [];
  try {
    await fetch('/api/status/update', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ source: 'The Odds API', status: 'pending' })
    }).catch(console.error);

    const oddsRes = await fetch('/api/odds');
    if (oddsRes.ok) {
      const oddsJson = await oddsRes.json();
      if (oddsJson.success) {
        realOddsData = oddsJson.data;
        await fetch('/api/status/update', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ source: 'The Odds API', status: 'success' })
        }).catch(console.error);
      } else {
        throw new Error(oddsJson.error || 'Error al obtener cuotas');
      }
    } else {
      throw new Error(`Error HTTP: ${oddsRes.status}`);
    }
  } catch (e) {
    console.warn("Could not fetch real odds", e);
    await fetch('/api/status/update', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ source: 'The Odds API', status: 'error', error: e instanceof Error ? e.message : 'Error desconocido' })
    }).catch(console.error);
  }
  return realOddsData;
}

export async function fetchSELAEData(): Promise<Matchday[]> {
  try {
    const matchdays: Matchday[] = [];
    
    // 0. Fetch real odds from The Odds API (direct client-side or via proxy)
    let realOddsData: any[] = await fetchOddsData();

    // 1. Fetch current matchday
    const proximosRes = await fetch(SELAE_PROXIMOS_URL, {
      headers: { 'Accept': 'application/json' }
    });
    
    if (!proximosRes.ok) {
      throw new Error(`Error de SELAE: ${proximosRes.status}`);
    }
    
    const proximosData = await proximosRes.json();
    let currentSorteoDate = '';

    if (proximosData && proximosData.length > 0) {
      const activeData = proximosData[0];
      currentSorteoDate = activeData.fecha_sorteo || activeData.fecha;
      
      const realMatches: Match[] = activeData.partidos.map((p: any, index: number) => {
        let odds = { 1: 2.50, X: 3.00, 2: 2.50 }; // Mock odds for now fallback
        
        // Match with realOddsData using Fuzzy Matching
        if (realOddsData.length > 0) {
           const selaeLocal = p.local || `Equipo Local ${index + 1}`;
           const selaeVisitante = p.visitante || `Equipo Visitante ${index + 1}`;
           
           const candidateLocals = realOddsData.map(r => r.local);
           const bestLocalMatch = findBestMatch(selaeLocal, candidateLocals);
           
           if (bestLocalMatch) {
             const realMatch = realOddsData.find(r => r.local === bestLocalMatch);
             if (realMatch && realMatch.cuotas && realMatch.cuotas['1']) {
               odds = {
                 1: parseFloat(realMatch.cuotas['1']),
                 X: parseFloat(realMatch.cuotas['X']),
                 2: parseFloat(realMatch.cuotas['2'])
               };
             }
           }
        }
        
        const statsOdds = p.porc1 !== undefined ? {
          1: p.porc1 / 100,
          X: p.porcX / 100,
          2: p.porc2 / 100
        } : undefined;

        // True probabilities son el resultado de la fusión (stats son más importantes si están disponibles)
        let trueProbabilities = calculateTrueProbabilities(odds);
        if (statsOdds) {
          trueProbabilities = {
            1: (trueProbabilities[1] * 0.4) + (statsOdds[1] * 0.6),
            X: (trueProbabilities.X * 0.4) + (statsOdds.X * 0.6),
            2: (trueProbabilities[2] * 0.4) + (statsOdds[2] * 0.6),
          };
        }

        return {
          id: index + 1,
          homeTeam: p.local || `Equipo Local ${index + 1}`,
          awayTeam: p.visitante || `Equipo Visitante ${index + 1}`,
          odds,
          statsOdds,
          trueProbabilities,
          selections: [],
          date: p.fecha || currentSorteoDate,
        };
      });

      matchdays.push({
        id: `selae-${activeData.jornada || activeData.id_sorteo}`,
        name: `Jornada ${activeData.jornada} (Próxima)`,
        status: 'upcoming',
        matches: realMatches,
      });
    }

    // 2. Fetch all dates
    try {
      const fechasRes = await fetch(SELAE_FECHAS_URL, {
        headers: { 'Accept': 'application/json' }
      });
      if (fechasRes.ok) {
        const fechasData = await fechasRes.json();
        if (Array.isArray(fechasData)) {
          // Find the index of the current matchday or just take the last 4 before today
          let pastFechas = [];
          
          if (currentSorteoDate) {
             const currentIndex = fechasData.findIndex(f => f.fecha_sorteo === currentSorteoDate || f.fecha === currentSorteoDate);
             if (currentIndex > 0) {
                // Get the 4 before it (arrays are usually chronologically sorted or reverse sorted)
                // Assuming reverse sorted (newest first)
                pastFechas = fechasData.slice(currentIndex + 1, currentIndex + 5);
                if (pastFechas.length === 0 && currentIndex >= 4) {
                  // If it was chronologically sorted
                  pastFechas = fechasData.slice(currentIndex - 4, currentIndex);
                }
             } else {
                pastFechas = fechasData.slice(0, 4);
             }
          } else {
             pastFechas = fechasData.slice(0, 4);
          }
          
          for (const item of pastFechas) {
            const dateStr = typeof item === 'string' ? item : (item.fecha_sorteo || item.fecha);
            if (dateStr) {
               // Fetch historical data for this date
               const histRes = await fetch(`${SELAE_HISTORICO_URL}?fecha=${dateStr}`, {
                 headers: { 'Accept': 'application/json' }
               });
               if (histRes.ok) {
                 const histData = await histRes.json();
                 if (histData && histData.length > 0) {
                   const h = histData[0];
                   const matches: Match[] = h.partidos.map((p: any, index: number) => {
                     const odds = { 1: 2.50, X: 3.00, 2: 2.50 }; 
                     return {
                        id: index + 1,
                        homeTeam: p.local,
                        awayTeam: p.visitante,
                        odds,
                        trueProbabilities: calculateTrueProbabilities(odds),
                        selections: [],
                        date: p.fecha || dateStr,
                        result: p.signo // Historical matches have results
                     };
                   });
                   matchdays.push({
                     id: `selae-${h.jornada || h.id_sorteo}`,
                     name: `Jornada ${h.jornada} (Completada)`,
                     status: 'completed',
                     matches
                   });
                 }
               }
            }
          }
        }
      }
    } catch (e) {
      console.warn("No se pudo obtener el historial:", e);
    }

    // Sort by id/jornada
    matchdays.sort((a, b) => {
      const aId = parseInt(a.id.replace('selae-', '')) || 0;
      const bId = parseInt(b.id.replace('selae-', '')) || 0;
      return aId - bId;
    });

    return matchdays;

  } catch (error) {
    console.error('SELAE Fetch Error:', error);
    throw new Error('No se pudo conectar a los servidores de SELAE. Verifica tu conexión o posibles bloqueos de CORS.');
  }
}

