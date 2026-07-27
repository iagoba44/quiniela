import { openDB, DBSchema, IDBPDatabase } from 'idb';

export interface SourceHealth {
  source: string;
  status: 'success' | 'error' | 'pending';
  lastUpdate: string;
  error?: string;
}

interface QuinielaDB extends DBSchema {
  bajas: {
    key: string;
    value: any;
  };
  cuotas: {
    key: string;
    value: any;
  };
  historico: {
    key: string;
    value: any;
  };
  sourceHealth: {
    key: string;
    value: SourceHealth;
  };
}

let dbPromise: Promise<IDBPDatabase<QuinielaDB>> | null = null;

if (typeof window !== 'undefined') {
  dbPromise = openDB<QuinielaDB>('quiniela-db', 1, {
    upgrade(db) {
      if (!db.objectStoreNames.contains('bajas')) db.createObjectStore('bajas');
      if (!db.objectStoreNames.contains('cuotas')) db.createObjectStore('cuotas');
      if (!db.objectStoreNames.contains('historico')) db.createObjectStore('historico');
      if (!db.objectStoreNames.contains('sourceHealth')) db.createObjectStore('sourceHealth');
    },
  });
}

export const db = {
  // Almacenamiento de bajas y lesiones
  async saveBajas(equipo: string, data: any) {
    const dbInstance = await dbPromise;
    if (!dbInstance) return;
    await dbInstance.put('bajas', data, equipo);
  },
  async getBajas(equipo: string) {
    const dbInstance = await dbPromise;
    if (!dbInstance) return;
    return await dbInstance.get('bajas', equipo);
  },

  // Almacenamiento de cuotas y probabilidades
  async saveCuotas(matchId: string, data: any) {
    const dbInstance = await dbPromise;
    if (!dbInstance) return;
    await dbInstance.put('cuotas', data, matchId);
  },
  async getCuotas(matchId: string) {
    const dbInstance = await dbPromise;
    if (!dbInstance) return;
    return await dbInstance.get('cuotas', matchId);
  },

  // Almacenamiento de resultados históricos
  async saveHistorico(equipo: string, data: any) {
    const dbInstance = await dbPromise;
    if (!dbInstance) return;
    await dbInstance.put('historico', data, equipo);
  },
  async getHistorico(equipo: string) {
    const dbInstance = await dbPromise;
    if (!dbInstance) return;
    return await dbInstance.get('historico', equipo);
  },

  // Gestión de estado y salud de las fuentes (APIs/Scraping)
  async updateSourceHealth(source: string, status: 'success' | 'error' | 'pending', error?: string) {
    const dbInstance = await dbPromise;
    if (!dbInstance) return;
    const health: SourceHealth = {
      source,
      status,
      lastUpdate: new Date().toISOString(),
      error
    };
    await dbInstance.put('sourceHealth', health, source);
  },
  
  async getSourceHealth(source: string): Promise<SourceHealth | undefined> {
    const dbInstance = await dbPromise;
    if (!dbInstance) return undefined;
    return await dbInstance.get('sourceHealth', source);
  },

  async getAllSourceHealth(): Promise<Record<string, SourceHealth>> {
    const dbInstance = await dbPromise;
    if (!dbInstance) return {};
    
    const allKeys = await dbInstance.getAllKeys('sourceHealth');
    const allValues = await dbInstance.getAll('sourceHealth');
    
    const result: Record<string, SourceHealth> = {};
    for (let i = 0; i < allKeys.length; i++) {
      result[allKeys[i] as string] = allValues[i];
    }
    return result;
  }
};
