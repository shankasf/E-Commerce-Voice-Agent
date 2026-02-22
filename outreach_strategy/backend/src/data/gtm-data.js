export const productContext = {
  name: "CallSphere.tech",
  tagline: "GTM Segmentation — Message-Market Fit Playbook",
  summary: "5 industries · 10 markets · 10 Apollo-ready segments",
  description: "CallSphere deploys AI-powered voice and chat agents that handle inbound customer communications — scheduling, triage, order status, payments — 24/7 across 57+ languages.",
  primaryValue: "Contact center cost reduction + 24/7 coverage without headcount",
  usage: "Operations & support teams rely on it daily to handle inbound volume; leadership monitors weekly via dashboards",
  pricing: "Tiered: Starter → Growth → Enterprise (annual billing saves 15%). Demo-gated, sales-assisted motion.",
  salesMotion: "Mid-market to Enterprise. Demo → pilot → deploy. \"Book a Demo\" CTA — not self-serve.",
  bestCustomers: [
    { name: "PropertyCo", industry: "Real Estate" },
    { name: "HealthFirst", industry: "Healthcare" },
    { name: "TechServ", industry: "IT Support" },
    { name: "LogiPro", industry: "Logistics" }
  ]
};

export const industries = [
  {
    id: "healthcare-dental",
    name: "Healthcare & Dental",
    icon: "🏥",
    color: "from-blue-500 to-cyan-500",
    whyUrgent: "Patients call 24/7 for appointments, reminders, and insurance questions. Missing calls = missed revenue and no-shows. HIPAA compliance pressure is constant.",
    whyBuyFast: "Already buying SaaS at scale. Dental chains especially are consolidating and need standardized patient touchpoints across locations.",
    whyOutboundWorks: "VPs of Operations are reachable. Pain is acute and well-understood. ROI is easy to quantify (no-show reduction alone justifies spend).",
    markets: [
      {
        id: "dental-chains",
        name: "Multi-Location Dental Chains",
        description: "Each location runs its own scheduling chaos. No-show rates hit 20–30%. Front desk staff turnover is brutal. Every missed call is a lost $200–$500 appointment."
      },
      {
        id: "outpatient-urgent-care",
        name: "Outpatient Clinics & Urgent Care",
        description: "Surge volumes are unpredictable. Walk-in + appointment mix creates constant triage nightmares. After-hours coverage is either outsourced expensively or nonexistent."
      }
    ],
    segments: [
      {
        id: "dental-chain-ops",
        name: "Dental Chain Operations Leaders",
        marketId: "dental-chains",
        buyerPersona: {
          titles: ["VP of Operations", "Director of Patient Experience", "Operations Manager"],
          seniority: "Director–VP",
          department: "Operations / Patient Experience",
          reportsTo: "COO or CEO"
        },
        painProfile: {
          whatsBroken: "Front desk staff can't keep up with inbound calls — missed calls, long hold times, no after-hours coverage.",
          costOfDoingNothing: "No-show rates stay high, staff burnout increases, patient satisfaction drops — competitors with AI-first booking win patients.",
          whatTheyTried: ["Hiring more front desk staff", "Outsourced answering services", "Basic IVR"],
          cost: "Each missed appointment = $200–$500 lost revenue. 20%+ no-show rate bleeds margin monthly."
        },
        urgencyTriggers: [
          "Opening new locations (scaling pain)",
          "Rising no-show rates quarter-over-quarter",
          "Front desk turnover spike",
          "New compliance audit cycle"
        ],
        apolloFilters: {
          industry: "Healthcare / Dental",
          companySize: "200–5,000 employees",
          titles: ["VP of Operations", "Director of Patient Experience", "Operations Manager", "Head of Patient Services"],
          keywords: ["dental chain", "multi-location dental", "patient scheduling", "dental group"],
          geography: "US (nationwide)",
          funding: "PE-backed or revenue-stage dental groups",
          techStack: ["Dentrix", "Eaglesoft", "Patterson Dental"]
        },
        messageFit: {
          whyOneEmailWorks: "Every one of them is losing money to no-shows and after-hours missed calls. That's a shared, quantifiable pain.",
          beliefToAlignWith: "They already believe automation can handle scheduling — they just haven't found one that's HIPAA-safe and actually works at scale.",
          doNotSay: "Don't lead with \"AI\" generically. Lead with the no-show stat or the after-hours coverage gap."
        }
      },
      {
        id: "urgent-care-ops",
        name: "Urgent Care / Outpatient Clinic Ops Leaders",
        marketId: "outpatient-urgent-care",
        buyerPersona: {
          titles: ["Director of Operations", "VP of Clinical Operations", "Clinic Manager"],
          seniority: "Director–VP",
          department: "Operations",
          reportsTo: "Regional VP or COO"
        },
        painProfile: {
          whatsBroken: "Unpredictable patient surges with zero flexible coverage. After-hours = zero phone coverage or expensive BPO.",
          costOfDoingNothing: "Patients route to ER or competitors during surges. BPO costs keep rising. Staff burnout from manual triage.",
          whatTheyTried: ["BPO outsourcing for after-hours", "Basic phone trees", "Seasonal temp hires"],
          cost: "Overflow calls go unanswered during surges. After-hours BPO costs $15–$25/call. Patient satisfaction tanks during wait spikes."
        },
        urgencyTriggers: [
          "Seasonal illness surge (flu season)",
          "New clinic opening",
          "BPO contract renewal",
          "Patient satisfaction score dip"
        ],
        apolloFilters: {
          industry: "Healthcare / Urgent Care",
          companySize: "100–2,000 employees",
          titles: ["Director of Operations", "VP of Clinical Operations", "Clinic Manager", "Patient Experience Lead"],
          keywords: ["urgent care chain", "outpatient clinic", "walk-in clinic operations"],
          geography: "US",
          funding: "PE-backed clinic networks",
          techStack: ["Epic", "athenahealth", "NextGen"]
        },
        messageFit: {
          whyOneEmailWorks: "Surge coverage and after-hours are a shared, painful gap across all of them — one message works.",
          beliefToAlignWith: "They believe outsourced BPO is a necessary evil. The message should challenge that assumption.",
          doNotSay: "Don't mention clinical decision-making. Position strictly on scheduling, triage, and routing."
        }
      }
    ]
  },
  {
    id: "hvac-field-services",
    name: "HVAC & Field Services",
    icon: "🔧",
    color: "from-orange-500 to-red-500",
    whyUrgent: "Technicians are in the field all day — calls go unanswered. Emergency service requests in summer/winter = revenue on the table. Dispatching delays = customer churn.",
    whyBuyFast: "HVAC companies are actively modernizing. PE roll-ups are consolidating and need standardized ops across locations.",
    whyOutboundWorks: "Operations and dispatching leaders are reachable. Pain is daily and obvious. Competitors winning on response time.",
    markets: [
      {
        id: "pe-hvac-rollups",
        name: "PE-Backed HVAC Roll-Ups",
        description: "Multiple acquired companies, inconsistent intake processes, brand fragmentation. Corporate needs one system that works across all locations."
      },
      {
        id: "regional-hvac",
        name: "Regional HVAC Service Companies",
        description: "Small dispatch team can't handle peak season volume. Every missed emergency call is a lost $1,000–$5,000 repair job and a lost customer forever."
      }
    ],
    segments: [
      {
        id: "hvac-rollup-ops",
        name: "HVAC Roll-Up Operations Directors",
        marketId: "pe-hvac-rollups",
        buyerPersona: {
          titles: ["VP of Operations", "Director of Field Operations", "Operations Manager"],
          seniority: "Director–VP",
          department: "Operations",
          reportsTo: "COO or Regional VP"
        },
        painProfile: {
          whatsBroken: "Acquired locations run different intake processes. Dispatchers are overwhelmed. After-hours emergency calls have no consistent coverage.",
          costOfDoingNothing: "Churn accelerates, technician utilization drops, competitor roll-ups with better tech win the customer.",
          whatTheyTried: ["Centralizing call centers", "Hiring more dispatchers", "Basic phone trees"],
          cost: "Missed emergency calls lose $1K–$5K per job. Inconsistent intake = slow dispatching = angry customers = churn."
        },
        urgencyTriggers: [
          "New acquisition integration",
          "Peak season (summer/winter)",
          "Dispatcher turnover",
          "Customer churn spike"
        ],
        apolloFilters: {
          industry: "HVAC / Field Services",
          companySize: "500–10,000 employees",
          titles: ["VP of Operations", "Director of Field Operations", "Operations Manager", "Head of Dispatch"],
          keywords: ["HVAC roll-up", "field service operations", "HVAC group", "service dispatch"],
          geography: "US",
          funding: "PE-backed",
          techStack: ["ServiceTitan", "Housecall Pro", "Connectwise"]
        },
        messageFit: {
          whyOneEmailWorks: "Every roll-up has the same integration + coverage problem. One message nails it.",
          beliefToAlignWith: "They know dispatch efficiency = revenue. The message should quantify what's being lost.",
          doNotSay: "Don't pitch \"AI chatbot.\" Position as 24/7 service intake and dispatch routing."
        }
      },
      {
        id: "regional-hvac-ops",
        name: "Regional HVAC Service Company Owners/Ops",
        marketId: "regional-hvac",
        buyerPersona: {
          titles: ["Owner", "Operations Manager", "Dispatch Manager"],
          seniority: "Owner or Director",
          department: "Operations / Dispatch",
          reportsTo: "—"
        },
        painProfile: {
          whatsBroken: "3–5 person dispatch team can't handle peak season. After-hours = voicemail. Emergency calls during summer go unanswered for hours.",
          costOfDoingNothing: "Peak season revenue stays capped. Best technicians idle while calls pile up. Owner is stuck on the phone.",
          whatTheyTried: ["Hiring seasonal dispatchers", "Basic answering services", "Owner taking calls personally"],
          cost: "One missed emergency repair = $1K–$5K lost. Peak season revenue is being left on the table daily."
        },
        urgencyTriggers: [
          "Approaching summer or winter peak",
          "Lost a big job to a competitor",
          "Dispatcher quit",
          "Revenue plateau"
        ],
        apolloFilters: {
          industry: "HVAC / Field Services",
          companySize: "25–250 employees",
          titles: ["Owner", "Operations Manager", "Dispatch Manager", "Service Coordinator"],
          keywords: ["HVAC service company", "heating cooling service", "emergency HVAC", "residential HVAC"],
          geography: "US (Sun Belt + cold-climate regions)",
          funding: "Bootstrapped or early PE interest",
          techStack: ["ServiceTitan", "Jobber", "Housecall Pro"]
        },
        messageFit: {
          whyOneEmailWorks: "Every regional HVAC company hits the same peak-season ceiling. Universal pain.",
          beliefToAlignWith: "They believe they need more dispatchers. The message should reframe: you need fewer, not more.",
          doNotSay: "Don't pitch complexity. They want something that works in 48 hours, not a 3-month implementation."
        }
      }
    ]
  },
  {
    id: "logistics-delivery",
    name: "Logistics & Delivery",
    icon: "📦",
    color: "from-green-500 to-emerald-500",
    whyUrgent: "Customers call constantly about order status, returns, rescheduling. Every missed call or slow answer = churn. Last-mile exceptions create call spikes that are impossible to staff for.",
    whyBuyFast: "Logistics companies are already heavily invested in SaaS. AI automation is top-of-mind for ops leaders trying to reduce per-contact cost.",
    whyOutboundWorks: "VP-level ops and CX leaders are accessible. Cost-per-contact is a KPI they're measured on. Automation ROI is easy to model.",
    markets: [
      {
        id: "last-mile-delivery",
        name: "Regional Last-Mile Delivery Operators",
        description: "Call volume spikes unpredictably with delivery exceptions. Small CX teams can't absorb surges. Customers want real-time status — phones are the fallback."
      },
      {
        id: "ecommerce-fulfillment",
        name: "E-Commerce Fulfillment Companies",
        description: "High return volume drives massive inbound call traffic. Each return call is expensive to handle manually and drags resolution time."
      }
    ],
    segments: [
      {
        id: "last-mile-ops",
        name: "Last-Mile Ops & CX Leaders",
        marketId: "last-mile-delivery",
        buyerPersona: {
          titles: ["VP of Operations", "Director of Customer Experience", "Head of Last-Mile Operations"],
          seniority: "Director–VP",
          department: "Operations / CX",
          reportsTo: "COO or SVP"
        },
        painProfile: {
          whatsBroken: "Delivery exception spikes (weather, reroutes) flood the phone lines. CX team can't scale to match. Status calls eat agent time that should go to escalations.",
          costOfDoingNothing: "Customer satisfaction drops during exception events. Cost per contact keeps rising. Competitors with self-serve status win retention.",
          whatTheyTried: ["SMS/email notifications (customers still call)", "Basic IVR", "Seasonal temp hires"],
          cost: "Cost per inbound contact runs $8–$15. Exception-driven spikes require expensive temp staffing or missed SLAs."
        },
        urgencyTriggers: [
          "Holiday shipping season",
          "Weather-related delivery disruptions",
          "New delivery zone expansion",
          "CX headcount freeze"
        ],
        apolloFilters: {
          industry: "Logistics / Transportation",
          companySize: "200–5,000 employees",
          titles: ["VP of Operations", "Director of CX", "Head of Last-Mile", "Customer Service Director"],
          keywords: ["last mile delivery", "delivery operations", "logistics CX", "parcel delivery"],
          geography: "US",
          funding: "PE-backed or VC-funded logistics",
          techStack: ["Salesforce", "Zendesk", "route optimization tools"]
        },
        messageFit: {
          whyOneEmailWorks: "Exception-driven call spikes are a shared operational headache. Same pain, same cost structure.",
          beliefToAlignWith: "They already know self-serve status reduces call volume — they just don't have voice/chat coverage for the customers who still call.",
          doNotSay: "Don't lead with \"chatbot.\" Lead with call deflection rate and cost-per-contact reduction."
        }
      },
      {
        id: "ecommerce-returns-ops",
        name: "E-Commerce Fulfillment Return Ops Leaders",
        marketId: "ecommerce-fulfillment",
        buyerPersona: {
          titles: ["VP of Operations", "Director of Returns", "Head of Customer Operations"],
          seniority: "Director–VP",
          department: "Operations / Returns",
          reportsTo: "COO or VP of CX"
        },
        painProfile: {
          whatsBroken: "Return volume is high and growing. Each return generates 1–3 inbound contacts. Manual handling is expensive and slow.",
          costOfDoingNothing: "Return handling costs keep rising. Customer rebuy rate stays low. BPO costs escalate with volume.",
          whatTheyTried: ["Self-serve return portals (low adoption)", "Email-only returns", "Outsourced BPO"],
          cost: "Per-return contact cost runs $10–$20. Slow resolution = customer doesn't rebuy. High return rate erodes margin."
        },
        urgencyTriggers: [
          "Post-holiday return surge",
          "New returns policy rollout",
          "BPO contract renewal",
          "Return rate increase"
        ],
        apolloFilters: {
          industry: "E-Commerce / Fulfillment",
          companySize: "100–3,000 employees",
          titles: ["VP of Operations", "Director of Returns", "Head of Customer Ops", "Returns Manager"],
          keywords: ["ecommerce fulfillment", "returns management", "reverse logistics", "order fulfillment"],
          geography: "US",
          funding: "VC or PE-backed",
          techStack: ["Shopify", "NetSuite", "RMA platforms"]
        },
        messageFit: {
          whyOneEmailWorks: "Return-driven call volume is universal for fulfillment ops. One message hits.",
          beliefToAlignWith: "They know self-serve returns have low adoption. They're looking for the next layer of automation.",
          doNotSay: "Don't promise zero-contact returns. Position as faster resolution and lower cost-per-return-contact."
        }
      }
    ]
  },
  {
    id: "it-support-msp",
    name: "IT Support & Managed Services",
    icon: "💻",
    color: "from-purple-500 to-indigo-500",
    whyUrgent: "Tier-1 tickets flood in 24/7. Understaffed support teams miss SLAs constantly. Every unresolved ticket is a frustrated end user and a liability for the MSP or internal IT org.",
    whyBuyFast: "IT teams are already adopting AI tools aggressively. Ticket deflection is a top priority for every IT budget conversation. MSPs are under margin pressure and need to serve more clients without proportional headcount growth.",
    whyOutboundWorks: "IT directors and MSP leaders are reachable and actively evaluating automation. Pain is daily, measurable, and tied directly to SLA performance.",
    markets: [
      {
        id: "msp",
        name: "Managed Service Providers (MSPs)",
        description: "Serving 50–200 client companies. Tier-1 volume is crushing. One missed SLA = contract risk. Margin is thin — every ticket costs more than it should."
      },
      {
        id: "midmarket-it",
        name: "Mid-Market Internal IT Departments",
        description: "Small IT team (3–10 people) handling thousands of tickets. After-hours coverage is either nonexistent or handled by on-call engineers who shouldn't be doing Tier-1."
      }
    ],
    segments: [
      {
        id: "msp-ops",
        name: "MSP Operations & Delivery Leaders",
        marketId: "msp",
        buyerPersona: {
          titles: ["VP of Service Delivery", "Director of Operations", "Head of NOC", "IT Operations Manager"],
          seniority: "Director–VP",
          department: "Service Delivery / Operations",
          reportsTo: "COO or CEO"
        },
        painProfile: {
          whatsBroken: "Tier-1 ticket volume keeps growing as client base scales. NOC team is maxed. After-hours tickets sit until morning. SLA breaches are happening.",
          costOfDoingNothing: "SLA breach rate increases, client churn ticks up, team burns out, margins compress.",
          whatTheyTried: ["Knowledge base articles", "Basic chatbots", "After-hours on-call rotation"],
          cost: "Each SLA breach risks contract penalty or churn. Hiring another L1 tech costs $50K+/year. Margin per client is already thin."
        },
        urgencyTriggers: [
          "New client onboarded",
          "SLA breach spike",
          "L1 tech resignation",
          "Q1 budget review (headcount freeze)"
        ],
        apolloFilters: {
          industry: "IT Services / MSP",
          companySize: "50–2,000 employees",
          titles: ["VP of Service Delivery", "Director of Operations", "Head of NOC", "IT Operations Manager"],
          keywords: ["managed service provider", "MSP", "IT support", "NOC operations", "tier 1 support"],
          geography: "US",
          funding: "PE-backed MSPs or bootstrapped",
          techStack: ["ConnectWise", "Datto", "Autotask", "ServiceNow"]
        },
        messageFit: {
          whyOneEmailWorks: "Every MSP has the same Tier-1 volume problem. It's the #1 margin killer across the industry.",
          beliefToAlignWith: "They already believe AI can deflect Tier-1 tickets — they just haven't found one that integrates cleanly and actually works.",
          doNotSay: "Don't promise \"100% deflection.\" Lead with SLA protection and per-ticket cost reduction."
        }
      },
      {
        id: "midmarket-it-ops",
        name: "Mid-Market IT Directors",
        marketId: "midmarket-it",
        buyerPersona: {
          titles: ["IT Director", "Director of IT Operations", "Head of IT Support"],
          seniority: "Director",
          department: "IT",
          reportsTo: "VP of IT or CTO"
        },
        painProfile: {
          whatsBroken: "3–8 person IT team handles everything. Tier-1 tickets eat the team's time that should go to projects and infrastructure. After-hours = nothing.",
          costOfDoingNothing: "Team burnout, projects never finish, top engineers leave, after-hours incidents go unresolved.",
          whatTheyTried: ["Self-service portal (low adoption)", "Email ticketing", "On-call rotation"],
          cost: "Engineer time on Tier-1 = $80–$120/hr opportunity cost. On-call burnout drives turnover. Projects stall."
        },
        urgencyTriggers: [
          "IT headcount freeze",
          "New software rollout (ticket spike)",
          "Engineer resignation",
          "After-hours outage"
        ],
        apolloFilters: {
          industry: "Technology / Mid-Market",
          companySize: "200–5,000 employees",
          titles: ["IT Director", "Director of IT Operations", "Head of IT Support", "IT Operations Manager"],
          keywords: ["IT director", "IT operations", "helpdesk", "IT support team"],
          geography: "US",
          funding: "Any stage — revenue-generating companies",
          techStack: ["ServiceNow", "Jira Service Management", "Freshservice", "Zendesk"]
        },
        messageFit: {
          whyOneEmailWorks: "Every mid-market IT director is drowning in Tier-1. It's the most universal pain in the segment.",
          beliefToAlignWith: "They believe self-service should work — it just doesn't get enough adoption. Voice/chat fills the gap.",
          doNotSay: "Don't pitch to the CTO. IT Directors feel the daily pain and control the tooling budget."
        }
      }
    ]
  },
  {
    id: "real-estate-property",
    name: "Real Estate & Property Management",
    icon: "🏢",
    color: "from-yellow-500 to-amber-500",
    whyUrgent: "Tenants and prospects call constantly — maintenance requests, lease questions, showing schedules. Understaffed property management teams miss calls that become complaints or lost leases.",
    whyBuyFast: "PropTech adoption is accelerating. PE-backed property platforms are consolidating and need standardized tenant touchpoints. ROI on occupancy improvement is immediate.",
    whyOutboundWorks: "Property management VPs and regional directors are accessible. Pain is daily, tied to occupancy and NOI — metrics they're measured on.",
    markets: [
      {
        id: "multifamily",
        name: "Multi-Family Property Management Platforms",
        description: "Managing 5,000–50,000 units across dozens of properties. Leasing agents are overwhelmed. Maintenance intake is inconsistent. Tenant satisfaction scores are slipping."
      },
      {
        id: "commercial-property",
        name: "Commercial Property Management Companies",
        description: "Tenant mix is complex (retail, office, mixed-use). Lease inquiries, maintenance requests, and building ops questions all hit the same phone line. Small on-site teams can't cover everything."
      }
    ],
    segments: [
      {
        id: "multifamily-ops",
        name: "Multi-Family Property Ops Leaders",
        marketId: "multifamily",
        buyerPersona: {
          titles: ["VP of Property Management", "Director of Operations", "Regional Property Manager"],
          seniority: "Director–VP",
          department: "Property Operations",
          reportsTo: "COO or SVP"
        },
        painProfile: {
          whatsBroken: "Leasing agents and on-site staff can't handle inbound volume — maintenance requests, lease inquiries, showing requests all hit one line. After-hours = nothing.",
          costOfDoingNothing: "Occupancy rate drops, maintenance backlog grows, tenant satisfaction tanks, staff burnout.",
          whatTheyTried: ["Online portals (low adoption by tenants)", "Outsourced call center", "Basic IVR"],
          cost: "Missed showing request = lost lease = $12K–$24K annual revenue per unit. Maintenance delays = tenant complaints = churn."
        },
        urgencyTriggers: [
          "New property acquisition",
          "Leasing season (spring)",
          "Tenant satisfaction score dip",
          "On-site staff turnover"
        ],
        apolloFilters: {
          industry: "Real Estate / Property Management",
          companySize: "200–10,000 employees",
          titles: ["VP of Property Management", "Director of Operations", "Regional Property Manager", "Head of Leasing"],
          keywords: ["multifamily property management", "apartment management", "property ops", "tenant services"],
          geography: "US (Sun Belt markets primary)",
          funding: "PE-backed or REIT",
          techStack: ["Yardi", "RealPage", "Entrata", "AppFolio"]
        },
        messageFit: {
          whyOneEmailWorks: "Every multi-family operator has the same missed-call-to-lost-lease problem. Quantifiable and shared.",
          beliefToAlignWith: "They know tenants don't use online portals for everything. They're looking for a way to capture calls they can't staff for.",
          doNotSay: "Don't lead with \"AI chatbot.\" Lead with occupancy impact and maintenance intake speed."
        }
      },
      {
        id: "commercial-property-ops",
        name: "Commercial Property Ops Directors",
        marketId: "commercial-property",
        buyerPersona: {
          titles: ["Director of Property Operations", "VP of Tenant Services", "Property Management Director"],
          seniority: "Director–VP",
          department: "Property Operations",
          reportsTo: "COO or Regional VP"
        },
        painProfile: {
          whatsBroken: "Mixed-use tenant base creates diverse call types. Small building management team handles everything. No after-hours intake for urgent building issues.",
          costOfDoingNothing: "Tenant satisfaction drops, liability exposure grows, lease renewal rate slips.",
          whatTheyTried: ["Outsourced call center", "Email-only intake", "On-call property manager"],
          cost: "Missed urgent building issue = liability risk. Slow lease inquiry response = lost tenant = $50K+ annual revenue loss per space."
        },
        urgencyTriggers: [
          "New building acquisition",
          "Tenant mix change",
          "Building management staff turnover",
          "Lease renewal cycle"
        ],
        apolloFilters: {
          industry: "Real Estate / Commercial Property",
          companySize: "100–5,000 employees",
          titles: ["Director of Property Operations", "VP of Tenant Services", "Property Management Director"],
          keywords: ["commercial property management", "tenant services", "mixed-use property", "building management"],
          geography: "US (major metro areas)",
          funding: "PE-backed or institutional",
          techStack: ["Yardi", "RealPage", "Buildium"]
        },
        messageFit: {
          whyOneEmailWorks: "Diverse call types + small team = universal pain for commercial property ops. One message works.",
          beliefToAlignWith: "They already know after-hours coverage is a gap. They just haven't found a solution that handles the complexity of mixed-use.",
          doNotSay: "Don't oversimplify. Acknowledge that commercial properties have more call complexity than residential."
        }
      }
    ]
  }
];

