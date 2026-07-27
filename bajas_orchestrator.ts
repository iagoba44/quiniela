import fs from 'fs';
import path from 'path';
import axios from 'axios';

const CACHE_FILE = path.join(process.cwd(), 'bajas_jornada_cache.json');
const TTL_HOURS = 6;

export interface BajasPayload {
  equipo: string;
  bajas_confirmadas: string[];
  dudas: string[];
  sancionados: string[];
  factor_penalizacion: number;
  _source: string;
}

interface CacheEntry {
  timestamp: number;
  data: BajasPayload;
  source: string;
}

function loadCache(): Record<string, CacheEntry> {
  if (fs.existsSync(CACHE_FILE)) {
    try { return JSON.parse(fs.readFileSync(CACHE_FILE, 'utf-8')); } catch {}
  }
  return {};
}

function saveCache(cache: Record<string, CacheEntry>) {
  try { fs.writeFileSync(CACHE_FILE, JSON.stringify(cache, null, 2)); } catch {}
}

function computePenalty(confirmadas: string[], sancionados: string[], dudas: string[]): number {
  const totalOut = confirmadas.length + sancionados.length;
  const totalDoubts = dudas.length;
  let penalty = (totalOut * 2.0 + totalDoubts * 0.5) / 100;
  if (penalty > 0.15) penalty = 0.15;
  return -penalty;
}

// ============================================================
// LEAGUE-WIDE: 1 request = all La Liga injuries (100x cheaper)
// ============================================================
export async function fetchAllLaLigaInjuries(): Promise<Map<string, BajasPayload>> {
  const apiKey = process.env.API_FOOTBALL_KEY;
  const result = new Map<string, BajasPayload>();

  if (!apiKey) {
    console.log('[Orchestrator] API_FOOTBALL_KEY not configured');
    return result;
  }

  const cache = loadCache();
  const now = Date.now();
  const LEAGUE_CACHE_KEY = '__LA_LIGA_ALL__';

  const leagueCache = cache[LEAGUE_CACHE_KEY];
  if (leagueCache && (now - leagueCache.timestamp) < TTL_HOURS * 3600000) {
    for (const [key, entry] of Object.entries(cache)) {
      if (key !== LEAGUE_CACHE_KEY && (now - entry.timestamp) < TTL_HOURS * 3600000) {
        result.set(entry.data.equipo, entry.data);
      }
    }
    if (result.size > 0) {
      console.log(`[Orchestrator] League cache hit: ${result.size} teams`);
      return result;
    }
  }

  try {
    console.log('[Orchestrator] Fetching all La Liga injuries (1 req)');
    const response = await axios.get('https://v3.football.api-sports.io/injuries', {
      headers: { 'x-apisports-key': apiKey },
      params: { league: 140, season: 2025 },
      timeout: 10000
    });

    const injuries = response.data?.response || [];
    console.log(`[Orchestrator] Got ${injuries.length} injuries`);

    const teamMap = new Map<string, { confirmadas: string[], dudas: string[], sancionados: string[] }>();

    for (const item of injuries) {
      const teamName = item.team?.name;
      const playerName = item.player?.name;
      const type = item.player?.type || '';
      const reason = (item.player?.reason || '').toLowerCase();

      if (!teamName || !playerName) continue;
      if (!teamMap.has(teamName)) teamMap.set(teamName, { confirmadas: [], dudas: [], sancionados: [] });

      const td = teamMap.get(teamName)!;
      if (type === 'Missing Fixture') td.confirmadas.push(playerName);
      else if (type === 'Questionable') td.dudas.push(playerName);
      else if (reason.includes('suspension') || reason.includes('sanción') || reason.includes('red card')) td.sancionados.push(playerName);
      else td.confirmadas.push(playerName);
    }

    for (const [teamName, data] of teamMap) {
      const payload: BajasPayload = {
        equipo: teamName,
        bajas_confirmadas: data.confirmadas,
        dudas: data.dudas,
        sancionados: data.sancionados,
        factor_penalizacion: computePenalty(data.confirmadas, data.sancionados, data.dudas),
        _source: 'API-Football'
      };
      result.set(teamName, payload);
      cache[teamName] = { timestamp: now, data: payload, source: 'API-Football' };
    }

    cache[LEAGUE_CACHE_KEY] = { timestamp: now, data: { equipo: '__META__', bajas_confirmadas: [], dudas: [], sancionados: [], factor_penalizacion: 0, _source: 'meta' }, source: 'API-Football' };
    saveCache(cache);
    console.log(`[Orchestrator] Cached ${result.size} teams from API-Football`);
  } catch (e) {
    console.warn('[Orchestrator] League-wide failed:', e instanceof Error ? e.message : e);
  }

  return result;
}

