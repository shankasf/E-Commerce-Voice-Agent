import { describe, it, expect, beforeEach, vi } from 'vitest';
import { screen, fireEvent } from '@testing-library/react';
import { renderWithProviders } from '../utils';
import { Settings } from '../../src/pages/Settings';
import { useSettingsStore } from '../../src/store/settingsStore';

describe('Settings Component', () => {
  beforeEach(() => {
    // Reset store before each test
    useSettingsStore.getState().resetSettings();
  });

  it('should render settings page title', () => {
    renderWithProviders(<Settings />);

    expect(screen.getByText('Settings')).toBeInTheDocument();
    expect(screen.getByText('Configure your preferences and customize your experience')).toBeInTheDocument();
  });

  it('should display SQL Editor section', () => {
    renderWithProviders(<Settings />);

    expect(screen.getByText('SQL Editor')).toBeInTheDocument();
    expect(screen.getByText('Font Size')).toBeInTheDocument();
    expect(screen.getByText('Tab Size')).toBeInTheDocument();
    expect(screen.getByText('Word Wrap')).toBeInTheDocument();
    expect(screen.getByText('Minimap')).toBeInTheDocument();
  });

  it('should display Display section', () => {
    renderWithProviders(<Settings />);

    expect(screen.getByText('Display')).toBeInTheDocument();
    expect(screen.getByText('Rows Per Page')).toBeInTheDocument();
    expect(screen.getByText('Date Format')).toBeInTheDocument();
    expect(screen.getByText('Row Numbers')).toBeInTheDocument();
  });

  it('should update font size when changed', async () => {
    renderWithProviders(<Settings />);

    const fontSizeSelect = screen.getAllByRole('combobox')[0];
    fireEvent.change(fontSizeSelect, { target: { value: '18' } });

    expect(useSettingsStore.getState().editorFontSize).toBe(18);
  });

  it('should update rows per page when changed', () => {
    renderWithProviders(<Settings />);

    // Find the Rows Per Page select (third combobox)
    const selects = screen.getAllByRole('combobox');
    const rowsSelect = selects.find(select => {
      const options = select.querySelectorAll('option');
      return Array.from(options).some(opt => opt.value === '50');
    });

    if (rowsSelect) {
      fireEvent.change(rowsSelect, { target: { value: '100' } });
      expect(useSettingsStore.getState().rowsPerPage).toBe(100);
    }
  });

  it('should toggle word wrap when clicked', () => {
    renderWithProviders(<Settings />);

    const checkboxes = screen.getAllByRole('checkbox');
    // Word wrap is the first toggle (initially checked)
    const wordWrapToggle = checkboxes[0];

    expect(useSettingsStore.getState().editorWordWrap).toBe(true);

    fireEvent.click(wordWrapToggle);

    expect(useSettingsStore.getState().editorWordWrap).toBe(false);
  });

  it('should reset settings when reset button clicked', () => {
    // First change some settings
    const store = useSettingsStore.getState();
    store.setEditorFontSize(20);
    store.setRowsPerPage(200);

    renderWithProviders(<Settings />);

    const resetButton = screen.getByText('Reset to Defaults');
    fireEvent.click(resetButton);

    expect(useSettingsStore.getState().editorFontSize).toBe(14);
    expect(useSettingsStore.getState().rowsPerPage).toBe(50);
  });

  it('should display About section with app info', () => {
    renderWithProviders(<Settings />);

    expect(screen.getByText('About')).toBeInTheDocument();
    expect(screen.getByText('PG Admin Dashboard')).toBeInTheDocument();
    expect(screen.getByText('v1.0.0')).toBeInTheDocument();
    expect(screen.getByText('MIT')).toBeInTheDocument();
  });
});
