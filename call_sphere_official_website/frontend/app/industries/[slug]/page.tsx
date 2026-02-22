import { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import {
  Thermometer,
  Stethoscope,
  Monitor,
  Truck,
  ArrowRight,
  CheckCircle2,
  Shield,
  Clock,
  PhoneCall,
  TrendingUp,
  Zap,
  Globe,
  Building2,
  UtensilsCrossed,
  Scissors,
  Heart,
  Scale,
  ShieldCheck,
  Car,
  Landmark,
  DollarSign,
  Users,
  Calendar,
  type LucideIcon,
} from "lucide-react";

import { Nav } from "@/components/Nav";
import { Footer } from "@/components/Footer";
import { CTA } from "@/components/CTA";
import { VoiceAgentLauncher } from "@/components/VoiceAgentLauncher";
import { BreadcrumbJsonLd, ServiceJsonLd } from "@/components/StructuredData";

type IndustryData = {
  slug: string;
  name: string;
  headline: string;
  metaTitle: string;
  metaDescription: string;
  icon: LucideIcon;
  heroDescription: string;
  painPoints: { title: string; description: string }[];
  solutions: { title: string; description: string; icon: LucideIcon }[];
  stat: string;
  statLabel: string;
  statDescription: string;
  integrations: string[];
  features: string[];
  compliance?: string[];
  ctaHeadline: string;
  ctaDescription: string;
};

const industries: Record<string, IndustryData> = {
  hvac: {
    slug: "hvac",
    name: "HVAC Services",
    headline: "AI Voice Agent for HVAC Service Companies",
    metaTitle: "AI Voice Agent for HVAC Companies | CallSphere",
    metaDescription:
      "Automate HVAC service calls with AI voice agents. Schedule maintenance, dispatch technicians, and handle emergency calls 24/7. 95% of calls resolved automatically.",
    icon: Thermometer,
    heroDescription:
      "Stop losing revenue to missed calls and after-hours emergencies. CallSphere AI voice agents handle service scheduling, emergency dispatch, and system diagnostics around the clock -- so your techs can focus on what they do best.",
    painPoints: [
      {
        title: "Missed After-Hours Calls",
        description:
          "Emergency HVAC calls come in at all hours. Without 24/7 coverage, you lose high-value emergency service jobs to competitors who answer.",
      },
      {
        title: "Overloaded Dispatchers",
        description:
          "Your dispatchers juggle incoming calls, schedule coordination, and technician routing simultaneously, leading to errors and delays.",
      },
      {
        title: "No-Show Appointments",
        description:
          "Without automated reminders and confirmations, no-show rates eat into your technicians' productivity and your bottom line.",
      },
      {
        title: "Seasonal Call Spikes",
        description:
          "Summer and winter peaks overwhelm your phone lines. Hiring temporary staff is expensive and training takes time you don't have.",
      },
    ],
    solutions: [
      {
        title: "24/7 Call Handling",
        description:
          "AI agents answer every call instantly, qualifying emergencies and scheduling routine maintenance without hold times.",
        icon: PhoneCall,
      },
      {
        title: "Smart Dispatch",
        description:
          "Automatically route jobs to the right technician based on location, skills, and availability. Emergency calls get priority routing.",
        icon: Zap,
      },
      {
        title: "Automated Reminders",
        description:
          "Send appointment confirmations and reminders via voice, SMS, or email. Reduce no-shows and keep your schedule full.",
        icon: Clock,
      },
      {
        title: "Instant Scalability",
        description:
          "Handle unlimited concurrent calls during peak seasons. No hiring, no training, no hold music.",
        icon: TrendingUp,
      },
    ],
    stat: "95%",
    statLabel: "of service calls resolved automatically",
    statDescription:
      "CallSphere AI agents resolve the vast majority of HVAC service calls without human intervention -- from scheduling routine maintenance to dispatching emergency technicians.",
    integrations: [
      "ServiceTitan",
      "Housecall Pro",
      "Jobber",
      "Twilio",
      "Google Calendar",
      "Stripe",
    ],
    features: [
      "Service Scheduling",
      "Emergency Dispatch",
      "System Diagnostics",
      "Parts Ordering",
      "Appointment Reminders",
      "Customer Follow-ups",
    ],
    ctaHeadline: "Stop Missing HVAC Service Calls",
    ctaDescription:
      "See how CallSphere AI agents handle your HVAC service calls, schedule maintenance, and dispatch technicians 24/7.",
  },
  healthcare: {
    slug: "healthcare",
    name: "Healthcare & Dental",
    headline: "HIPAA-Compliant AI Voice Agent for Healthcare",
    metaTitle: "HIPAA-Compliant AI Voice Agent for Healthcare | CallSphere",
    metaDescription:
      "HIPAA-compliant AI voice agents for healthcare. Automate appointment scheduling, insurance verification, and patient intake. Reduce no-shows by 40%. BAA available.",
    icon: Stethoscope,
    heroDescription:
      "Reduce no-shows, automate patient intake, and ensure every call is answered -- all while maintaining full HIPAA compliance with a signed Business Associate Agreement.",
    painPoints: [
      {
        title: "Patient No-Shows",
        description:
          "Missed appointments cost U.S. healthcare $150B+ annually. Without automated reminders, clinics lose 20-30% of scheduled visits.",
      },
      {
        title: "Front Desk Overload",
        description:
          "Reception staff juggle phone calls, check-ins, insurance verification, and paperwork simultaneously, leading to long hold times and frustrated patients.",
      },
      {
        title: "After-Hours Patient Calls",
        description:
          "Patients call after hours for urgent questions, prescription refills, and appointment changes. Voicemail leads to callbacks and delayed care.",
      },
      {
        title: "HIPAA Compliance Burden",
        description:
          "Every communication channel must be HIPAA-compliant. Generic phone systems and chatbots create compliance gaps and audit risks.",
      },
    ],
    solutions: [
      {
        title: "Smart Appointment Scheduling",
        description:
          "AI agents book, reschedule, and confirm appointments 24/7. Automated reminders via voice, SMS, and email reduce no-shows by up to 40%.",
        icon: Clock,
      },
      {
        title: "Insurance Verification",
        description:
          "Verify insurance eligibility and collect copay information before the visit, reducing front-desk bottlenecks and billing delays.",
        icon: Shield,
      },
      {
        title: "Patient Intake Automation",
        description:
          "Collect patient information, medical history, and consent forms via voice or chat before they arrive, saving 15+ minutes per visit.",
        icon: PhoneCall,
      },
      {
        title: "HIPAA-Compliant by Default",
        description:
          "Full HIPAA compliance with signed BAA, encrypted data in transit and at rest, audit logging, and role-based access controls.",
        icon: Shield,
      },
    ],
    stat: "40%",
    statLabel: "reduction in patient no-shows",
    statDescription:
      "Healthcare clinics using CallSphere AI agents see dramatic reductions in no-shows through automated appointment reminders, confirmations, and easy rescheduling.",
    integrations: [
      "Epic",
      "Cerner",
      "athenahealth",
      "DrChrono",
      "Twilio",
      "Stripe",
    ],
    features: [
      "Appointment Scheduling",
      "Insurance Verification",
      "Patient Intake",
      "No-Show Reduction",
      "Prescription Reminders",
      "Referral Management",
    ],
    compliance: [
      "HIPAA Compliant",
      "BAA Available",
      "SOC 2 Aligned",
      "Encrypted PHI",
      "Audit Logging",
      "Role-Based Access",
    ],
    ctaHeadline: "Reduce No-Shows and Automate Patient Communications",
    ctaDescription:
      "See how CallSphere HIPAA-compliant AI agents handle appointment scheduling, insurance verification, and patient intake for your clinic.",
  },
  "it-support": {
    slug: "it-support",
    name: "IT Support & MSPs",
    headline: "AI Voice Agent for IT Support & Managed Service Providers",
    metaTitle: "AI Voice Agent for IT Support & MSPs | CallSphere",
    metaDescription:
      "AI voice agents for IT support and MSPs. Automate ticket triage, password resets, and status updates. 60% faster Tier-1 resolution. ConnectWise & Autotask integration.",
    icon: Monitor,
    heroDescription:
      "Deflect Tier-1 tickets, auto-create categorized tickets, and provide instant status updates -- without human intervention. Let your engineers focus on complex issues that actually need them.",
    painPoints: [
      {
        title: "Tier-1 Ticket Overload",
        description:
          "Your engineers spend 40-60% of their time on password resets, connectivity checks, and basic troubleshooting that doesn't require their expertise.",
      },
      {
        title: "Slow Response Times",
        description:
          "SLA breaches happen when tickets pile up. Customers expect instant responses but your team is buried in low-priority requests.",
      },
      {
        title: "After-Hours Support Gaps",
        description:
          "Critical infrastructure issues don't wait for business hours. On-call rotations burn out engineers and still leave gaps in coverage.",
      },
      {
        title: "Inconsistent Ticket Quality",
        description:
          "Manual ticket creation leads to missing information, wrong categorization, and duplicate tickets that waste engineering time.",
      },
    ],
    solutions: [
      {
        title: "Automated Ticket Triage",
        description:
          "AI agents categorize, prioritize, and route tickets to the right team instantly. Critical issues get immediate escalation.",
        icon: Zap,
      },
      {
        title: "Self-Service Resolution",
        description:
          "Handle password resets, connectivity diagnostics, VPN setup, and common troubleshooting steps automatically via voice or chat.",
        icon: CheckCircle2,
      },
      {
        title: "24/7 First Response",
        description:
          "Every call and message gets an instant response. SLA clocks start with context already gathered, not with a voicemail.",
        icon: Clock,
      },
      {
        title: "Smart Escalation",
        description:
          "When human expertise is needed, AI hands off with full context: issue description, steps already tried, and relevant system info.",
        icon: TrendingUp,
      },
    ],
    stat: "60%",
    statLabel: "faster Tier-1 ticket resolution",
    statDescription:
      "MSPs and IT departments using CallSphere AI agents resolve Tier-1 tickets dramatically faster through automated triage, self-service, and intelligent escalation.",
    integrations: [
      "ConnectWise",
      "Autotask/Datto",
      "Zendesk",
      "Freshdesk",
      "Jira Service Management",
      "PagerDuty",
    ],
    features: [
      "Ticket Triage & Creation",
      "Smart Escalation",
      "Status Updates",
      "Password Resets",
      "Knowledge Base Search",
      "SLA Monitoring",
    ],
    ctaHeadline: "Stop Wasting Engineers on Password Resets",
    ctaDescription:
      "See how CallSphere AI agents handle Tier-1 tickets, automate triage, and give your engineers time back for complex work.",
  },
  logistics: {
    slug: "logistics",
    name: "Logistics & Delivery",
    headline: "AI Voice Agent for Logistics & Delivery Companies",
    metaTitle: "AI Voice Agent for Logistics & Delivery | CallSphere",
    metaDescription:
      "AI voice agents for logistics and delivery companies. Automate order tracking, exception handling, and redelivery scheduling. Available 24/7 in 57+ languages.",
    icon: Truck,
    heroDescription:
      "Handle order tracking inquiries, manage delivery exceptions, and schedule redeliveries automatically. Give your customers instant answers without overwhelming your operations team.",
    painPoints: [
      {
        title: "Where Is My Order? Flood",
        description:
          "WISMO calls make up 40-50% of all customer contacts. Each one costs $5-8 to handle manually but takes an AI agent seconds.",
      },
      {
        title: "Delivery Exceptions",
        description:
          "Failed deliveries, wrong addresses, and damaged packages create urgent calls. Slow resolution means returns and chargebacks.",
      },
      {
        title: "Multilingual Customer Base",
        description:
          "Global logistics means customers who speak different languages. Hiring multilingual agents is expensive and hard to scale.",
      },
      {
        title: "Peak Season Scaling",
        description:
          "Holiday seasons, flash sales, and promotional events create 3-5x call spikes. Traditional staffing can't keep up.",
      },
    ],
    solutions: [
      {
        title: "Instant Order Tracking",
        description:
          "AI agents pull real-time tracking data and give customers instant updates on their order status, ETA, and delivery details.",
        icon: Globe,
      },
      {
        title: "Exception Handling",
        description:
          "Automatically process delivery exceptions, initiate returns, and schedule redeliveries without human intervention.",
        icon: Zap,
      },
      {
        title: "57+ Language Support",
        description:
          "Serve customers globally in their native language. Natural conversations, not robotic translations.",
        icon: Globe,
      },
      {
        title: "Unlimited Scale",
        description:
          "Handle thousands of concurrent calls during peak season. No hiring, no training, no seasonal staffing headaches.",
        icon: TrendingUp,
      },
    ],
    stat: "24/7",
    statLabel: "availability in 57+ languages",
    statDescription:
      "CallSphere AI agents provide round-the-clock order tracking, exception handling, and customer support in 57+ languages -- scaling instantly for peak season demand.",
    integrations: [
      "ShipStation",
      "ShipBob",
      "Shopify",
      "WMS Systems",
      "Twilio",
      "Salesforce",
    ],
    features: [
      "Order Tracking",
      "Exception Handling",
      "Redelivery Scheduling",
      "Return Processing",
      "Proof of Delivery",
      "Customer Notifications",
    ],
    ctaHeadline: "Automate Your Logistics Customer Support",
    ctaDescription:
      'See how CallSphere AI agents handle "Where is my order?" calls, delivery exceptions, and redelivery scheduling 24/7.',
  },
  "real-estate": {
    slug: "real-estate",
    name: "Real Estate & Property Management",
    headline: "AI Voice Agent for Real Estate & Property Management",
    metaTitle: "AI Voice Agent for Real Estate | CallSphere",
    metaDescription:
      "AI voice agents for real estate and property management. Automate tenant inquiries, schedule showings, handle maintenance requests, and qualify leads 24/7.",
    icon: Building2,
    heroDescription:
      "Automate property inquiries, schedule showings, handle maintenance requests, and qualify leads around the clock. Never lose a prospect to a missed call again.",
    painPoints: [
      {
        title: "Missed Prospect Calls",
        description:
          "Potential buyers and renters call at all hours -- evenings, weekends, and lunch breaks. Every missed call is a lost showing opportunity and potential commission walking out the door to a competitor who answered first.",
      },
      {
        title: "Maintenance Request Overload",
        description:
          "Property managers drown in tenant maintenance calls ranging from emergency plumbing to routine requests. Without a system to triage and prioritize, urgent issues get buried and tenant satisfaction plummets.",
      },
      {
        title: "Showing Coordination Chaos",
        description:
          "Coordinating property showings across multiple listings, agents, and prospect schedules is a logistical nightmare. Double-bookings, no-shows, and last-minute cancellations waste everyone's time.",
      },
      {
        title: "Tenant Communication Gaps",
        description:
          "Lease renewals, rent reminders, and community updates require consistent outreach. When communication lapses, tenant turnover increases and vacancy rates climb.",
      },
    ],
    solutions: [
      {
        title: "24/7 Lead Capture",
        description:
          "AI agents answer every inquiry instantly, qualify prospects based on budget and requirements, and capture contact details so no lead slips through the cracks -- even at 2 AM.",
        icon: PhoneCall,
      },
      {
        title: "Automated Showing Scheduling",
        description:
          "Prospects book property showings directly through the AI agent, synced with your calendar and listing availability. Automatic reminders reduce no-shows and keep your schedule optimized.",
        icon: Clock,
      },
      {
        title: "Maintenance Request Triage",
        description:
          "AI agents collect details about maintenance issues, categorize them by urgency, and route emergency requests to on-call staff while scheduling routine repairs during business hours.",
        icon: Zap,
      },
      {
        title: "Tenant Communication Hub",
        description:
          "Automate lease renewal reminders, rent payment notifications, and community announcements. Tenants get instant answers to common questions about policies, amenities, and move-in procedures.",
        icon: Globe,
      },
    ],
    stat: "35%",
    statLabel: "more leads captured after hours",
    statDescription:
      "Real estate agencies using CallSphere AI agents capture significantly more leads outside business hours by answering every inquiry instantly, qualifying prospects, and scheduling showings automatically.",
    integrations: [
      "AppFolio",
      "Buildium",
      "Yardi",
      "Zillow",
      "Google Calendar",
      "Stripe",
    ],
    features: [
      "Lead Qualification",
      "Showing Scheduling",
      "Maintenance Triage",
      "Rent Collection",
      "Lease Inquiries",
      "Tenant Notifications",
    ],
    ctaHeadline: "Never Miss a Real Estate Lead Again",
    ctaDescription:
      "See how CallSphere AI agents qualify prospects, schedule showings, and handle maintenance requests for your properties 24/7.",
  },
  restaurant: {
    slug: "restaurant",
    name: "Restaurants & Food Service",
    headline: "AI Voice Agent for Restaurants & Food Service",
    metaTitle: "AI Voice Agent for Restaurants | CallSphere",
    metaDescription:
      "AI voice agents for restaurants. Automate reservations, takeout orders, catering inquiries, and customer FAQs. Handle peak hour calls without missing a beat.",
    icon: UtensilsCrossed,
    heroDescription:
      "Take reservations, process takeout orders, answer menu questions, and handle catering inquiries -- all while your staff focuses on the dining experience.",
    painPoints: [
      {
        title: "Missed Calls During Rush Hours",
        description:
          "When the dinner rush hits, your staff is plating food and serving guests -- not answering phones. Every unanswered call is a lost reservation, a missed takeout order, or a frustrated regular who goes elsewhere.",
      },
      {
        title: "Order Errors from Phone Miscommunication",
        description:
          "Background noise, accents, and hurried staff lead to phone order mistakes. Wrong items, missed modifications, and dietary allergy miscommunications create costly remakes and unhappy customers.",
      },
      {
        title: "Reservation No-Shows",
        description:
          "Without automated confirmations and reminders, no-show rates can exceed 20%. Empty tables during peak hours mean lost revenue that can never be recovered.",
      },
      {
        title: "Staff Pulled from Service to Answer Phones",
        description:
          "Every time a server or host stops to answer the phone, in-house guests wait longer. This creates a lose-lose scenario where phone callers and dine-in customers both receive degraded service.",
      },
    ],
    solutions: [
      {
        title: "Automated Reservations",
        description:
          "AI agents handle reservation requests 24/7, check real-time table availability, accommodate special requests, and send confirmation reminders that dramatically reduce no-show rates.",
        icon: Calendar,
      },
      {
        title: "Phone Order Processing",
        description:
          "Accurately capture takeout and delivery orders with every modification, allergy note, and special instruction. Orders are confirmed back to the customer and sent directly to your kitchen system.",
        icon: Zap,
      },
      {
        title: "Menu & FAQ Answering",
        description:
          "Instantly answer questions about menu items, ingredients, allergens, hours, location, parking, and dietary accommodations. Your staff never has to pause service to field routine calls.",
        icon: PhoneCall,
      },
      {
        title: "Catering Lead Capture",
        description:
          "Capture catering inquiries with event details, guest counts, budget ranges, and dietary requirements. Qualified leads are routed to your catering manager with all the information needed to close the deal.",
        icon: TrendingUp,
      },
    ],
    stat: "98%",
    statLabel: "of calls answered, even during rush hours",
    statDescription:
      "Restaurants using CallSphere AI agents answer virtually every call, even during the busiest dinner rushes. No more lost reservations, missed takeout orders, or frustrated customers sent to voicemail.",
    integrations: [
      "OpenTable",
      "Toast",
      "Square",
      "Yelp",
      "Google Calendar",
      "DoorDash",
    ],
    features: [
      "Reservation Management",
      "Takeout Orders",
      "Menu Inquiries",
      "Catering Quotes",
      "Wait Time Updates",
      "Special Event Booking",
    ],
    ctaHeadline: "Never Miss a Reservation or Order Again",
    ctaDescription:
      "See how CallSphere AI agents handle reservations, takeout orders, and catering inquiries so your staff can focus on the dining experience.",
  },
  "salon-beauty": {
    slug: "salon-beauty",
    name: "Salons & Beauty",
    headline: "AI Voice Agent for Salons & Beauty Businesses",
    metaTitle: "AI Voice Agent for Salons & Spas | CallSphere",
    metaDescription:
      "AI voice agents for salons, spas, and beauty businesses. Automate appointment booking, service inquiries, and client reminders. Reduce no-shows by 35%.",
    icon: Scissors,
    heroDescription:
      "Book appointments, answer service questions, send reminders, and manage your waitlist automatically. Your stylists stay with clients, not on the phone.",
    painPoints: [
      {
        title: "Stylists Interrupted by Phone Calls",
        description:
          "Every phone call pulls a stylist away from a paying client mid-service. Wet hair waits, color processes are left unattended, and the client experience suffers -- all for a booking that could have been automated.",
      },
      {
        title: "High No-Show Rates",
        description:
          "Without automated reminders, salon no-show rates average 15-25%. Each empty chair is lost revenue -- and the stylist who blocked that time can't fill it at the last minute.",
      },
      {
        title: "Complex Multi-Service Booking",
        description:
          "Clients often want multiple services (cut, color, blowout) that require different time blocks, specific stylists, and careful scheduling. Phone bookings frequently result in timing errors and overbooking.",
      },
      {
        title: "Difficulty Managing Waitlists",
        description:
          "When cancellations happen, manually calling through a waitlist is time-consuming and often results in the slot going unfilled. Revenue is lost that could have been recovered with instant notifications.",
      },
    ],
    solutions: [
      {
        title: "Smart Appointment Booking",
        description:
          "AI agents book single and multi-service appointments with the right stylist, at the right time, accounting for processing times and chair availability. Clients book 24/7 without calling during business hours.",
        icon: Clock,
      },
      {
        title: "Service & Pricing Info",
        description:
          "Answer questions about services, pricing, products, and stylist specialties instantly. Clients get the information they need to make booking decisions without interrupting your team.",
        icon: PhoneCall,
      },
      {
        title: "Automated Reminders",
        description:
          "Send appointment confirmations, reminders, and follow-ups via voice, SMS, or email. Clients can easily confirm, reschedule, or cancel -- reducing no-shows by up to 35%.",
        icon: Zap,
      },
      {
        title: "Waitlist Management",
        description:
          "When a cancellation opens up, the AI agent automatically contacts waitlisted clients to fill the slot. First to confirm gets the appointment, maximizing your chair utilization.",
        icon: TrendingUp,
      },
    ],
    stat: "35%",
    statLabel: "reduction in no-shows",
    statDescription:
      "Salons and beauty businesses using CallSphere AI agents see dramatic reductions in no-shows through automated reminders, easy rescheduling, and proactive confirmations that keep chairs full and revenue flowing.",
    integrations: [
      "Vagaro",
      "Fresha",
      "Mindbody",
      "Square",
      "Google Calendar",
      "Stripe",
    ],
    features: [
      "Appointment Booking",
      "Service Inquiries",
      "Price Quotes",
      "Reminder Sequences",
      "Waitlist Management",
      "Product Recommendations",
    ],
    ctaHeadline: "Keep Your Chairs Full and Your Stylists Focused",
    ctaDescription:
      "See how CallSphere AI agents handle appointment booking, reminders, and waitlist management so your stylists stay with clients.",
  },
  dental: {
    slug: "dental",
    name: "Dental Practices",
    headline: "HIPAA-Compliant AI Voice Agent for Dental Practices",
    metaTitle: "AI Voice Agent for Dental Practices | CallSphere",
    metaDescription:
      "HIPAA-compliant AI voice agents for dental practices. Automate appointment scheduling, insurance verification, and patient reminders. BAA available.",
    icon: Heart,
    heroDescription:
      "Automate patient scheduling, insurance verification, and appointment reminders while maintaining full HIPAA compliance. Your front desk focuses on patient care, not phone calls.",
    painPoints: [
      {
        title: "Front Desk Overwhelmed with Calls",
        description:
          "Your front desk staff juggle incoming calls, patient check-ins, insurance paperwork, and billing inquiries all at once. Hold times increase, callers hang up, and new patients book elsewhere.",
      },
      {
        title: "Patient No-Shows Cost Revenue",
        description:
          "The average dental practice loses $150-200 per no-show. Without automated reminders and confirmations, no-show rates can reach 15-20%, costing practices tens of thousands annually.",
      },
      {
        title: "Insurance Verification Delays",
        description:
          "Verifying insurance eligibility and benefits before appointments is time-consuming and often incomplete. Patients arrive to surprise bills, creating dissatisfaction and payment collection challenges.",
      },
      {
        title: "After-Hours Patient Inquiries",
        description:
          "Patients call after hours for emergency guidance, appointment changes, and insurance questions. Voicemail leads to phone tag the next morning and potential patient attrition.",
      },
    ],
    solutions: [
      {
        title: "Patient Scheduling",
        description:
          "AI agents handle appointment booking, rescheduling, and cancellations 24/7. Smart scheduling optimizes chair time and ensures the right appointment type is booked with the right provider.",
        icon: Clock,
      },
      {
        title: "Insurance Pre-Verification",
        description:
          "Collect insurance information and verify eligibility before the appointment. Patients arrive informed about their coverage and expected costs, reducing billing surprises and payment delays.",
        icon: Shield,
      },
      {
        title: "Automated Recall Reminders",
        description:
          "Send recall reminders for cleanings, follow-up treatments, and overdue appointments. Multi-touch sequences via voice, SMS, and email bring patients back and keep your schedule full.",
        icon: Zap,
      },
      {
        title: "After-Hours Triage",
        description:
          "Provide after-hours guidance for dental emergencies, answer common post-procedure questions, and allow patients to schedule urgent appointments without waiting until morning.",
        icon: PhoneCall,
      },
    ],
    stat: "42%",
    statLabel: "reduction in patient no-shows",
    statDescription:
      "Dental practices using CallSphere AI agents see significant reductions in no-shows through automated recall reminders, appointment confirmations, and easy rescheduling that keeps chairs occupied and production high.",
    integrations: [
      "Dentrix",
      "Eaglesoft",
      "Open Dental",
      "CareStack",
      "Twilio",
      "Stripe",
    ],
    features: [
      "Patient Scheduling",
      "Insurance Verification",
      "No-Show Reduction",
      "Recall Reminders",
      "New Patient Intake",
      "Emergency Triage",
    ],
    compliance: [
      "HIPAA Compliant",
      "BAA Available",
      "SOC 2 Aligned",
      "Encrypted PHI",
      "Audit Logging",
      "Role-Based Access",
    ],
    ctaHeadline: "Reduce No-Shows and Fill Your Dental Chairs",
    ctaDescription:
      "See how CallSphere HIPAA-compliant AI agents handle patient scheduling, insurance verification, and recall reminders for your dental practice.",
  },
  legal: {
    slug: "legal",
    name: "Legal & Law Firms",
    headline: "AI Voice Agent for Law Firms & Legal Practices",
    metaTitle: "AI Voice Agent for Law Firms | CallSphere",
    metaDescription:
      "AI voice agents for law firms. Qualify leads, schedule consultations, handle intake calls, and manage client communications 24/7. Confidential and compliant.",
    icon: Scale,
    heroDescription:
      "Qualify potential clients, schedule consultations, handle intake calls, and manage communications 24/7. Every call is a potential case -- never miss one again.",
    painPoints: [
      {
        title: "High-Value Leads Lost to Voicemail",
        description:
          "Potential clients in crisis call multiple firms and hire the first one that answers. Every call that goes to voicemail is a high-value case walking to your competitor down the street.",
      },
      {
        title: "Intake Calls Disrupt Attorney Work",
        description:
          "Attorneys and paralegals are pulled from billable work to handle intake calls. This disrupts focus on active cases and reduces the firm's productive hours and revenue.",
      },
      {
        title: "After-Hours Client Emergencies",
        description:
          "Legal emergencies -- arrests, accidents, urgent filings -- don't wait for business hours. Without 24/7 intake, firms miss time-sensitive cases that require immediate action.",
      },
      {
        title: "Client Communication Follow-Up Gaps",
        description:
          "Keeping clients updated on case status is essential but time-consuming. Gaps in communication lead to client dissatisfaction, bar complaints, and negative reviews.",
      },
    ],
    solutions: [
      {
        title: "Lead Qualification & Intake",
        description:
          "AI agents answer every call, screen for case type and jurisdiction, collect essential intake information, and qualify leads based on your firm's criteria -- all before a human touches the file.",
        icon: PhoneCall,
      },
      {
        title: "Consultation Scheduling",
        description:
          "Qualified prospects are booked directly into attorney calendars based on practice area, availability, and case urgency. Automated reminders ensure prospects show up prepared.",
        icon: Clock,
      },
      {
        title: "Emergency Call Routing",
        description:
          "Time-sensitive matters -- criminal arrests, restraining orders, emergency custody -- are identified instantly and routed to the on-call attorney with full case context.",
        icon: Zap,
      },
      {
        title: "Client Communication Hub",
        description:
          "Automate case status updates, document request follow-ups, and appointment reminders. Clients get timely information without attorneys spending hours on routine calls.",
        icon: Globe,
      },
    ],
    stat: "45%",
    statLabel: "more qualified leads captured",
    statDescription:
      "Law firms using CallSphere AI agents capture significantly more qualified leads by answering every call instantly, screening for case fit, and booking consultations before prospects call another firm.",
    integrations: [
      "Clio",
      "MyCase",
      "PracticePanther",
      "Calendly",
      "Google Calendar",
      "Stripe",
    ],
    features: [
      "Lead Qualification",
      "Consultation Booking",
      "Client Intake",
      "Conflict Checks",
      "Emergency Routing",
      "Case Status Updates",
    ],
    ctaHeadline: "Capture Every Legal Lead, Day and Night",
    ctaDescription:
      "See how CallSphere AI agents qualify leads, schedule consultations, and handle client intake for your law firm 24/7.",
  },
  insurance: {
    slug: "insurance",
    name: "Insurance",
    headline: "AI Voice Agent for Insurance Agencies",
    metaTitle: "AI Voice Agent for Insurance Agencies | CallSphere",
    metaDescription:
      "AI voice agents for insurance agencies. Automate quote requests, claims intake, policy inquiries, and renewal reminders. Available 24/7 in 57+ languages.",
    icon: ShieldCheck,
    heroDescription:
      "Handle quote requests, claims intake, policy questions, and renewal reminders automatically. Serve more policyholders without adding headcount.",
    painPoints: [
      {
        title: "Quote Request Response Delays",
        description:
          "Speed-to-quote is the number one factor in winning new business. When prospects wait hours or days for a callback, they've already bound coverage with a faster competitor.",
      },
      {
        title: "Claims Intake Bottleneck",
        description:
          "First notice of loss calls flood in after storms, accidents, and incidents. Overwhelmed staff means longer claim cycle times, frustrated policyholders, and increased E&O exposure.",
      },
      {
        title: "Policy Question Overload",
        description:
          "Policyholders call with routine questions about coverage limits, deductibles, payment due dates, and ID cards. Each call costs $8-12 to handle and pulls producers away from selling.",
      },
      {
        title: "Renewal Follow-Up Gaps",
        description:
          "Lapsed renewals are lost revenue that's expensive to replace with new business. Without systematic follow-up, agencies see 10-15% annual policy attrition from missed renewals alone.",
      },
    ],
    solutions: [
      {
        title: "Instant Quote Intake",
        description:
          "AI agents collect all required information for quote requests instantly -- vehicle details, property info, coverage preferences -- and route completed applications to your producers for binding.",
        icon: Zap,
      },
      {
        title: "Claims First Notice",
        description:
          "Capture first notice of loss with all required details: incident date, description, involved parties, and photos. Claims are submitted to carriers faster, accelerating the entire cycle.",
        icon: Shield,
      },
      {
        title: "Policy Information Hub",
        description:
          "Answer routine policy questions instantly -- coverage limits, deductibles, payment schedules, ID card requests -- without tying up your staff on calls that don't generate revenue.",
        icon: PhoneCall,
      },
      {
        title: "Renewal Reminders",
        description:
          "Proactive renewal outreach via voice, SMS, and email ensures policyholders renew on time. Multi-touch sequences catch at-risk policies before they lapse and walk out the door.",
        icon: Clock,
      },
    ],
    stat: "3x",
    statLabel: "faster quote response time",
    statDescription:
      "Insurance agencies using CallSphere AI agents respond to quote requests three times faster by collecting all required information instantly and routing completed applications to producers for immediate binding.",
    integrations: [
      "Applied Epic",
      "Hawksoft",
      "AgencyZoom",
      "Salesforce",
      "Twilio",
      "Stripe",
    ],
    features: [
      "Quote Requests",
      "Claims Intake",
      "Policy Inquiries",
      "Renewal Reminders",
      "Coverage Verification",
      "Agent Routing",
    ],
    ctaHeadline: "Win More Policies and Retain More Clients",
    ctaDescription:
      "See how CallSphere AI agents handle quote intake, claims first notice, and renewal reminders for your insurance agency 24/7.",
  },
  automotive: {
    slug: "automotive",
    name: "Automotive & Dealerships",
    headline: "AI Voice Agent for Auto Dealerships & Service Centers",
    metaTitle: "AI Voice Agent for Auto Dealerships | CallSphere",
    metaDescription:
      "AI voice agents for auto dealerships and service centers. Automate service scheduling, test drive bookings, parts inquiries, and lead capture 24/7.",
    icon: Car,
    heroDescription:
      "Schedule service appointments, book test drives, answer parts inquiries, and capture sales leads around the clock. Your team closes deals while AI handles the phones.",
    painPoints: [
      {
        title: "Sales Leads Lost to Missed Calls",
        description:
          "Car buyers research online and call when they're ready to act. If your BDC doesn't answer within seconds, that prospect moves to the next dealer on their list -- and they rarely call back.",
      },
      {
        title: "Service Department Phone Overload",
        description:
          "Service advisors juggle walk-in customers, technician questions, and a ringing phone simultaneously. Long hold times frustrate customers and push routine maintenance to independent shops.",
      },
      {
        title: "Parts Inquiry Bottleneck",
        description:
          "Parts counter staff spend significant time answering calls about availability, pricing, and fitment that could be handled automatically. Meanwhile, in-person customers wait at the counter.",
      },
      {
        title: "After-Hours Test Drive Requests",
        description:
          "Many buyers browse inventory evenings and weekends. Without 24/7 availability to schedule test drives, interested prospects cool off and move on to competitors who respond faster.",
      },
    ],
    solutions: [
      {
        title: "Sales Lead Capture",
        description:
          "AI agents answer every sales inquiry instantly, qualify buyers by budget and vehicle preference, and schedule showroom visits or test drives -- turning missed calls into appointments on your sales board.",
        icon: TrendingUp,
      },
      {
        title: "Service Scheduling",
        description:
          "Automate service appointment booking with the right advisor, for the right service type, at the right time. Automated reminders reduce no-shows and keep your service bays productive.",
        icon: Clock,
      },
      {
        title: "Parts Inquiry Handling",
        description:
          "Answer parts availability, pricing, and fitment questions instantly. Complex inquiries are routed to your parts specialists with all vehicle and part details already collected.",
        icon: Zap,
      },
      {
        title: "Test Drive Booking",
        description:
          "Let prospects schedule test drives 24/7 with real-time inventory availability. Confirmation reminders and follow-ups ensure prospects show up ready to experience the vehicle.",
        icon: PhoneCall,
      },
    ],
    stat: "30%",
    statLabel: "more service appointments booked",
    statDescription:
      "Auto dealerships using CallSphere AI agents book significantly more service appointments by answering every call instantly, eliminating hold times, and making it effortless for customers to schedule maintenance.",
    integrations: [
      "CDK Global",
      "DealerSocket",
      "Reynolds & Reynolds",
      "Twilio",
      "Google Calendar",
      "Stripe",
    ],
    features: [
      "Lead Capture",
      "Service Scheduling",
      "Test Drive Booking",
      "Parts Lookup",
      "Recall Notifications",
      "Service Reminders",
    ],
    ctaHeadline: "Sell More Cars and Fill More Service Bays",
    ctaDescription:
      "See how CallSphere AI agents capture sales leads, schedule service appointments, and book test drives for your dealership 24/7.",
  },
  "financial-services": {
    slug: "financial-services",
    name: "Financial Services",
    headline: "AI Voice Agent for Financial Services",
    metaTitle: "AI Voice Agent for Financial Services | CallSphere",
    metaDescription:
      "AI voice agents for financial services. Automate account inquiries, appointment scheduling, loan application intake, and compliance-ready client communications.",
    icon: Landmark,
    heroDescription:
      "Handle account inquiries, schedule advisor meetings, process loan application intake, and manage client communications with enterprise-grade security and compliance.",
    painPoints: [
      {
        title: "High Call Volume for Routine Inquiries",
        description:
          "The majority of inbound calls are routine -- balance checks, transaction history, branch hours, and rate inquiries. These calls overwhelm your team and create long hold times for clients with complex needs.",
      },
      {
        title: "Advisor Time Wasted on Scheduling",
        description:
          "Financial advisors and loan officers spend valuable time coordinating meeting schedules instead of advising clients and closing deals. Phone tag with prospects kills momentum and conversion rates.",
      },
      {
        title: "Compliance Requirements for All Communications",
        description:
          "Every client interaction must be documented, recorded, and compliant with financial regulations. Manual compliance tracking is error-prone and creates audit liability for your institution.",
      },
      {
        title: "After-Hours Client Needs",
        description:
          "Clients need account information, transaction confirmations, and urgent assistance outside business hours. Voicemail creates anxiety and pushes clients toward digital-only competitors.",
      },
    ],
    solutions: [
      {
        title: "Account Information Hub",
        description:
          "AI agents handle routine account inquiries securely -- balances, recent transactions, rate information, and branch details -- freeing your team to focus on high-value advisory conversations.",
        icon: Shield,
      },
      {
        title: "Advisor Scheduling",
        description:
          "Automate meeting scheduling with the right advisor based on client needs, account type, and asset level. Confirmations and reminders ensure clients arrive prepared for productive meetings.",
        icon: Clock,
      },
      {
        title: "Application Intake",
        description:
          "Collect loan and account application information via voice or chat. Pre-qualified applications are routed to the right department with all required documentation identified upfront.",
        icon: PhoneCall,
      },
      {
        title: "Compliance-Ready Communications",
        description:
          "Every interaction is automatically logged, recorded, and archived for regulatory compliance. Full audit trails, data encryption, and role-based access controls meet stringent financial industry requirements.",
        icon: Zap,
      },
    ],
    stat: "50%",
    statLabel: "reduction in routine inquiry calls",
    statDescription:
      "Financial services firms using CallSphere AI agents cut routine inquiry call volume in half by providing instant, secure, automated answers to common account questions -- letting advisors focus on clients who need them most.",
    integrations: [
      "Salesforce Financial Cloud",
      "Redtail CRM",
      "Wealthbox",
      "Calendly",
      "Twilio",
      "Stripe",
    ],
    features: [
      "Account Inquiries",
      "Meeting Scheduling",
      "Loan Intake",
      "Balance Checks",
      "Statement Requests",
      "Compliance Logging",
    ],
    compliance: [
      "SOC 2 Aligned",
      "GDPR Compliant",
      "Encrypted Communications",
      "Audit Logging",
      "Role-Based Access",
      "Data Retention Controls",
    ],
    ctaHeadline: "Serve More Clients with Fewer Routine Calls",
    ctaDescription:
      "See how CallSphere AI agents handle account inquiries, schedule advisor meetings, and process applications for your financial services firm 24/7.",
  },
};

export function generateStaticParams() {
  return Object.keys(industries).map((slug) => ({ slug }));
}

export function generateMetadata({
  params,
}: {
  params: { slug: string };
}): Metadata {
  const industry = industries[params.slug];
  if (!industry) return {};

  return {
    title: industry.metaTitle,
    description: industry.metaDescription,
    alternates: {
      canonical: `https://callsphere.tech/industries/${industry.slug}`,
    },
    openGraph: {
      title: industry.metaTitle,
      description: industry.metaDescription,
      url: `https://callsphere.tech/industries/${industry.slug}`,
      type: "website",
    },
  };
}

export default function IndustryPage({
  params,
}: {
  params: { slug: string };
}) {
  const industry = industries[params.slug];
  if (!industry) notFound();

  const Icon = industry.icon;

  return (
    <>
      <BreadcrumbJsonLd
        items={[
          { name: "Home", url: "https://callsphere.tech" },
          { name: "Industries", url: "https://callsphere.tech/industries" },
          {
            name: industry.name,
            url: `https://callsphere.tech/industries/${industry.slug}`,
          },
        ]}
      />
      <ServiceJsonLd
        name={`AI Voice Agent for ${industry.name}`}
        description={industry.metaDescription}
        url={`https://callsphere.tech/industries/${industry.slug}`}
      />
      <Nav />
      <main id="main" className="relative">
        {/* Hero Section */}
        <section className="section-shell pt-16 pb-20">
          <div className="mx-auto max-w-4xl text-center">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-medium text-slate-700">
              <Icon className="h-4 w-4" />
              {industry.name}
            </div>
            <h1 className="text-4xl font-bold leading-tight tracking-tight text-slate-900 sm:text-5xl">
              {industry.headline}
            </h1>
            <p className="mx-auto mt-6 max-w-3xl text-lg leading-relaxed text-slate-600">
              {industry.heroDescription}
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

        {/* Pain Points */}
        <section className="section-stack bg-slate-50 py-20">
          <div className="mx-auto max-w-6xl px-6">
            <div className="mx-auto max-w-3xl text-center">
              <span className="text-sm font-medium text-indigo-600">
                The Problem
              </span>
              <h2 className="mt-4 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
                Challenges {industry.name} businesses face today
              </h2>
            </div>
            <div className="mt-12 grid gap-6 sm:grid-cols-2">
              {industry.painPoints.map((point) => (
                <div
                  key={point.title}
                  className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm"
                >
                  <h3 className="text-lg font-semibold text-slate-900">
                    {point.title}
                  </h3>
                  <p className="mt-3 text-sm leading-relaxed text-slate-600">
                    {point.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Solutions */}
        <section className="section-stack py-20">
          <div className="mx-auto max-w-6xl px-6">
            <div className="mx-auto max-w-3xl text-center">
              <span className="text-sm font-medium text-indigo-600">
                The Solution
              </span>
              <h2 className="mt-4 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
                How CallSphere AI agents solve it
              </h2>
            </div>
            <div className="mt-12 grid gap-8 sm:grid-cols-2">
              {industry.solutions.map((solution) => {
                const SolutionIcon = solution.icon;
                return (
                  <div key={solution.title} className="flex gap-4">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-indigo-100 text-indigo-600">
                      <SolutionIcon className="h-6 w-6" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-slate-900">
                        {solution.title}
                      </h3>
                      <p className="mt-2 text-sm leading-relaxed text-slate-600">
                        {solution.description}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* Key Stat */}
        <section className="section-stack bg-indigo-600 py-20">
          <div className="mx-auto max-w-4xl px-6 text-center">
            <div className="text-6xl font-bold text-white sm:text-7xl">
              {industry.stat}
            </div>
            <p className="mt-4 text-xl font-medium text-indigo-100">
              {industry.statLabel}
            </p>
            <p className="mx-auto mt-6 max-w-2xl text-base leading-relaxed text-indigo-200">
              {industry.statDescription}
            </p>
          </div>
        </section>

        {/* Features & Integrations */}
        <section className="section-stack py-20">
          <div className="mx-auto max-w-6xl px-6">
            <div className="grid gap-12 lg:grid-cols-2">
              {/* Features */}
              <div>
                <h2 className="text-2xl font-bold text-slate-900">
                  Built for {industry.name}
                </h2>
                <p className="mt-3 text-slate-600">
                  Purpose-built AI capabilities for your industry workflows.
                </p>
                <div className="mt-8 grid grid-cols-2 gap-3">
                  {industry.features.map((feature) => (
                    <div
                      key={feature}
                      className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-700"
                    >
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                      {feature}
                    </div>
                  ))}
                </div>
              </div>

              {/* Integrations */}
              <div>
                <h2 className="text-2xl font-bold text-slate-900">
                  Integrations
                </h2>
                <p className="mt-3 text-slate-600">
                  Connects to the tools your team already uses.
                </p>
                <div className="mt-8 grid grid-cols-2 gap-3">
                  {industry.integrations.map((integration) => (
                    <div
                      key={integration}
                      className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700"
                    >
                      <span className="h-2 w-2 rounded-full bg-indigo-400" />
                      {integration}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Compliance (Healthcare only) */}
        {industry.compliance && (
          <section className="section-stack bg-slate-50 py-20">
            <div className="mx-auto max-w-6xl px-6">
              <div className="mx-auto max-w-3xl text-center">
                <h2 className="text-3xl font-bold tracking-tight text-slate-900">
                  Enterprise Compliance & Security
                </h2>
                <p className="mt-4 text-lg text-slate-600">
                  Built from the ground up for healthcare compliance
                  requirements.
                </p>
              </div>
              <div className="mt-12 grid gap-4 sm:grid-cols-3">
                {industry.compliance.map((item) => (
                  <div
                    key={item}
                    className="flex items-center gap-3 rounded-xl border border-green-200 bg-white p-5 shadow-sm"
                  >
                    <Shield className="h-5 w-5 text-green-600" />
                    <span className="font-medium text-slate-900">{item}</span>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* Industry CTA */}
        <section className="section-stack py-20">
          <div className="mx-auto max-w-4xl px-6">
            <div className="rounded-2xl border border-slate-200 bg-gradient-to-br from-slate-50 to-white px-8 py-16 text-center sm:px-16">
              <h2 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
                {industry.ctaHeadline}
              </h2>
              <p className="mx-auto mt-4 max-w-2xl text-lg text-slate-600">
                {industry.ctaDescription}
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
