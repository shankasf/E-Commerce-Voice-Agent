import { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  AlertTriangle,
  ArrowRight,
  Calendar,
  CheckCircle2,
  Clock,
  CreditCard,
  DollarSign,
  Factory,
  FileText,
  Headphones,
  Heart,
  ListChecks,
  Moon,
  Phone,
  Search,
  ShoppingCart,
  Sparkles,
  TrendingUp,
  Truck,
  Users,
  Zap,
} from "lucide-react";

import { Nav } from "@/components/Nav";
import { Footer } from "@/components/Footer";
import { VoiceAgentLauncher } from "@/components/VoiceAgentLauncher";
import { BreadcrumbJsonLd } from "@/components/StructuredData";

/* ------------------------------------------------------------------ */
/*  Solution data                                                      */
/* ------------------------------------------------------------------ */

type Solution = {
  slug: string;
  name: string;
  metaTitle: string;
  metaDescription: string;
  headline: string;
  heroDescription: string;
  heroIcon: React.ElementType;
  howItWorks: { step: number; title: string; description: string }[];
  benefits: { title: string; description: string }[];
  industries: string[];
  stats: { value: string; label: string }[];
  features: string[];
  ctaHeading: string;
  ctaDescription: string;
};

const solutions: Record<string, Solution> = {
  "appointment-scheduling": {
    slug: "appointment-scheduling",
    name: "Appointment Scheduling",
    metaTitle: "AI Appointment Scheduling Bot | CallSphere",
    metaDescription:
      "Automate appointment booking, rescheduling, and reminders with CallSphere's AI voice agent. Sync calendars, reduce no-shows by 40%, and let customers self-serve 24/7.",
    headline: "Automated Appointment Scheduling That Never Sleeps",
    heroDescription:
      "Let an AI voice agent handle bookings, rescheduling, and reminders around the clock. Sync with your calendar in real time, reduce no-shows, and free your staff to focus on what matters.",
    heroIcon: Calendar,
    howItWorks: [
      {
        step: 1,
        title: "Customer calls or chats",
        description:
          "The AI agent greets the caller, understands their intent, and checks real-time availability across providers, locations, and time slots.",
      },
      {
        step: 2,
        title: "Booking confirmed instantly",
        description:
          "The agent books the appointment, syncs it to your calendar (Google, Outlook, or custom EHR), and sends an instant confirmation via SMS or email.",
      },
      {
        step: 3,
        title: "Automated reminders & follow-ups",
        description:
          "Patients and clients receive automated reminders 24 hours and 1 hour before their appointment, with easy options to reschedule or cancel.",
      },
    ],
    benefits: [
      {
        title: "Reduce no-shows by 40%",
        description:
          "Automated reminders via SMS and voice keep patients and clients on track, drastically cutting missed appointments.",
      },
      {
        title: "24/7 self-service booking",
        description:
          "Customers book at their convenience — evenings, weekends, holidays — without waiting for office hours.",
      },
      {
        title: "Calendar sync",
        description:
          "Real-time integration with Google Calendar, Outlook, and industry-specific systems ensures zero double-bookings.",
      },
      {
        title: "Multi-location support",
        description:
          "Route appointments to the right provider and location based on service type, availability, and customer preference.",
      },
      {
        title: "Rescheduling & cancellations",
        description:
          "Customers can reschedule or cancel via a simple voice command or chat message — no hold times, no friction.",
      },
    ],
    industries: [
      "Healthcare & Dental",
      "Salons & Spas",
      "HVAC & Home Services",
      "Legal & Financial Services",
      "Fitness & Wellness",
    ],
    stats: [
      { value: "40%", label: "Reduction in no-shows" },
      { value: "24/7", label: "Booking availability" },
      { value: "< 3s", label: "Average booking time" },
      { value: "95%", label: "Customer satisfaction" },
    ],
    features: [
      "Real-time availability checks",
      "Multi-provider & multi-location routing",
      "SMS & email confirmations",
      "Automated reminder sequences",
      "Rescheduling & cancellation handling",
      "Calendar sync (Google, Outlook, EHR)",
      "Waitlist management",
      "Multi-language support (57+ languages)",
    ],
    ctaHeading: "Stop losing revenue to missed appointments",
    ctaDescription:
      "Book a demo and see how CallSphere's AI scheduling agent fills your calendar, reduces no-shows, and delights customers — without adding headcount.",
  },

  "order-processing": {
    slug: "order-processing",
    name: "Order Processing",
    metaTitle: "AI Order Processing Agent | CallSphere",
    metaDescription:
      "Automate phone and chat orders with CallSphere's AI agent. Product lookup, cart building, upselling, and order confirmation — all handled by voice or chat.",
    headline: "AI-Powered Order Processing, From Call to Confirmation",
    heroDescription:
      "Your AI agent looks up products, builds carts, confirms orders, and even upsells — all through natural voice or chat conversations. Faster orders, fewer errors, happier customers.",
    heroIcon: ShoppingCart,
    howItWorks: [
      {
        step: 1,
        title: "Customer places an order",
        description:
          "The AI agent understands natural language orders, looks up your product catalog in real time, and confirms item details including pricing and availability.",
      },
      {
        step: 2,
        title: "Cart built & upsells offered",
        description:
          "Items are added to a cart with accurate pricing. The agent intelligently suggests complementary products and current promotions to increase average order value.",
      },
      {
        step: 3,
        title: "Order confirmed & dispatched",
        description:
          "The customer confirms the order, payment is processed securely, and an order confirmation with tracking is sent via SMS or email.",
      },
    ],
    benefits: [
      {
        title: "Increase average order value",
        description:
          "Smart upselling and cross-selling recommendations boost revenue by 15-25% per order.",
      },
      {
        title: "Eliminate order errors",
        description:
          "AI confirms every item, quantity, and special instruction — reducing costly mistakes and returns.",
      },
      {
        title: "Handle peak volume",
        description:
          "Scale to thousands of concurrent orders during rush hours without hiring seasonal staff.",
      },
      {
        title: "Real-time inventory sync",
        description:
          "Integrates with your POS and inventory system to show only available items and accurate pricing.",
      },
      {
        title: "Multi-channel orders",
        description:
          "Accept orders via phone, chat, and web — all processed through a single unified system.",
      },
      {
        title: "Order modification & tracking",
        description:
          "Customers can modify or track their orders by calling or chatting, with instant status updates.",
      },
    ],
    industries: [
      "Restaurants & QSR",
      "Retail & E-commerce",
      "Wholesale & Distribution",
      "Pharmacies",
      "Catering & Events",
    ],
    stats: [
      { value: "20%", label: "Higher order value" },
      { value: "99.5%", label: "Order accuracy" },
      { value: "3x", label: "Faster order processing" },
      { value: "0", label: "Orders lost to hold times" },
    ],
    features: [
      "Natural language order understanding",
      "Real-time product catalog lookup",
      "Intelligent upselling & cross-selling",
      "Cart management & modification",
      "POS & inventory integration",
      "SMS/email order confirmations",
      "Order tracking & status updates",
      "Multi-language ordering (57+ languages)",
    ],
    ctaHeading: "Never miss an order again",
    ctaDescription:
      "See how CallSphere's AI order agent handles high-volume ordering with zero hold times, fewer errors, and higher average order values.",
  },

  "payment-collection": {
    slug: "payment-collection",
    name: "Payment Collection",
    metaTitle: "AI Payment Collection Agent | CallSphere",
    metaDescription:
      "Automate payment collection, invoice reminders, and payment plans with CallSphere's AI voice agent. Secure Stripe integration, PCI-compliant, and available 24/7.",
    headline: "Secure, Automated Payment Collection via Voice & Chat",
    heroDescription:
      "Collect payments, send invoice reminders, set up payment plans, and process refunds — all through conversational AI. PCI-compliant and integrated with Stripe for secure transactions.",
    heroIcon: CreditCard,
    howItWorks: [
      {
        step: 1,
        title: "Payment reminder sent",
        description:
          "The AI agent proactively contacts customers with outstanding balances via voice call, SMS, or chat — with a friendly, professional tone that preserves the relationship.",
      },
      {
        step: 2,
        title: "Secure payment captured",
        description:
          "Customers pay securely over the phone or via a payment link. Stripe handles card processing with full PCI-DSS compliance — no sensitive data touches your servers.",
      },
      {
        step: 3,
        title: "Receipt & reconciliation",
        description:
          "An instant receipt is sent to the customer and the payment is automatically reconciled in your billing system, updating the account balance in real time.",
      },
    ],
    benefits: [
      {
        title: "Recover overdue payments",
        description:
          "Automated reminders and follow-up calls recover 30-50% more overdue payments compared to manual collection.",
      },
      {
        title: "PCI-DSS compliant",
        description:
          "Stripe integration ensures all card data is handled securely. No sensitive payment information is stored on CallSphere servers.",
      },
      {
        title: "Payment plan setup",
        description:
          "The AI agent can offer and set up installment plans based on your rules, making it easier for customers to pay.",
      },
      {
        title: "Refund processing",
        description:
          "Handle refund requests conversationally — the agent verifies the transaction and processes approved refunds automatically.",
      },
      {
        title: "Invoice reminders",
        description:
          "Scheduled reminder sequences via call, SMS, and email ensure customers are prompted before and after due dates.",
      },
    ],
    industries: [
      "Healthcare & Medical Billing",
      "Property Management",
      "Utilities & Telecom",
      "Insurance",
      "Professional Services",
    ],
    stats: [
      { value: "45%", label: "More payments recovered" },
      { value: "60%", label: "Reduction in DSO" },
      { value: "24/7", label: "Payment availability" },
      { value: "100%", label: "PCI-DSS compliant" },
    ],
    features: [
      "Secure payment capture via Stripe",
      "Automated invoice reminders",
      "Payment plan setup & management",
      "Refund processing",
      "Multi-channel outreach (call, SMS, email)",
      "Real-time billing system sync",
      "Custom reminder schedules",
      "Multi-language support (57+ languages)",
    ],
    ctaHeading: "Get paid faster with zero awkward conversations",
    ctaDescription:
      "Let CallSphere's AI agent handle payment reminders and collections with professionalism and compliance. Book a demo to see it in action.",
  },

  "customer-support": {
    slug: "customer-support",
    name: "Customer Support",
    metaTitle: "AI Customer Support Agent | CallSphere",
    metaDescription:
      "Resolve FAQs, create tickets, provide status updates, and escalate to humans — all with CallSphere's AI customer support agent. Reduce support costs by 60%.",
    headline: "AI Customer Support That Resolves, Not Just Responds",
    heroDescription:
      "Go beyond scripted IVRs. CallSphere's AI agent actually resolves customer issues — answering FAQs, creating tickets, providing real-time status updates, and seamlessly escalating complex cases to human agents.",
    heroIcon: Headphones,
    howItWorks: [
      {
        step: 1,
        title: "Customer describes their issue",
        description:
          "The AI agent listens to the customer's problem in natural language, classifies the intent, and pulls up relevant account information and knowledge base articles.",
      },
      {
        step: 2,
        title: "Issue resolved or ticket created",
        description:
          "For common issues, the agent resolves them on the spot. For complex cases, it creates a detailed support ticket with full context and routes it to the right team.",
      },
      {
        step: 3,
        title: "Follow-up & escalation",
        description:
          "Customers receive status updates proactively. If the issue requires human intervention, the agent transfers with full context so the customer never repeats themselves.",
      },
    ],
    benefits: [
      {
        title: "60% cost reduction",
        description:
          "Resolve the majority of support requests automatically, freeing human agents for high-value interactions.",
      },
      {
        title: "Instant resolution for FAQs",
        description:
          "Common questions about hours, policies, account info, and troubleshooting are answered immediately — no queue.",
      },
      {
        title: "Smart ticket creation",
        description:
          "When a ticket is needed, the AI captures all relevant details, categorizes the issue, and assigns priority automatically.",
      },
      {
        title: "Seamless human escalation",
        description:
          "Complex issues are transferred to human agents with full conversation context — no cold transfers, no repeated explanations.",
      },
      {
        title: "Real-time status updates",
        description:
          "Customers can check ticket status, order tracking, and service updates through a quick call or chat.",
      },
      {
        title: "Sentiment detection",
        description:
          "The AI detects frustrated or upset customers and prioritizes escalation to prevent churn.",
      },
    ],
    industries: [
      "SaaS & Technology",
      "E-commerce & Retail",
      "Telecommunications",
      "Financial Services",
      "Healthcare",
    ],
    stats: [
      { value: "60%", label: "Support cost reduction" },
      { value: "< 10s", label: "Average response time" },
      { value: "85%", label: "First-call resolution" },
      { value: "4.8/5", label: "Customer satisfaction" },
    ],
    features: [
      "Natural language understanding",
      "Knowledge base integration",
      "Automated ticket creation & routing",
      "Real-time status & tracking updates",
      "Sentiment analysis & escalation",
      "CRM integration (Salesforce, HubSpot)",
      "Call recording & transcript logging",
      "Multi-language support (57+ languages)",
    ],
    ctaHeading: "Deliver world-class support at a fraction of the cost",
    ctaDescription:
      "See how CallSphere's AI support agent resolves issues faster, creates better tickets, and keeps customers happy — all without growing your team.",
  },

  "after-hours-answering": {
    slug: "after-hours-answering",
    name: "After-Hours Answering",
    metaTitle: "AI After-Hours Answering Service | CallSphere",
    metaDescription:
      "Never miss a call again. CallSphere's AI after-hours agent handles calls 24/7 — routing emergencies, taking messages, and scheduling appointments while you sleep.",
    headline: "24/7 AI Answering — Every Call Handled, Every Time",
    heroDescription:
      "When your office closes, CallSphere opens. Our AI agent answers every call after hours — routing emergencies to on-call staff, taking detailed messages, and even booking next-day appointments.",
    heroIcon: Moon,
    howItWorks: [
      {
        step: 1,
        title: "Call answered instantly",
        description:
          "Every after-hours call is answered within 2 rings by an AI agent that greets the caller professionally and identifies their needs through natural conversation.",
      },
      {
        step: 2,
        title: "Triaged & routed",
        description:
          "Emergencies are immediately routed to on-call staff via call transfer or SMS alert. Non-urgent inquiries are logged as detailed messages for the next business day.",
      },
      {
        step: 3,
        title: "Messages & appointments delivered",
        description:
          "Your team starts the day with organized messages, new appointment bookings, and a summary of after-hours activity — ready to follow up.",
      },
    ],
    benefits: [
      {
        title: "Never miss a lead",
        description:
          "After-hours callers are potential customers. Capture every inquiry and book appointments before competitors respond.",
      },
      {
        title: "Emergency routing",
        description:
          "Critical calls are escalated immediately to on-call staff via phone transfer, SMS, or email — based on your custom rules.",
      },
      {
        title: "Detailed message taking",
        description:
          "The AI captures caller name, number, reason for calling, urgency level, and any specific details — delivered in organized summaries.",
      },
      {
        title: "Appointment scheduling",
        description:
          "Callers can book next-day or future appointments during the after-hours call, so your calendar fills up overnight.",
      },
      {
        title: "Cost-effective 24/7 coverage",
        description:
          "Replace expensive answering services or night-shift staff with an AI agent that costs a fraction and never calls in sick.",
      },
    ],
    industries: [
      "HVAC & Plumbing",
      "Medical Practices & Clinics",
      "Legal Firms",
      "Property Management",
      "Veterinary Clinics",
    ],
    stats: [
      { value: "100%", label: "Calls answered" },
      { value: "< 5s", label: "Average answer time" },
      { value: "35%", label: "More leads captured" },
      { value: "90%", label: "Cost savings vs. live service" },
    ],
    features: [
      "Instant call answering (< 2 rings)",
      "Emergency call routing & escalation",
      "Detailed message capture & delivery",
      "After-hours appointment booking",
      "Custom greeting & business rules",
      "On-call staff SMS/email alerts",
      "Daily activity summary reports",
      "Multi-language support (57+ languages)",
    ],
    ctaHeading: "Your business never sleeps — neither should your phone",
    ctaDescription:
      "See how CallSphere's AI after-hours agent captures leads, routes emergencies, and books appointments while your team rests.",
  },

  "lead-qualification": {
    slug: "lead-qualification",
    name: "Lead Qualification",
    metaTitle: "AI Lead Qualification Agent | CallSphere",
    metaDescription:
      "Qualify leads automatically with CallSphere's AI voice agent. Score prospects, ask qualifying questions, route hot leads to sales, and book meetings 24/7.",
    headline: "AI Lead Qualification That Never Stops Selling",
    heroDescription:
      "Your AI agent qualifies every inbound lead in real time — asking the right questions, scoring interest, routing hot prospects to sales, and booking meetings. No lead falls through the cracks.",
    heroIcon: Search,
    howItWorks: [
      {
        step: 1,
        title: "Lead calls or chats in",
        description:
          "The AI agent greets the prospect warmly, identifies their intent, and begins the qualification flow. Whether the lead comes from a paid ad, organic search, or referral, the agent adapts the conversation to gather key information.",
      },
      {
        step: 2,
        title: "Qualifying questions asked",
        description:
          "The agent walks through your custom qualification criteria — budget, timeline, authority, and need (BANT) — in a natural, conversational tone. Responses are scored in real time against your ideal customer profile.",
      },
      {
        step: 3,
        title: "Lead scored and routed",
        description:
          "Hot leads are instantly transferred to a sales rep or have a meeting booked on the spot. Warm leads receive automated follow-up sequences, and all data is pushed to your CRM with full conversation context.",
      },
    ],
    benefits: [
      {
        title: "Never miss a lead",
        description:
          "Every inbound call and chat is answered instantly, 24 hours a day. No more leads bouncing to voicemail or abandoning a chat window during off-hours.",
      },
      {
        title: "Consistent qualification criteria",
        description:
          "The AI follows your exact qualification playbook every single time. No shortcuts, no forgotten questions, no subjective scoring — just reliable, repeatable qualification.",
      },
      {
        title: "Instant CRM updates",
        description:
          "Lead data, qualification scores, and conversation transcripts are pushed to Salesforce, HubSpot, or your CRM of choice in real time. Your sales team always has the full picture.",
      },
      {
        title: "24/7 lead capture",
        description:
          "Prospects research and reach out at all hours. Your AI agent is always available to engage, qualify, and book meetings — even at 2 AM on a Sunday.",
      },
      {
        title: "Higher conversion rates",
        description:
          "By responding to every lead in under 30 seconds and asking the right questions, qualified leads convert at significantly higher rates than those left waiting.",
      },
    ],
    industries: [
      "SaaS & Technology",
      "Real Estate",
      "Financial Services",
      "Insurance",
      "Professional Services",
    ],
    stats: [
      { value: "45%", label: "More qualified leads" },
      { value: "24/7", label: "Capture rate" },
      { value: "< 30s", label: "Response time" },
      { value: "3x", label: "Sales efficiency" },
    ],
    features: [
      "Natural language qualification",
      "Custom scoring criteria",
      "CRM auto-population",
      "Meeting scheduling",
      "Lead routing rules",
      "Call recording & transcripts",
      "Multi-language support",
      "SMS/email follow-up",
    ],
    ctaHeading: "Stop losing leads to voicemail",
    ctaDescription:
      "See how CallSphere's AI lead qualification agent captures and qualifies every prospect 24/7. Book a demo today.",
  },

  "emergency-dispatch": {
    slug: "emergency-dispatch",
    name: "Emergency Dispatch",
    metaTitle: "AI Emergency Dispatch Agent | CallSphere",
    metaDescription:
      "Automate emergency call triage and dispatch with CallSphere's AI. Prioritize urgency, route to on-call staff, and coordinate response 24/7.",
    headline: "AI Emergency Dispatch — Every Critical Call Handled Instantly",
    heroDescription:
      "Triage emergency calls, assess urgency, dispatch the right team member, and coordinate response — all in seconds. AI that keeps your emergency response running 24/7/365.",
    heroIcon: AlertTriangle,
    howItWorks: [
      {
        step: 1,
        title: "Emergency call received",
        description:
          "The AI agent answers every call instantly — no hold music, no menu trees. It greets the caller, identifies the nature of the emergency, and begins gathering critical details such as location, severity, and affected systems.",
      },
      {
        step: 2,
        title: "Urgency classified",
        description:
          "Using your custom triage rules, the agent categorizes the situation as critical, urgent, or routine. Critical emergencies bypass all queues and trigger immediate dispatch, while routine matters are logged for standard follow-up.",
      },
      {
        step: 3,
        title: "Dispatch and notify",
        description:
          "The right on-call team member is contacted via phone, SMS, or push notification within seconds. A detailed incident ticket is created automatically with all caller-provided details, timestamps, and classification data.",
      },
    ],
    benefits: [
      {
        title: "Zero missed emergencies",
        description:
          "Every call is answered within seconds, regardless of time of day or call volume. No emergency goes unheard, even during peak periods or holidays.",
      },
      {
        title: "Instant triage",
        description:
          "The AI classifies urgency in real time using your custom severity criteria. Critical situations are escalated immediately while routine requests are queued appropriately.",
      },
      {
        title: "On-call routing",
        description:
          "Integrates with your on-call schedule to contact the right person every time. If the primary contact doesn't respond, the agent automatically escalates through your backup chain.",
      },
      {
        title: "Complete audit trail",
        description:
          "Every call, classification decision, and dispatch action is logged with timestamps. Full recordings and transcripts are available for compliance reviews and after-action analysis.",
      },
      {
        title: "Reduced response times",
        description:
          "By eliminating manual call screening and dispatch delays, average response times drop by 60% or more. Faster response means less damage and better outcomes.",
      },
    ],
    industries: [
      "HVAC & Plumbing",
      "Property Management",
      "Healthcare",
      "IT Support & MSPs",
      "Security Services",
    ],
    stats: [
      { value: "< 10s", label: "Triage time" },
      { value: "100%", label: "Calls answered" },
      { value: "24/7", label: "Coverage" },
      { value: "60%", label: "Faster dispatch" },
    ],
    features: [
      "Instant call answering",
      "Urgency classification",
      "On-call staff routing",
      "SMS/call/email alerts",
      "Escalation chains",
      "Incident logging",
      "GPS-based dispatch",
      "After-action reports",
    ],
    ctaHeading: "Never miss a critical call again",
    ctaDescription:
      "CallSphere's AI emergency dispatch agent answers, triages, and dispatches 24/7. See it handle a real emergency scenario.",
  },

  "patient-intake": {
    slug: "patient-intake",
    name: "Patient Intake",
    metaTitle: "AI Patient Intake Agent | CallSphere",
    metaDescription:
      "Automate patient intake with HIPAA-compliant AI voice agents. Collect demographics, insurance info, and medical history before the visit. Reduce check-in time by 70%.",
    headline: "AI Patient Intake That Saves 15 Minutes Per Visit",
    heroDescription:
      "Collect patient demographics, insurance information, medical history, and consent forms via AI voice or chat before the visit. HIPAA-compliant, with signed BAA available.",
    heroIcon: Heart,
    howItWorks: [
      {
        step: 1,
        title: "Patient contacted before visit",
        description:
          "The AI agent reaches out to the patient 24-48 hours before their appointment via phone call or a secure chat link sent by SMS. The process is seamless — patients simply answer questions conversationally, no forms required.",
      },
      {
        step: 2,
        title: "Information collected",
        description:
          "The agent walks the patient through demographics, insurance details, current medications, allergies, and medical history using natural conversation. Data is validated in real time to ensure completeness and accuracy.",
      },
      {
        step: 3,
        title: "Data synced to EHR",
        description:
          "All collected information is automatically mapped and pushed to your EHR or EMR system. When the patient arrives, their chart is already populated and the front desk can focus on welcoming them rather than processing paperwork.",
      },
    ],
    benefits: [
      {
        title: "70% faster check-in",
        description:
          "With demographics, insurance, and history already collected, patients breeze through check-in. Wait times drop and the front desk can focus on patient experience rather than data entry.",
      },
      {
        title: "HIPAA-compliant collection",
        description:
          "All data is encrypted in transit and at rest. CallSphere signs Business Associate Agreements (BAAs) and maintains full HIPAA compliance for protected health information.",
      },
      {
        title: "Reduced paperwork",
        description:
          "Eliminate clipboards, paper forms, and manual data entry. The AI collects everything digitally and syncs it directly to your systems — reducing errors and saving staff hours every day.",
      },
      {
        title: "Better data accuracy",
        description:
          "The AI validates insurance IDs, verifies date formats, and confirms spelling in real time. Fewer errors at intake means fewer claim denials and billing issues downstream.",
      },
      {
        title: "Improved patient experience",
        description:
          "Patients appreciate completing intake from the comfort of home at their own pace. It sets a positive tone before the visit and shows your practice values their time.",
      },
    ],
    industries: [
      "Healthcare Systems",
      "Dental Practices",
      "Specialty Clinics",
      "Urgent Care Centers",
      "Mental Health Practices",
    ],
    stats: [
      { value: "70%", label: "Faster check-in" },
      { value: "15min", label: "Saved per visit" },
      { value: "99%", label: "Data accuracy" },
      { value: "40%", label: "Less paperwork" },
    ],
    features: [
      "Demographics collection",
      "Insurance verification",
      "Medical history intake",
      "Consent form delivery",
      "EHR/EMR sync",
      "Multi-language support",
      "HIPAA compliance",
      "Automated reminders",
    ],
    ctaHeading: "Eliminate the clipboard and cut check-in time by 70%",
    ctaDescription:
      "See how CallSphere's HIPAA-compliant AI intake agent collects patient information before they arrive. Book a demo.",
  },

  "order-tracking": {
    slug: "order-tracking",
    name: "Order Tracking",
    metaTitle: "AI Order Tracking Agent | CallSphere",
    metaDescription:
      "Automate WISMO calls with CallSphere's AI order tracking agent. Instant status updates, delivery estimates, and exception handling via phone and chat.",
    headline: "Instant Order Tracking via Voice & Chat",
    heroDescription:
      "Customers call or chat to ask 'Where is my order?' and get instant answers. Real-time tracking data, delivery estimates, and proactive exception handling — all automated.",
    heroIcon: Truck,
    howItWorks: [
      {
        step: 1,
        title: "Customer asks about order",
        description:
          "The customer calls or starts a chat and provides their order number, email address, or phone number. The AI agent verifies their identity and locates the order in your system within seconds.",
      },
      {
        step: 2,
        title: "Status pulled in real time",
        description:
          "The agent queries your OMS, WMS, or carrier APIs to fetch the latest tracking data. It translates raw logistics data into a clear, customer-friendly update including current location and next steps.",
      },
      {
        step: 3,
        title: "Update delivered",
        description:
          "The customer receives a clear ETA, current shipment location, and any required actions. If there's an exception — delay, missed delivery, damage — the agent proactively offers solutions like redelivery scheduling or a refund.",
      },
    ],
    benefits: [
      {
        title: "Eliminate WISMO ticket volume",
        description:
          "'Where is my order?' is the number one support request for e-commerce brands. Automating it instantly removes up to 80% of inbound support volume.",
      },
      {
        title: "Instant customer answers",
        description:
          "No more waiting on hold or navigating self-service portals. Customers get a clear, accurate status update in under five seconds, any time of day.",
      },
      {
        title: "Proactive exception alerts",
        description:
          "When a shipment is delayed or a delivery fails, the AI agent can proactively reach out to the customer before they even call — reducing frustration and building trust.",
      },
      {
        title: "Reduced support costs",
        description:
          "By deflecting the most common and repetitive inquiry, your human support team can focus on complex issues that truly require personal attention.",
      },
      {
        title: "Higher customer satisfaction",
        description:
          "Customers rate instant, accurate tracking updates highly. Brands using automated WISMO see measurable improvements in NPS and repeat purchase rates.",
      },
    ],
    industries: [
      "E-commerce & Retail",
      "Logistics & Shipping",
      "Meal Kit & Subscription",
      "Wholesale Distribution",
      "Direct-to-Consumer Brands",
    ],
    stats: [
      { value: "80%", label: "WISMO reduction" },
      { value: "< 5s", label: "Response time" },
      { value: "24/7", label: "Availability" },
      { value: "4.9/5", label: "Customer rating" },
    ],
    features: [
      "Real-time tracking lookup",
      "Delivery ETA updates",
      "Exception notifications",
      "Redelivery scheduling",
      "Return initiation",
      "Carrier integration",
      "Multi-channel support",
      "Multi-language support",
    ],
    ctaHeading: "Stop drowning in 'Where is my order?' calls",
    ctaDescription:
      "CallSphere's AI order tracking agent handles WISMO calls instantly. See how it reduces your support volume by 80%.",
  },

  "debt-collection": {
    slug: "debt-collection",
    name: "Debt Collection",
    metaTitle: "AI Debt Collection Agent | CallSphere",
    metaDescription:
      "Automate debt collection outreach with CallSphere's AI voice agent. Professional payment reminders, payment plan setup, and compliance-ready communications.",
    headline: "AI-Powered Debt Collection That Preserves Relationships",
    heroDescription:
      "Reach more debtors with professional, compliant AI outreach. Automated payment reminders, payment plan negotiations, and secure payment processing — without the stigma of traditional collections.",
    heroIcon: DollarSign,
    howItWorks: [
      {
        step: 1,
        title: "Outreach initiated",
        description:
          "The AI agent contacts the debtor via phone call or SMS at optimal times determined by historical answer-rate data. The tone is professional and empathetic — designed to start a productive conversation, not provoke defensiveness.",
      },
      {
        step: 2,
        title: "Payment discussed",
        description:
          "The agent confirms the outstanding balance, explains any applicable fees or deadlines, and presents available payment options. If the debtor cannot pay in full, the agent negotiates a payment plan based on your pre-approved terms.",
      },
      {
        step: 3,
        title: "Payment captured or plan set",
        description:
          "Payments are processed securely via Stripe with full PCI-DSS compliance. For payment plans, the agent sets up recurring charges, sends confirmation, and schedules automated reminders for upcoming installments.",
      },
    ],
    benefits: [
      {
        title: "Higher recovery rates",
        description:
          "AI agents make three times more contact attempts than human collectors and reach debtors at statistically optimal times. More contacts mean more conversations and more payments recovered.",
      },
      {
        title: "Consistent professional tone",
        description:
          "Every interaction follows your approved script with a calm, empathetic tone. There's no risk of an agent losing their temper or making statements that create legal liability.",
      },
      {
        title: "Compliance-ready communications",
        description:
          "The AI agent adheres to TCPA, FDCPA, and state-specific regulations automatically. Call times, frequency limits, required disclosures, and do-not-call lists are all enforced programmatically.",
      },
      {
        title: "Payment plan flexibility",
        description:
          "Offer debtors flexible payment plans within your pre-set parameters. The agent can negotiate installment amounts and schedules, improving willingness to pay and reducing write-offs.",
      },
      {
        title: "Reduced labor costs",
        description:
          "Automate the highest-volume, most repetitive part of collections — initial outreach and payment capture. Your human collectors can focus on complex negotiations and high-value accounts.",
      },
    ],
    industries: [
      "Healthcare Billing",
      "Utilities & Telecom",
      "Financial Services",
      "Property Management",
      "Education",
    ],
    stats: [
      { value: "40%", label: "Higher recovery" },
      { value: "3x", label: "More contacts made" },
      { value: "100%", label: "TCPA compliant" },
      { value: "60%", label: "Cost reduction" },
    ],
    features: [
      "Automated outreach scheduling",
      "Payment plan negotiation",
      "Secure payment capture",
      "TCPA/FDCPA compliance",
      "Do-not-call list management",
      "Payment link delivery",
      "Activity logging",
      "Multi-language support",
    ],
    ctaHeading: "Recover more while spending less",
    ctaDescription:
      "See how CallSphere's AI collection agent increases recovery rates while reducing costs and maintaining compliance.",
  },
};

