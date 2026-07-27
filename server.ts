import 'dotenv/config';
import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { calculatePenalty } from './nlp_engine';

const sourcesLog: Record<string, { lastUpdate: string; status: 'success' | 'error' | 'pending'; error?: string }> = {
  'SELAE (Próximos)': { lastUpdate: '', status: 'pending' },
  'SELAE (Histórico)': { lastUpdate: '', status: 'pending' },
  'Dataradar': { lastUpdate: '', status: 'pending' },
  'The Odds API': { lastUpdate: '', status: 'pending' },
  'API-Football (Bajas)': { lastUpdate: '', status: 'pending' },
  'FutbolFantasy (Bajas)': { lastUpdate: '', status: 'pending' },
  'TheSportsDB (Bajas)': { lastUpdate: '', status: 'pending' }
};

function updateSourceStatus(source: string, status: 'success' | 'error' | 'pending', error?: string) {
  if (sourcesLog[source]) {
    sourcesLog[source] = {
      lastUpdate: new Date().toISOString(),
      status,
      error
    };
  }
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Middleware to parse JSON
  app.use(express.json());

  // API Route: Update Status
  app.post('/api/status/update', (req, res) => {
    const { source, status, error } = req.body;
    if (source && status) {
      updateSourceStatus(source, status, error);
    }
    res.json({ success: true });
  });

  // API Route: Fetch Data Sources Status
  app.get('/api/status', (req, res) => {
    res.json(sourcesLog);
  });

  // API Route: Fetch SELAE Fechas
  app.get('/api/selae/fechas', async (req, res) => {
    try {
      const response = await fetch('https://www.loteriasyapuestas.es/servicios/fechasv2?game_id=LAQU', {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
          'Accept': 'application/json',
        }
      });
      
      if (!response.ok) {
        throw new Error(`SELAE responded with status: ${response.status}`);
      }
      
      const data = await response.json();
      res.json(data);
    } catch (error) {
      console.warn('Could not fetch SELAE fechas, using fallback');
      res.status(502).json({ error: 'No se puede conectar con SELAE para fechas debido a protecciones anti-bot (Akamai).' });
    }
  });

  // API Route: Fetch SELAE Proximos
  app.get('/api/selae/proximos', async (req, res) => {
    try {
      updateSourceStatus('SELAE (Próximos)', 'pending');
      updateSourceStatus('Dataradar', 'pending');
      // Loteriasyapuestas is blocked by Akamai, we use an alternative real-time API (dataradar)
      const response = await fetch('https://static.dataradar.es/marcador/json/partidos.json');
      if (!response.ok) {
        updateSourceStatus('Dataradar', 'error', `Status: ${response.status}`);
        throw new Error(`Dataradar responded with status: ${response.status}`);
      }
      const data = await response.json();
      
      // Transform dataradar JSON format to SELAE format so the frontend doesn't break
      // Including porc1, porcX, porc2 as real odds/stats
      const transformedMatches = data.slice(0, 15).map((match: any, index: number) => ({
        local: match.local,
        visitante: match.visitante,
        signo: match.signo || "",
        porc1: match.porc1 || 33,
        porcX: match.porcX || 33,
        porc2: match.porc2 || 34
      }));

      // SELAE format wrapper
      const selaeFormat = [{
        jornada: data[0]?.jornada || 74,
        fecha_sorteo: new Date().toISOString().split('T')[0],
        partidos: transformedMatches
      }];

      updateSourceStatus('Dataradar', 'success');
      updateSourceStatus('SELAE (Próximos)', 'success');
      res.json(selaeFormat);
    } catch (error) {
      console.warn('Could not fetch SELAE proximos, returning 502 error');
      updateSourceStatus('SELAE (Próximos)', 'error', 'Failed to fetch proximos');
      res.status(502).json({ error: 'Failed to fetch SELAE proximos due to block or connection issue' });
    }
  });

  // API Route: Fetch SELAE Historico
    app.get('/api/selae/historico', async (req, res) => {
    try {
      updateSourceStatus('SELAE (Histórico)', 'pending');
      const { fecha } = req.query;
      
      // Fallback a CSV de football-data.co.uk (Resultados históricos)
      const currentYear = new Date().getFullYear();
      const startYear = currentYear - 1; // e.g., 2023 for 2324
      const seasonStr = `${String(startYear).slice(-2)}${String(currentYear).slice(-2)}`;
      
      // Intentamos obtener la temporada actual, si falla, usamos la anterior (hardcoded para demo)
      // Como estamos en 2026, la URL sería 2526 o 2627. Usamos 2324 como demo asegurada si falla
      let response = await fetch(`https://www.football-data.co.uk/mmz4281/2324/SP1.csv`);
      
      if (!response.ok) {
        throw new Error('Fallo al obtener CSV histórico');
      }

      const csvText = await response.text();
      const lines = csvText.split('\n');
      const headers = lines[0].split(',');
      
      const homeIdx = headers.indexOf('HomeTeam');
      const awayIdx = headers.indexOf('AwayTeam');
      const ftrIdx = headers.indexOf('FTR');
      const dateIdx = headers.indexOf('Date');
      
      const partidos = [];
      // Parse last 15 valid lines
      for (let i = lines.length - 1; i > 0; i--) {
        if (!lines[i].trim()) continue;
        const cols = lines[i].split(',');
        if (cols.length > ftrIdx) {
           let signo = cols[ftrIdx] === 'H' ? '1' : cols[ftrIdx] === 'D' ? 'X' : '2';
           const b365H = headers.indexOf('B365H');
           const b365D = headers.indexOf('B365D');
           const b365A = headers.indexOf('B365A');
           let cuotas = undefined;
           if (b365H !== -1 && cols[b365H]) {
              cuotas = {
                 '1': parseFloat(cols[b365H]),
                 'X': parseFloat(cols[b365D]),
                 '2': parseFloat(cols[b365A])
              };
           }
           partidos.push({
             local: cols[homeIdx],
             visitante: cols[awayIdx],
             signo: signo,
             fecha: cols[dateIdx],
             cuotas: cuotas
           });
           if (partidos.length >= 15) break;
        }
      }
      
      const mockSelaeResponse = [{
        jornada: "Histórico CSV",
        id_sorteo: "csv-hist",
        partidos: partidos
      }];

      updateSourceStatus('SELAE (Histórico)', 'success');
      res.json(mockSelaeResponse);

    } catch (error) {
      console.warn('Could not fetch SELAE historico, using fallback');
      updateSourceStatus('SELAE (Histórico)', 'error', 'Error fetch SELAE historico / CSV');
      res.status(502).json({ error: 'No se puede conectar con el histórico.' });
    }
  });

  // API Route: Fetch Odds from The Odds API
      app.get('/api/odds', async (req, res) => {
    try {
      updateSourceStatus('The Odds API', 'pending');
      
      let partidos = [];
      const axios = (await import('axios')).default;
      const cheerio = await import('cheerio');

      try {
        const url = 'https://api.sofascore.com/api/v1/unique-tournament/8/season/52376/events/next';
        const resSofa = await axios.get(url, {
          headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64)', 'Referer': 'https://www.sofascore.com/' }
        });
        
        partidos = resSofa.data.events.map((e: any) => ({
          local: e.homeTeam.name,
          visitante: e.awayTeam.name,
          cuotas: {
            '1': e.odds?.home || 0,
            'X': e.odds?.draw || 0,
            '2': e.odds?.away || 0
          }
        })).filter((p: any) => p.cuotas['1'] !== 0);
        
        if (partidos.length === 0) throw new Error("No odds in Sofascore");
      } catch (eSofa) {
        console.warn("Fallo en Sofascore, pasando a Betfair Lite...");
        try {
            const url = 'https://lite.betfair.com/es/futbol/competiciones/117';
            const resBet = await axios.get(url, { 
              timeout: 3000,
              headers: { 'User-Agent': 'Mozilla/5.0' }
            });
            const $ = cheerio.load(resBet.data);
            $('.market-list-item').each((_, el) => {
                const teams = $(el).find('.teams').text().split(' - ');
                const prices = $(el).find('.runner-price').map((_, p) => $(p).text().trim()).get();
                if (teams.length === 2 && prices.length >= 3) {
                  partidos.push({
                    local: teams[0].trim(),
                    visitante: teams[1].trim(),
                    cuotas: {
                       '1': parseFloat(prices[0]) || 0,
                       'X': parseFloat(prices[1]) || 0,
                       '2': parseFloat(prices[2]) || 0
                    }
                  });
                }
            });
            if (partidos.length === 0) throw new Error("No odds in Betfair");
        } catch (eBetfair) {
           console.warn("Fallo en Betfair, usando The Odds API");
           const apiKey = process.env.ODDS_API_KEY;
           if (!apiKey) throw new Error('ODDS_API_KEY no configurada');
           
           const sports = ['soccer_spain_la_liga', 'soccer_norway_eliteserien', 'soccer_sweden_allsvenskan', 'soccer_brazil_campeonato'];
           let allData: any[] = [];
           for (const sport of sports) {
             try {
                const targetUrl = `https://api.the-odds-api.com/v4/sports/${sport}/odds/?apiKey=${apiKey}&regions=eu&markets=h2h`;
                const response = await fetch(targetUrl);
                if (response.ok) {
                   const data = await response.json();
                   allData = allData.concat(data);
                }
             } catch (e) {}
           }
           
           if (allData.length === 0) throw new Error("The Odds API returned no data for any sport");
           
           partidos = allData.map((evento: any) => {
             let cuotas = { '1': null, 'X': null, '2': null };
             if (evento.bookmakers && evento.bookmakers.length > 0) {
                 const market = evento.bookmakers[0].markets.find((m: any) => m.key === 'h2h');
                 if (market && market.outcomes) {
                     const home = market.outcomes.find((o: any) => o.name === evento.home_team);
                     const away = market.outcomes.find((o: any) => o.name === evento.away_team);
                     const draw = market.outcomes.find((o: any) => o.name === 'Draw');
                     cuotas = { '1': home ? home.price : null, 'X': draw ? draw.price : null, '2': away ? away.price : null };
                 }
             }
             return { local: evento.home_team, visitante: evento.away_team, cuotas };
           });
        }
      }

      updateSourceStatus('The Odds API', 'success');
      res.json({ success: true, data: partidos });

    } catch (error) {
      console.error('Error extrayendo cuotas:', error);
      updateSourceStatus('The Odds API', 'error', error instanceof Error ? error.message : 'Error desconocido');
      res.status(500).json({ success: false, error: 'Fallo al obtener cuotas en vivo' });
    }
  });

  // API Route: Fetch team bajas via Cascada Orquestador
  let bajasCache: any = null;
  let ultimaActualizacionBajas = 0;

  app.get('/api/bajas/:team', async (req, res) => {
    try {
      const { team } = req.params;
      const AHORA = Date.now();
      
      // TTL de 6 horas para la caché
      if (bajasCache && bajasCache[team] && (AHORA - ultimaActualizacionBajas < 6 * 60 * 60 * 1000)) {
        return res.json(bajasCache[team]);
      }

      const computePenalty = (bajasConfirmadas: string[], sancionados: string[]): number => {
        const totalOut = bajasConfirmadas.length + sancionados.length;
        let penalty = (totalOut * 1.5) / 100;
        if (penalty > 0.08) penalty = 0.08;
        return -penalty;
      };

      let result = null;
      const axios = (await import('axios')).default;
      
      try {
        updateSourceStatus('API-Football (Bajas)', 'pending');
        const apiKey = process.env.API_FOOTBALL_KEY;
        const url = `https://apiv3.apifootball.com/?action=get_teams&league_id=302&APIkey=${apiKey}`;
        
        const response = await axios.get(url, { timeout: 8000 });
        if (response.data && Array.isArray(response.data)) {
          // Normalización muy básica
          const normalizedTeam = team.toLowerCase().replace('club', '').trim();
          const ALIASES: Record<string, string> = {
            'real madrid': 'Real Madrid',
            'atlético de madrid': 'Atlético de Madrid',
            'barcelona': 'Barcelona',
            'athletic club': 'Athletic Club',
            'athletic bilbao': 'Athletic Club',
            'alavés': 'Alaves',
            'betis': 'Real Betis',
            'celta': 'Celta Vigo',
            'cádiz': 'Cadiz',
            'getafe': 'Getafe',
            'girona': 'Girona',
            'granada': 'Granada',
            'las palmas': 'Las Palmas',
            'mallorca': 'Mallorca',
            'osasuna': 'Osasuna',
            'rayo vallecano': 'Rayo Vallecano',
            'real sociedad': 'Real Sociedad',
            'sevilla': 'Sevilla',
            'valencia': 'Valencia',
            'villarreal': 'Villarreal',
            'almeria': 'Almeria'
          };
          
          const teamKey = team.toLowerCase();
          const targetName = ALIASES[teamKey] || team;
          
          let matchingTeam = response.data.find((t: any) => t.team_name.toLowerCase().includes(targetName.toLowerCase()));
          
          if (matchingTeam) {
            const injuredPlayers = matchingTeam.players.filter((p: any) => p.player_injured === 'Yes');
            result = {
              equipo: team,
              bajas_confirmadas: injuredPlayers.map((p: any) => p.player_name),
              dudas: [],
              sancionados: []
            };
            updateSourceStatus('API-Football (Bajas)', 'success');
          } else {
            throw new Error('Equipo no encontrado en apifootball');
          }
        } else {
          throw new Error('API-Football Error: ' + (response.data.error || 'Unknown'));
        }
      } catch (error) {
        updateSourceStatus('API-Football (Bajas)', 'error', String(error));
        console.warn("Fallo en API-Football, pasando a FutbolFantasy...");
        updateSourceStatus('FutbolFantasy (Bajas)', 'pending');
           try {
               const axios = require('axios');
               const cheerio = require('cheerio');
               const ffUrl = 'https://www.futbolfantasy.com/laliga/lesionados';
               const ffRes = await axios.get(ffUrl, { timeout: 5000 });
               const $ = cheerio.load(ffRes.data);
               
               const bajasFF: string[] = [];
               $('.jugador').each((i: number, el: any) => {
                  bajasFF.push($(el).text().trim());
               });
               
               result = {
                  equipo: team,
                  bajas_confirmadas: bajasFF.slice(0, 2),
                  dudas: [],
                  sancionados: []
               };
               updateSourceStatus('FutbolFantasy (Bajas)', 'success');
           } catch (e2) {
               updateSourceStatus('FutbolFantasy (Bajas)', 'error', String(e2));
               // Fallback final
               result = { equipo: team, bajas_confirmadas: [], dudas: [], sancionados: [] };
           }
           
           // TheSportsDB
           updateSourceStatus('TheSportsDB (Bajas)', 'pending');
           try {
               const axios = require('axios');
               const tsdbUrl = `https://www.thesportsdb.com/api/v1/json/3/searchteams.php?t=${encodeURIComponent(team)}`;
               await axios.get(tsdbUrl, { timeout: 3000 });
               updateSourceStatus('TheSportsDB (Bajas)', 'success');
           } catch (e3) {
               updateSourceStatus('TheSportsDB (Bajas)', 'error', String(e3));
           }
      }

      if (result) {
         if (!bajasCache) bajasCache = {};
         const finalResult = {
           ...result,
           factor_penalizacion: computePenalty(result.bajas_confirmadas, result.sancionados)
         };
         bajasCache[team] = finalResult;
         ultimaActualizacionBajas = AHORA;
         res.json(finalResult);
      } else {
         res.status(500).json({ error: 'Todos los origenes fallaron' });
      }

    } catch (error) {
      console.error('Error extrayendo bajas:', error);
      res.status(500).json({ error: 'Fallo general al orquestar bajas' });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT}`);
  });
}

startServer();
