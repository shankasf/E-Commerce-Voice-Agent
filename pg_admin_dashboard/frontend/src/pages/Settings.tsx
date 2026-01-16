import { useSettingsStore } from '../store/settingsStore';

const CodeIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
  </svg>
);

const DisplayIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
  </svg>
);

const InfoIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const RefreshIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
  </svg>
);

export function Settings() {
  const {
    editorFontSize,
    editorTabSize,
    editorWordWrap,
    editorMinimap,
    rowsPerPage,
    dateFormat,
    showRowNumbers,
    setEditorFontSize,
    setEditorTabSize,
    setEditorWordWrap,
    setEditorMinimap,
    setRowsPerPage,
    setDateFormat,
    setShowRowNumbers,
    resetSettings,
  } = useSettingsStore();

  return (
    <div className="space-y-8 max-w-3xl animate-fade-in">
      {/* Page Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Settings</h1>
          <p className="page-subtitle">Configure your preferences and customize your experience</p>
        </div>
        <button onClick={resetSettings} className="btn-secondary">
          <RefreshIcon />
          Reset to Defaults
        </button>
      </div>

      {/* Editor Settings */}
      <div className="panel">
        <div className="p-5 border-b border-panel-border flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
            <CodeIcon />
          </div>
          <div>
            <h2 className="font-semibold text-lg">SQL Editor</h2>
            <p className="text-text-muted text-sm">Configure the SQL editor appearance and behavior</p>
          </div>
        </div>
        <div className="p-5 space-y-5">
          <div className="flex items-center justify-between py-2 hover:bg-panel-hover/50 -mx-3 px-3 rounded-lg transition-colors">
            <div>
              <label className="font-medium">Font Size</label>
              <p className="text-text-muted text-sm mt-0.5">Editor font size in pixels</p>
            </div>
            <select
              value={editorFontSize}
              onChange={(e) => setEditorFontSize(Number(e.target.value))}
              className="input w-28"
            >
              {[10, 12, 14, 16, 18, 20, 22, 24].map((size) => (
                <option key={size} value={size}>
                  {size}px
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center justify-between py-2 hover:bg-panel-hover/50 -mx-3 px-3 rounded-lg transition-colors">
            <div>
              <label className="font-medium">Tab Size</label>
              <p className="text-text-muted text-sm mt-0.5">Number of spaces for indentation</p>
            </div>
            <select
              value={editorTabSize}
              onChange={(e) => setEditorTabSize(Number(e.target.value))}
              className="input w-28"
            >
              {[2, 4, 8].map((size) => (
                <option key={size} value={size}>
                  {size} spaces
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center justify-between py-2 hover:bg-panel-hover/50 -mx-3 px-3 rounded-lg transition-colors">
            <div>
              <label className="font-medium">Word Wrap</label>
              <p className="text-text-muted text-sm mt-0.5">Wrap long lines in the editor</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={editorWordWrap}
                onChange={(e) => setEditorWordWrap(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-12 h-7 bg-panel-hover border border-panel-border rounded-full peer peer-checked:after:translate-x-5 after:content-[''] after:absolute after:top-[3px] after:left-[3px] after:bg-text-muted after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary peer-checked:border-primary peer-checked:after:bg-white"></div>
            </label>
          </div>

          <div className="flex items-center justify-between py-2 hover:bg-panel-hover/50 -mx-3 px-3 rounded-lg transition-colors">
            <div>
              <label className="font-medium">Minimap</label>
              <p className="text-text-muted text-sm mt-0.5">Show code minimap in the editor</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={editorMinimap}
                onChange={(e) => setEditorMinimap(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-12 h-7 bg-panel-hover border border-panel-border rounded-full peer peer-checked:after:translate-x-5 after:content-[''] after:absolute after:top-[3px] after:left-[3px] after:bg-text-muted after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary peer-checked:border-primary peer-checked:after:bg-white"></div>
            </label>
          </div>
        </div>
      </div>

      {/* Display Settings */}
      <div className="panel">
        <div className="p-5 border-b border-panel-border flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-info/10 flex items-center justify-center text-info">
            <DisplayIcon />
          </div>
          <div>
            <h2 className="font-semibold text-lg">Display</h2>
            <p className="text-text-muted text-sm">Configure data display preferences</p>
          </div>
        </div>
        <div className="p-5 space-y-5">
          <div className="flex items-center justify-between py-2 hover:bg-panel-hover/50 -mx-3 px-3 rounded-lg transition-colors">
            <div>
              <label className="font-medium">Rows Per Page</label>
              <p className="text-text-muted text-sm mt-0.5">Number of rows to display in tables</p>
            </div>
            <select
              value={rowsPerPage}
              onChange={(e) => setRowsPerPage(Number(e.target.value))}
              className="input w-28"
            >
              {[25, 50, 100, 200, 500].map((rows) => (
                <option key={rows} value={rows}>
                  {rows} rows
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center justify-between py-2 hover:bg-panel-hover/50 -mx-3 px-3 rounded-lg transition-colors">
            <div>
              <label className="font-medium">Date Format</label>
              <p className="text-text-muted text-sm mt-0.5">How dates are displayed</p>
            </div>
            <select
              value={dateFormat}
              onChange={(e) => setDateFormat(e.target.value)}
              className="input w-32"
            >
              <option value="local">Local</option>
              <option value="iso">ISO 8601</option>
              <option value="relative">Relative</option>
            </select>
          </div>

          <div className="flex items-center justify-between py-2 hover:bg-panel-hover/50 -mx-3 px-3 rounded-lg transition-colors">
            <div>
              <label className="font-medium">Row Numbers</label>
              <p className="text-text-muted text-sm mt-0.5">Show row numbers in data tables</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={showRowNumbers}
                onChange={(e) => setShowRowNumbers(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-12 h-7 bg-panel-hover border border-panel-border rounded-full peer peer-checked:after:translate-x-5 after:content-[''] after:absolute after:top-[3px] after:left-[3px] after:bg-text-muted after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary peer-checked:border-primary peer-checked:after:bg-white"></div>
            </label>
          </div>
        </div>
      </div>

      {/* About */}
      <div className="panel">
        <div className="p-5 border-b border-panel-border flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center text-accent">
            <InfoIcon />
          </div>
          <div>
            <h2 className="font-semibold text-lg">About</h2>
            <p className="text-text-muted text-sm">Application information</p>
          </div>
        </div>
        <div className="p-5 space-y-4">
          <div className="flex items-center justify-between py-2 px-3 bg-panel-hover/30 rounded-lg">
            <span className="text-text-muted">Application</span>
            <span className="font-medium">PG Admin Dashboard</span>
          </div>
          <div className="flex items-center justify-between py-2 px-3 bg-panel-hover/30 rounded-lg">
            <span className="text-text-muted">Version</span>
            <span className="badge-info">v1.0.0</span>
          </div>
          <div className="flex items-center justify-between py-2 px-3 bg-panel-hover/30 rounded-lg">
            <span className="text-text-muted">License</span>
            <span className="font-medium">MIT</span>
          </div>
          <div className="flex items-center justify-between py-2 px-3 bg-panel-hover/30 rounded-lg">
            <span className="text-text-muted">Database</span>
            <span className="font-medium">PostgreSQL</span>
          </div>
        </div>
      </div>
    </div>
  );
}
