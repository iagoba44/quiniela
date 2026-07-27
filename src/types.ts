export type Selection = '1' | 'X' | '2';

export interface Odds {
  1: number;
  X: number;
  2: number;
}

export type PlayerPosition = 'GK' | 'DEF' | 'MID' | 'FWD';
export type PlayerRole = 'star' | 'starter' | 'rotation' | 'substitute' | 'unknown';
export type InjuryStatus = 'confirmed_out' | 'doubtful' | 'suspended' | 'recovered';

export interface PlayerImpact {
  name: string;
  status: InjuryStatus;
  position: PlayerPosition;
  role: PlayerRole;
  minutesPlayed?: number;
  goals?: number;
  assists?: number;
  marketValue?: number;
  impactScore: number; // Calculated 0-1
}

export interface TeamBajasDetail {
  equipo: string;
  players: PlayerImpact[];
  factor_penalizacion: number;
  fragilityFlags: string[];
  lastUpdated?: string;
}

export interface AlertItem {
  id: string;
  playerName: string;
  teamName: string;
  oldStatus: string;
  newStatus: string;
  timestamp: string;
  source: string;
  seen?: boolean;
}

export interface Match {
  id: number;
  homeTeam: string;
  awayTeam: string;
  odds: Odds;
  trueProbabilities: Odds;
  trueProbabilitiesSinBajas?: Odds;
  impactoBajasHome?: number;
  impactoBajasAway?: number;
  selections: Selection[];
  date?: string;
  statsOdds?: Odds;
  bajasHome?: { confirmadas: string[], dudas: string[], sancionados: string[] };
  bajasAway?: { confirmadas: string[], dudas: string[], sancionados: string[] };
  bajasHomeDetail?: TeamBajasDetail;
  bajasAwayDetail?: TeamBajasDetail;
  fragilityFlagsHome?: string[];
  fragilityFlagsAway?: string[];
  laeProbabilities?: Odds;
  ev?: Odds;
  officialResult?: Selection;
  result?: Selection;
}

export interface TicketSettings {
  algorithm: 'reduction' | 'ev' | 'montecarlo' | 'filters' | 'condorcet' | 'classic';
  budget: number; // Max combinations
  minVariants: number;
  maxVariants: number;
  minX: number;
  maxX: number;
  min2: number;
  max2: number;
  maxHomeOnes?: number; // Anti-favoritism filter
  jackpotAmount?: number; // Bote acumulado
  classicDobles?: number; // Dobles para quiniela clasica
  classicTriples?: number; // Triples para quiniela clasica
  penaMembers?: { name: string; percentage: number }[];
}

export interface GeneratedTicket {
  id: string;
  picks: Selection[];
  probability: number;
  evScore?: number;
}

export interface MonteCarloStats {
  mean: number;
  stdDev: number;
  p10: number;
  p90: number;
  simulations: number;
}

export interface Matchday {
  id: string;
  name: string;
  status: 'upcoming' | 'completed';
  matches: Match[];
}
