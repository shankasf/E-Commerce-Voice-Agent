import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface SettingsState {
  // Editor settings
  editorFontSize: number;
  editorTabSize: number;
  editorWordWrap: boolean;
  editorMinimap: boolean;

  // Display settings
  rowsPerPage: number;
  dateFormat: string;
  showRowNumbers: boolean;

  // Actions
  setEditorFontSize: (size: number) => void;
  setEditorTabSize: (size: number) => void;
  setEditorWordWrap: (wrap: boolean) => void;
  setEditorMinimap: (show: boolean) => void;
  setRowsPerPage: (rows: number) => void;
  setDateFormat: (format: string) => void;
  setShowRowNumbers: (show: boolean) => void;
  resetSettings: () => void;
}

const defaultSettings = {
  editorFontSize: 14,
  editorTabSize: 2,
  editorWordWrap: true,
  editorMinimap: false,
  rowsPerPage: 50,
  dateFormat: 'local',
  showRowNumbers: true,
};

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      ...defaultSettings,

      setEditorFontSize: (size) => set({ editorFontSize: size }),
      setEditorTabSize: (size) => set({ editorTabSize: size }),
      setEditorWordWrap: (wrap) => set({ editorWordWrap: wrap }),
      setEditorMinimap: (show) => set({ editorMinimap: show }),
      setRowsPerPage: (rows) => set({ rowsPerPage: rows }),
      setDateFormat: (format) => set({ dateFormat: format }),
      setShowRowNumbers: (show) => set({ showRowNumbers: show }),
      resetSettings: () => set(defaultSettings),
    }),
    {
      name: 'pg-admin-settings',
    }
  )
);
