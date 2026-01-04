import { Metadata } from "next";
import Link from "next/link";
import { DollarSign, Users, TrendingUp, Zap, CheckCircle, ArrowRight, Gift, Shield, Clock } from "lucide-react";

import { Footer } from "@/components/Footer";
import { Nav } from "@/components/Nav";
import { VoiceAgentLauncher } from "@/components/VoiceAgentLauncher";

export const metadata: Metadata = {
    title: "Affiliate Program - Earn 22% Commission | CallSphere",
    description:
        "Join the CallSphere Affiliate Program and earn 22% of all payments from your referrals for the first year. Start earning passive income by promoting AI voice agents.",
};

const benefits = [
    {
        icon: DollarSign,
        title: "22% Commission",
        description: "Earn 22% of all payments from your referrals for their entire first year of subscription.",
        gradient: "from-emerald-500 to-green-600",
    },
    {
        icon: TrendingUp,
        title: "Recurring Revenue",
        description: "Get paid every month as long as your referrals stay subscribed during their first year.",
        gradient: "from-blue-500 to-indigo-600",
    },
    {
        icon: Users,
        title: "No Limits",
        description: "There's no cap on how many people you can refer or how much you can earn.",
        gradient: "from-purple-500 to-violet-600",
    },
    {
        icon: Zap,
        title: "Easy Tracking",
        description: "Access your personal dashboard to track clicks, conversions, and earnings in real-time.",
        gradient: "from-amber-500 to-orange-600",
    },
];

const steps = [
    {
        number: "01",
        title: "Apply to Join",
        description: "Fill out a quick application form and get approved within 24-48 hours.",
        icon: Gift,
    },
    {
        number: "02",
        title: "Get Your Link",
        description: "Receive your unique referral link and marketing materials to share.",
        icon: Shield,
    },
    {
        number: "03",
        title: "Spread the Word",
        description: "Share CallSphere with your audience through your preferred channels.",
        icon: Users,
    },
    {
        number: "04",
        title: "Earn Commissions",
        description: "Get 22% of every payment your referrals make in their first year.",
        icon: DollarSign,
    },
];

const idealFor = [
    "Marketing agencies & consultants",
    "Business coaches & advisors",
    "Tech bloggers & content creators",
    "SaaS review platforms",
    "Customer service consultants",
    "Sales trainers & professionals",
];

const earnings = [
    { plan: "Starter", price: "$149/mo", commission: "$32.78", annual: "$393.36" },
    { plan: "Growth", price: "$499/mo", commission: "$109.78", annual: "$1,317.36" },
    { plan: "Scale", price: "$1,499/mo", commission: "$329.78", annual: "$3,957.36" },
];

