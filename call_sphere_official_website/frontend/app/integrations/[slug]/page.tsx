import { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import type { Route } from "next";
import {
  ArrowRight,
  CheckCircle2,
  Phone,
  Users,
  BarChart3,
  Headphones,
  CreditCard,
  ShoppingCart,
  Wrench,
  Monitor,
  HelpCircle,
  Plug,
  Zap,
  Settings,
  RefreshCw,
  Calendar,
  Clock,
  DollarSign,
  Globe,
  Search,
  Layout,
  type LucideIcon,
} from "lucide-react";

import { Nav } from "@/components/Nav";
import { Footer } from "@/components/Footer";
import { VoiceAgentLauncher } from "@/components/VoiceAgentLauncher";
import { BreadcrumbJsonLd, ServiceJsonLd } from "@/components/StructuredData";

/* ------------------------------------------------------------------ */
/*  Integration data                                                   */
/* ------------------------------------------------------------------ */

type IntegrationData = {
  slug: string;
  name: string;
  metaTitle: string;
  metaDescription: string;
  category: string;
  icon: LucideIcon;
  description: string;
  features: { title: string; description: string }[];
  setupSteps: { step: number; title: string; description: string }[];
  benefits: { title: string; description: string; icon: LucideIcon }[];
};

const integrations: Record<string, IntegrationData> = {
  twilio: {
    slug: "twilio",
    name: "Twilio",
    metaTitle: "CallSphere + Twilio Integration | AI Voice Agents",
    metaDescription:
      "Connect CallSphere AI voice agents with Twilio for enterprise-grade telephony. Inbound/outbound calls, SMS messaging, intelligent call routing, and real-time transcription.",
    category: "Telephony",
    icon: Phone,
    description:
      "Twilio is the telephony backbone that powers CallSphere voice agents. Route inbound and outbound calls, send SMS confirmations, and deliver crystal-clear audio quality -- all through a battle-tested global infrastructure trusted by millions of businesses.",
    features: [
      {
        title: "Inbound & Outbound Calls",
        description:
          "AI agents answer inbound calls instantly and make outbound calls for confirmations, reminders, and follow-ups on your behalf.",
      },
      {
        title: "SMS Messaging",
        description:
          "Send appointment confirmations, order updates, and follow-up messages automatically via SMS after every voice interaction.",
      },
      {
        title: "Intelligent Call Routing",
        description:
          "Route calls to the right AI agent or human team member based on caller intent, language, time of day, or business rules.",
      },
      {
        title: "Real-Time Transcription",
        description:
          "Every call is transcribed in real time for compliance, training, and analytics. Searchable transcripts available instantly.",
      },
      {
        title: "Global Phone Numbers",
        description:
          "Provision local, toll-free, or international numbers in 100+ countries so customers always reach you on a familiar number.",
      },
      {
        title: "Call Recording & Analytics",
        description:
          "Record calls for quality assurance and compliance. Built-in analytics track call volume, duration, and resolution rates.",
      },
    ],
    setupSteps: [
      {
        step: 1,
        title: "Connect Your Twilio Account",
        description:
          "Enter your Twilio Account SID and Auth Token in the CallSphere dashboard. We handle the rest.",
      },
      {
        step: 2,
        title: "Provision Phone Numbers",
        description:
          "Select or port your business phone numbers. CallSphere automatically configures webhooks and routing.",
      },
      {
        step: 3,
        title: "Configure Agent Behavior",
        description:
          "Define how your AI agent answers calls -- greeting scripts, transfer rules, and escalation paths.",
      },
      {
        step: 4,
        title: "Go Live",
        description:
          "Test with a live call, then flip the switch. Your AI agent starts handling calls within minutes.",
      },
    ],
    benefits: [
      {
        title: "99.95% Uptime SLA",
        description:
          "Twilio's globally distributed infrastructure ensures your AI agents are always reachable, even during traffic spikes.",
        icon: Zap,
      },
      {
        title: "Sub-Second Latency",
        description:
          "Calls connect in milliseconds. Customers hear a natural greeting, not awkward silence or hold music.",
        icon: RefreshCw,
      },
      {
        title: "Carrier-Grade Security",
        description:
          "TLS encryption, SRTP for voice, and SOC 2 compliance keep every conversation secure and private.",
        icon: Settings,
      },
    ],
  },

  salesforce: {
    slug: "salesforce",
    name: "Salesforce",
    metaTitle: "CallSphere + Salesforce Integration | AI Voice Agents",
    metaDescription:
      "Sync CallSphere AI voice agents with Salesforce CRM. Automatic lead creation, contact management, call logging, and real-time opportunity updates.",
    category: "CRM",
    icon: Users,
    description:
      "Sync every voice and chat interaction directly into Salesforce. CallSphere automatically creates leads, logs calls, updates contacts, and pushes conversation insights to your CRM -- so your sales team always has the full picture without manual data entry.",
    features: [
      {
        title: "Automatic Lead Creation",
        description:
          "New callers are automatically created as Leads in Salesforce with contact information, call summary, and intent captured by the AI agent.",
      },
      {
        title: "Contact & Account Sync",
        description:
          "Caller ID is matched against existing Contacts and Accounts. The AI agent greets returning customers by name with full context.",
      },
      {
        title: "Call Activity Logging",
        description:
          "Every call is logged as an Activity on the associated Lead, Contact, or Account -- with duration, transcript, and outcome.",
      },
      {
        title: "Opportunity Updates",
        description:
          "AI agents update Opportunity stages and next steps based on call outcomes. Pipeline stays current without rep intervention.",
      },
      {
        title: "Custom Field Mapping",
        description:
          "Map any data captured during a call to custom Salesforce fields. Industry, budget, timeline -- whatever your process needs.",
      },
      {
        title: "Workflow & Flow Triggers",
        description:
          "Trigger Salesforce Flows, assignment rules, or email alerts based on AI agent actions like booking a meeting or qualifying a lead.",
      },
    ],
    setupSteps: [
      {
        step: 1,
        title: "Authorize Salesforce",
        description:
          "Sign in with your Salesforce credentials via OAuth. CallSphere requests only the permissions it needs.",
      },
      {
        step: 2,
        title: "Map Fields & Objects",
        description:
          "Choose which Salesforce objects (Lead, Contact, Opportunity) to sync and map CallSphere data to your custom fields.",
      },
      {
        step: 3,
        title: "Set Sync Rules",
        description:
          "Define when to create vs. update records, deduplication logic, and which call types to log.",
      },
      {
        step: 4,
        title: "Activate & Monitor",
        description:
          "Enable the integration and monitor sync status from the CallSphere dashboard. Real-time error alerts included.",
      },
    ],
    benefits: [
      {
        title: "Zero Manual Data Entry",
        description:
          "Sales reps save 30+ minutes per day. Every interaction is automatically captured and logged.",
        icon: Zap,
      },
      {
        title: "Real-Time Pipeline Visibility",
        description:
          "Opportunities update as calls happen. Managers see pipeline changes the moment they occur.",
        icon: BarChart3,
      },
      {
        title: "Bi-Directional Sync",
        description:
          "Changes in Salesforce flow back to CallSphere. AI agents always have the latest customer context.",
        icon: RefreshCw,
      },
    ],
  },

  hubspot: {
    slug: "hubspot",
    name: "HubSpot",
    metaTitle: "CallSphere + HubSpot Integration | AI Voice Agents",
    metaDescription:
      "Integrate CallSphere AI voice agents with HubSpot CRM. Automate deal tracking, contact sync, call logging, and workflow triggers.",
    category: "CRM",
    icon: BarChart3,
    description:
      "Connect CallSphere to HubSpot and turn every phone call into a CRM update. AI agents create contacts, track deals, log activities, and trigger HubSpot workflows automatically -- keeping your sales and marketing teams aligned without lifting a finger.",
    features: [
      {
        title: "Deal Tracking",
        description:
          "AI agents create and advance deals through your HubSpot pipeline based on call outcomes. Stages update in real time.",
      },
      {
        title: "Contact Sync",
        description:
          "New callers become HubSpot contacts instantly. Existing contacts are recognized and enriched with every interaction.",
      },
      {
        title: "Call Logging & Notes",
        description:
          "Every call is logged on the contact timeline with a transcript summary, call duration, and outcome classification.",
      },
      {
        title: "Workflow Triggers",
        description:
          "Kick off HubSpot workflows when the AI agent books a meeting, qualifies a lead, or detects a support issue.",
      },
      {
        title: "List Segmentation",
        description:
          "Automatically add callers to HubSpot lists based on intent, industry, or call outcome for targeted follow-up campaigns.",
      },
      {
        title: "Meeting Scheduling",
        description:
          "AI agents book meetings directly on your HubSpot calendar. Prospects receive confirmation emails with meeting links.",
      },
    ],
    setupSteps: [
      {
        step: 1,
        title: "Connect HubSpot",
        description:
          "Authorize CallSphere via HubSpot's OAuth flow. Select the portal and scopes you want to connect.",
      },
      {
        step: 2,
        title: "Configure Pipeline Mapping",
        description:
          "Map AI agent outcomes to your HubSpot deal stages and lifecycle stages.",
      },
      {
        step: 3,
        title: "Set Up Workflows",
        description:
          "Define which events should trigger HubSpot workflows -- new lead, booked meeting, escalation, etc.",
      },
      {
        step: 4,
        title: "Launch",
        description:
          "Activate the sync. All future calls flow into HubSpot automatically with full context.",
      },
    ],
    benefits: [
      {
        title: "Marketing & Sales Alignment",
        description:
          "Call data syncs to both Marketing Hub and Sales Hub, giving both teams unified customer context.",
        icon: Users,
      },
      {
        title: "Automated Follow-Up",
        description:
          "HubSpot workflows fire instantly after calls, sending emails, assigning tasks, and notifying reps.",
        icon: Zap,
      },
      {
        title: "Full Funnel Visibility",
        description:
          "Track every touchpoint from first call to closed deal. Attribution reporting covers voice interactions.",
        icon: BarChart3,
      },
    ],
  },

  zendesk: {
    slug: "zendesk",
    name: "Zendesk",
    metaTitle: "CallSphere + Zendesk Integration | AI Voice Agents",
    metaDescription:
      "Connect CallSphere AI agents with Zendesk. Automatic ticket creation, status updates, customer context enrichment, and smart escalation to human agents.",
    category: "CRM",
    icon: Headphones,
    description:
      "Pair CallSphere AI voice agents with Zendesk to automate your support queue. AI agents create tickets, check statuses, pull customer context, and escalate to human agents with full conversation history -- reducing resolution time and improving CSAT.",
    features: [
      {
        title: "Automatic Ticket Creation",
        description:
          "AI agents create Zendesk tickets during or after calls, pre-populated with issue category, priority, and a transcript summary.",
      },
      {
        title: "Status Updates",
        description:
          "Callers asking about ticket status get instant answers. The AI agent pulls real-time status from Zendesk without agent involvement.",
      },
      {
        title: "Customer Context Enrichment",
        description:
          "When a known customer calls, the AI agent sees their ticket history, account tier, and recent interactions for personalized service.",
      },
      {
        title: "Smart Escalation",
        description:
          "Complex issues are escalated to human agents with the full call transcript, customer history, and suggested resolution attached.",
      },
      {
        title: "Macro & Trigger Integration",
        description:
          "CallSphere actions can fire Zendesk macros and triggers -- auto-tagging, assigning groups, and sending templated responses.",
      },
      {
        title: "CSAT Follow-Up",
        description:
          "After resolution, the AI agent can call or text customers with a satisfaction survey that feeds back into Zendesk analytics.",
      },
    ],
    setupSteps: [
      {
        step: 1,
        title: "Connect Zendesk",
        description:
          "Enter your Zendesk subdomain and authorize via API token or OAuth. CallSphere connects securely.",
      },
      {
        step: 2,
        title: "Map Ticket Fields",
        description:
          "Map AI agent data to Zendesk ticket fields -- category, priority, custom fields, and assignee groups.",
      },
      {
        step: 3,
        title: "Define Escalation Rules",
        description:
          "Set when the AI agent should escalate to a human -- by issue type, sentiment, VIP status, or SLA threshold.",
      },
      {
        step: 4,
        title: "Enable & Test",
        description:
          "Run a test call to verify ticket creation and escalation. Then go live with confidence.",
      },
    ],
    benefits: [
      {
        title: "60% Fewer Tier-1 Tickets",
        description:
          "AI agents resolve common questions before they become tickets, freeing your support team for complex issues.",
        icon: Zap,
      },
      {
        title: "Faster First Response",
        description:
          "Every call gets an instant response. SLA timers start with context already gathered, not a voicemail.",
        icon: RefreshCw,
      },
      {
        title: "Higher CSAT Scores",
        description:
          "Instant answers and seamless escalation mean customers get help faster, improving satisfaction metrics.",
        icon: BarChart3,
      },
    ],
  },

  stripe: {
    slug: "stripe",
    name: "Stripe",
    metaTitle: "CallSphere + Stripe Integration | AI Voice Agents",
    metaDescription:
      "Process payments with CallSphere AI voice agents and Stripe. Handle billing inquiries, process refunds, manage subscriptions, and take payments over the phone securely.",
    category: "Payment",
    icon: CreditCard,
    description:
      "Let customers pay, manage subscriptions, and resolve billing questions over the phone. CallSphere AI agents connect to Stripe to process payments, issue refunds, update payment methods, and answer billing inquiries -- all PCI-compliant and fully automated.",
    features: [
      {
        title: "Payment Processing",
        description:
          "AI agents securely collect payment information and process charges through Stripe. PCI DSS Level 1 compliant by default.",
      },
      {
        title: "Refund Management",
        description:
          "Handle refund requests over the phone. AI agents verify the order, confirm the amount, and initiate the Stripe refund instantly.",
      },
      {
        title: "Subscription Management",
        description:
          "Customers can upgrade, downgrade, pause, or cancel subscriptions by speaking with the AI agent. Changes sync to Stripe immediately.",
      },
      {
        title: "Billing Inquiries",
        description:
          "AI agents answer questions about charges, invoices, payment history, and upcoming renewals by pulling data from Stripe.",
      },
      {
        title: "Payment Link Delivery",
        description:
          "For complex transactions, the AI agent generates a Stripe Payment Link and sends it via SMS for the customer to complete securely.",
      },
      {
        title: "Failed Payment Recovery",
        description:
          "AI agents proactively call customers with failed payments, collect updated card details, and retry the charge.",
      },
    ],
    setupSteps: [
      {
        step: 1,
        title: "Connect Stripe",
        description:
          "Link your Stripe account using a restricted API key with only the permissions CallSphere needs.",
      },
      {
        step: 2,
        title: "Configure Payment Rules",
        description:
          "Set refund limits, subscription change policies, and payment collection flows that match your business rules.",
      },
      {
        step: 3,
        title: "Enable PCI-Compliant Voice Input",
        description:
          "Activate secure DTMF or tokenized card capture so payment data never touches your servers.",
      },
      {
        step: 4,
        title: "Go Live",
        description:
          "Process a test payment, then activate. Your AI agent handles billing calls end-to-end.",
      },
    ],
    benefits: [
      {
        title: "PCI DSS Compliant",
        description:
          "Payment data is tokenized and never stored on CallSphere servers. Meets PCI DSS Level 1 requirements.",
        icon: Settings,
      },
      {
        title: "Reduce Churn",
        description:
          "Proactive failed-payment recovery and easy subscription management prevent involuntary churn.",
        icon: RefreshCw,
      },
      {
        title: "24/7 Payment Support",
        description:
          "Customers can pay, get refunds, and manage billing at any hour without waiting for business hours.",
        icon: Zap,
      },
    ],
  },

  shopify: {
    slug: "shopify",
    name: "Shopify",
    metaTitle: "CallSphere + Shopify Integration | AI Voice Agents",
    metaDescription:
      "Connect CallSphere AI voice agents with Shopify. Automate order lookup, shipment tracking, returns processing, and product catalog inquiries over the phone.",
    category: "Industry",
    icon: ShoppingCart,
    description:
      "Give your Shopify customers a premium phone experience. CallSphere AI agents look up orders, track shipments, process returns, and answer product questions -- pulling real-time data from your Shopify store so customers get instant, accurate answers.",
    features: [
      {
        title: "Order Lookup",
        description:
          "Customers call with an order number or email and instantly hear their order status, items, and estimated delivery date.",
      },
      {
        title: "Shipment Tracking",
        description:
          "AI agents pull real-time tracking data from Shopify and connected carriers, giving customers up-to-the-minute delivery updates.",
      },
      {
        title: "Returns & Exchanges",
        description:
          "Handle return requests, generate return labels, and initiate exchanges through Shopify -- all during the phone call.",
      },
      {
        title: "Product Catalog Search",
        description:
          "Customers can ask about product availability, specifications, pricing, and variants. The AI agent searches your live Shopify catalog.",
      },
      {
        title: "Order Modification",
        description:
          "Before shipment, AI agents can update shipping addresses, add items, or apply discount codes to existing orders.",
      },
      {
        title: "Inventory Alerts",
        description:
          "When a requested item is out of stock, the AI agent can add customers to restock notification lists automatically.",
      },
    ],
    setupSteps: [
      {
        step: 1,
        title: "Install the CallSphere App",
        description:
          "Install CallSphere from the Shopify App Store or connect via a custom app with the required API scopes.",
      },
      {
        step: 2,
        title: "Sync Your Catalog",
        description:
          "CallSphere indexes your product catalog, collections, and pricing so the AI agent can answer product questions.",
      },
      {
        step: 3,
        title: "Configure Order Policies",
        description:
          "Set return windows, exchange rules, and modification cutoff times that match your store policies.",
      },
      {
        step: 4,
        title: "Launch",
        description:
          "Test with a sample order lookup, then go live. Your AI agent handles Shopify support calls 24/7.",
      },
    ],
    benefits: [
      {
        title: "Instant Order Answers",
        description:
          "Customers get order status in seconds, not minutes. No more 'let me look that up' hold times.",
        icon: Zap,
      },
      {
        title: "Fewer Support Tickets",
        description:
          "Resolve WISMO (Where Is My Order?) calls automatically -- the #1 source of e-commerce support volume.",
        icon: RefreshCw,
      },
      {
        title: "Higher Customer Lifetime Value",
        description:
          "Premium phone support builds trust and loyalty, leading to repeat purchases and higher AOV.",
        icon: BarChart3,
      },
    ],
  },

  servicetitan: {
    slug: "servicetitan",
    name: "ServiceTitan",
    metaTitle: "CallSphere + ServiceTitan Integration | AI Voice Agents",
    metaDescription:
      "Integrate CallSphere AI voice agents with ServiceTitan for HVAC, plumbing, and electrical companies. Automate job scheduling, dispatch, and customer booking.",
    category: "Industry",
    icon: Wrench,
    description:
      "Built for home service businesses running on ServiceTitan. CallSphere AI agents schedule jobs, dispatch technicians, confirm appointments, and handle after-hours emergency calls -- syncing every interaction directly into your ServiceTitan workflow.",
    features: [
      {
        title: "Job Scheduling",
        description:
          "AI agents book service appointments by checking technician availability, service zones, and job types directly in ServiceTitan.",
      },
      {
        title: "Smart Dispatch",
        description:
          "Route emergency calls to the nearest available technician based on real-time location, skill set, and current workload.",
      },
      {
        title: "Customer Booking",
        description:
          "New and returning customers book service calls by phone. The AI agent creates or updates the customer record in ServiceTitan.",
      },
      {
        title: "Appointment Confirmations",
        description:
          "Automated outbound calls and SMS reminders confirm upcoming appointments, reducing no-shows and wasted truck rolls.",
      },
      {
        title: "Membership Management",
        description:
          "AI agents can enroll customers in maintenance plans, check membership status, and schedule recurring service visits.",
      },
      {
        title: "After-Hours Call Handling",
        description:
          "Every after-hours call is answered, triaged for urgency, and either scheduled for next-day or dispatched immediately.",
      },
    ],
    setupSteps: [
      {
        step: 1,
        title: "Connect ServiceTitan",
        description:
          "Authorize CallSphere with your ServiceTitan API credentials. We connect to your live instance securely.",
      },
      {
        step: 2,
        title: "Sync Business Units & Zones",
        description:
          "Import your business units, service zones, job types, and technician roster for accurate scheduling.",
      },
      {
        step: 3,
        title: "Define Booking Rules",
        description:
          "Set scheduling windows, emergency criteria, and dispatch priorities that match your operations.",
      },
      {
        step: 4,
        title: "Go Live",
        description:
          "Run a test booking, then enable 24/7 call handling. Jobs flow into ServiceTitan dispatch automatically.",
      },
    ],
    benefits: [
      {
        title: "Never Miss a Service Call",
        description:
          "24/7 call answering means no more lost revenue from missed after-hours calls and voicemails.",
        icon: Zap,
      },
      {
        title: "Reduce Dispatcher Workload",
        description:
          "AI agents handle routine scheduling, freeing dispatchers to focus on complex routing and escalations.",
        icon: RefreshCw,
      },
      {
        title: "Fill Your Schedule",
        description:
          "Automated booking and confirmations keep your calendar full and no-show rates low.",
        icon: BarChart3,
      },
    ],
  },

  connectwise: {
    slug: "connectwise",
    name: "ConnectWise",
    metaTitle: "CallSphere + ConnectWise Integration | AI Voice Agents",
    metaDescription:
      "Integrate CallSphere AI voice agents with ConnectWise PSA. Automate ticket management, asset tracking, and IT support workflows for MSPs.",
    category: "Industry",
    icon: Monitor,
    description:
      "Purpose-built for MSPs and IT service providers on ConnectWise. CallSphere AI agents create and triage service tickets, pull asset information, check agreement status, and escalate critical issues -- keeping your PSA data accurate without manual entry.",
    features: [
      {
        title: "Ticket Management",
        description:
          "AI agents create, update, and close ConnectWise service tickets with proper board, status, priority, and type assignments.",
      },
      {
        title: "Asset Tracking",
        description:
          "When a customer calls about a device, the AI agent pulls configuration and warranty data from ConnectWise Manage for context.",
      },
      {
        title: "Agreement Verification",
        description:
          "Instantly verify whether a caller is covered under an active service agreement and what their SLA entitlements are.",
      },
      {
        title: "Tier-1 Automation",
        description:
          "Handle password resets, VPN troubleshooting, connectivity checks, and other common issues without dispatching an engineer.",
      },
      {
        title: "Time Entry Logging",
        description:
          "AI-handled interactions are automatically logged as time entries against the correct ticket and agreement.",
      },
      {
        title: "Critical Alert Escalation",
        description:
          "When monitoring tools trigger critical alerts, the AI agent can call on-call engineers and create P1 tickets simultaneously.",
      },
    ],
    setupSteps: [
      {
        step: 1,
        title: "Connect ConnectWise",
        description:
          "Provide your ConnectWise Manage API credentials. CallSphere connects to your PSA securely.",
      },
      {
        step: 2,
        title: "Map Service Boards & Types",
        description:
          "Configure which service boards, ticket types, and priorities the AI agent should use when creating tickets.",
      },
      {
        step: 3,
        title: "Set Escalation Policies",
        description:
          "Define escalation rules by issue severity, customer tier, and time of day. Route critical issues immediately.",
      },
      {
        step: 4,
        title: "Activate",
        description:
          "Run test tickets through the system, then enable live call handling. Tickets appear in ConnectWise instantly.",
      },
    ],
    benefits: [
      {
        title: "Accurate PSA Data",
        description:
          "Every interaction is logged with the right board, type, and time entry. No more missing or miscategorized tickets.",
        icon: Settings,
      },
      {
        title: "Faster SLA Response",
        description:
          "AI agents provide instant first response, starting SLA clocks with context already captured.",
        icon: Zap,
      },
      {
        title: "Scale Without Hiring",
        description:
          "Handle more clients without adding headcount. AI agents absorb Tier-1 volume so engineers handle Tier-2+.",
        icon: BarChart3,
      },
    ],
  },

  freshdesk: {
    slug: "freshdesk",
    name: "Freshdesk",
    metaTitle: "CallSphere + Freshdesk Integration | AI Voice Agents",
    metaDescription:
      "Connect CallSphere AI voice agents with Freshdesk. Automate ticket routing, provide instant customer context, and escalate complex issues to human agents.",
    category: "CRM",
    icon: HelpCircle,
    description:
      "Supercharge your Freshdesk help desk with AI voice support. CallSphere agents create tickets, route to the right group, check existing ticket status, and provide agents with full conversation context when escalation is needed -- all while reducing first-response time to zero.",
    features: [
      {
        title: "Ticket Routing",
        description:
          "AI agents categorize incoming calls and route tickets to the correct Freshdesk group, agent, or queue based on issue type.",
      },
      {
        title: "Customer Context",
        description:
          "When a known customer calls, the AI agent sees their Freshdesk profile, open tickets, and interaction history for personalized support.",
      },
      {
        title: "Status Lookup",
        description:
          "Callers checking on existing tickets get instant status updates pulled directly from Freshdesk -- no agent needed.",
      },
      {
        title: "Canned Response Integration",
        description:
          "AI agents use your Freshdesk canned responses and solution articles to deliver consistent, accurate answers.",
      },
      {
        title: "SLA-Aware Escalation",
        description:
          "When a ticket is approaching SLA breach, the AI agent prioritizes escalation and notifies the assigned group.",
      },
      {
        title: "Multi-Channel Sync",
        description:
          "Voice interactions sync with Freshdesk alongside email, chat, and social channels for a unified customer timeline.",
      },
    ],
    setupSteps: [
      {
        step: 1,
        title: "Connect Freshdesk",
        description:
          "Enter your Freshdesk domain and API key. CallSphere authenticates and syncs your configuration.",
      },
      {
        step: 2,
        title: "Configure Groups & Routing",
        description:
          "Map call intents to Freshdesk groups, set default ticket properties, and configure auto-assignment rules.",
      },
      {
        step: 3,
        title: "Import Solution Articles",
        description:
          "Sync your Freshdesk knowledge base so the AI agent can reference articles when answering customer questions.",
      },
      {
        step: 4,
        title: "Go Live",
        description:
          "Test a support call end-to-end, then activate. Tickets flow into Freshdesk with full context from day one.",
      },
    ],
    benefits: [
      {
        title: "Zero First-Response Time",
        description:
          "Every call is answered instantly. Customers never hit voicemail or wait in a queue.",
        icon: Zap,
      },
      {
        title: "Consistent Quality",
        description:
          "AI agents deliver the same accurate answers every time, using your knowledge base and canned responses.",
        icon: Settings,
      },
      {
        title: "Unified Timeline",
        description:
          "Voice interactions appear alongside email, chat, and social in the Freshdesk customer timeline.",
        icon: RefreshCw,
      },
    ],
  },

  "google-calendar": {
    slug: "google-calendar",
    name: "Google Calendar",
    metaTitle: "CallSphere + Google Calendar Integration | AI Voice Agents",
    metaDescription:
      "Sync CallSphere AI voice agents with Google Calendar for real-time availability checks, appointment booking, and automated reminders. Eliminate double-bookings and reduce no-shows.",
    category: "Scheduling",
    icon: Calendar,
    description:
      "Sync CallSphere AI agents with Google Calendar for real-time availability checks, appointment booking, and automated reminders. Every booking lands on the right calendar instantly. Whether you run a single-provider practice or a multi-location operation, the AI agent reads live calendar data to offer only open slots, books confirmed appointments, and sends reminders that keep your schedule full and your no-show rate low.",
    features: [
      {
        title: "Real-Time Availability Checks",
        description:
          "The AI agent queries Google Calendar in real time before offering time slots to callers. Busy blocks, all-day events, and buffer periods are all respected -- so customers only hear slots that are genuinely open.",
      },
      {
        title: "Multi-Calendar Support",
        description:
          "Manage availability across multiple Google Calendars -- one per provider, location, or resource. The AI agent checks all relevant calendars simultaneously to find the best available slot.",
      },
      {
        title: "Appointment Booking & Rescheduling",
        description:
          "Callers can book new appointments and reschedule existing ones in a single conversation. The AI agent creates or moves calendar events, updates attendees, and confirms the new time instantly.",
      },
      {
        title: "Automated Reminder Notifications",
        description:
          "After booking, CallSphere triggers automated SMS and email reminders at configurable intervals -- 24 hours, 2 hours, or 30 minutes before the appointment -- reducing no-shows by up to 40%.",
      },
      {
        title: "Time Zone Handling",
        description:
          "The AI agent detects the caller's time zone and presents availability in their local time. Calendar events are created with correct time zone metadata so nothing gets lost in translation.",
      },
      {
        title: "Recurring Appointment Support",
        description:
          "Set up weekly, bi-weekly, or monthly recurring appointments directly from a phone call. The AI agent creates the full series in Google Calendar with proper recurrence rules.",
      },
    ],
    setupSteps: [
      {
        step: 1,
        title: "Connect Google Account",
        description:
          "Authorize CallSphere via Google OAuth. We request only calendar read/write permissions -- no access to email, drive, or other services.",
      },
      {
        step: 2,
        title: "Select Calendars to Sync",
        description:
          "Choose which Google Calendars the AI agent should check for availability and create events on. Map each calendar to a provider, location, or resource.",
      },
      {
        step: 3,
        title: "Configure Booking Rules",
        description:
          "Set minimum lead time, maximum advance booking window, appointment durations, buffer times between appointments, and business hours for each calendar.",
      },
      {
        step: 4,
        title: "Go Live",
        description:
          "Run a test booking to verify calendar events are created correctly, then activate. Your AI agent starts scheduling appointments immediately.",
      },
    ],
    benefits: [
      {
        title: "Zero Double-Bookings",
        description:
          "Real-time calendar sync means the AI agent never offers a slot that is already taken. Conflicts are eliminated before they happen.",
        icon: Zap,
      },
      {
        title: "Reduce No-Shows by 40%",
        description:
          "Automated SMS and email reminders go out at configurable intervals before each appointment, dramatically cutting no-show rates.",
        icon: RefreshCw,
      },
      {
        title: "Multi-Provider Scheduling",
        description:
          "Route bookings to the right calendar based on service type, location, or provider. Each appointment lands exactly where it belongs.",
        icon: Calendar,
      },
    ],
  },

  calendly: {
    slug: "calendly",
    name: "Calendly",
    metaTitle: "CallSphere + Calendly Integration | AI Voice Agents",
    metaDescription:
      "Connect CallSphere AI voice agents with Calendly for seamless meeting scheduling. AI agents book meetings during calls using your Calendly availability and routing rules.",
    category: "Scheduling",
    icon: Clock,
    description:
      "Connect CallSphere AI agents with Calendly for seamless meeting scheduling. AI agents book meetings during calls using your Calendly availability, event types, and routing rules. Instead of sending a link and hoping the prospect follows up, the AI agent checks your real-time Calendly availability, confirms the slot during the conversation, and sends a calendar invite before the call ends.",
    features: [
      {
        title: "Event Type Selection",
        description:
          "The AI agent presents your Calendly event types -- discovery call, product demo, onboarding session -- and lets the caller choose the right one. Duration, location, and conferencing details are inherited automatically.",
      },
      {
        title: "Real-Time Availability",
        description:
          "Availability is pulled live from Calendly, reflecting your connected calendars, scheduling rules, and existing bookings. The caller hears only slots that are genuinely open.",
      },
      {
        title: "Round-Robin Routing",
        description:
          "For team scheduling, the AI agent leverages Calendly's round-robin and availability-based routing to distribute meetings evenly across sales reps, support agents, or account managers.",
      },
      {
        title: "Meeting Confirmations",
        description:
          "Once a meeting is booked, Calendly sends its standard confirmation email with calendar invite, video link, and reschedule/cancel options -- maintaining a consistent booking experience.",
      },
      {
        title: "Buffer Time Handling",
        description:
          "The integration respects your Calendly buffer time settings -- before and after events -- so back-to-back meetings don't stack up and leave you without a break.",
      },
      {
        title: "Team Scheduling",
        description:
          "Book collective meetings that require multiple team members, or use Calendly's group events to schedule webinars and workshops directly from an inbound phone call.",
      },
    ],
    setupSteps: [
      {
        step: 1,
        title: "Connect Calendly Account",
        description:
          "Authorize CallSphere with your Calendly account via OAuth. We connect to your organization and pull event types, team members, and scheduling rules.",
      },
      {
        step: 2,
        title: "Map Event Types",
        description:
          "Select which Calendly event types the AI agent should offer callers. Map each event type to a call intent -- e.g., sales inquiries get 'Discovery Call', support gets 'Technical Review'.",
      },
      {
        step: 3,
        title: "Configure Routing Rules",
        description:
          "Define how meetings are assigned -- round-robin across the team, routed to a specific rep based on territory, or offered to the first available team member.",
      },
      {
        step: 4,
        title: "Activate",
        description:
          "Book a test meeting to confirm the flow, then go live. The AI agent starts scheduling Calendly meetings during every qualifying call.",
      },
    ],
    benefits: [
      {
        title: "Instant Meeting Booking",
        description:
          "Meetings are booked during the call, not after. Prospects don't need to click a link, check their calendar, and come back later -- it is done before they hang up.",
        icon: Zap,
      },
      {
        title: "Even Lead Distribution",
        description:
          "Round-robin routing ensures every rep gets a fair share of meetings. No cherry-picking, no imbalance, no manual assignment needed.",
        icon: Users,
      },
      {
        title: "Seamless Handoff",
        description:
          "After booking, the AI agent can send the Calendly link via SMS for easy rescheduling. The prospect has full control without another phone call.",
        icon: RefreshCw,
      },
    ],
  },

  square: {
    slug: "square",
    name: "Square",
    metaTitle: "CallSphere + Square Integration | AI Voice Agents",
    metaDescription:
      "Process payments and manage transactions with CallSphere AI voice agents and Square. Handle phone payments, refunds, invoice lookups, and subscription management with PCI-compliant security.",
    category: "Payment",
    icon: DollarSign,
    description:
      "Process payments and manage transactions with CallSphere AI agents and Square. Handle phone payments, refunds, invoice lookups, and subscription management with PCI-compliant security. Whether a customer is calling to pay an outstanding invoice, check a transaction, or request a refund, the AI agent pulls live data from Square and completes the action in real time -- no hold music, no transfers, no manual processing.",
    features: [
      {
        title: "Payment Processing",
        description:
          "AI agents securely collect payment details over the phone and process charges through Square's PCI-compliant infrastructure. Payments are confirmed to the caller in real time with a receipt sent via SMS or email.",
      },
      {
        title: "Refund Management",
        description:
          "Handle refund requests end-to-end during the call. The AI agent locates the original transaction in Square, verifies the amount and refund eligibility, and initiates the refund instantly with full audit trail.",
      },
      {
        title: "Invoice Lookup",
        description:
          "Customers calling about an invoice get immediate answers. The AI agent searches Square invoices by customer name, email, or invoice number and reads back the amount, due date, and payment status.",
      },
      {
        title: "Subscription Management",
        description:
          "Manage recurring billing over the phone. Customers can upgrade, downgrade, pause, or cancel Square subscriptions through a conversation with the AI agent, with changes reflected immediately.",
      },
      {
        title: "Payment Link Delivery",
        description:
          "For transactions that require the customer to enter their own card details, the AI agent generates a Square payment link and delivers it via SMS so the customer can complete the payment securely on their device.",
      },
      {
        title: "Transaction History",
        description:
          "Callers can ask about past payments, view recent charges, and get details on specific transactions. The AI agent pulls transaction history from Square and provides clear, itemized answers.",
      },
    ],
    setupSteps: [
      {
        step: 1,
        title: "Connect Square Account",
        description:
          "Authorize CallSphere via Square's OAuth flow. We request only the permissions needed for payments, invoices, and subscriptions -- nothing more.",
      },
      {
        step: 2,
        title: "Configure Payment Rules",
        description:
          "Set refund limits, payment thresholds requiring manager approval, accepted payment methods, and subscription modification policies that align with your business rules.",
      },
      {
        step: 3,
        title: "Enable Secure Capture",
        description:
          "Activate PCI-compliant DTMF tone capture or tokenized card entry so sensitive payment data is processed through Square's secure infrastructure and never stored on CallSphere servers.",
      },
      {
        step: 4,
        title: "Go Live",
        description:
          "Process a test payment to confirm the integration is working, then activate. Your AI agent starts handling payment calls immediately, 24 hours a day.",
      },
    ],
    benefits: [
      {
        title: "PCI-Compliant by Default",
        description:
          "All payment data is tokenized and processed through Square's PCI DSS Level 1 certified infrastructure. Sensitive card details never touch CallSphere servers.",
        icon: Settings,
      },
      {
        title: "Unified Commerce",
        description:
          "Phone payments, in-store transactions, and online orders all flow through Square. Your AI agent gives customers a consistent payment experience across every channel.",
        icon: DollarSign,
      },
      {
        title: "24/7 Payment Support",
        description:
          "Customers can pay invoices, request refunds, and manage subscriptions at any hour. No more waiting for business hours to resolve billing issues.",
        icon: Zap,
      },
    ],
  },

  "zoho-crm": {
    slug: "zoho-crm",
    name: "Zoho CRM",
    metaTitle: "CallSphere + Zoho CRM Integration | AI Voice Agents",
    metaDescription:
      "Sync CallSphere AI voice agents with Zoho CRM. Automatically create leads, log calls, update deals, and trigger workflows. Keep your sales pipeline current without manual entry.",
    category: "CRM",
    icon: Search,
    description:
      "Sync CallSphere AI voice agents with Zoho CRM. Automatically create leads, log calls, update deals, and trigger workflows. Keep your sales pipeline current without manual entry. Every inbound and outbound call is captured, enriched with AI-extracted insights, and pushed into the right Zoho module -- so your sales team always works from a complete, up-to-date CRM without lifting a finger.",
    features: [
      {
        title: "Lead Creation & Enrichment",
        description:
          "New callers are automatically created as Leads in Zoho CRM with contact details, call summary, intent classification, and any custom data points extracted by the AI agent during the conversation.",
      },
      {
        title: "Call Activity Logging",
        description:
          "Every call -- inbound and outbound -- is logged as an Activity on the associated Lead, Contact, or Deal. Logs include call duration, transcript, outcome classification, and next-step recommendations.",
      },
      {
        title: "Deal Stage Updates",
        description:
          "AI agents advance Deal stages based on call outcomes. A qualified prospect moves from 'Initial Contact' to 'Qualification' automatically. Pipeline stages stay current without rep intervention.",
      },
      {
        title: "Custom Field Mapping",
        description:
          "Map any data captured during a call to custom Zoho CRM fields. Industry, budget range, timeline, competitor mentions, product interest -- whatever your sales process requires is captured and synced.",
      },
      {
        title: "Workflow Triggers",
        description:
          "CallSphere actions trigger Zoho CRM workflows and blueprint transitions. Book a meeting? Trigger an email sequence. Qualify a lead? Assign it to the right rep and notify the manager.",
      },
      {
        title: "Contact Deduplication",
        description:
          "Before creating a new record, the AI agent checks for existing Contacts and Leads by phone number, email, and name. Duplicates are merged or linked, keeping your CRM clean and accurate.",
      },
    ],
    setupSteps: [
      {
        step: 1,
        title: "Connect Zoho CRM",
        description:
          "Authorize CallSphere via Zoho's OAuth flow. Select your Zoho CRM organization and grant the required API scopes for Leads, Contacts, Deals, and Activities.",
      },
      {
        step: 2,
        title: "Map Fields & Modules",
        description:
          "Choose which Zoho CRM modules to sync -- Leads, Contacts, Deals, Activities -- and map CallSphere data fields to your standard and custom Zoho fields.",
      },
      {
        step: 3,
        title: "Set Sync Rules",
        description:
          "Define when to create new records vs. update existing ones, configure deduplication logic, set which call types to log, and choose which events trigger Zoho workflows.",
      },
      {
        step: 4,
        title: "Activate",
        description:
          "Run a test call to verify that Leads are created, Activities are logged, and Deals are updated correctly. Then go live and let every call flow into Zoho CRM automatically.",
      },
    ],
    benefits: [
      {
        title: "Zero Manual Entry",
        description:
          "Every call is logged automatically with full context -- transcript, outcome, and next steps. Sales reps save 30+ minutes per day on CRM data entry.",
        icon: Zap,
      },
      {
        title: "Real-Time Pipeline",
        description:
          "Deal stages update as calls happen. Sales managers see pipeline changes the moment they occur, with accurate forecasting data that reflects reality.",
        icon: BarChart3,
      },
      {
        title: "Smart Deduplication",
        description:
          "The AI agent checks for existing records before creating new ones, matching on phone number, email, and name. Your CRM stays clean with no duplicate leads or contacts.",
        icon: Search,
      },
    ],
  },

  pipedrive: {
    slug: "pipedrive",
    name: "Pipedrive",
    metaTitle: "CallSphere + Pipedrive Integration | AI Voice Agents",
    metaDescription:
      "Integrate CallSphere AI voice agents with Pipedrive CRM. AI agents create deals, log activities, advance pipeline stages, and schedule follow-ups automatically.",
    category: "CRM",
    icon: BarChart3,
    description:
      "Integrate CallSphere AI agents with Pipedrive CRM. AI agents create deals, log activities, advance pipeline stages, and schedule follow-ups -- keeping your sales process running on autopilot. Every phone conversation feeds directly into your Pipedrive pipeline with structured data, so reps focus on selling instead of updating records.",
    features: [
      {
        title: "Deal Creation & Management",
        description:
          "AI agents create new Deals in Pipedrive during qualifying calls, setting the correct pipeline, stage, expected value, and close date based on information gathered in the conversation.",
      },
      {
        title: "Activity Logging",
        description:
          "Every call is logged as an Activity on the associated Person, Organization, and Deal. Logs include call duration, AI-generated summary, outcome classification, and key discussion points.",
      },
      {
        title: "Pipeline Stage Advancement",
        description:
          "Deals move through pipeline stages automatically based on call outcomes. A successful demo call advances the Deal to 'Proposal Sent'. A signed agreement moves it to 'Won'. No manual dragging required.",
      },
      {
        title: "Contact Sync",
        description:
          "New callers become Persons in Pipedrive with phone number, email, company, and any custom fields populated during the call. Existing contacts are matched and enriched with every interaction.",
      },
      {
        title: "Smart Scheduling",
        description:
          "The AI agent schedules follow-up Activities in Pipedrive after each call -- next call, email reminder, proposal deadline -- so nothing falls through the cracks and reps always know their next action.",
      },
      {
        title: "Revenue Tracking",
        description:
          "Deal values are updated in real time as pricing discussions happen on calls. Weighted pipeline reports in Pipedrive reflect the latest numbers without waiting for reps to update manually.",
      },
    ],
    setupSteps: [
      {
        step: 1,
        title: "Connect Pipedrive",
        description:
          "Authorize CallSphere with your Pipedrive account using an API token or OAuth. We connect to your instance and import your pipelines, stages, and custom fields.",
      },
      {
        step: 2,
        title: "Configure Pipeline Mapping",
        description:
          "Map AI agent call outcomes to Pipedrive pipeline stages. Define which outcomes advance a Deal, which create new Deals, and which trigger follow-up Activities.",
      },
      {
        step: 3,
        title: "Set Automation Rules",
        description:
          "Configure rules for deal assignment, activity scheduling, and notification triggers. Set ownership rules so Deals are assigned to the right rep based on territory, round-robin, or caller intent.",
      },
      {
        step: 4,
        title: "Launch",
        description:
          "Run a test call to verify Deals are created, stages advance, and Activities are logged correctly. Then activate and let every call power your Pipedrive pipeline.",
      },
    ],
    benefits: [
      {
        title: "Deals Advance Automatically",
        description:
          "AI agents update pipeline stages based on call outcomes. Deals move forward in real time without reps manually dragging cards between columns.",
        icon: Zap,
      },
      {
        title: "Complete Activity History",
        description:
          "Every call, voicemail, and follow-up is logged as a Pipedrive Activity with full context. Reps see the complete interaction history before picking up the phone.",
        icon: BarChart3,
      },
      {
        title: "Faster Follow-Ups",
        description:
          "The AI agent schedules next-step Activities immediately after each call. Reps start every day with a clear action list -- no deals go cold because someone forgot to follow up.",
        icon: RefreshCw,
      },
    ],
  },

  monday: {
    slug: "monday",
    name: "Monday.com",
    metaTitle: "CallSphere + Monday.com Integration | AI Voice Agents",
    metaDescription:
      "Connect CallSphere AI voice agents with Monday.com. AI agents create items, update statuses, trigger automations, and log customer interactions directly into your Monday boards.",
    category: "Project Management",
    icon: Layout,
    description:
      "Connect CallSphere AI agents with Monday.com. AI agents create items, update statuses, trigger automations, and log customer interactions directly into your Monday boards. Every phone call becomes a structured work item -- routed to the right board, tagged with the right status, and visible to every team that needs to act on it.",
    features: [
      {
        title: "Item Creation from Calls",
        description:
          "AI agents create new Monday.com items during or after every call. Customer name, issue type, priority, and call summary are populated automatically into the columns you define.",
      },
      {
        title: "Status Updates",
        description:
          "When a caller provides new information or a task is completed during the call, the AI agent updates the item's status column in real time -- keeping boards current without manual intervention.",
      },
      {
        title: "Automation Triggers",
        description:
          "CallSphere events fire Monday.com automations. A new high-priority item can trigger Slack notifications, assign team members, set due dates, and move items between groups automatically.",
      },
      {
        title: "Column Mapping",
        description:
          "Map data extracted from calls to any Monday.com column type -- text, numbers, dropdowns, dates, people, and tags. Your boards capture exactly the information your workflow needs.",
      },
      {
        title: "Sub-Item Support",
        description:
          "For complex requests, the AI agent creates sub-items under a parent item -- breaking a customer call into discrete tasks that can be assigned and tracked independently.",
      },
      {
        title: "Activity Logging",
        description:
          "Every call interaction is logged in the item's activity feed with a transcript summary, call duration, and outcome. Team members see the full conversation history without leaving Monday.com.",
      },
    ],
    setupSteps: [
      {
        step: 1,
        title: "Connect Monday.com",
        description:
          "Authorize CallSphere with your Monday.com account via OAuth. We connect to your workspace and pull your boards, groups, and column configurations.",
      },
      {
        step: 2,
        title: "Select Boards & Groups",
        description:
          "Choose which Monday.com boards and groups the AI agent should create items in. Map different call types to different boards -- sales calls to the Sales Pipeline board, support calls to the Support Tracker.",
      },
      {
        step: 3,
        title: "Map Columns",
        description:
          "Map CallSphere data fields to Monday.com columns. Define which call data populates which column -- caller name to Person, issue type to Status, priority to Label, due date to Date.",
      },
      {
        step: 4,
        title: "Activate",
        description:
          "Create a test item from a sample call, verify columns are populated correctly and automations fire, then go live. Every call starts flowing into your Monday boards instantly.",
      },
    ],
    benefits: [
      {
        title: "Calls Become Action Items",
        description:
          "Every phone call automatically creates a structured work item in Monday.com. Zero manual entry means zero calls slip through the cracks.",
        icon: Zap,
      },
      {
        title: "Real-Time Board Updates",
        description:
          "Item statuses change instantly as calls progress and resolve. Your Monday boards always reflect the current state of every customer interaction.",
        icon: RefreshCw,
      },
      {
        title: "Cross-Team Visibility",
        description:
          "Sales, support, and operations teams all see call-generated items on their boards. Everyone has context, no one is left out, and handoffs happen seamlessly.",
        icon: Layout,
      },
    ],
  },
};

/* ------------------------------------------------------------------ */
/*  Static generation & metadata                                       */
/* ------------------------------------------------------------------ */

export function generateStaticParams() {
  return Object.keys(integrations).map((slug) => ({ slug }));
}

export function generateMetadata({
  params,
}: {
  params: { slug: string };
}): Metadata {
  const integration = integrations[params.slug];
  if (!integration) return {};

  return {
    title: integration.metaTitle,
    description: integration.metaDescription,
    alternates: {
      canonical: `https://callsphere.tech/integrations/${integration.slug}`,
    },
    openGraph: {
      title: integration.metaTitle,
      description: integration.metaDescription,
      url: `https://callsphere.tech/integrations/${integration.slug}`,
      type: "website",
    },
  };
}

/* ------------------------------------------------------------------ */
/*  Page component                                                     */
/* ------------------------------------------------------------------ */

export default function IntegrationPage({
  params,
}: {
  params: { slug: string };
}) {
  const integration = integrations[params.slug];
  if (!integration) notFound();

  const Icon = integration.icon;

  return (
    <>
      <BreadcrumbJsonLd
        items={[
          { name: "Home", url: "https://callsphere.tech" },
          { name: "Integrations", url: "https://callsphere.tech/integrations" },
          {
            name: integration.name,
            url: `https://callsphere.tech/integrations/${integration.slug}`,
          },
        ]}
      />
      <ServiceJsonLd
        name={`CallSphere + ${integration.name} Integration`}
        description={integration.metaDescription}
        url={`https://callsphere.tech/integrations/${integration.slug}`}
      />
      <Nav />
      <main id="main" className="relative">
        {/* Hero Section */}
        <section className="section-shell pt-16 pb-20">
          <div className="mx-auto max-w-4xl text-center">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-medium text-slate-700">
              <Plug className="h-4 w-4" />
              {integration.category} Integration
            </div>
            <h1 className="text-4xl font-bold leading-tight tracking-tight text-slate-900 sm:text-5xl">
              CallSphere + {integration.name}
            </h1>
            <p className="mx-auto mt-6 max-w-3xl text-lg leading-relaxed text-slate-600">
              {integration.description}
            </p>
            <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
              <Link
                href="/contact"
                className="inline-flex items-center rounded-lg bg-indigo-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-indigo-700"
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

        {/* Key Features Grid */}
        <section className="section-stack bg-slate-50 py-20">
          <div className="mx-auto max-w-6xl px-6">
            <div className="mx-auto max-w-3xl text-center">
              <span className="text-sm font-medium text-indigo-600">
                Capabilities
              </span>
              <h2 className="mt-4 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
                What the {integration.name} integration enables
              </h2>
            </div>
            <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {integration.features.map((feature) => (
                <div
                  key={feature.title}
                  className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:shadow-md"
                >
                  <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-100 text-indigo-600">
                    <Icon className="h-5 w-5" />
                  </div>
                  <h3 className="text-lg font-semibold text-slate-900">
                    {feature.title}
                  </h3>
                  <p className="mt-3 text-sm leading-relaxed text-slate-600">
                    {feature.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* How It Works Steps */}
        <section className="section-stack py-20">
          <div className="mx-auto max-w-4xl px-6">
            <div className="mx-auto max-w-3xl text-center">
              <span className="text-sm font-medium text-indigo-600">
                Setup
              </span>
              <h2 className="mt-4 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
                How to connect {integration.name}
              </h2>
              <p className="mt-4 text-lg text-slate-600">
                Get up and running in four simple steps. Most teams go live in
                under 30 minutes.
              </p>
            </div>
            <div className="mt-12 space-y-8">
              {integration.setupSteps.map((step) => (
                <div key={step.step} className="flex gap-6">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-indigo-600 text-sm font-bold text-white">
                    {step.step}
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-slate-900">
                      {step.title}
                    </h3>
                    <p className="mt-2 text-sm leading-relaxed text-slate-600">
                      {step.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Benefits Section */}
        <section className="section-stack bg-indigo-600 py-20">
          <div className="mx-auto max-w-6xl px-6">
            <div className="mx-auto max-w-3xl text-center">
              <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
                Why teams choose this integration
              </h2>
            </div>
            <div className="mt-12 grid gap-8 sm:grid-cols-3">
              {integration.benefits.map((benefit) => {
                const BenefitIcon = benefit.icon;
                return (
                  <div
                    key={benefit.title}
                    className="rounded-2xl bg-white/10 p-8 backdrop-blur-sm"
                  >
                    <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-white/20 text-white">
                      <BenefitIcon className="h-6 w-6" />
                    </div>
                    <h3 className="text-lg font-semibold text-white">
                      {benefit.title}
                    </h3>
                    <p className="mt-3 text-sm leading-relaxed text-indigo-100">
                      {benefit.description}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* Other Integrations */}
        <section className="section-stack py-20">
          <div className="mx-auto max-w-6xl px-6">
            <div className="mx-auto max-w-3xl text-center">
              <h2 className="text-2xl font-bold text-slate-900">
                Explore more integrations
              </h2>
              <p className="mt-3 text-slate-600">
                CallSphere connects to the tools your team already uses.
              </p>
            </div>
            <div className="mt-10 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {Object.values(integrations)
                .filter((i) => i.slug !== integration.slug)
                .map((i) => {
                  const OtherIcon = i.icon;
                  return (
                    <Link
                      key={i.slug}
                      href={`/integrations/${i.slug}` as Route}
                      className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 transition hover:border-indigo-300 hover:bg-indigo-50"
                    >
                      <OtherIcon className="h-4 w-4 text-indigo-500" />
                      {i.name}
                    </Link>
                  );
                })}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="section-stack py-20">
          <div className="mx-auto max-w-4xl px-6">
            <div className="rounded-2xl border border-slate-200 bg-gradient-to-br from-slate-50 to-white px-8 py-16 text-center sm:px-16">
              <h2 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
                Ready to connect {integration.name}?
              </h2>
              <p className="mx-auto mt-4 max-w-2xl text-lg text-slate-600">
                See how CallSphere AI agents integrate with {integration.name}{" "}
                to automate your workflows. Live demo available -- no signup
                required.
              </p>
              <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
                <Link
                  href="/contact"
                  className="inline-flex items-center rounded-lg bg-indigo-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-indigo-700"
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
          </div>
        </section>
      </main>
      <Footer />
      <VoiceAgentLauncher />
    </>
  );
}