// ============================================================
// PER-TEAM fallback cascade
// ============================================================
async function fetchApiFootballTeam(team: string): Promise<BajasPayload> {
  const apiKey = process.env.API_FOOTBALL_KEY;
  if (!apiKey) throw new Error('API_FOOTBALL_KEY not configured');

  const response = await axios.get('https://v3.football.api-sports.io/injuries', {
    headers: { 'x-apisports-key': apiKey },
    params: { team, league: 140, season: 2025 },
    timeout: 5000
  });

  const injuries = response.data?.response || [];
  const out: string[] = [], doubts: string[] = [], susp: string[] = [];

  for (const item of injuries) {
    const name = item.player?.name;
    if (!name) continue;
    const type = item.player?.type;
    const reason = (item.player?.reason || '').toLowerCase();
    if (type === 'Missing Fixture') out.push(name);
    else if (type === 'Questionable') doubts.push(name);
    else if (reason.includes('suspension') || reason.includes('sanción') || reason.includes('red card')) susp.push(name);
    else out.push(name);
  }

  return { equipo: team, bajas_confirmadas: out, dudas: doubts, sancionados: susp, factor_penalizacion: computePenalty(out, susp, doubts), _source: 'API-Football' };
}

async function fetchBesoccerTeam(team: string): Promise<BajasPayload> {
  const apiKey = process.env.BESOCCER_API_KEY;
  if (!apiKey) throw new Error('BESOCCER_API_KEY not configured');
  const response = await axios.get(`https://www.besoccer.com/api/v1/team/info/${encodeURIComponent(team)}`, {
    headers: { Authorization: `Bearer ${apiKey}`, 'User-Agent': 'QuinielaOptimizer/1.0' },
    timeout: 5000
  });
  if (response.status !== 200) throw new Error('Besoccer error');
  return { equipo: team, bajas_confirmadas: response.data.injuries || [], dudas: response.data.doubts || [], sancionados: response.data.suspensions || [], factor_penalizacion: 0, _source: 'Besoccer' };
}

async function fetchTheSportsDB(team: string): Promise<BajasPayload> {
  throw new Error('TheSportsDB free tier no tiene datos de lesiones');
}

function emptyTeamData(team: string): BajasPayload {
  return { equipo: team, bajas_confirmadas: [], dudas: [], sancionados: [], factor_penalizacion: 0, _source: 'sin_datos' };
}

export async function getBajasForTeam(team: string): Promise<BajasPayload> {
  const cache = loadCache();
  const now = Date.now();
  const cachedTeam = cache[team];

  if (cachedTeam && (now - cachedTeam.timestamp) < TTL_HOURS * 3600000) {
    return cachedTeam.data;
  }

  let result: BajasPayload | null = null;
  let source = '';

  try { result = await fetchApiFootballTeam(team); source = 'API-Football'; } catch {
    try { result = await fetchBesoccerTeam(team); source = 'Besoccer'; } catch {
      try { result = await fetchTheSportsDB(team); source = 'TheSportsDB'; } catch {
        result = emptyTeamData(team); source = 'sin_datos';
      }
    }
  }

  if (result) {
    result.factor_penalizacion = computePenalty(result.bajas_confirmadas, result.sancionados, result.dudas);
    result._source = source;
    cache[team] = { timestamp: now, data: result, source };
    saveCache(cache);
  }

  return result || emptyTeamData(team);
}
