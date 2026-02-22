"use client";

import { useState, useEffect } from "react";
import { X, Settings } from "lucide-react";
import Link from "next/link";

const COOKIE_CONSENT_KEY = "callsphere_cookie_consent";

type ConsentPreferences = {
  necessary: boolean;
  analytics: boolean;
  marketing: boolean;
};

const DEFAULT_PREFERENCES: ConsentPreferences = {
  necessary: true,
  analytics: false,
  marketing: false,
};

function getStoredPreferences(): ConsentPreferences | null {
  try {
    const stored = localStorage.getItem(COOKIE_CONSENT_KEY);
    if (!stored) return null;
    if (stored === "accepted") return { necessary: true, analytics: true, marketing: true };
    if (stored === "declined") return { necessary: true, analytics: false, marketing: false };
    return JSON.parse(stored) as ConsentPreferences;
  } catch {
    return null;
  }
}

function savePreferences(prefs: ConsentPreferences) {
  localStorage.setItem(COOKIE_CONSENT_KEY, JSON.stringify(prefs));
  window.dispatchEvent(new Event("cookie-consent-update"));
}

export function CookieConsent() {
  const [showBanner, setShowBanner] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [preferences, setPreferences] = useState<ConsentPreferences>(DEFAULT_PREFERENCES);

  useEffect(() => {
    const stored = getStoredPreferences();
    if (!stored) {
      const timer = setTimeout(() => setShowBanner(true), 500);
      return () => clearTimeout(timer);
    }
    setPreferences(stored);
  }, []);

  useEffect(() => {
    const handleReopen = () => {
      setShowBanner(true);
      setShowSettings(true);
      const stored = getStoredPreferences();
      if (stored) setPreferences(stored);
    };

    window.addEventListener("open-cookie-settings", handleReopen);
    return () => window.removeEventListener("open-cookie-settings", handleReopen);
  }, []);

  const acceptAll = () => {
    const prefs = { necessary: true, analytics: true, marketing: true };
    setPreferences(prefs);
    savePreferences(prefs);
    setShowBanner(false);
    setShowSettings(false);
  };

  const declineAll = () => {
    const prefs = { necessary: true, analytics: false, marketing: false };
    setPreferences(prefs);
    savePreferences(prefs);
    setShowBanner(false);
    setShowSettings(false);
  };

  const saveSettings = () => {
    savePreferences(preferences);
    setShowBanner(false);
    setShowSettings(false);
  };

  if (!showBanner) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 p-4 sm:p-6">
      <div className="mx-auto max-w-4xl">
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Cookie consent"
          className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-4 shadow-xl sm:p-6"
        >
          {/* Close button */}
          <button
            onClick={declineAll}
            className="absolute right-3 top-3 rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>

          {!showSettings ? (
            /* Simple banner */
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-6">
              <div className="flex-1 pr-8 sm:pr-0">
                <h3 className="text-base font-semibold text-slate-900">We value your privacy</h3>
                <p className="mt-1 text-sm text-slate-600">
                  We use cookies to improve your browsing experience and analyze site traffic.
                  By clicking &quot;Accept All&quot;, you consent to our use of cookies.{" "}
                  <Link href="/privacy" className="text-blue-600 hover:underline">
                    Privacy Policy
                  </Link>
                </p>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <button
                  onClick={() => setShowSettings(true)}
                  className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors inline-flex items-center gap-1.5"
                >
                  <Settings className="h-4 w-4" />
                  Settings
                </button>
                <button
                  onClick={declineAll}
                  className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
                >
                  Decline
                </button>
                <button
                  onClick={acceptAll}
                  className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 transition-colors"
                >
                  Accept All
                </button>
              </div>
            </div>
          ) : (
            /* Granular settings */
            <div className="pr-8">
              <h3 className="text-base font-semibold text-slate-900">Cookie Settings</h3>
              <p className="mt-1 text-sm text-slate-600">
                Manage your cookie preferences. Necessary cookies are always enabled.
              </p>

              <div className="mt-4 space-y-3">
                {/* Necessary */}
                <div className="flex items-center justify-between rounded-lg border border-slate-200 px-4 py-3">
                  <div>
                    <p className="text-sm font-medium text-slate-900">Necessary</p>
                    <p className="text-xs text-slate-500">Required for the website to function properly.</p>
                  </div>
                  <div className="relative">
                    <div className="h-6 w-11 rounded-full bg-indigo-600 cursor-not-allowed" />
                    <div className="absolute left-[22px] top-0.5 h-5 w-5 rounded-full bg-white shadow" />
                  </div>
                </div>

                {/* Analytics */}
                <label className="flex items-center justify-between rounded-lg border border-slate-200 px-4 py-3 cursor-pointer hover:bg-slate-50 transition-colors">
                  <div>
                    <p className="text-sm font-medium text-slate-900">Analytics</p>
                    <p className="text-xs text-slate-500">Help us understand how visitors use the site (Google Analytics).</p>
                  </div>
                  <div className="relative">
                    <input
                      type="checkbox"
                      className="sr-only peer"
                      checked={preferences.analytics}
                      onChange={(e) => setPreferences({ ...preferences, analytics: e.target.checked })}
                    />
                    <div className="h-6 w-11 rounded-full bg-slate-200 peer-checked:bg-indigo-600 transition-colors" />
                    <div className="absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform peer-checked:translate-x-5" />
                  </div>
                </label>

                {/* Marketing */}
                <label className="flex items-center justify-between rounded-lg border border-slate-200 px-4 py-3 cursor-pointer hover:bg-slate-50 transition-colors">
                  <div>
                    <p className="text-sm font-medium text-slate-900">Marketing</p>
                    <p className="text-xs text-slate-500">Used for visitor identification and remarketing (reb2b).</p>
                  </div>
                  <div className="relative">
                    <input
                      type="checkbox"
                      className="sr-only peer"
                      checked={preferences.marketing}
                      onChange={(e) => setPreferences({ ...preferences, marketing: e.target.checked })}
                    />
                    <div className="h-6 w-11 rounded-full bg-slate-200 peer-checked:bg-indigo-600 transition-colors" />
                    <div className="absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform peer-checked:translate-x-5" />
                  </div>
                </label>
              </div>

              <div className="mt-4 flex items-center justify-end gap-3">
                <button
                  onClick={declineAll}
                  className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
                >
                  Decline All
                </button>
                <button
                  onClick={saveSettings}
                  className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 transition-colors"
                >
                  Save Preferences
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
