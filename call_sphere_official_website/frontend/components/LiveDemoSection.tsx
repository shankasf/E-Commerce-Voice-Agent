"use client";

import { Shield, Lock, Database } from "lucide-react";

export function LiveDemoSection() {
    return (
        <section className="section-stack">
            {/* Bottom Security Info */}
            <div className="rounded-2xl border border-slate-200 bg-gradient-to-br from-indigo-50 to-white p-8">
                <div className="grid gap-8 md:grid-cols-3">
                    <div className="text-center">
                        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-100 text-indigo-600">
                            <Lock className="h-6 w-6" />
                        </div>
                        <h4 className="font-semibold text-slate-900">Enterprise Security</h4>
                        <p className="mt-2 text-sm text-slate-600">
                            Encryption in transit (TLS) and at rest. Security program aligned with SOC 2 principles.
                        </p>
                    </div>
                    <div className="text-center">
                        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-100 text-indigo-600">
                            <Shield className="h-6 w-6" />
                        </div>
                        <h4 className="font-semibold text-slate-900">Multi-Factor Auth</h4>
                        <p className="mt-2 text-sm text-slate-600">
                            Caller ID verification, email confirmation, and knowledge-based authentication.
                        </p>
                    </div>
                    <div className="text-center">
                        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-100 text-indigo-600">
                            <Database className="h-6 w-6" />
                        </div>
                        <h4 className="font-semibold text-slate-900">Data Privacy</h4>
                        <p className="mt-2 text-sm text-slate-600">
                            GDPR/CPRA rights requests supported. DPA available for business customers.
                        </p>
                    </div>
                </div>
            </div>
        </section>
    );
}
