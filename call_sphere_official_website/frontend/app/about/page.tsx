import { Metadata } from "next";
import Link from "next/link";
import {
    Phone,
    Mail,
    MapPin,
    Clock,
    Globe,
    Shield,
    Zap,
    Target,
    CheckCircle2,
    ArrowRight,
    Mic,
    MessageSquare,
    ShoppingCart,
    HeadphonesIcon,
    Calendar,
    CreditCard,
    BarChart3,
    Lock,
    Layers,
} from "lucide-react"; import { Footer } from "@/components/Footer";
import { Nav } from "@/components/Nav";
import { Button } from "@/components/Button";
import { VoiceAgentLauncher } from "@/components/VoiceAgentLauncher";

export const metadata: Metadata = {
    title: "About CallSphere - AI Voice & Chat Agents for Enterprise Automation",
    description:
        "Learn about CallSphere LLC, the enterprise automation platform specializing in AI-powered agentic voice and chat agents that transform customer interactions into completed transactions.",
};

const coreValues = [
    {
        icon: Target,
        title: "Mission-Driven",
        description:
            "Transform inbound communications into completed transactions, resolved support cases, and scheduled services.",
    },
    {
        icon: Globe,
        title: "24/7 Global Coverage",
        description:
            "Our AI agents operate continuously worldwide, ensuring businesses automate customer interactions regardless of timezone.",
    },
    {
        icon: Shield,
        title: "Security First",
        description:
            "PCI-compliant payment processing, PII vaulting, and comprehensive audit logs protect your data.",
    },
    {
        icon: Zap,
        title: "Instant Results",
        description:
            "Most businesses have agents live within days, not weeks—with zero-code configuration.",
    },
];

const agentCapabilities = [
    {
        icon: ShoppingCart,
        title: "Order Placement & Checkout",
        description: "Complete end-to-end order processing with cart building and PCI-compliant payments.",
    },
    {
        icon: HeadphonesIcon,
        title: "Customer Support",
        description: "Resolve 91% of tier-one queries without human escalation.",
    },
    {
        icon: Calendar,
        title: "Appointment Scheduling",
        description: "Intelligent booking with reminders and rescheduling capabilities.",
    },
    {
        icon: CreditCard,
        title: "Secure Payments",
        description: "PCI-compliant handoff to Stripe, Square, and other processors.",
    },
    {
        icon: BarChart3,
        title: "Real-Time Analytics",
        description: "Heatmaps, topic modeling, and CSAT insights to optimize performance.",
    },
    {
        icon: Lock,
        title: "Data Protection",
        description: "Encrypted PII vaulting with role-based access controls.",
    },
];

const stats = [
    { value: "92%", label: "Order Closure Rate" },
    { value: "35%", label: "Reduced Handling Time" },
    { value: "91%", label: "Tier-1 Auto-Resolution" },
    { value: "42%", label: "Faster Order Completion" },
];

const processSteps = [
    {
        step: "01",
        title: "Discover",
        description:
            "The agent listens to or reads the customer's request and understands their intent using semantic understanding—meaning, not just keywords.",
    },
    {
        step: "02",
        title: "Decide",
        description:
            "Apply relevant filters and constraints: dietary restrictions, price ranges, availability, insurance coverage. Build a cart or proposal based on these decisions.",
    },
    {
        step: "03",
        title: "Complete",
        description:
            "Process the transaction through secure channels, confirm via SMS/email, and provide tracking information with escalation paths for follow-up.",
    },
];

