import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useSettingsStore } from '../../src/store/settingsStore';

// Reset Zustand store between tests
const resetStore = () => {
  const store = useSettingsStore.getState();
  store.resetSettings();
};

describe('Settings Store', () => {
  beforeEach(() => {
    // Clear localStorage mock
    vi.mocked(localStorage.getItem).mockReturnValue(null);
    vi.mocked(localStorage.setItem).mockClear();
    resetStore();
  });

  describe('Initial State', () => {
    it('should have default values', () => {
      const state = useSettingsStore.getState();

      expect(state.editorFontSize).toBe(14);
      expect(state.editorTabSize).toBe(2);
      expect(state.editorWordWrap).toBe(true);
      expect(state.editorMinimap).toBe(false);
      expect(state.rowsPerPage).toBe(50);
      expect(state.dateFormat).toBe('local');
      expect(state.showRowNumbers).toBe(true);
    });
  });

  describe('Editor Settings', () => {
    it('should update font size', () => {
      const { setEditorFontSize } = useSettingsStore.getState();

      setEditorFontSize(18);

      expect(useSettingsStore.getState().editorFontSize).toBe(18);
    });

    it('should update tab size', () => {
      const { setEditorTabSize } = useSettingsStore.getState();

      setEditorTabSize(4);

      expect(useSettingsStore.getState().editorTabSize).toBe(4);
    });

    it('should toggle word wrap', () => {
      const { setEditorWordWrap } = useSettingsStore.getState();

      setEditorWordWrap(false);
      expect(useSettingsStore.getState().editorWordWrap).toBe(false);

      setEditorWordWrap(true);
      expect(useSettingsStore.getState().editorWordWrap).toBe(true);
    });

    it('should toggle minimap', () => {
      const { setEditorMinimap } = useSettingsStore.getState();

      setEditorMinimap(true);
      expect(useSettingsStore.getState().editorMinimap).toBe(true);

      setEditorMinimap(false);
      expect(useSettingsStore.getState().editorMinimap).toBe(false);
    });
  });

  describe('Display Settings', () => {
    it('should update rows per page', () => {
      const { setRowsPerPage } = useSettingsStore.getState();

      setRowsPerPage(100);

      expect(useSettingsStore.getState().rowsPerPage).toBe(100);
    });

    it('should update date format', () => {
      const { setDateFormat } = useSettingsStore.getState();

      setDateFormat('iso');

      expect(useSettingsStore.getState().dateFormat).toBe('iso');
    });

    it('should toggle row numbers', () => {
      const { setShowRowNumbers } = useSettingsStore.getState();

      setShowRowNumbers(false);

      expect(useSettingsStore.getState().showRowNumbers).toBe(false);
    });
  });

  describe('Reset Settings', () => {
    it('should reset all settings to defaults', () => {
      const state = useSettingsStore.getState();

      // Change some settings
      state.setEditorFontSize(20);
      state.setRowsPerPage(200);
      state.setEditorWordWrap(false);

      // Verify changes
      expect(useSettingsStore.getState().editorFontSize).toBe(20);

      // Reset
      state.resetSettings();

      // Verify reset
      const newState = useSettingsStore.getState();
      expect(newState.editorFontSize).toBe(14);
      expect(newState.rowsPerPage).toBe(50);
      expect(newState.editorWordWrap).toBe(true);
    });
  });
});
