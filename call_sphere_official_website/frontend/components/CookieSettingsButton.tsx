"use client";

export function CookieSettingsButton() {
  return (
    <button
      type="button"
      onClick={() => window.dispatchEvent(new Event("open-cookie-settings"))}
      className="text-sm text-slate-600 hover:text-blue-600 transition-colors"
    >
      Cookie Settings
    </button>
  );
}
