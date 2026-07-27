export type Selection = '1' | 'X' | '2';

export interface Odds {
  1: number;
  X: number;
  2: number;
}

export interface Match {
  id: number;
  homeTeam: string;
  awayTeam: string;
  odds: Odds;
  trueProbabilities: Odds;
  selections: Selection[];
  date?: string;
  statsOdds?: Odds;
  bajasHome?: { confirmadas: string[], dudas: string[], sancionados: string[] };
  bajasAway?: { confirmadas: string[], dudas: string[], sancionados: string[] };
  laeProbabilities?: Odds;
  ev?: Odds;
}

export interface TicketSettings {
  algorithm: 'reduction' | 'ev' | 'montecarlo' | 'filters';
  budget: number; // Max combinations
  minVariants: number;
  maxVariants: number;
  minX: number;
  maxX: number;
  min2: number;
  max2: number;
}

export interface GeneratedTicket {
  id: string;
  picks: Selection[];
  probability: number;
}

export interface Matchday {
  id: string;
  name: string;
  status: 'upcoming' | 'completed';
  matches: Match[];
}