export default function AffiliatePage() {
    return (
        <>
            <Nav />
            <main id="main" className="relative overflow-hidden">
                {/* Hero Section */}
                <section className="relative pt-20 pb-24 overflow-hidden">
                    {/* Background decorations */}
                    <div className="absolute inset-0 bg-gradient-to-br from-slate-50 via-white to-emerald-50/30" />
                    <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-gradient-to-bl from-emerald-100/40 to-transparent rounded-full blur-3xl" />
                    <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-gradient-to-tr from-blue-100/30 to-transparent rounded-full blur-3xl" />

                    <div className="relative mx-auto max-w-6xl px-6">
                        <div className="text-center max-w-3xl mx-auto">
                            <div className="inline-flex items-center gap-2 rounded-full bg-emerald-50 border border-emerald-200 px-4 py-2 text-sm font-medium text-emerald-700 mb-8">
                                <Gift className="h-4 w-4" />
                                Partner Program
                            </div>
                            <h1 className="text-5xl font-bold tracking-tight text-slate-900 sm:text-6xl lg:text-7xl">
                                Earn{" "}
                                <span className="relative">
                                    <span className="bg-gradient-to-r from-emerald-600 to-green-500 bg-clip-text text-transparent">22%</span>
                                    <svg className="absolute -bottom-2 left-0 w-full" viewBox="0 0 100 10" preserveAspectRatio="none">
                                        <path d="M0,8 Q50,0 100,8" fill="none" stroke="url(#underline-gradient)" strokeWidth="3" strokeLinecap="round" />
                                        <defs>
                                            <linearGradient id="underline-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                                                <stop offset="0%" stopColor="#10b981" />
                                                <stop offset="100%" stopColor="#22c55e" />
                                            </linearGradient>
                                        </defs>
                                    </svg>
                                </span>
                                {" "}Commission
                            </h1>
                            <p className="mt-8 text-xl text-slate-600 leading-relaxed max-w-2xl mx-auto">
                                Partner with CallSphere and earn recurring revenue for every customer you refer.
                                Get 22% of all payments for their entire first year.
                            </p>
                            <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
                                <Link
                                    href="/contact"
                                    className="group inline-flex items-center justify-center rounded-xl bg-gradient-to-r from-emerald-600 to-green-500 px-8 py-4 text-base font-semibold text-white shadow-lg shadow-emerald-500/25 hover:shadow-xl hover:shadow-emerald-500/30 hover:-translate-y-0.5 transition-all duration-200"
                                >
                                    Apply Now
                                    <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
                                </Link>
                                <Link
                                    href="/pricing"
                                    className="inline-flex items-center justify-center rounded-xl border-2 border-slate-200 bg-white px-8 py-4 text-base font-semibold text-slate-700 hover:border-slate-300 hover:bg-slate-50 transition-all duration-200"
                                >
                                    View Pricing Plans
                                </Link>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Stats Section */}
                <section className="relative py-16 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900">
                    <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wMyI+PGNpcmNsZSBjeD0iMzAiIGN5PSIzMCIgcj0iMiIvPjwvZz48L2c+PC9zdmc+')] opacity-50" />
                    <div className="relative mx-auto max-w-6xl px-6">
                        <div className="grid gap-8 md:grid-cols-3">
                            <div className="text-center group">
                                <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 mb-4">
                                    <DollarSign className="h-8 w-8 text-emerald-400" />
                                </div>
                                <p className="text-5xl font-bold text-white">22%</p>
                                <p className="mt-2 text-slate-400">Commission Rate</p>
                            </div>
                            <div className="text-center group">
                                <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-blue-500/10 border border-blue-500/20 mb-4">
                                    <Clock className="h-8 w-8 text-blue-400" />
                                </div>
                                <p className="text-5xl font-bold text-white">12</p>
                                <p className="mt-2 text-slate-400">Months of Earnings</p>
                            </div>
                            <div className="text-center group">
                                <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-purple-500/10 border border-purple-500/20 mb-4">
                                    <Gift className="h-8 w-8 text-purple-400" />
                                </div>
                                <p className="text-5xl font-bold text-white">$0</p>
                                <p className="mt-2 text-slate-400">Cost to Join</p>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Earnings Calculator */}
                <section className="py-20 bg-white">
                    <div className="mx-auto max-w-6xl px-6">
                        <div className="text-center mb-12">
                            <span className="inline-block rounded-full bg-blue-50 border border-blue-100 px-4 py-1.5 text-sm font-medium text-blue-700 mb-4">
                                Earning Potential
                            </span>
                            <h2 className="text-3xl font-bold text-slate-900 sm:text-4xl">
                                See What You Could Earn
                            </h2>
                            <p className="mt-4 text-lg text-slate-600 max-w-2xl mx-auto">
                                Here&apos;s how much you can make per referral across our pricing tiers.
                            </p>
                        </div>
                        <div className="grid gap-6 md:grid-cols-3">
                            {earnings.map((tier) => (
                                <div
                                    key={tier.plan}
                                    className="relative rounded-2xl border border-slate-200 bg-gradient-to-b from-white to-slate-50/50 p-8 hover:shadow-xl hover:border-slate-300 transition-all duration-300"
                                >
                                    <div className="text-center">
                                        <h3 className="text-lg font-semibold text-slate-900">{tier.plan} Plan</h3>
                                        <p className="text-sm text-slate-500 mt-1">{tier.price}</p>
                                        <div className="mt-6 py-6 border-y border-slate-100">
                                            <p className="text-sm text-slate-500">Your monthly commission</p>
                                            <p className="text-4xl font-bold text-emerald-600 mt-2">{tier.commission}</p>
                                        </div>
                                        <div className="mt-6">
                                            <p className="text-sm text-slate-500">First year total</p>
                                            <p className="text-2xl font-bold text-slate-900 mt-1">{tier.annual}</p>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                        <p className="text-center text-sm text-slate-500 mt-8">
                            * Calculations based on monthly billing. Annual plans earn you even more!
                        </p>
                    </div>
                </section>

                {/* Benefits Section */}
                <section className="py-20 bg-slate-50">
                    <div className="mx-auto max-w-6xl px-6">
                        <div className="text-center mb-16">
                            <span className="inline-block rounded-full bg-purple-50 border border-purple-100 px-4 py-1.5 text-sm font-medium text-purple-700 mb-4">
                                Benefits
                            </span>
                            <h2 className="text-3xl font-bold text-slate-900 sm:text-4xl">
                                Why Partner With Us?
                            </h2>
                            <p className="mt-4 text-lg text-slate-600 max-w-2xl mx-auto">
                                We&apos;ve built an affiliate program that truly rewards your efforts.
                            </p>
                        </div>
                        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
                            {benefits.map((benefit) => (
                                <div
                                    key={benefit.title}
                                    className="group relative rounded-2xl bg-white p-8 shadow-sm hover:shadow-xl transition-all duration-300 border border-slate-100 hover:border-transparent overflow-hidden"
                                >
                                    <div className={`absolute inset-0 bg-gradient-to-br ${benefit.gradient} opacity-0 group-hover:opacity-5 transition-opacity duration-300`} />
                                    <div className={`relative flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br ${benefit.gradient} shadow-lg`}>
                                        <benefit.icon className="h-7 w-7 text-white" />
                                    </div>
                                    <h3 className="relative mt-6 text-xl font-semibold text-slate-900">
                                        {benefit.title}
                                    </h3>
                                    <p className="relative mt-3 text-slate-600 leading-relaxed">
                                        {benefit.description}
                                    </p>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

                {/* How It Works Section */}
                <section className="py-20 bg-white">
                    <div className="mx-auto max-w-6xl px-6">
                        <div className="text-center mb-16">
                            <span className="inline-block rounded-full bg-amber-50 border border-amber-100 px-4 py-1.5 text-sm font-medium text-amber-700 mb-4">
                                How It Works
                            </span>
                            <h2 className="text-3xl font-bold text-slate-900 sm:text-4xl">
                                Start Earning in 4 Steps
                            </h2>
                            <p className="mt-4 text-lg text-slate-600 max-w-2xl mx-auto">
                                Getting started is simple. Follow these steps to begin earning.
                            </p>
                        </div>
                        <div className="relative">
                            {/* Connection line */}
                            <div className="absolute top-24 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-slate-200 to-transparent hidden lg:block" />

                            <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-4">
                                {steps.map((step, index) => (
                                    <div key={step.number} className="relative text-center">
                                        <div className="relative inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-slate-100 to-slate-50 border border-slate-200 mb-6">
                                            <step.icon className="h-8 w-8 text-slate-700" />
                                            <span className="absolute -top-2 -right-2 flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-emerald-500 to-green-600 text-xs font-bold text-white shadow-lg">
                                                {index + 1}
                                            </span>
                                        </div>
                                        <h3 className="text-xl font-semibold text-slate-900">
                                            {step.title}
                                        </h3>
                                        <p className="mt-3 text-slate-600">
                                            {step.description}
                                        </p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </section>

                {/* Ideal For Section */}
                <section className="py-20 bg-gradient-to-br from-slate-50 to-white">
                    <div className="mx-auto max-w-4xl px-6">
                        <div className="rounded-3xl bg-white border border-slate-200 p-10 md:p-14 shadow-xl shadow-slate-200/50">
                            <div className="text-center mb-10">
                                <span className="inline-block rounded-full bg-green-50 border border-green-100 px-4 py-1.5 text-sm font-medium text-green-700 mb-4">
                                    Perfect Match
                                </span>
                                <h2 className="text-3xl font-bold text-slate-900 sm:text-4xl">
                                    Ideal For
                                </h2>
                            </div>
                            <div className="grid gap-4 md:grid-cols-2">
                                {idealFor.map((item) => (
                                    <div
                                        key={item}
                                        className="flex items-center gap-4 p-4 rounded-xl bg-slate-50 hover:bg-emerald-50 transition-colors duration-200"
                                    >
                                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100">
                                            <CheckCircle className="h-5 w-5 text-emerald-600" />
                                        </div>
                                        <span className="text-slate-700 font-medium">{item}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </section>

                {/* CTA Section */}
                <section className="relative py-24 overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-br from-emerald-600 via-green-600 to-teal-600" />
                    <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNSI+PGNpcmNsZSBjeD0iMzAiIGN5PSIzMCIgcj0iMiIvPjwvZz48L2c+PC9zdmc+')]" />
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-white/10 rounded-full blur-3xl" />

                    <div className="relative mx-auto max-w-4xl px-6 text-center">
                        <h2 className="text-4xl font-bold text-white sm:text-5xl">
                            Ready to Start Earning?
                        </h2>
                        <p className="mt-6 text-xl text-emerald-100 max-w-2xl mx-auto">
                            Apply today and start earning 22% commission on every referral.
                            No upfront costs, no hidden fees, just recurring revenue.
                        </p>
                        <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
                            <Link
                                href="/contact"
                                className="group inline-flex items-center justify-center rounded-xl bg-white px-8 py-4 text-base font-semibold text-emerald-600 shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all duration-200"
                            >
                                Apply to Become an Affiliate
                                <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
                            </Link>
                        </div>
                        <p className="mt-8 text-emerald-200 text-sm">
                            Applications are reviewed within 24-48 hours
                        </p>
                    </div>
                </section>
            </main>
            <Footer />
            <VoiceAgentLauncher />
        </>
    );
}
