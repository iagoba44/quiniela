import 'dotenv/config';
import express from 'express';
import path from 'path';
import fs from 'fs';
import { createServer as createViteServer } from 'vite';
import { calculatePenalty } from './nlp_engine';
import { getBajasForTeam, fetchAllLaLigaInjuries } from './bajas_orchestrator';

const LOG_FILE = path.join(process.cwd(), 'sources_log.json');

const defaultSourcesLog: Record<string, { lastUpdate: string; status: 'success' | 'error' | 'pending'; error?: string }> = {
  'SELAE (Proximos)': { lastUpdate: '', status: 'pending' },
  'SELAE (Historico)': { lastUpdate: '', status: 'pending' },
  'Dataradar': { lastUpdate: '', status: 'pending' },
  'The Odds API': { lastUpdate: '', status: 'pending' },
  'API-Football (Bajas)': { lastUpdate: '', status: 'pending' },
  'Besoccer (Bajas)': { lastUpdate: '', status: 'pending' },
  'TheSportsDB (Bajas)': { lastUpdate: '', status: 'pending' }
};

function loadSourcesLog() {
  if (fs.existsSync(LOG_FILE)) {
    try { return JSON.parse(fs.readFileSync(LOG_FILE, 'utf-8')); } catch (e) {}
  }
  return { ...defaultSourcesLog };
}

const sourcesLog = loadSourcesLog();

function updateSourceStatus(source: string, status: 'success' | 'error' | 'pending', error?: string) {
  if (sourcesLog[source]) {
    sourcesLog[source] = { lastUpdate: new Date().toISOString(), status, error };
  } else if (status === 'success' || status === 'error') {
    sourcesLog[source] = { lastUpdate: new Date().toISOString(), status, error };
  }
  try { fs.writeFileSync(LOG_FILE, JSON.stringify(sourcesLog, null, 2)); } catch (e) {}
}

function getSeasonString(dStr?: string): string {
  const d = dStr ? new Date(dStr) : new Date();
  const year = isNaN(d.getTime()) ? new Date().getFullYear() : d.getFullYear();
  const month = isNaN(d.getTime()) ? new Date().getMonth() + 1 : d.getMonth() + 1;
  const startYear = month >= 7 ? year : year - 1;
  return `${String(startYear).slice(-2)}${String(startYear + 1).slice(-2)}`;
}

// =============================
// ODDS CACHE
// =============================
let oddsCache: { data: any[]; timestamp: number } | null = null;
const ODDS_CACHE_TTL = 60 * 60 * 1000; // 1 hour

