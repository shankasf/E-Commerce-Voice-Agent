import Link from "next/link";
import { ArrowRight } from "lucide-react";

export function AffiliateBanner() {
    return (
        <div className="bg-gradient-to-r from-green-600 to-emerald-600 text-white">
            <div className="mx-auto max-w-6xl px-4 py-3">
                <Link
                    href="/affiliate"
                    className="flex items-center justify-center gap-2 text-sm font-medium hover:opacity-90 transition-opacity"
                >
                    <span className="inline-flex items-center gap-1.5">
                        <span className="hidden sm:inline">💰</span>
                        <span>
                            <strong>Become an Affiliate</strong> — Earn 22% of all payments from referrals for the first year
                        </span>
                    </span>
                    <ArrowRight className="h-4 w-4" />
                </Link>
            </div>
        </div>
    );
}
