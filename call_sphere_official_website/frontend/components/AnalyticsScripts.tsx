"use client";

import { useEffect, useState } from "react";
import Script from "next/script";

const COOKIE_CONSENT_KEY = "callsphere_cookie_consent";

type ConsentPreferences = {
  necessary: boolean;
  analytics: boolean;
  marketing: boolean;
};

function getConsent(): ConsentPreferences {
  try {
    const stored = localStorage.getItem(COOKIE_CONSENT_KEY);
    if (!stored) return { necessary: true, analytics: false, marketing: false };
    if (stored === "accepted") return { necessary: true, analytics: true, marketing: true };
    if (stored === "declined") return { necessary: true, analytics: false, marketing: false };
    return JSON.parse(stored) as ConsentPreferences;
  } catch {
    return { necessary: true, analytics: false, marketing: false };
  }
}

export function AnalyticsScripts() {
  const [consent, setConsent] = useState<ConsentPreferences>({
    necessary: true,
    analytics: false,
    marketing: false,
  });

  useEffect(() => {
    setConsent(getConsent());

    const handleUpdate = () => setConsent(getConsent());

    window.addEventListener("storage", handleUpdate);
    window.addEventListener("cookie-consent-update", handleUpdate);

    return () => {
      window.removeEventListener("storage", handleUpdate);
      window.removeEventListener("cookie-consent-update", handleUpdate);
    };
  }, []);

  return (
    <>
      {consent.analytics && (
        <>
          <Script
            src="https://www.googletagmanager.com/gtag/js?id=G-54K8RDBQ4K"
            strategy="afterInteractive"
          />
          <Script id="google-analytics" strategy="afterInteractive">
            {`window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('js', new Date());
gtag('config', 'G-54K8RDBQ4K');`}
          </Script>
        </>
      )}
      {consent.marketing && (
        <Script id="reb2b-tracking" strategy="lazyOnload">
          {`!function(key) {if (window.reb2b) return;window.reb2b = {loaded: true};var s = document.createElement("script");s.async = true;s.src = "https://ddwl4m2hdecbv.cloudfront.net/b/" + key + "/" + key + ".js.gz";document.getElementsByTagName("script")[0].parentNode.insertBefore(s, document.getElementsByTagName("script")[0]);}("QOQRJH9ZD062");`}
        </Script>
      )}
    </>
  );
}