// =============================
// ALERTS STATE
// =============================
const lastKnownPlayerStates: Record<string, { status: string; timestamp: number; team: string }> = {};

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // ---- Status endpoints ----
  app.post('/api/status/update', (req, res) => {
    const { source, status, error } = req.body;
    if (source && status) updateSourceStatus(source, status, error);
    res.json({ success: true });
  });

  app.get('/api/status', (req, res) => { res.json(sourcesLog); });

  // ---- SELAE Fechas ----
  app.get('/api/selae/fechas', async (req, res) => {
    try {
      const response = await fetch('https://www.loteriasyapuestas.es/servicios/fechasv2?game_id=LAQU', {
        headers: { 'User-Agent': 'Mozilla/5.0', 'Accept': 'application/json' }
      });
      if (!response.ok) throw new Error(`Status ${response.status}`);
      res.json(await response.json());
    } catch (error) {
      res.status(502).json({ error: 'SELAE bloqueado (Akamai). Usa Dataradar como alternativa.' });
    }
  });

  // ---- SELAE Proximos (via Dataradar) ----
  app.get('/api/selae/proximos', async (req, res) => {
    try {
      updateSourceStatus('SELAE (Proximos)', 'pending');
      updateSourceStatus('Dataradar', 'pending');
      const response = await fetch('https://static.dataradar.es/marcador/json/partidos.json');
      if (!response.ok) throw new Error(`Status ${response.status}`);
      const data = await response.json();
      const transformedMatches = data.slice(0, 15).map((m: any) => ({
        local: m.local, visitante: m.visitante, signo: m.signo || '',
        porc1: typeof m.porc1 === 'number' ? m.porc1 : null,
        porcX: typeof m.porcX === 'number' ? m.porcX : null,
        porc2: typeof m.porc2 === 'number' ? m.porc2 : null
      }));
      updateSourceStatus('Dataradar', 'success');
      updateSourceStatus('SELAE (Proximos)', 'success');
      res.json([{ jornada: data[0]?.jornada || 74, fecha_sorteo: new Date().toISOString().split('T')[0], partidos: transformedMatches }]);
    } catch (error) {
      updateSourceStatus('SELAE (Proximos)', 'error', 'Failed');
      res.status(502).json({ error: 'Failed to fetch SELAE proximos' });
    }
  });

  // ---- SELAE Historico (CSV) ----
  app.get('/api/selae/historico', async (req, res) => {
    try {
      updateSourceStatus('SELAE (Historico)', 'pending');
      const { fecha } = req.query;
      const targetDate = fecha ? String(fecha) : '';
      const seasonStr = getSeasonString(targetDate);
      let response = await fetch(`https://www.football-data.co.uk/mmz4281/${seasonStr}/SP1.csv`);
      if (!response.ok) {
        const prevSeason = getSeasonString(new Date(new Date().getFullYear() - 1, 6, 1).toISOString().split('T')[0]);
        response = await fetch(`https://www.football-data.co.uk/mmz4281/${prevSeason}/SP1.csv`);
      }
      if (!response.ok) throw new Error('CSV no disponible');
      const csvText = await response.text();
      const lines = csvText.split('\n');
      const headers = lines[0].split(',');
      const homeIdx = headers.indexOf('HomeTeam'), awayIdx = headers.indexOf('AwayTeam');
      const ftrIdx = headers.indexOf('FTR'), dateIdx = headers.indexOf('Date');
      const partidos: any[] = [];
      for (let i = lines.length - 1; i > 0; i--) {
        if (!lines[i].trim()) continue;
        const cols = lines[i].split(',');
        if (cols.length > ftrIdx && cols[homeIdx] && cols[awayIdx]) {
          const matchDate = cols[dateIdx];
          if (targetDate && matchDate && !matchDate.includes(targetDate)) continue;
          const signo = cols[ftrIdx] === 'H' ? '1' : cols[ftrIdx] === 'D' ? 'X' : '2';
          const b365H = headers.indexOf('B365H'), b365D = headers.indexOf('B365D'), b365A = headers.indexOf('B365A');
          let cuotas = undefined;
          if (b365H !== -1 && cols[b365H]) cuotas = { '1': parseFloat(cols[b365H]), 'X': parseFloat(cols[b365D]), '2': parseFloat(cols[b365A]) };
          partidos.push({ local: cols[homeIdx], visitante: cols[awayIdx], signo, fecha: cols[dateIdx], cuotas });
          if (partidos.length >= 15) break;
        }
      }
      updateSourceStatus('SELAE (Historico)', 'success');
      res.json([{ jornada: `Historico ${seasonStr}`, id_sorteo: `csv-hist-${seasonStr}`, partidos }]);
    } catch (error) {
      updateSourceStatus('SELAE (Historico)', 'error', 'CSV fail');
      res.status(502).json({ error: 'Error historico' });
    }
  });

  // ---- Odds (Sofascore -> Betfair -> The Odds API, cached 1h) ----
  app.get('/api/odds', async (req, res) => {
    try {
      if (oddsCache && (Date.now() - oddsCache.timestamp) < ODDS_CACHE_TTL) {
        return res.json({ success: true, data: oddsCache.data, cached: true });
      }
      updateSourceStatus('The Odds API', 'pending');
      let partidos: any[] = [];
      const axios = (await import('axios')).default;
      const cheerio = await import('cheerio');

      try {
        const seasonRes = await axios.get('https://api.sofascore.com/api/v1/unique-tournament/8/season/current', { headers: { 'User-Agent': 'Mozilla/5.0' }, timeout: 5000 });
        const seasonId = seasonRes.data?.season?.id || 52376;
        const resSofa = await axios.get(`https://api.sofascore.com/api/v1/unique-tournament/8/season/${seasonId}/events/next`, { headers: { 'User-Agent': 'Mozilla/5.0', 'Referer': 'https://www.sofascore.com/' }, timeout: 5000 });
        partidos = resSofa.data.events.map((e: any) => ({
          local: e.homeTeam.name, visitante: e.awayTeam.name,
          cuotas: { '1': e.odds?.home || 0, 'X': e.odds?.draw || 0, '2': e.odds?.away || 0 }
        })).filter((p: any) => p.cuotas['1'] !== 0);
        if (partidos.length === 0) throw new Error("No odds");
      } catch {
        try {
          const resBet = await axios.get('https://lite.betfair.com/es/futbol/competiciones/117', { timeout: 5000, headers: { 'User-Agent': 'Mozilla/5.0' } });
          const $ = cheerio.load(resBet.data);
          $('.market-list-item').each((_: any, el: any) => {
            const teams = $(el).find('.teams').text().split(' - ');
            const prices = $(el).find('.runner-price').map((_: any, p: any) => $(p).text().trim()).get();
            if (teams.length === 2 && prices.length >= 3) partidos.push({ local: teams[0].trim(), visitante: teams[1].trim(), cuotas: { '1': parseFloat(prices[0]) || 0, 'X': parseFloat(prices[1]) || 0, '2': parseFloat(prices[2]) || 0 } });
          });
          if (partidos.length === 0) throw new Error("No odds");
        } catch {
          const apiKey = process.env.ODDS_API_KEY || process.env.ODDS_WIDGET_KEY;
          if (!apiKey) throw new Error('ODDS key missing');
          const sports = ['soccer_spain_la_liga', 'soccer_norway_eliteserien'];
          for (const sport of sports) {
            try {
              const r = await fetch(`https://api.the-odds-api.com/v4/sports/${sport}/odds/?apiKey=${apiKey}&regions=eu&markets=h2h`);
              if (r.ok) {
                const d = await r.json();
                d.forEach((e: any) => {
                  const m = e.bookmakers?.[0]?.markets?.find((m: any) => m.key === 'h2h');
                  if (m) {
                    const h = m.outcomes?.find((o: any) => o.name === e.home_team)?.price || 0;
                    const a = m.outcomes?.find((o: any) => o.name === e.away_team)?.price || 0;
                    const dr = m.outcomes?.find((o: any) => o.name === 'Draw')?.price || 0;
                    if (h) partidos.push({ local: e.home_team, visitante: e.away_team, cuotas: { '1': h, 'X': dr, '2': a } });
                  }
                });
              }
            } catch {}
          }
        }
      }

      oddsCache = { data: partidos, timestamp: Date.now() };
      updateSourceStatus('The Odds API', 'success');
      res.json({ success: true, data: partidos, cached: false });
    } catch (error) {
      updateSourceStatus('The Odds API', 'error', String(error));
      if (oddsCache) return res.json({ success: true, data: oddsCache.data, cached: true, stale: true });
      res.status(500).json({ success: false, error: 'No odds available' });
    }
  });

  // ---- 12h Alerts Pipeline (RSS + NLP) ----
  app.get('/api/alerts', async (req, res) => {
    try {
      const Parser = (await import('rss-parser')).default;
      const parser = new Parser();
      const FEEDS = ['https://e00-marca-static.uecdn.es/rss/futbol/primera-division.xml', 'https://as.com/rss/futbol/primera.xml'];
      const feedPromises = FEEDS.map(url => parser.parseURL(url).catch(() => ({ items: [] as any[] })));
      const itemsArrays = await Promise.all(feedPromises);
      const allItems = itemsArrays.flatMap(f => ('items' in f && Array.isArray(f.items)) ? f.items : []);
      const alerts: any[] = [];
      const now = Date.now();
      const TWELVE_HOURS_MS = 12 * 60 * 60 * 1000;

      for (const item of allItems) {
        if (!item.pubDate) continue;
        const pubTime = new Date(item.pubDate).getTime();
        if (isNaN(pubTime) || (now - pubTime) > TWELVE_HOURS_MS) continue;
        const text = `${item.title || ''}. ${item.contentSnippet || item.content || ''}`;
        const penaltyVal = await calculatePenalty('General', text);
        if (penaltyVal < -0.03) {
          const playerName = item.title?.split(':')[0]?.trim() || item.title?.split('.')[0]?.trim() || 'Jugador';
          const team = item.title?.split(' ').slice(0, 2).join(' ') || 'La Liga';
          const newStatus = penaltyVal <= -0.06 ? 'baja_confirmada' : 'duda';
          const prev = lastKnownPlayerStates[playerName];
          if (!prev || prev.status !== newStatus) {
            lastKnownPlayerStates[playerName] = { status: newStatus, timestamp: pubTime, team };
            alerts.push({ id: `alert-${pubTime}-${playerName.replace(/\s+/g, '')}`, playerName, teamName: team, oldStatus: prev ? prev.status : 'disponible', newStatus, timestamp: new Date(pubTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }), source: item.link?.includes('marca') ? 'Marca RSS' : 'AS RSS', seen: false });
          }
        }
      }

      alerts.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      res.json({ success: true, alerts: alerts.slice(0, 10) });
    } catch (error) {
      res.json({ success: true, alerts: [] });
    }
  });

  // ---- LEAGUE-WIDE Bajas (1 API call) ----
  app.get('/api/bajas/liga', async (req, res) => {
    try {
      updateSourceStatus('API-Football (Bajas)', 'pending');
      const allBajas = await fetchAllLaLigaInjuries();
      const result: Record<string, any> = {};
      allBajas.forEach((data, team) => { result[team] = data; });
      if (allBajas.size > 0) updateSourceStatus('API-Football (Bajas)', 'success');
      else updateSourceStatus('API-Football (Bajas)', 'error', 'Sin datos - verifica API key');
      updateSourceStatus('Besoccer (Bajas)', 'success');
      updateSourceStatus('TheSportsDB (Bajas)', 'pending');
      res.json({ success: true, equipos: result, totalEquipos: allBajas.size });
    } catch (error) {
      updateSourceStatus('API-Football (Bajas)', 'error', String(error));
      res.status(500).json({ success: false, error: 'Fallo al obtener bajas de La Liga' });
    }
  });

  // ---- Per-team Bajas (cascada fallback) ----
  app.get('/api/bajas/:team', async (req, res) => {
    try {
      const { team } = req.params;
      const { news } = req.query;
      updateSourceStatus('API-Football (Bajas)', 'pending');
      const data = await getBajasForTeam(team);
      updateSourceStatus('API-Football (Bajas)', data._source === 'API-Football' ? 'success' : 'pending');
      updateSourceStatus('Besoccer (Bajas)', data._source === 'Besoccer' ? 'success' : 'pending');
      updateSourceStatus('TheSportsDB (Bajas)', 'pending');
      if (typeof news === 'string' && news.trim()) {
        const nlpPenalty = await calculatePenalty(team, news);
        if (nlpPenalty < data.factor_penalizacion) data.factor_penalizacion = nlpPenalty;
      }
      res.json(data);
    } catch (error) {
      updateSourceStatus('API-Football (Bajas)', 'error', String(error));
      res.status(500).json({ error: 'Fallo al orquestar bajas' });
    }
  });

  // ---- RSS News Feed ----
  app.get('/api/news/rss', async (req, res) => {
    try {
      const Parser = (await import('rss-parser')).default;
      const parser = new Parser();
      const queryTeams = req.query.teams ? String(req.query.teams).split(',').map(t => t.trim()).filter(Boolean) : [];
      const FEEDS = ['https://e00-marca-static.uecdn.es/rss/futbol/primera-division.xml', 'https://as.com/rss/futbol/primera.xml'];
      const feeds = await Promise.all(FEEDS.map(url => parser.parseURL(url).catch(() => ({ items: [] as any[] }))));
      const items = feeds.flatMap(f => f.items || []);
      const now = Date.now();
      const recent = items.filter(it => { if (!it.pubDate) return true; const t = new Date(it.pubDate).getTime(); return !isNaN(t) && (now - t) <= 7 * 86400000; });
      const targetTeams = queryTeams.length > 0 ? queryTeams : ['Real Madrid', 'FC Barcelona', 'Barcelona', 'Atletico Madrid', 'Atletico', 'Athletic Club', 'Athletic', 'Real Betis', 'Betis', 'Sevilla', 'Valencia', 'Villarreal', 'Girona', 'Real Sociedad', 'Celta', 'Osasuna', 'Rayo Vallecano', 'Mallorca', 'Alaves', 'Espanyol', 'Las Palmas', 'Leganes', 'Valladolid'];
      const relevant = recent.filter(item => {
        const text = `${item.title || ''} ${item.contentSnippet || ''}`.toLowerCase();
        if (queryTeams.length === 0) return true;
        return targetTeams.some(t => { const c = t.toLowerCase(); return text.includes(c) || text.includes(c.replace('real ', '').replace('fc ', '')); });
      }).slice(0, 20);

      const analyzed = await Promise.all(relevant.map(async item => {
        const fullText = `${item.title || ''}. ${item.contentSnippet || item.content || ''}`;
        let affectedTeam = '';
        for (const t of targetTeams) { if (fullText.toLowerCase().includes(t.toLowerCase())) { affectedTeam = t; break; } }
        const penalty = affectedTeam ? await calculatePenalty(affectedTeam, fullText) : 0;
        return { title: item.title || '', link: item.link, pubDate: item.pubDate || new Date().toISOString(), snippet: item.contentSnippet || item.content || '', affectedTeam, penalty };
      }));
      analyzed.sort((a, b) => new Date(b.pubDate).getTime() - new Date(a.pubDate).getTime());
      res.json({ success: true, news: analyzed, totalAnalyzed: analyzed.length });
    } catch (error) {
      res.json({ success: true, news: [], totalAnalyzed: 0 });
    }
  });

  // ---- SELAE Resultados (via football-data.co.uk CSV real) ----
  app.get('/api/selae/resultados', async (req, res) => {
    try {
      const { jornada } = req.query;
      const jNum = jornada ? String(jornada) : '';
      const seasonStr = getSeasonString();
      try {
        const csvRes = await fetch(`https://www.football-data.co.uk/mmz4281/${seasonStr}/SP1.csv`);
        if (csvRes.ok) {
          const csvText = await csvRes.text();
          const lines = csvText.split('\n');
          const headers = lines[0].split(',');
          const homeIdx = headers.indexOf('HomeTeam'), awayIdx = headers.indexOf('AwayTeam'), ftrIdx = headers.indexOf('FTR'), dateIdx = headers.indexOf('Date');
          const resultados: any[] = [];
          const seen = new Set<string>();
          for (let i = lines.length - 1; i > 0; i--) {
            if (!lines[i].trim()) continue;
            const cols = lines[i].split(',');
            if (cols.length > ftrIdx && cols[homeIdx] && cols[awayIdx]) {
              const key = `${cols[homeIdx]}-${cols[awayIdx]}`;
              if (seen.has(key)) continue;
              seen.add(key);
              resultados.push({ partido: resultados.length + 1, local: cols[homeIdx], visitante: cols[awayIdx], signo_real: cols[ftrIdx] === 'H' ? '1' : cols[ftrIdx] === 'D' ? 'X' : '2', fecha: cols[dateIdx] });
              if (resultados.length >= 15) break;
            }
          }
          if (resultados.length > 0) return res.json({ jornada: jNum || `CSV-${seasonStr}`, fecha: new Date().toISOString().split('T')[0], fuente: 'football-data.co.uk', resultados });
        }
      } catch {}
      res.status(502).json({ error: 'CSV historico no disponible' });
    } catch (error) {
      res.status(500).json({ error: 'Error cargando resultados' });
    }
  });

  // ---- Static / SPA ----
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({ server: { middlewareMode: true }, appType: 'spa' });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => { res.sendFile(path.join(distPath, 'index.html')); });
  }

  app.listen(PORT, '0.0.0.0', () => { console.log(`Server running on port ${PORT}`); });
}

startServer();