export default function AboutPage() {
    return (
        <>
            <Nav />
            <main id="main" className="relative">
                {/* Hero Section */}
                <section className="section-stack relative overflow-hidden">
                    <div className="absolute inset-0 -z-10 bg-gradient-to-b from-gray-50 via-white to-white" />
                    <div className="mx-auto max-w-4xl text-center">
                        <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-gray-200 bg-gray-50 px-4 py-2 text-sm text-gray-600">
                            <Globe className="h-4 w-4" />
                            Enterprise Automation Platform
                        </div>
                        <h1 className="text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl lg:text-6xl">
                            AI-Powered Agentic Voice & Chat Agents
                        </h1>
                        <p className="mt-6 text-lg text-slate-600 sm:text-xl">
                            CallSphere LLC specializes in deploying intelligent agentic systems that automate
                            customer interactions across voice and text channels, transforming communications
                            into completed transactions.
                        </p>
                        <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
                            <Button size="lg" asChild>
                                <Link href="/contact">
                                    Get Started
                                    <ArrowRight className="h-4 w-4" />
                                </Link>
                            </Button>
                            <Button variant="secondary" size="lg" asChild>
                                <Link href="/pricing">View Pricing</Link>
                            </Button>
                        </div>
                    </div>
                </section>

                {/* Contact Info Bar */}
                <section className="section-stack">
                    <div className="grid gap-4 rounded-xl border border-gray-200 bg-white p-6 shadow-sm sm:grid-cols-2 lg:grid-cols-4">
                        <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gray-100">
                                <MapPin className="h-5 w-5 text-gray-600" />
                            </div>
                            <div>
                                <p className="text-xs text-slate-600">Headquarters</p>
                                <p className="text-sm font-medium text-slate-900">27 Orchard Pl, New York, NY</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gray-100">
                                <Mail className="h-5 w-5 text-gray-600" />
                            </div>
                            <div>
                                <p className="text-xs text-slate-600">Email</p>
                                <a href="mailto:sagar@callsphere.tech" className="text-sm font-medium text-slate-900 hover:text-gray-600">
                                    sagar@callsphere.tech
                                </a>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gray-100">
                                <Phone className="h-5 w-5 text-gray-600" />
                            </div>
                            <div>
                                <p className="text-xs text-slate-600">Phone</p>
                                <a href="tel:18453884261" className="text-sm font-medium text-slate-900 hover:text-gray-600">
                                    (845) 388-4261
                                </a>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gray-100">
                                <Clock className="h-5 w-5 text-gray-600" />
                            </div>
                            <div>
                                <p className="text-xs text-slate-600">Support Hours</p>
                                <p className="text-sm font-medium text-slate-900">9am - 7pm ET | Agents 24/7</p>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Core Values */}
                <section className="section-stack">
                    <div className="mx-auto max-w-2xl text-center">
                        <h2 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">What Drives Us</h2>
                        <p className="mt-4 text-slate-600">
                            Our mission is to transform how businesses handle customer interactions through
                            intelligent automation.
                        </p>
                    </div>
                    <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
                        {coreValues.map((value) => (
                            <div
                                key={value.title}
                                className="group rounded-xl border border-gray-200 bg-white p-6 shadow-sm transition hover:border-gray-300 hover:shadow-md"
                            >
                                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-gray-100">
                                    <value.icon className="h-6 w-6 text-gray-700" />
                                </div>
                                <h3 className="text-lg font-semibold text-slate-900">{value.title}</h3>
                                <p className="mt-2 text-sm text-slate-600">{value.description}</p>
                            </div>
                        ))}
                    </div>
                </section>

                {/* Two Products Section */}
                <section className="section-stack">
                    <div className="mx-auto max-w-2xl text-center">
                        <h2 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
                            Two Complementary AI Agents
                        </h2>
                        <p className="mt-4 text-slate-600">
                            Voice and chat agents that work together for comprehensive customer interaction
                            coverage.
                        </p>
                    </div>
                    <div className="mt-12 grid gap-8 lg:grid-cols-2">
                        {/* Voice Agents */}
                        <div className="relative overflow-hidden rounded-xl border border-gray-200 bg-white p-8 shadow-sm">
                            <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-gray-100 blur-3xl" />
                            <div className="relative">
                                <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-gray-100">
                                    <Mic className="h-8 w-8 text-gray-700" />
                                </div>
                                <h3 className="text-2xl font-bold text-slate-900">Agentic Voice Agents</h3>
                                <p className="mt-3 text-slate-600">
                                    Our flagship offering. AI-powered voice systems that orchestrate the complete
                                    customer journey from initial intent understanding through transaction completion.
                                </p>
                                <ul className="mt-6 space-y-3">
                                    {[
                                        "Catalog search with semantic understanding",
                                        "Cart building & PCI-compliant checkout",
                                        "No hold music or handoffs",
                                        "SMS/Email confirmation",
                                    ].map((item) => (
                                        <li key={item} className="flex items-start gap-3 text-sm text-slate-600">
                                            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-gray-500" />
                                            {item}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        </div>

                        {/* Chatbot Agents */}
                        <div className="relative overflow-hidden rounded-xl border border-gray-200 bg-white p-8 shadow-sm">
                            <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-gray-100 blur-3xl" />
                            <div className="relative">
                                <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-gray-100">
                                    <MessageSquare className="h-8 w-8 text-gray-700" />
                                </div>
                                <h3 className="text-2xl font-bold text-slate-900">Agentic Chatbot Agents</h3>
                                <p className="mt-3 text-slate-600">
                                    Text-based intelligent automation for customers who prefer written communication.
                                    Uses the same orchestration engine as voice agents.
                                </p>
                                <ul className="mt-6 space-y-3">
                                    {[
                                        "Conversational product discovery",
                                        "Secure chat payment processing",
                                        "Support ticket management",
                                        "Real-time order status updates",
                                    ].map((item) => (
                                        <li key={item} className="flex items-start gap-3 text-sm text-slate-600">
                                            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-gray-500" />
                                            {item}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Stats Section */}
                <section className="section-stack">
                    <div className="rounded-xl border border-gray-200 bg-gray-50 p-8 sm:p-12">
                        <div className="mx-auto max-w-2xl text-center">
                            <h2 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
                                Proven Results & Performance
                            </h2>
                            <p className="mt-4 text-slate-600">
                                Measurable business outcomes across customer interaction metrics.
                            </p>
                        </div>
                        <div className="mt-10 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
                            {stats.map((stat) => (
                                <div key={stat.label} className="text-center">
                                    <div className="text-4xl font-bold text-slate-900 sm:text-5xl">{stat.value}</div>
                                    <p className="mt-2 text-sm text-slate-600">{stat.label}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

                {/* Capabilities Grid */}
                <section className="section-stack">
                    <div className="mx-auto max-w-2xl text-center">
                        <h2 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">Key Capabilities</h2>
                        <p className="mt-4 text-slate-600">
                            Both voice and chatbot agents share a unified set of capabilities for comprehensive
                            business automation.
                        </p>
                    </div>
                    <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                        {agentCapabilities.map((capability) => (
                            <div
                                key={capability.title}
                                className="flex gap-4 rounded-xl border border-gray-200 bg-white p-6 shadow-sm transition hover:border-gray-300 hover:shadow-md"
                            >
                                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gray-100">
                                    <capability.icon className="h-6 w-6 text-gray-700" />
                                </div>
                                <div>
                                    <h3 className="font-semibold text-slate-900">{capability.title}</h3>
                                    <p className="mt-1 text-sm text-slate-600">{capability.description}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </section>

                {/* How It Works Process */}
                <section className="section-stack">
                    <div className="mx-auto max-w-2xl text-center">
                        <h2 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
                            How Agentic Agents Work
                        </h2>
                        <p className="mt-4 text-slate-600">
                            A consistent three-step workflow ensures seamless customer experience across all
                            channels.
                        </p>
                    </div>
                    <div className="mt-12 grid gap-8 lg:grid-cols-3">
                        {processSteps.map((step, index) => (
                            <div key={step.step} className="relative">
                                {index < processSteps.length - 1 && (
                                    <div className="absolute left-1/2 top-16 hidden h-px w-full bg-gradient-to-r from-gray-300 to-transparent lg:block" />
                                )}
                                <div className="relative rounded-xl border border-gray-200 bg-white p-8 text-center shadow-sm">
                                    <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-gray-900 text-xl font-bold text-white">
                                        {step.step}
                                    </div>
                                    <h3 className="text-xl font-semibold text-slate-900">{step.title}</h3>
                                    <p className="mt-3 text-sm text-slate-600">{step.description}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </section>

                {/* Integration Ecosystem */}
                <section className="section-stack">
                    <div className="grid gap-12 lg:grid-cols-2 lg:items-center">
                        <div>
                            <h2 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
                                Seamless Integration Ecosystem
                            </h2>
                            <p className="mt-4 text-slate-600">
                                CallSphere agents integrate with the business systems and platforms you already
                                rely on—no rip-and-replace required.
                            </p>
                            <div className="mt-8 space-y-6">
                                <div>
                                    <h4 className="flex items-center gap-2 font-semibold text-slate-900">
                                        <Layers className="h-5 w-5 text-gray-600" />
                                        Telephony & Commerce
                                    </h4>
                                    <p className="mt-1 text-sm text-slate-600">
                                        Twilio, Shopify, WooCommerce, Stripe, Square
                                    </p>
                                </div>
                                <div>
                                    <h4 className="flex items-center gap-2 font-semibold text-slate-900">
                                        <Layers className="h-5 w-5 text-gray-600" />
                                        Data & Storage
                                    </h4>
                                    <p className="mt-1 text-sm text-slate-600">
                                        Weaviate, Milvus, Qdrant, PostgreSQL
                                    </p>
                                </div>
                                <div>
                                    <h4 className="flex items-center gap-2 font-semibold text-slate-900">
                                        <Layers className="h-5 w-5 text-gray-600" />
                                        CRM & Support
                                    </h4>
                                    <p className="mt-1 text-sm text-slate-600">
                                        HubSpot, Zendesk, Freshdesk, Salesforce
                                    </p>
                                </div>
                            </div>
                        </div>
                        <div className="relative">
                            <div className="grid grid-cols-3 gap-4">
                                {[
                                    "Twilio",
                                    "Shopify",
                                    "Stripe",
                                    "HubSpot",
                                    "Zendesk",
                                    "Square",
                                    "Salesforce",
                                    "PostgreSQL",
                                    "Freshdesk",
                                ].map((integration) => (
                                    <div
                                        key={integration}
                                        className="flex h-20 items-center justify-center rounded-xl border border-gray-200 bg-white text-sm font-medium text-slate-900 shadow-sm transition hover:border-gray-300 hover:shadow-md"
                                    >
                                        {integration}
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </section>

                {/* CTA Section */}
                <section className="section-stack">
                    <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-indigo-600/80 via-indigo-500/70 to-cyan-500/70 px-8 py-16 text-center shadow-glow sm:px-12">
                        <div className="absolute inset-0 -z-10 opacity-40">
                            <div className="noise-overlay" />
                        </div>
                        <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
                            Ready to Transform Your Customer Interactions?
                        </h2>
                        <p className="mx-auto mt-4 max-w-2xl text-indigo-50/90">
                            Book a 30-minute walkthrough to see how CallSphere voice and chat agents can
                            automate your ordering, support, and scheduling.
                        </p>
                        <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
                            <Button size="lg" className="shadow-xl shadow-indigo-800/30" asChild>
                                <Link href="/contact">
                                    Schedule a Demo
                                    <ArrowRight className="h-4 w-4" />
                                </Link>
                            </Button>
                            <Button variant="secondary" size="lg" asChild>
                                <a href="tel:18453884261">
                                    <Phone className="h-4 w-4" />
                                    Call (845) 388-4261
                                </a>
                            </Button>
                        </div>
                    </div>
                </section>
            </main>
            <Footer />
            <VoiceAgentLauncher />
        </>
    );
}