// Helper to get all data as a single text for chatbot context
export function getFullGTMContext() {
  let context = `
CallSphere.tech GTM Strategy Playbook

PRODUCT CONTEXT:
${productContext.description}
Primary Value: ${productContext.primaryValue}
Usage: ${productContext.usage}
Pricing: ${productContext.pricing}
Sales Motion: ${productContext.salesMotion}
Best Customers: ${productContext.bestCustomers.map(c => `${c.name} (${c.industry})`).join(', ')}

INDUSTRIES AND SEGMENTS:
`;

  industries.forEach(industry => {
    context += `\n${'='.repeat(50)}\nINDUSTRY: ${industry.name}\n${'='.repeat(50)}\n`;
    context += `Why Urgent: ${industry.whyUrgent}\n`;
    context += `Why They Buy Fast: ${industry.whyBuyFast}\n`;
    context += `Why Outbound Works: ${industry.whyOutboundWorks}\n\n`;

    industry.markets.forEach(market => {
      context += `MARKET: ${market.name}\n${market.description}\n\n`;
    });

    industry.segments.forEach(segment => {
      context += `\n--- SEGMENT: ${segment.name} ---\n`;
      context += `Buyer Persona:\n`;
      context += `  Titles: ${segment.buyerPersona.titles.join(', ')}\n`;
      context += `  Seniority: ${segment.buyerPersona.seniority}\n`;
      context += `  Department: ${segment.buyerPersona.department}\n`;
      context += `  Reports To: ${segment.buyerPersona.reportsTo}\n\n`;

      context += `Pain Profile:\n`;
      context += `  What's Broken: ${segment.painProfile.whatsBroken}\n`;
      context += `  Cost of Doing Nothing: ${segment.painProfile.costOfDoingNothing}\n`;
      context += `  What They've Tried: ${segment.painProfile.whatTheyTried.join(', ')}\n`;
      context += `  Cost: ${segment.painProfile.cost}\n\n`;

      context += `Urgency Triggers: ${segment.urgencyTriggers.join(', ')}\n\n`;

      context += `Apollo Filters:\n`;
      context += `  Industry: ${segment.apolloFilters.industry}\n`;
      context += `  Company Size: ${segment.apolloFilters.companySize}\n`;
      context += `  Titles: ${segment.apolloFilters.titles.join(', ')}\n`;
      context += `  Keywords: ${segment.apolloFilters.keywords.join(', ')}\n`;
      context += `  Geography: ${segment.apolloFilters.geography}\n`;
      context += `  Funding: ${segment.apolloFilters.funding}\n`;
      context += `  Tech Stack: ${segment.apolloFilters.techStack.join(', ')}\n\n`;

      context += `Message Fit:\n`;
      context += `  Why One Email Works: ${segment.messageFit.whyOneEmailWorks}\n`;
      context += `  Belief to Align With: ${segment.messageFit.beliefToAlignWith}\n`;
      context += `  Do NOT Say: ${segment.messageFit.doNotSay}\n\n`;
    });
  });

  return context;
}
