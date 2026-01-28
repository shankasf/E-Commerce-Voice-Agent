import { create } from 'zustand';
import type { DatabaseInfo, TableInfo } from '../types';

interface DatabaseState {
  databases: DatabaseInfo[];
  currentDatabase: string | null;
  currentSchema: string | null;
  currentTable: string | null;
  tables: TableInfo[];
  setDatabases: (databases: DatabaseInfo[]) => void;
  setCurrentDatabase: (dbName: string | null) => void;
  setCurrentSchema: (schema: string | null) => void;
  setCurrentTable: (table: string | null) => void;
  setTables: (tables: TableInfo[]) => void;
}

export const useDatabaseStore = create<DatabaseState>((set) => ({
  databases: [],
  currentDatabase: null,
  currentSchema: null,
  currentTable: null,
  tables: [],

  setDatabases: (databases) => set({ databases }),
  setCurrentDatabase: (dbName) => set({ currentDatabase: dbName, currentSchema: null, currentTable: null }),
  setCurrentSchema: (schema) => set({ currentSchema: schema }),
  setCurrentTable: (table) => set({ currentTable: table }),
  setTables: (tables) => set({ tables }),
}));