const slugs = Object.keys(solutions);

/* ------------------------------------------------------------------ */
/*  Static params & metadata                                           */
/* ------------------------------------------------------------------ */

export function generateStaticParams() {
  return slugs.map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const solution = solutions[slug];
  if (!solution) return {};

  return {
    title: solution.metaTitle,
    description: solution.metaDescription,
    alternates: {
      canonical: `https://callsphere.tech/solutions/${solution.slug}`,
    },
    openGraph: {
      title: solution.metaTitle,
      description: solution.metaDescription,
      url: `https://callsphere.tech/solutions/${solution.slug}`,
      type: "website",
    },
  };
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

const stepIcons = [ListChecks, Zap, CheckCircle2];

function StatCard({ value, label }: { value: string; label: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white px-6 py-8 text-center shadow-sm">
      <p className="text-3xl font-extrabold tracking-tight text-indigo-600">
        {value}
      </p>
      <p className="mt-1 text-sm font-medium text-slate-500">{label}</p>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Page component                                                     */
/* ------------------------------------------------------------------ */

export default async function SolutionPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const solution = solutions[slug];
  if (!solution) notFound();

  const HeroIcon = solution.heroIcon;

  return (
    <>
      {/* ---- Structured Data ---- */}
      <BreadcrumbJsonLd
        items={[
          { name: "Home", url: "https://callsphere.tech" },
          { name: "Solutions", url: "https://callsphere.tech/solutions" },
          {
            name: solution.name,
            url: `https://callsphere.tech/solutions/${solution.slug}`,
          },
        ]}
      />

      <Nav />

      <main id="main" className="relative">
        {/* ============================================================ */}
        {/*  Hero                                                        */}
        {/* ============================================================ */}
        <section
          aria-label={`${solution.name} hero`}
          className="relative overflow-hidden bg-gradient-to-b from-slate-50 to-white pb-16 pt-20 sm:pb-24 sm:pt-28"
        >
          <div className="section-shell text-center">
            <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-100">
              <HeroIcon className="h-8 w-8 text-indigo-600" aria-hidden />
            </div>
            <h1 className="mx-auto max-w-3xl text-4xl font-extrabold tracking-tight text-slate-900 sm:text-5xl lg:text-6xl">
              {solution.headline}
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-slate-600">
              {solution.heroDescription}
            </p>
            <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
              <Link
                href="/contact"
                className="inline-flex items-center rounded-lg bg-indigo-600 px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
              >
                Book a Demo
                <ArrowRight aria-hidden className="ml-2 h-4 w-4" />
              </Link>
              <Link
                href="/pricing"
                className="inline-flex items-center rounded-lg border border-slate-300 bg-white px-6 py-3 text-sm font-semibold text-slate-900 transition hover:bg-slate-50"
              >
                See Pricing
              </Link>
            </div>
          </div>
        </section>

        {/* ============================================================ */}
        {/*  Stats                                                       */}
        {/* ============================================================ */}
        <section aria-label="Key statistics" className="section-stack">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 sm:gap-6">
            {solution.stats.map((stat) => (
              <StatCard key={stat.label} {...stat} />
            ))}
          </div>
        </section>

        {/* ============================================================ */}
        {/*  How It Works                                                */}
        {/* ============================================================ */}
        <section
          aria-labelledby="how-it-works-heading"
          className="section-stack mt-20 sm:mt-28"
        >
          <div className="text-center">
            <h2
              id="how-it-works-heading"
              className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl"
            >
              How It Works
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-lg text-slate-600">
              Three simple steps to automate your {solution.name.toLowerCase()}.
            </p>
          </div>

          <div className="mt-14 grid gap-8 md:grid-cols-3">
            {solution.howItWorks.map((item, idx) => {
              const StepIcon = stepIcons[idx] ?? Sparkles;
              return (
                <div
                  key={item.step}
                  className="relative rounded-2xl border border-slate-200 bg-white p-8 shadow-sm transition hover:shadow-md"
                >
                  <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-100 text-indigo-600">
                    <StepIcon className="h-6 w-6" aria-hidden />
                  </div>
                  <span className="mb-2 block text-xs font-semibold uppercase tracking-widest text-indigo-600">
                    Step {item.step}
                  </span>
                  <h3 className="text-lg font-bold text-slate-900">
                    {item.title}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-slate-600">
                    {item.description}
                  </p>
                </div>
              );
            })}
          </div>
        </section>

        {/* ============================================================ */}
        {/*  Benefits                                                    */}
        {/* ============================================================ */}
        <section
          aria-labelledby="benefits-heading"
          className="section-stack mt-20 sm:mt-28"
        >
          <div className="text-center">
            <h2
              id="benefits-heading"
              className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl"
            >
              Why Choose CallSphere for{" "}
              {solution.name}
            </h2>
          </div>

          <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {solution.benefits.map((benefit) => (
              <div
                key={benefit.title}
                className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:shadow-md"
              >
                <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-100">
                  <TrendingUp
                    className="h-5 w-5 text-emerald-600"
                    aria-hidden
                  />
                </div>
                <h3 className="text-base font-bold text-slate-900">
                  {benefit.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">
                  {benefit.description}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* ============================================================ */}
        {/*  Industries Served                                           */}
        {/* ============================================================ */}
        <section
          aria-labelledby="industries-heading"
          className="section-stack mt-20 sm:mt-28"
        >
          <div className="rounded-2xl border border-slate-200 bg-gradient-to-br from-slate-50 to-white p-8 sm:p-12">
            <div className="text-center">
              <h2
                id="industries-heading"
                className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl"
              >
                Industries Using This Solution
              </h2>
              <p className="mx-auto mt-4 max-w-2xl text-lg text-slate-600">
                {solution.name} is trusted by businesses across these
                industries.
              </p>
            </div>
            <div className="mx-auto mt-10 flex max-w-3xl flex-wrap items-center justify-center gap-3">
              {solution.industries.map((industry) => (
                <span
                  key={industry}
                  className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-5 py-2.5 text-sm font-medium text-slate-700 shadow-sm"
                >
                  <Factory className="h-4 w-4 text-indigo-500" aria-hidden />
                  {industry}
                </span>
              ))}
            </div>
          </div>
        </section>

        {/* ============================================================ */}
        {/*  Features List                                               */}
        {/* ============================================================ */}
        <section
          aria-labelledby="features-heading"
          className="section-stack mt-20 sm:mt-28"
        >
          <div className="text-center">
            <h2
              id="features-heading"
              className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl"
            >
              Everything You Need
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-lg text-slate-600">
              A complete feature set for enterprise-grade{" "}
              {solution.name.toLowerCase()}.
            </p>
          </div>

          <div className="mx-auto mt-14 grid max-w-4xl gap-4 sm:grid-cols-2">
            {solution.features.map((feature) => (
              <div
                key={feature}
                className="flex items-start gap-3 rounded-xl border border-slate-100 bg-white p-4 shadow-sm"
              >
                <CheckCircle2
                  className="mt-0.5 h-5 w-5 shrink-0 text-indigo-600"
                  aria-hidden
                />
                <span className="text-sm font-medium text-slate-700">
                  {feature}
                </span>
              </div>
            ))}
          </div>
        </section>

        {/* ============================================================ */}
        {/*  CTA                                                         */}
        {/* ============================================================ */}
        <section aria-label="Call to action" className="section-stack mt-20 mb-20 sm:mt-28 sm:mb-28">
          <div className="rounded-2xl border border-slate-200 bg-gradient-to-br from-slate-50 to-white px-8 py-16 text-center sm:px-16">
            <h2 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
              {solution.ctaHeading}
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-lg text-slate-600">
              {solution.ctaDescription}
            </p>
            <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
              <Link
                href="/contact"
                className="inline-flex items-center rounded-lg bg-indigo-600 px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
              >
                Book a Demo
                <ArrowRight aria-hidden className="ml-2 h-4 w-4" />
              </Link>
              <Link
                href="/pricing"
                className="inline-flex items-center rounded-lg border border-slate-300 bg-white px-6 py-3 text-sm font-semibold text-slate-900 transition hover:bg-slate-50"
              >
                See Pricing
              </Link>
            </div>
          </div>
        </section>
      </main>

      <Footer />
      <VoiceAgentLauncher />
    </>
  );
}
