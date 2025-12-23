require("dotenv").config();
const express = require("express");
const bodyParser = require("body-parser");
const { spawn } = require("child_process");
const http = require("http");
const path = require("path");

const app = express();

// --- Dashboard Auth (basic) ---
const DASH_USER = process.env.DASH_USER || "admin";
const DASH_PASS = process.env.DASH_PASS || "kids4fun123";

function requireDashboardAuth(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.split(" ")[1];
  if (!token) {
    res.set("WWW-Authenticate", 'Basic realm="Dashboard"');
    return res.status(401).send("Authentication required.");
  }

  const [user, pass] = Buffer.from(token, "base64").toString().split(":");
  if (user === DASH_USER && pass === DASH_PASS) {
    return next();
  }

  res.set("WWW-Authenticate", 'Basic realm="Dashboard"');
  return res.status(401).send("Access denied.");
}

// --- Supabase settings for dashboard data (read-only) ---
const SUPABASE_URL = process.env.SUPABASE_URL || "";
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || "";

// Time range helpers
function getTimeRangeFilter(range) {
  const now = new Date();
  let startDate = null;
  switch (range) {
    case "today":
      startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      break;
    case "7d":
      startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      break;
    case "30d":
      startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      break;
    case "90d":
      startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
      break;
    default:
      return null; // all time
  }
  return startDate ? startDate.toISOString() : null;
}

async function fetchCallLogs(limit = 200, range = "all") {
  if (!SUPABASE_URL || !SUPABASE_KEY) return [];
  let url = `${SUPABASE_URL}/rest/v1/call_logs?select=*&order=ended_at.desc.nullslast&limit=${limit}`;
  const rangeStart = getTimeRangeFilter(range);
  if (rangeStart) {
    url += `&ended_at=gte.${rangeStart}`;
  }
  const res = await fetch(url, {
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
    },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Supabase fetch failed: ${res.status} ${text}`);
  }
  return res.json();
}

const WORDS_PER_SECOND = 2.5;
const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const INTENT_RULES = [
  { label: "Party Booking", keywords: ["party", "birthday", "celebration", "package", "room", "balloon"] },
  { label: "Admissions & Tickets", keywords: ["ticket", "admission", "play pass", "entry", "check-in"] },
  { label: "Retail Order", keywords: ["order", "product", "item", "purchase", "inventory"] },
  { label: "Membership", keywords: ["membership", "plan", "subscription", "renew"] },
  { label: "Customer Support", keywords: ["problem", "issue", "complaint", "refund", "cancel", "policy"] },
  { label: "Information Request", keywords: ["information", "hours", "pricing", "open", "contact"] },
  { label: "Events & Camps", keywords: ["camp", "event", "field trip", "group"] },
];
const CONVERSION_KEYWORDS = ["booked", "reserved", "confirmed", "deposit", "order placed", "payment", "signed up", "scheduled", "completed"];
const FOLLOW_UP_KEYWORDS = ["follow up", "call back", "email", "send", "awaiting", "pending", "later today", "tomorrow", "get back"];
const ESCALATION_KEYWORDS = ["escalat", "transfer", "hand off", "manager", "supervisor"];
const OBJECTION_KEYWORDS = ["expensive", "too much", "not sure", "maybe later", "need to check", "concern", "hesitant", "unsure"];
const STOPWORDS = new Set([
  "the", "and", "that", "with", "this", "have", "from", "your", "just", "about", "they", "what", "when", "will", "into", "also", "then", "there", "need", "more", "please", "like", "want"
]);

function safeText(value) {
  return (value || "").toLowerCase();
}

function escapeHtml(value = "") {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function classifyIntent(text) {
  const normalized = safeText(text);
  for (const rule of INTENT_RULES) {
    if (rule.keywords.some((kw) => normalized.includes(kw))) {
      return rule.label;
    }
  }
  return "General Inquiry";
}

function detectConversion(text) {
  const normalized = safeText(text);
  return CONVERSION_KEYWORDS.some((kw) => normalized.includes(kw));
}

function detectFollowUp(text) {
  const normalized = safeText(text);
  return FOLLOW_UP_KEYWORDS.some((kw) => normalized.includes(kw));
}

function detectEscalation(text) {
  const normalized = safeText(text);
  return ESCALATION_KEYWORDS.some((kw) => normalized.includes(kw));
}

function detectObjection(text) {
  const normalized = safeText(text);
  return OBJECTION_KEYWORDS.some((kw) => normalized.includes(kw));
}

function classifyOutcome(text, sentiment, conversion, followUp) {
  const normalized = safeText(text);
  if (conversion) return "Converted";
  if (normalized.includes("resolved") || normalized.includes("answer")) return "Resolved";
  if (followUp) return "Pending Follow-up";
  if (normalized.includes("cancel") || normalized.includes("dropped")) return "Abandoned";
  if (normalized.includes("voicemail") || normalized.includes("left message")) return "Voicemail";
  return (sentiment || "unknown").toLowerCase();
}

function getSentimentScore(sentiment) {
  const normalized = (sentiment || "").toLowerCase();
  if (normalized.includes("positive")) return 1;
  if (normalized.includes("negative")) return 0;
  if (normalized.includes("neutral")) return 0.5;
  return 0.5;
}

function extractKeywords(text) {
  const normalized = safeText(text);
  const matches = normalized.match(/\b[a-z]{4,}\b/g) || [];
  const keywords = [];
  for (const word of matches) {
    if (STOPWORDS.has(word)) continue;
    if (!keywords.includes(word)) {
      keywords.push(word);
    }
    if (keywords.length === 5) break;
  }
  return keywords.map((word) => word.charAt(0).toUpperCase() + word.slice(1));
}

function computeWordStats(row) {
  const entries = Array.isArray(row.transcript_json)
    ? row.transcript_json
    : (row.transcript || "").split("\n").map((line) => {
      const [rawRole, ...rest] = line.split(":");
      return {
        role: (rawRole || "").toLowerCase().includes("assistant") ? "assistant" : "user",
        content: rest.join(":").trim(),
      };
    });

  let userWords = 0;
  let assistantWords = 0;

  entries.forEach((entry) => {
    const content = entry?.content || "";
    const wordCount = (content.match(/\b[\w']+\b/g) || []).length;
    if ((entry?.role || "user").toLowerCase().includes("assistant")) {
      assistantWords += wordCount;
    } else {
      userWords += wordCount;
    }
  });

  const totalWords = userWords + assistantWords;
  const talkTimeSeconds = totalWords / WORDS_PER_SECOND;

  return { userWords, assistantWords, totalWords, talkTimeSeconds };
}

function enrichCallRecord(row) {
  const durationSec = Number(row.duration_seconds) || 0;
  const endedAtMsRaw = row.ended_at ? Date.parse(row.ended_at) : Date.now();
  const endedAtMs = Number.isFinite(endedAtMsRaw) ? endedAtMsRaw : Date.now();
  const startedAtMs = endedAtMs - durationSec * 1000;
  const startedDate = new Date(Number.isFinite(startedAtMs) ? startedAtMs : Date.now());
  const wordStats = computeWordStats(row);
  const transcriptText = Array.isArray(row.transcript_json)
    ? row.transcript_json.map((m) => m.content || "").join(" ")
    : row.transcript || "";
  const combinedText = `${safeText(row.summary)} ${safeText(transcriptText)}`;
  const intent = classifyIntent(combinedText);
  const conversion = detectConversion(combinedText);
  const followUp = detectFollowUp(combinedText);
  const escalation = detectEscalation(combinedText);
  const objections = detectObjection(combinedText);
  const outcome = classifyOutcome(combinedText, row.sentiment, conversion, followUp);
  const talkRatio = wordStats.totalWords ? wordStats.userWords / wordStats.totalWords : 0.5;
  const talkTimeSeconds = wordStats.talkTimeSeconds || 0;
  const silenceSeconds = Math.max(0, durationSec - talkTimeSeconds);
  const silenceRatio = durationSec ? silenceSeconds / durationSec : 0;
  const sentimentScore = getSentimentScore(row.sentiment);
  const keywords = extractKeywords(`${transcriptText} ${row.summary || ""}`);
  const qualityFlags = [];
  if ((row.sentiment || "").toLowerCase().includes("negative")) qualityFlags.push("Negative sentiment");
  if (silenceRatio > 0.4) qualityFlags.push("High silence");
  if (followUp) qualityFlags.push("Needs follow-up");
  if (escalation) qualityFlags.push("Escalated");

  return {
    raw: row,
    id: row.call_sid || row.session_id || `call-${Math.random().toString(36).slice(2, 8)}`,
    caller: row.from_number || "Unknown",
    callee: row.to_number || "",
    intent,
    outcome,
    sentiment: row.sentiment || "unknown",
    sentimentScore,
    leadScore: row.lead_score || 0,
    leadGrade: (row.lead_score || 0) >= 80 ? "High" : (row.lead_score || 0) >= 50 ? "Warm" : "Low",
    durationSec,
    direction: row.direction || "inbound",
    summary: row.summary || "",
    conversion,
    followUp,
    escalation,
    objections,
    talkRatio,
    assistantTalkRatio: 1 - talkRatio,
    userWords: wordStats.userWords,
    assistantWords: wordStats.assistantWords,
    totalWords: wordStats.totalWords,
    talkTimeSeconds,
    silenceSeconds,
    silenceRatio,
    endedAtMs,
    startedAtMs,
    hour: startedDate.getHours(),
    weekday: startedDate.getDay(),
    dayKey: startedDate.toISOString().slice(0, 10),
    keywords,
    qualityFlags,
  };
}

function getEmptyMetrics() {
  return {
    summary: {
      totalCalls: 0,
      conversions: 0,
      conversionRate: 0,
      avgHandleSeconds: 0,
      avgLeadScore: 0,
      positiveRate: 0,
      highLeadRate: 0,
      repeatCallerRate: 0,
      followUpRate: 0,
      escalationRate: 0,
      avgTalkRatioPct: 50,
      avgSilencePct: 0,
      avgWordsPerCall: 0,
      uniqueCallers: 0,
      qualifiedLeads: 0,
      newCallers: 0,
      returningCallers: 0,
    },
    charts: {
      dailyVolume: { labels: [], values: [] },
      sentimentTrend: { labels: [], positive: [], neutral: [], negative: [] },
      leadTrend: { labels: [], values: [] },
      conversionFunnel: { labels: [], values: [] },
      intentBreakdown: { labels: [], values: [] },
      hourlyDistribution: { labels: [], values: [] },
      heatmap: { days: DAY_LABELS, matrix: [] },
      talkDistribution: { labels: ["Customer", "Assistant"], values: [50, 50] },
      leadGrades: { labels: ["High", "Warm", "Low"], values: [0, 0, 0] },
    },
    tables: { recentCalls: [], topCallers: [], followUps: [], qualityAlerts: [] },
    insights: [],
    sentimentCounts: { positive: 0, neutral: 0, negative: 0 },
    leadBands: { high: 0, warm: 0, low: 0 },
  };
}

function buildInsights(summary, charts, context) {
  const insights = [];
  if (summary.conversionRate > 0) {
    insights.push(`Conversion rate holding at ${(summary.conversionRate * 100).toFixed(1)}% with ${summary.conversions} wins.`);
  }
  if (context.positiveDelta !== null) {
    const trendWord = context.positiveDelta >= 0 ? "up" : "down";
    insights.push(`Positive sentiment is ${trendWord} ${Math.abs(context.positiveDelta * 100).toFixed(1)}% week-over-week.`);
  }
  if (summary.highLeadRate > 0.2) {
    insights.push(`${Math.round(summary.highLeadRate * 100)}% of calls are high-intent leads—prioritize rapid follow-up.`);
  }
  if (context.followUps > 0) {
    insights.push(`${context.followUps} calls need follow-up; close the loop to protect revenue.`);
  }
  if (context.topIntent) {
    insights.push(`${context.topIntent} dominates intent mix—staff accordingly.`);
  }
  if (!insights.length) {
    insights.push("Not enough data yet. Make a few calls to unlock insights.");
  }
  return insights;
}

function deriveDashboardMetrics(rows = []) {
  if (!rows.length) {
    return getEmptyMetrics();
  }

  const metrics = getEmptyMetrics();
  const enriched = rows.map(enrichCallRecord);
  const chronological = [...enriched].sort((a, b) => (a.startedAtMs || 0) - (b.startedAtMs || 0));
  const seenCallers = new Set();
  chronological.forEach((call) => {
    const key = call.caller || `caller-${call.id}`;
    if (seenCallers.has(key)) {
      call.isReturning = true;
    } else {
      call.isReturning = false;
      seenCallers.add(key);
    }
  });

  const callerStats = new Map();
  const dailyMap = new Map();
  const hourlyCounts = Array.from({ length: 24 }, () => 0);
  const heatmapMatrix = Array.from({ length: 7 }, () => Array.from({ length: 24 }, () => 0));
  const intentCounts = new Map();

  let totalDuration = 0;
  let sentimentScoreSum = 0;
  let userTalkSum = 0;
  let silenceSum = 0;
  let totalWords = 0;
  let conversions = 0;
  let followUps = 0;
  let escalations = 0;
  let qualifiedLeads = 0;
  let highLeads = 0;
  let positiveCount = 0;
  let neutralCount = 0;
  let negativeCount = 0;

  enriched.forEach((call) => {
    totalDuration += call.durationSec;
    sentimentScoreSum += call.sentimentScore;
    userTalkSum += call.talkRatio;
    silenceSum += call.silenceRatio;
    totalWords += call.totalWords;
    if (call.conversion) conversions += 1;
    if (call.followUp) followUps += 1;
    if (call.escalation) escalations += 1;
    if (call.leadScore >= 50) qualifiedLeads += 1;
    if (call.leadScore >= 80) highLeads += 1;

    const sentimentLower = (call.sentiment || "").toLowerCase();
    if (sentimentLower.includes("positive")) positiveCount += 1;
    else if (sentimentLower.includes("negative")) negativeCount += 1;
    else neutralCount += 1;

    const callerKey = call.caller || "Unknown";
    const callerEntry = callerStats.get(callerKey) || {
      caller: callerKey,
      count: 0,
      totalLead: 0,
      conversions: 0,
      lastSentiment: call.sentiment,
      lastCall: call.endedAtMs,
    };
    callerEntry.count += 1;
    callerEntry.totalLead += call.leadScore;
    if (call.conversion) callerEntry.conversions += 1;
    if (!callerEntry.lastCall || call.endedAtMs > callerEntry.lastCall) {
      callerEntry.lastCall = call.endedAtMs;
      callerEntry.lastSentiment = call.sentiment;
    }
    callerStats.set(callerKey, callerEntry);

    const dayKey = call.dayKey;
    if (!dailyMap.has(dayKey)) {
      dailyMap.set(dayKey, { count: 0, positive: 0, neutral: 0, negative: 0, totalLead: 0, conversions: 0 });
    }
    const bucket = dailyMap.get(dayKey);
    bucket.count += 1;
    bucket.totalLead += call.leadScore;
    bucket.conversions += call.conversion ? 1 : 0;
    if (sentimentLower.includes("positive")) bucket.positive += 1;
    else if (sentimentLower.includes("negative")) bucket.negative += 1;
    else bucket.neutral += 1;

    hourlyCounts[call.hour] += 1;
    heatmapMatrix[call.weekday][call.hour] += 1;

    const intentCount = intentCounts.get(call.intent) || 0;
    intentCounts.set(call.intent, intentCount + 1);

    if (call.leadGrade === "High") metrics.leadBands.high += 1;
    else if (call.leadGrade === "Warm") metrics.leadBands.warm += 1;
    else metrics.leadBands.low += 1;
  });

  const totalCalls = enriched.length;
  const avgHandleSeconds = Math.round(totalDuration / totalCalls);
  const avgLeadScore = Math.round((enriched.reduce((acc, c) => acc + c.leadScore, 0) / totalCalls) || 0);
  const newCallers = enriched.filter((c) => !c.isReturning).length;
  const returningCallers = totalCalls - newCallers;
  const repeatCallerRate = totalCalls ? returningCallers / totalCalls : 0;
  const positiveRate = totalCalls ? positiveCount / totalCalls : 0;
  const highLeadRate = totalCalls ? highLeads / totalCalls : 0;
  const conversionRate = totalCalls ? conversions / totalCalls : 0;
  const followUpRate = totalCalls ? followUps / totalCalls : 0;
  const escalationRate = totalCalls ? escalations / totalCalls : 0;
  const avgTalkRatioPct = Math.round((userTalkSum / totalCalls) * 100);
  const avgSilencePct = Math.round((silenceSum / totalCalls) * 100);
  const avgWordsPerCall = Math.round(totalWords / totalCalls);

  metrics.summary = {
    totalCalls,
    conversions,
    conversionRate,
    avgHandleSeconds,
    avgLeadScore,
    positiveRate,
    highLeadRate,
    repeatCallerRate,
    followUpRate,
    escalationRate,
    avgTalkRatioPct,
    avgSilencePct,
    avgWordsPerCall,
    uniqueCallers: seenCallers.size,
    qualifiedLeads,
    newCallers,
    returningCallers,
  };

  metrics.sentimentCounts = { positive: positiveCount, neutral: neutralCount, negative: negativeCount };

  const dailySorted = Array.from(dailyMap.entries()).sort((a, b) => new Date(a[0]) - new Date(b[0]));
  const recentDaily = dailySorted.slice(-10);
  metrics.charts.dailyVolume = {
    labels: recentDaily.map(([day]) => day.slice(5)),
    values: recentDaily.map(([, bucket]) => bucket.count),
  };
  metrics.charts.sentimentTrend = {
    labels: recentDaily.map(([day]) => day.slice(5)),
    positive: recentDaily.map(([, bucket]) => bucket.positive),
    neutral: recentDaily.map(([, bucket]) => bucket.neutral),
    negative: recentDaily.map(([, bucket]) => bucket.negative),
  };
  metrics.charts.leadTrend = {
    labels: recentDaily.map(([day]) => day.slice(5)),
    values: recentDaily.map(([, bucket]) => bucket.count ? Math.round(bucket.totalLead / bucket.count) : 0),
  };

  metrics.charts.conversionFunnel = {
    labels: ["Total Calls", "Qualified Leads", "Positive Sentiment", "Conversions"],
    values: [totalCalls, qualifiedLeads, positiveCount, conversions],
  };

  const intentEntries = Array.from(intentCounts.entries()).sort((a, b) => b[1] - a[1]);
  metrics.charts.intentBreakdown = {
    labels: intentEntries.map(([intent]) => intent),
    values: intentEntries.map(([, count]) => count),
  };

  metrics.charts.hourlyDistribution = {
    labels: Array.from({ length: 24 }, (_, idx) => `${idx}:00`),
    values: hourlyCounts,
  };

  metrics.charts.heatmap = {
    days: DAY_LABELS,
    matrix: heatmapMatrix.flatMap((dayRow, dayIdx) =>
      dayRow.map((value, hourIdx) => ({ day: DAY_LABELS[dayIdx], hour: hourIdx, value }))
    ),
  };

  metrics.charts.talkDistribution = {
    labels: ["Customer", "Assistant"],
    values: [Math.round((userTalkSum / totalCalls) * 100), 100 - Math.round((userTalkSum / totalCalls) * 100)],
  };

  metrics.charts.leadGrades = {
    labels: ["High", "Warm", "Low"],
    values: [metrics.leadBands.high, metrics.leadBands.warm, metrics.leadBands.low],
  };

  metrics.tables.recentCalls = enriched.slice(0, 15).map((call) => ({
    id: call.id,
    caller: call.caller,
    sentiment: call.sentiment,
    leadScore: call.leadScore,
    leadGrade: call.leadGrade,
    durationSec: call.durationSec,
    intent: call.intent,
    outcome: call.outcome,
    conversion: call.conversion,
    followUp: call.followUp,
    talkRatio: call.talkRatio,
  }));

  metrics.tables.topCallers = Array.from(callerStats.values())
    .sort((a, b) => b.count - a.count)
    .slice(0, 5)
    .map((entry) => ({
      caller: entry.caller,
      count: entry.count,
      avgLead: entry.count ? Math.round(entry.totalLead / entry.count) : 0,
      conversions: entry.conversions,
      sentiment: entry.lastSentiment,
      lastCall: entry.lastCall,
    }));

  metrics.tables.followUps = enriched
    .filter((call) => call.followUp)
    .slice(0, 5)
    .map((call) => ({
      id: call.id,
      caller: call.caller,
      intent: call.intent,
      leadScore: call.leadScore,
      sentiment: call.sentiment,
    }));

  metrics.tables.qualityAlerts = enriched
    .filter((call) => call.qualityFlags.length)
    .slice(0, 5)
    .map((call) => ({
      id: call.id,
      caller: call.caller,
      flags: call.qualityFlags,
      durationSec: call.durationSec,
      sentiment: call.sentiment,
    }));

  const sentimentTrend = metrics.charts.sentimentTrend;
  let positiveDelta = null;
  if (sentimentTrend.labels.length >= 2) {
    const lastIdx = sentimentTrend.labels.length - 1;
    const prevIdx = lastIdx - 1;
    const lastTotal = sentimentTrend.positive[lastIdx] + sentimentTrend.neutral[lastIdx] + sentimentTrend.negative[lastIdx];
    const prevTotal = sentimentTrend.positive[prevIdx] + sentimentTrend.neutral[prevIdx] + sentimentTrend.negative[prevIdx];
    if (lastTotal && prevTotal) {
      const lastRate = sentimentTrend.positive[lastIdx] / lastTotal;
      const prevRate = sentimentTrend.positive[prevIdx] / prevTotal;
      positiveDelta = lastRate - prevRate;
    }
  }

  metrics.insights = buildInsights(metrics.summary, metrics.charts, {
    positiveDelta,
    followUps,
    topIntent: intentEntries.length ? intentEntries[0][0] : null,
  });

  return metrics;
}

// Python SIP server configuration
const PYTHON_SERVER_PORT = 8080;
const PYTHON_SERVER_URL = `http://127.0.0.1:${PYTHON_SERVER_PORT}`;
const CHATBOT_DIR = __dirname;

let pythonProcess = null;

// Start the Python SIP integration server
function startPythonServer() {
  console.log("Starting Python SIP integration server...");

  pythonProcess = spawn("python3", ["-m", "sip_integration.server"], {
    cwd: CHATBOT_DIR,
    stdio: ["inherit", "pipe", "pipe"],
    env: { ...process.env }
  });

  pythonProcess.stdout.on("data", (data) => {
    console.log(`[Python] ${data.toString().trim()}`);
  });

  pythonProcess.stderr.on("data", (data) => {
    console.error(`[Python Error] ${data.toString().trim()}`);
  });

  pythonProcess.on("close", (code) => {
    console.log(`Python server exited with code ${code}`);
    if (code !== 0 && code !== null) {
      console.log("Restarting Python server in 2 seconds...");
      setTimeout(startPythonServer, 2000);
    }
  });

  pythonProcess.on("error", (err) => {
    console.error("Failed to start Python server:", err);
  });
}

// Graceful shutdown
function shutdown() {
  console.log("\nShutting down...");
  if (pythonProcess) {
    pythonProcess.kill("SIGTERM");
  }
  process.exit(0);
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

// Start Python server
startPythonServer();

setTimeout(() => {
  console.log("Proxy ready to forward requests to Python server");
}, 3000);

// --- PROXY FUNCTION ---
function proxyToPython(req, res) {
  console.log(`Proxying ${req.method} ${req.originalUrl} to Python server`);

  const options = {
    hostname: "127.0.0.1",
    port: PYTHON_SERVER_PORT,
    path: req.originalUrl,
    method: req.method,
    headers: {
      ...req.headers,
      host: `127.0.0.1:${PYTHON_SERVER_PORT}`
    }
  };

  const proxyReq = http.request(options, (proxyRes) => {
    console.log(`Python server responded with status: ${proxyRes.statusCode}`);
    res.writeHead(proxyRes.statusCode, proxyRes.headers);
    proxyRes.pipe(res);
  });

  proxyReq.on("error", (err) => {
    console.error("Proxy error:", err);
    res.status(503).set("Content-Type", "text/xml").send(`
<Response>
  <Say>Sorry, the voice system is temporarily unavailable. Please try again later.</Say>
</Response>
`);
  });

  req.pipe(proxyReq);
}

// --- PROXY TWILIO ROUTES ---
app.post("/twilio", proxyToPython);
app.post("/twilio/status", proxyToPython);
app.all("/twilio/:path", proxyToPython);

// --- BODY PARSERS (for non-proxied routes) ---
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// --- OPENAI WEBHOOK ---
app.post("/openai", (req, res) => {
  console.log("Received OpenAI Webhook:");
  console.log(JSON.stringify(req.body, null, 2));
  res.status(200).send("ok");
});

// --- HEALTH CHECK ---
app.get("/health", async (req, res) => {
  try {
    const response = await fetch(`${PYTHON_SERVER_URL}/health`);
    const data = await response.json();
    res.json({
      node_server: "healthy",
      python_server: data
    });
  } catch (err) {
    res.json({
      node_server: "healthy",
      python_server: "unavailable"
    });
  }
});

// UptimeRobot health check endpoint
app.get("/get", (req, res) => {
  res.json({
    status: "ok",
    service: "CallSphere Voice Agent",
    timestamp: new Date().toISOString()
  });
});

// Root health check
app.get("/", (req, res) => {
  res.json({
    status: "healthy",
    service: "CallSphere Voice Agent Gateway",
    python_server: PYTHON_SERVER_URL
  });
});

// --- DASHBOARD ---
app.get("/dashboard", requireDashboardAuth, async (req, res) => {
  const range = req.query.range || "all";
  let metrics = getEmptyMetrics();
  try {
    const rows = await fetchCallLogs(500, range);
    metrics = deriveDashboardMetrics(rows);
  } catch (err) {
    console.error("Dashboard Supabase fetch failed", err);
  }

  const summary = metrics.summary;
  const percent = (value) => `${Math.round((value || 0) * 100)}%`;
  const seconds = (value) => `${value || 0}s`;
  const talkBadge = (value) => `${Math.round((value || 0) * 100)}%`;
  const formatTime = (value) => (value ? new Date(value).toLocaleString() : "—");

  const recentRows = metrics.tables.recentCalls.length
    ? metrics.tables.recentCalls
      .map((call) => {
        const sentimentLower = (call.sentiment || "").toLowerCase();
        const sentimentClass = sentimentLower.includes("positive")
          ? "positive"
          : sentimentLower.includes("negative")
            ? "negative"
            : "neutral";
        const talkPct = talkBadge(call.talkRatio);
        return `
            <tr>
              <td>${escapeHtml((call.id || "").slice(0, 12))}…</td>
              <td>${escapeHtml(call.caller)}</td>
              <td><span class="pill ${sentimentClass}">${escapeHtml(call.sentiment || "unknown")}</span></td>
              <td>${call.leadScore} <span class="sub-chip">${call.leadGrade}</span></td>
              <td>${escapeHtml(call.intent)}</td>
              <td>${escapeHtml(call.outcome)}</td>
              <td>${talkPct}</td>
              <td><a class="btn" href="/dashboard/call/${encodeURIComponent(call.id)}">Details</a></td>
            </tr>
          `;
      })
      .join("")
    : '<tr><td colspan="8" style="text-align:center;color:var(--muted);padding:18px;">No call logs yet.</td></tr>';

  const topCallerRows = metrics.tables.topCallers.length
    ? metrics.tables.topCallers
      .map((entry) => `
          <tr>
            <td>${escapeHtml(entry.caller)}</td>
            <td>${entry.count}</td>
            <td>${entry.avgLead}</td>
            <td>${entry.conversions}</td>
            <td>${escapeHtml(entry.sentiment || "unknown")}</td>
            <td>${formatTime(entry.lastCall)}</td>
          </tr>
        `)
      .join("")
    : '<tr><td colspan="6" style="text-align:center;color:var(--muted);padding:18px;">No callers yet.</td></tr>';

  const followUpRows = metrics.tables.followUps.length
    ? metrics.tables.followUps
      .map((call) => `
          <tr>
            <td>${escapeHtml(call.caller)}</td>
            <td>${escapeHtml(call.intent)}</td>
            <td>${call.leadScore}</td>
            <td>${escapeHtml(call.sentiment)}</td>
            <td><a class="btn ghost" href="/dashboard/call/${encodeURIComponent(call.id)}">Open</a></td>
          </tr>
        `)
      .join("")
    : '<tr><td colspan="5" style="text-align:center;color:var(--muted);padding:18px;">All caught up!</td></tr>';

  const qualityRows = metrics.tables.qualityAlerts.length
    ? metrics.tables.qualityAlerts
      .map((call) => `
          <tr>
            <td>${escapeHtml(call.caller)}</td>
            <td>${escapeHtml(call.flags.join(", "))}</td>
            <td>${escapeHtml(call.sentiment)}</td>
            <td>${seconds(call.durationSec)}</td>
            <td><a class="btn ghost" href="/dashboard/call/${encodeURIComponent(call.id)}">Inspect</a></td>
          </tr>
        `)
      .join("")
    : '<tr><td colspan="5" style="text-align:center;color:var(--muted);padding:18px;">No alerts 🎉</td></tr>';

  const insightsHtml = metrics.insights.length
    ? metrics.insights.map((line) => `<li>${escapeHtml(line)}</li>`).join("")
    : '<li>No insights yet.</li>';

  const chartsJson = JSON.stringify(metrics.charts).replace(/</g, "\\u003c");

  const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1"/>
  <title>Voice Intelligence Dashboard</title>
  <script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.1/dist/chart.umd.min.js"></script>
  <style>
    :root {
      --bg:#050c1f;
      --panel:#0f172a;
      --panel-alt:#111b2f;
      --border:rgba(255,255,255,0.06);
      --text:#f8fafc;
      --muted:#94a3b8;
      --accent:#22d3ee;
      --accent2:#a855f7;
      --danger:#f43f5e;
      --success:#34d399;
      --warning:#fbbf24;
    }
    *{box-sizing:border-box;}
    body{
      margin:0;
      padding:28px;
      font-family:"Inter","Segoe UI",system-ui,sans-serif;
      background:radial-gradient(circle at 10% 20%,rgba(34,211,238,0.12),transparent 45%),
                 radial-gradient(circle at 80% 0%,rgba(168,85,247,0.18),transparent 35%),
                 #030816;
      color:var(--text);
    }
    .dashboard{max-width:1400px;margin:0 auto;display:flex;flex-direction:column;gap:22px;}
    .hero{display:flex;align-items:center;justify-content:space-between;padding:24px 28px;border-radius:20px;background:linear-gradient(135deg,rgba(34,211,238,0.18),rgba(168,85,247,0.25));border:1px solid rgba(255,255,255,0.15);box-shadow:0 25px 60px rgba(2,6,23,0.65);}
    .hero h1{margin:6px 0 0;font-size:32px;font-weight:700;}
    .hero p{margin:6px 0 0;color:var(--muted);font-size:15px;}
    .hero .eyebrow{letter-spacing:0.2em;text-transform:uppercase;font-size:12px;color:var(--text);opacity:0.7;}
    .hero .stat{display:flex;flex-direction:column;align-items:flex-end;text-align:right;}
    .hero .stat strong{font-size:48px;line-height:1;margin-bottom:4px;}
    .grid{display:grid;gap:18px;}
    .metrics-grid{grid-template-columns:repeat(auto-fit,minmax(180px,1fr));}
    .metrics-grid.secondary{grid-template-columns:repeat(auto-fit,minmax(160px,1fr));}
    .card{background:var(--panel);border:1px solid var(--border);border-radius:16px;padding:18px;box-shadow:0 20px 40px rgba(2,6,23,0.55);}
    .metric-card{display:flex;flex-direction:column;gap:4px;}
    .metric-card .label{font-size:11px;letter-spacing:0.15em;text-transform:uppercase;color:var(--muted);margin:0 0 4px;display:block;font-weight:500;}
    .metric-card .value{font-size:32px;font-weight:700;line-height:1.1;background:linear-gradient(135deg,var(--accent),var(--accent2));-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;}
    .metric-card .sub{color:var(--muted);font-size:12px;margin-top:2px;}
    .metric-card .badge{margin-left:8px;font-size:11px;padding:2px 8px;border-radius:999px;background:rgba(34,211,238,0.15);color:var(--accent);}
    .label{font-size:12px;letter-spacing:0.2em;text-transform:uppercase;color:var(--muted);margin-bottom:8px;display:block;}
    .charts-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:18px;}
    .chart-card{padding:22px;}
    .chart-card canvas{width:100%;height:260px;}
    .chart-card.span-2{grid-column:span 2;}
    .split{display:grid;gap:18px;grid-template-columns:1fr;}
    .tables-stack{display:flex;flex-direction:column;gap:18px;}
    @media(max-width:1100px){.split{grid-template-columns:1fr;}.hero{flex-direction:column;align-items:flex-start;}.hero .stat{align-items:flex-start;text-align:left;margin-top:12px;}}
    table{width:100%;min-width:720px;border-collapse:collapse;margin-top:6px;table-layout:fixed;}
    th,td{text-align:left;padding:10px;font-size:13px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
    th{color:var(--muted);font-weight:600;border-bottom:1px solid var(--border);}
    tr:hover td{background:rgba(255,255,255,0.02);}
    .table-wrap{width:100%;overflow-x:auto;}
    .pill{display:inline-flex;align-items:center;padding:4px 10px;border-radius:999px;font-size:11px;font-weight:600;text-transform:capitalize;}
    .pill.positive{background:rgba(52,211,153,0.15);color:var(--success);}
    .pill.neutral{background:rgba(148,163,184,0.15);color:var(--muted);}
    .pill.negative{background:rgba(244,63,94,0.15);color:var(--danger);}
    .btn{display:inline-flex;align-items:center;justify-content:center;padding:6px 14px;border-radius:8px;font-size:12px;font-weight:600;text-decoration:none;color:#020617;background:linear-gradient(135deg,var(--accent),var(--accent2));}
    .btn.ghost{background:rgba(255,255,255,0.08);color:var(--text);}
    .sub-chip{font-size:11px;color:var(--muted);margin-left:6px;text-transform:uppercase;letter-spacing:0.05em;}
    .heatmap-card{padding:22px;}
    .heatmap-grid{margin-top:12px;display:grid;grid-template-columns:repeat(25,minmax(36px,1fr));gap:6px;font-size:11px;}
    .heatmap-cell{height:32px;border-radius:8px;display:flex;align-items:center;justify-content:center;background:rgba(15,23,42,0.6);color:var(--muted);}
    .heatmap-cell[data-value]{color:#020617;font-weight:600;}
    .heatmap-label{background:transparent;color:var(--muted);font-weight:600;}
    .insights-card ul{list-style:none;padding:0;margin:12px 0 0;display:flex;flex-direction:column;gap:12px;}
    .insights-card li{background:rgba(255,255,255,0.03);padding:12px 14px;border-radius:12px;border:1px solid rgba(255,255,255,0.05);font-size:13px;line-height:1.4;}
    .controls{display:flex;gap:12px;flex-wrap:wrap;align-items:center;}
    .range-btn{padding:6px 14px;border-radius:8px;border:1px solid rgba(255,255,255,0.15);background:transparent;color:var(--text);font-size:12px;font-weight:500;cursor:pointer;text-decoration:none;display:inline-flex;align-items:center;gap:6px;}
    .range-btn:hover,.range-btn.active{background:rgba(34,211,238,0.15);border-color:var(--accent);}
    .export-btn{padding:6px 14px;border-radius:8px;background:rgba(168,85,247,0.2);border:1px solid rgba(168,85,247,0.4);color:var(--text);font-size:12px;font-weight:500;cursor:pointer;text-decoration:none;display:inline-flex;align-items:center;gap:6px;}
    .export-btn:hover{background:rgba(168,85,247,0.3);}
  </style>
</head>
<body>
  <main class="dashboard">
    <header class="hero">
      <div>
        <div class="eyebrow">Kids4Fun Voice Ops</div>
        <h1>Voice Intelligence Dashboard</h1>
        <p>Live call insights, lead quality, and customer sentiment across every conversation.</p>
        <div class="controls" style="margin-top:14px;">
          <a class="range-btn${range === "all" ? " active" : ""}" href="/dashboard?range=all">All Time</a>
          <a class="range-btn${range === "today" ? " active" : ""}" href="/dashboard?range=today">Today</a>
          <a class="range-btn${range === "7d" ? " active" : ""}" href="/dashboard?range=7d">7 Days</a>
          <a class="range-btn${range === "30d" ? " active" : ""}" href="/dashboard?range=30d">30 Days</a>
          <a class="range-btn${range === "90d" ? " active" : ""}" href="/dashboard?range=90d">90 Days</a>
          <span style="width:1px;height:20px;background:rgba(255,255,255,0.15);margin:0 6px;"></span>
          <a class="export-btn" href="/dashboard/export/json?range=${range}">⬇ JSON</a>
          <a class="export-btn" href="/dashboard/export/csv?range=${range}">⬇ CSV</a>
        </div>
      </div>
      <div class="stat">
        <strong>${summary.totalCalls}</strong>
        <span>Total calls (lookback)</span>
      </div>
    </header>

    <section class="grid metrics-grid">
      <div class="card metric-card">
        <span class="label">Total Calls</span>
        <div class="value">${summary.totalCalls}</div>
        <div class="sub">${summary.uniqueCallers} unique callers</div>
      </div>
      <div class="card metric-card">
        <span class="label">Qualified Leads</span>
        <div class="value">${summary.qualifiedLeads}</div>
        <div class="sub">${percent(summary.highLeadRate)} high intent</div>
      </div>
      <div class="card metric-card">
        <span class="label">Conversion Rate</span>
        <div class="value">${percent(summary.conversionRate)}</div>
        <div class="sub">${summary.conversions} conversions</div>
      </div>
      <div class="card metric-card">
        <span class="label">Avg Handle Time</span>
        <div class="value">${seconds(summary.avgHandleSeconds)}</div>
        <div class="sub">${summary.avgWordsPerCall} words / call</div>
      </div>
      <div class="card metric-card">
        <span class="label">Positive Sentiment</span>
        <div class="value">${percent(summary.positiveRate)}</div>
        <div class="sub">${metrics.sentimentCounts.positive} positive calls</div>
      </div>
      <div class="card metric-card">
        <span class="label">Avg Lead Score</span>
        <div class="value">${summary.avgLeadScore}</div>
        <div class="sub">${percent(summary.followUpRate)} need follow-up</div>
      </div>
    </section>

    <section class="grid metrics-grid secondary">
      <div class="card metric-card">
        <span class="label">Repeat Caller Rate</span>
        <div class="value">${percent(summary.repeatCallerRate)}</div>
        <div class="sub">${summary.returningCallers} returning</div>
      </div>
      <div class="card metric-card">
        <span class="label">Customer Talk Share</span>
        <div class="value">${summary.avgTalkRatioPct}%</div>
        <div class="sub">${summary.avgSilencePct}% silence</div>
      </div>
      <div class="card metric-card">
        <span class="label">Escalation Rate</span>
        <div class="value">${percent(summary.escalationRate)}</div>
        <div class="sub">${summary.followUpRate ? `${percent(summary.followUpRate)} follow-ups` : "Stable"}</div>
      </div>
      <div class="card metric-card">
        <span class="label">New vs Returning</span>
        <div class="value">${summary.newCallers}/${summary.returningCallers}</div>
        <div class="sub">New / Returning</div>
      </div>
    </section>

    <section class="charts-grid">
      <div class="card chart-card span-2">
        <span class="label">Call Volume Trend</span>
        <canvas id="dailyVolumeChart"></canvas>
      </div>
      <div class="card chart-card">
        <span class="label">Conversion Funnel</span>
        <canvas id="conversionFunnelChart"></canvas>
      </div>
      <div class="card chart-card">
        <span class="label">Sentiment Pulse</span>
        <canvas id="sentimentChart"></canvas>
      </div>
      <div class="card chart-card">
        <span class="label">Lead Score Trend</span>
        <canvas id="leadTrendChart"></canvas>
      </div>
      <div class="card chart-card">
        <span class="label">Intent Mix</span>
        <canvas id="intentChart"></canvas>
      </div>
      <div class="card chart-card">
        <span class="label">Hourly Load</span>
        <canvas id="hourlyChart"></canvas>
      </div>
      <div class="card chart-card">
        <span class="label">Lead Quality Bands</span>
        <canvas id="leadGradeChart"></canvas>
      </div>
    </section>

    <section class="split">
      <div class="card heatmap-card">
        <span class="label">Engagement Heatmap</span>
        <div class="heatmap-grid" id="heatmapGrid"></div>
      </div>
    </section>

    <section class="tables-stack">
      <div class="card">
        <span class="label">Recent Calls</span>
        <div class="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Call</th>
                <th>Caller</th>
                <th>Sentiment</th>
                <th>Lead</th>
                <th>Intent</th>
                <th>Outcome</th>
                <th>Talk</th>
                <th></th>
              </tr>
            </thead>
            <tbody>${recentRows}</tbody>
          </table>
        </div>
      </div>
      <div class="card">
        <span class="label">Top Callers</span>
        <div class="table-wrap">
          <table>
            <thead><tr><th>Caller</th><th>Calls</th><th>Avg Lead</th><th>Wins</th><th>Sentiment</th><th>Last</th></tr></thead>
            <tbody>${topCallerRows}</tbody>
          </table>
        </div>
      </div>
      <div class="card">
        <span class="label">Follow-up Queue</span>
        <div class="table-wrap">
          <table>
            <thead><tr><th>Caller</th><th>Intent</th><th>Lead</th><th>Sentiment</th><th></th></tr></thead>
            <tbody>${followUpRows}</tbody>
          </table>
        </div>
      </div>
      <div class="card">
        <span class="label">Quality Alerts</span>
        <div class="table-wrap">
          <table>
            <thead><tr><th>Caller</th><th>Flags</th><th>Sentiment</th><th>Duration</th><th></th></tr></thead>
            <tbody>${qualityRows}</tbody>
          </table>
        </div>
      </div>
      <div class="card insights-card">
        <span class="label">Ops Insights</span>
        <ul>${insightsHtml}</ul>
      </div>
    </section>
  </main>

  <script>
    const DASH_CHARTS = ${chartsJson};
    Chart.defaults.color = '#cbd5f5';
    Chart.defaults.font.family = 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';

    const lineGradient = (ctx, colors) => {
      const gradient = ctx.createLinearGradient(0, 0, 0, 300);
      gradient.addColorStop(0, colors[0]);
      gradient.addColorStop(1, colors[1]);
      return gradient;
    };

    const volumeCtx = document.getElementById('dailyVolumeChart');
    if (volumeCtx && DASH_CHARTS.dailyVolume.labels.length) {
      new Chart(volumeCtx, {
        type: 'line',
        data: {
          labels: DASH_CHARTS.dailyVolume.labels,
          datasets: [{
            label: 'Calls',
            data: DASH_CHARTS.dailyVolume.values,
            tension: 0.35,
            fill: true,
            borderColor: '#22d3ee',
            backgroundColor: (ctx) => lineGradient(ctx.chart.ctx, ['rgba(34,211,238,0.35)', 'rgba(34,211,238,0.02)']),
            borderWidth: 3,
            pointRadius: 0
          }]
        },
        options: {
          plugins: { legend: { display: false } },
          scales: {
            y: { grid: { color: 'rgba(255,255,255,0.05)' } },
            x: { grid: { display: false } }
          }
        }
      });
    }

    const funnelCtx = document.getElementById('conversionFunnelChart');
    if (funnelCtx) {
      new Chart(funnelCtx, {
        type: 'bar',
        data: {
          labels: DASH_CHARTS.conversionFunnel.labels,
          datasets: [{
            label: 'Count',
            data: DASH_CHARTS.conversionFunnel.values,
            backgroundColor: ['#22d3ee','#38bdf8','#a855f7','#34d399'],
            borderRadius: 10
          }]
        },
        options: { plugins: { legend: { display: false } }, indexAxis: 'y', scales: { x: { grid: { color: 'rgba(255,255,255,0.05)' } }, y: { grid: { display: false } } } }
      });
    }

    const sentimentCtx = document.getElementById('sentimentChart');
    if (sentimentCtx) {
      new Chart(sentimentCtx, {
        type: 'bar',
        data: {
          labels: DASH_CHARTS.sentimentTrend.labels,
          datasets: [
            { label: 'Positive', data: DASH_CHARTS.sentimentTrend.positive, backgroundColor: '#34d399', stack: 'sent' },
            { label: 'Neutral', data: DASH_CHARTS.sentimentTrend.neutral, backgroundColor: '#94a3b8', stack: 'sent' },
            { label: 'Negative', data: DASH_CHARTS.sentimentTrend.negative, backgroundColor: '#f43f5e', stack: 'sent' }
          ]
        },
        options: {
          responsive: true,
          plugins: { legend: { position: 'bottom' } },
          scales: { x: { stacked: true }, y: { stacked: true, grid: { color: 'rgba(255,255,255,0.05)' } } }
        }
      });
    }

    const leadTrendCtx = document.getElementById('leadTrendChart');
    if (leadTrendCtx) {
      new Chart(leadTrendCtx, {
        type: 'line',
        data: {
          labels: DASH_CHARTS.leadTrend.labels,
          datasets: [{
            label: 'Lead Score',
            data: DASH_CHARTS.leadTrend.values,
            borderColor: '#a855f7',
            borderWidth: 3,
            pointRadius: 3,
            fill: false
          }]
        },
        options: {
          plugins: { legend: { display: false } },
          scales: { y: { grid: { color: 'rgba(255,255,255,0.05)' } }, x: { grid: { display: false } } }
        }
      });
    }

    const intentCtx = document.getElementById('intentChart');
    if (intentCtx) {
      new Chart(intentCtx, {
        type: 'doughnut',
        data: {
          labels: DASH_CHARTS.intentBreakdown.labels,
          datasets: [{ data: DASH_CHARTS.intentBreakdown.values, backgroundColor: ['#22d3ee','#38bdf8','#0ea5e9','#a855f7','#f472b6','#facc15','#34d399'] }]
        },
        options: { cutout: '70%' }
      });
    }

    const hourlyCtx = document.getElementById('hourlyChart');
    if (hourlyCtx) {
      new Chart(hourlyCtx, {
        type: 'bar',
        data: {
          labels: DASH_CHARTS.hourlyDistribution.labels,
          datasets: [{ data: DASH_CHARTS.hourlyDistribution.values, backgroundColor: '#38bdf8', borderRadius: 6 }]
        },
        options: { plugins: { legend: { display: false } }, scales: { y: { grid: { color: 'rgba(255,255,255,0.05)' } }, x: { ticks: { maxTicksLimit: 8 } } } }
      });
    }

    const leadGradeCtx = document.getElementById('leadGradeChart');
    if (leadGradeCtx) {
      new Chart(leadGradeCtx, {
        type: 'doughnut',
        data: {
          labels: DASH_CHARTS.leadGrades.labels,
          datasets: [{ data: DASH_CHARTS.leadGrades.values, backgroundColor: ['#34d399','#f87171','#fde047'] }]
        },
        options: { cutout: '65%' }
      });
    }

    const heatmapEl = document.getElementById('heatmapGrid');
    if (heatmapEl) {
      const hours = Array.from({ length: 24 }, (_, i) => i);
      const matrix = DASH_CHARTS.heatmap.matrix || [];
      const maxVal = Math.max(...matrix.map((cell) => cell.value), 1);
      const dayLabels = DASH_CHARTS.heatmap.days || ${JSON.stringify(DAY_LABELS)};
      let headerRow = '<div class="heatmap-cell heatmap-label"></div>';
      headerRow += hours.map((h) => '<div class="heatmap-cell heatmap-label">' + h + '</div>').join('');
      heatmapEl.innerHTML = headerRow;
      dayLabels.forEach((day) => {
        heatmapEl.innerHTML += '<div class="heatmap-cell heatmap-label">' + day + '</div>';
        hours.forEach((hour) => {
          const match = matrix.find((cell) => cell.day === day && cell.hour === hour);
          const value = match ? match.value : 0;
          const intensity = value ? Math.max(0.15, value / maxVal) : 0;
          const bg = value ? 'rgba(34,211,238,' + intensity + ')' : 'rgba(15,23,42,0.6)';
          const color = value ? '#020617' : 'var(--muted)';
          const content = value ? value : '';
          heatmapEl.innerHTML += '<div class="heatmap-cell" data-value="' + value + '" style="background:' + bg + ';color:' + color + ';">' + content + '</div>';
        });
      });
    }
  </script>
</body>
</html>`;

  res.set("Content-Type", "text/html").send(html);
});

// --- CALL DETAIL PAGE ---
app.get("/dashboard/call/:callId", requireDashboardAuth, async (req, res) => {
  const callId = req.params.callId;
  let call = null;
  try {
    const url = SUPABASE_URL + "/rest/v1/call_logs?or=(call_sid.eq." + encodeURIComponent(callId) + ",session_id.eq." + encodeURIComponent(callId) + ")&limit=1";
    const r = await fetch(url, { headers: { apikey: SUPABASE_KEY, Authorization: "Bearer " + SUPABASE_KEY } });
    const rows = await r.json();
    call = rows[0] || null;
  } catch (e) {
    console.error("Call detail fetch failed", e);
  }

  if (!call) {
    return res.status(404).send("Call not found");
  }

  const enriched = enrichCallRecord(call);
  const sentimentClass = (call.sentiment || "").toLowerCase().includes("positive") ? "positive" : (call.sentiment || "").toLowerCase().includes("negative") ? "negative" : "neutral";
  const talkPct = Math.round((enriched.talkRatio || 0) * 100);
  const assistantPct = 100 - talkPct;
  const silencePct = Math.round((enriched.silenceRatio || 0) * 100);
  const keywordsHtml = enriched.keywords.length
    ? enriched.keywords.map((tag) => '<span class="chip">' + escapeHtml(tag) + '</span>').join("")
    : '<span class="chip muted">No keywords</span>';
  const flagHtml = enriched.qualityFlags.length
    ? enriched.qualityFlags.map((flag) => '<span class="chip warn">' + escapeHtml(flag) + '</span>').join("")
    : '<span class="chip muted">No alerts</span>';
  const transcriptHtml = Array.isArray(call.transcript_json)
    ? call.transcript_json.map((m) => '<div class="line"><span>' + escapeHtml(m.role || "") + ':</span> ' + escapeHtml(m.content || "") + '</div>').join("")
    : (call.transcript || "").split("\n").map((line) => '<div class="line">' + escapeHtml(line) + '</div>').join("");

  const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1"/>
  <title>Call Detail — ${call.call_sid || call.session_id}</title>
  <style>
    :root{--bg:#030816;--panel:#0f172a;--panel2:#111b2f;--text:#f8fafc;--muted:#94a3b8;--accent:#22d3ee;--accent2:#a855f7;--danger:#f43f5e;--success:#34d399;}
    *{box-sizing:border-box;}
    body{margin:0;padding:26px;font-family:"Inter","Segoe UI",system-ui,sans-serif;background:var(--bg);color:var(--text);}
    a{color:var(--accent);text-decoration:none;}
    .back{margin-bottom:16px;display:inline-flex;align-items:center;font-size:13px;gap:6px;}
    h1{margin:0 0 6px;font-size:28px;}
    .meta{color:var(--muted);font-size:14px;margin-bottom:20px;}
    .card{background:var(--panel);border-radius:18px;border:1px solid rgba(255,255,255,0.08);padding:20px;margin-bottom:20px;box-shadow:0 18px 40px rgba(3,8,22,0.65);}
    .stats{display:grid;gap:16px;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));}
    .stat-block h3{margin:0;font-size:13px;color:var(--muted);letter-spacing:0.08em;text-transform:uppercase;}
    .stat-block p{margin:6px 0 0;font-size:28px;font-weight:700;}
    .pill{display:inline-flex;align-items:center;padding:4px 12px;border-radius:999px;font-size:12px;font-weight:600;text-transform:capitalize;}
    .pill.positive{background:rgba(52,211,153,0.15);color:var(--success);}
    .pill.neutral{background:rgba(148,163,184,0.2);color:var(--muted);}
    .pill.negative{background:rgba(244,63,94,0.2);color:var(--danger);}
    .chips{display:flex;flex-wrap:wrap;gap:8px;margin-top:8px;}
    .chip{padding:5px 12px;border-radius:999px;background:rgba(255,255,255,0.08);font-size:12px;}
    .chip.warn{background:rgba(244,63,94,0.15);color:var(--danger);}
    .chip.muted{background:rgba(148,163,184,0.12);color:var(--muted);}
    .summary-box{background:linear-gradient(135deg,rgba(34,211,238,0.12),rgba(168,85,247,0.18));border-radius:16px;padding:18px;font-size:14px;line-height:1.6;}
    .mix{display:flex;flex-direction:column;gap:10px;margin-top:12px;}
    .mix-bar{display:flex;width:100%;border-radius:12px;overflow:hidden;border:1px solid rgba(255,255,255,0.08);}
    .mix-bar span{padding:6px 0;text-align:center;font-size:12px;font-weight:600;}
    .mix-bar .user{background:rgba(34,211,238,0.25);}
    .mix-bar .assistant{background:rgba(168,85,247,0.25);}
    .transcript{background:rgba(15,23,42,0.85);border-radius:14px;padding:18px;font-size:13px;line-height:1.6;max-height:420px;overflow-y:auto;border:1px solid rgba(255,255,255,0.05);}
    .transcript .line{padding:4px 0;border-bottom:1px dashed rgba(255,255,255,0.05);} 
    .transcript .line:last-child{border-bottom:none;}
    .transcript .line span{font-weight:600;color:var(--muted);margin-right:6px;text-transform:capitalize;}
    @media(max-width:760px){.stats{grid-template-columns:1fr;}}
  </style>
</head>
<body>
  <a class="back" href="/dashboard">← Back to dashboard</a>
  <h1>Call Detail</h1>
  <p class="meta">${call.call_sid || call.session_id} • ${call.from_number || "Unknown"} → ${call.to_number || ""} • ${call.ended_at ? new Date(call.ended_at).toLocaleString() : ""}</p>

  <section class="card stats">
    <div class="stat-block"><h3>Duration</h3><p>${call.duration_seconds || 0}s</p></div>
    <div class="stat-block"><h3>Lead Score</h3><p>${call.lead_score || 0} <small style="font-size:13px;color:var(--muted);">${enriched.leadGrade}</small></p></div>
    <div class="stat-block"><h3>Sentiment</h3><p><span class="pill ${sentimentClass}">${call.sentiment || "unknown"}</span></p></div>
    <div class="stat-block"><h3>Intent</h3><p>${escapeHtml(enriched.intent)}</p></div>
    <div class="stat-block"><h3>Outcome</h3><p>${escapeHtml(enriched.outcome)}</p></div>
    <div class="stat-block"><h3>Conversion</h3><p>${enriched.conversion ? "Converted" : "Not converted"}</p></div>
  </section>

  <section class="card">
    <h3 style="margin:0;font-size:14px;color:var(--muted);letter-spacing:0.2em;text-transform:uppercase;">Conversation Mix</h3>
    <div class="mix">
      <div class="mix-bar">
        <span class="user" style="width:${talkPct}%">${talkPct}% Customer</span>
        <span class="assistant" style="width:${assistantPct}%">${assistantPct}% Assistant</span>
      </div>
      <div style="font-size:13px;color:var(--muted);">Silence ${silencePct}% • ${enriched.totalWords} words captured</div>
    </div>
    <div class="chips" style="margin-top:18px;">
      ${flagHtml}
    </div>
  </section>

  <section class="card">
    <span class="label">AI Summary</span>
    <div class="summary-box">${escapeHtml(enriched.summary || "No summary available.")}</div>
  </section>

  <section class="card">
    <span class="label">Key Keywords</span>
    <div class="chips">${keywordsHtml}</div>
  </section>

  <section class="card">
    <span class="label">Full Transcript</span>
    <div class="transcript">${transcriptHtml}</div>
  </section>
</body>
</html>`;

  res.set("Content-Type", "text/html").send(html);
});

// --- EXPORT ENDPOINTS ---
app.get("/dashboard/export/json", requireDashboardAuth, async (req, res) => {
  const range = req.query.range || "all";
  try {
    const rows = await fetchCallLogs(2000, range);
    const enriched = rows.map(enrichCallRecord);
    const metrics = deriveDashboardMetrics(rows);
    const payload = {
      exportedAt: new Date().toISOString(),
      range,
      summary: metrics.summary,
      calls: enriched.map((call) => ({
        id: call.id,
        caller: call.caller,
        callee: call.callee,
        direction: call.direction,
        durationSec: call.durationSec,
        intent: call.intent,
        outcome: call.outcome,
        sentiment: call.sentiment,
        leadScore: call.leadScore,
        leadGrade: call.leadGrade,
        conversion: call.conversion,
        followUp: call.followUp,
        escalation: call.escalation,
        talkRatio: call.talkRatio,
        silenceRatio: call.silenceRatio,
        totalWords: call.totalWords,
        summary: call.summary,
        keywords: call.keywords,
        qualityFlags: call.qualityFlags,
        endedAt: call.raw?.ended_at || null,
      })),
    };
    res.set("Content-Type", "application/json");
    res.set("Content-Disposition", `attachment; filename="call_logs_${range}_${Date.now()}.json"`);
    res.send(JSON.stringify(payload, null, 2));
  } catch (err) {
    console.error("Export JSON failed", err);
    res.status(500).json({ error: "Export failed" });
  }
});

app.get("/dashboard/export/csv", requireDashboardAuth, async (req, res) => {
  const range = req.query.range || "all";
  try {
    const rows = await fetchCallLogs(2000, range);
    const enriched = rows.map(enrichCallRecord);
    const headers = [
      "id", "caller", "callee", "direction", "duration_sec", "intent", "outcome",
      "sentiment", "lead_score", "lead_grade", "conversion", "follow_up", "escalation",
      "talk_ratio", "silence_ratio", "total_words", "summary", "keywords", "quality_flags", "ended_at"
    ];
    const csvRows = [headers.join(",")];
    enriched.forEach((call) => {
      const row = [
        `"${(call.id || "").replace(/"/g, '""')}"`,
        `"${(call.caller || "").replace(/"/g, '""')}"`,
        `"${(call.callee || "").replace(/"/g, '""')}"`,
        `"${call.direction || ""}"`,
        call.durationSec || 0,
        `"${(call.intent || "").replace(/"/g, '""')}"`,
        `"${(call.outcome || "").replace(/"/g, '""')}"`,
        `"${(call.sentiment || "").replace(/"/g, '""')}"`,
        call.leadScore || 0,
        `"${call.leadGrade || ""}"`,
        call.conversion ? "true" : "false",
        call.followUp ? "true" : "false",
        call.escalation ? "true" : "false",
        (call.talkRatio || 0).toFixed(2),
        (call.silenceRatio || 0).toFixed(2),
        call.totalWords || 0,
        `"${(call.summary || "").replace(/"/g, '""').replace(/\n/g, " ")}"`,
        `"${(call.keywords || []).join("; ")}"`,
        `"${(call.qualityFlags || []).join("; ")}"`,
        `"${call.raw?.ended_at || ""}"`,
      ];
      csvRows.push(row.join(","));
    });
    res.set("Content-Type", "text/csv");
    res.set("Content-Disposition", `attachment; filename="call_logs_${range}_${Date.now()}.csv"`);
    res.send(csvRows.join("\n"));
  } catch (err) {
    console.error("Export CSV failed", err);
    res.status(500).json({ error: "Export failed" });
  }
});

// --- METRICS API (JSON) ---
app.get("/dashboard/api/metrics", requireDashboardAuth, async (req, res) => {
  const range = req.query.range || "all";
  try {
    const rows = await fetchCallLogs(500, range);
    const metrics = deriveDashboardMetrics(rows);
    res.json({
      range,
      generatedAt: new Date().toISOString(),
      summary: metrics.summary,
      charts: metrics.charts,
      sentimentCounts: metrics.sentimentCounts,
      leadBands: metrics.leadBands,
      insights: metrics.insights,
    });
  } catch (err) {
    console.error("Metrics API failed", err);
    res.status(500).json({ error: "Failed to fetch metrics" });
  }
});

const PORT = 4001;
const server = app.listen(PORT, () => {
  console.log("=".repeat(60));
  console.log("CallSphere Voice Agent Gateway");
  console.log("=".repeat(60));
  console.log(`Node.js gateway running on port ${PORT}`);
  console.log(`Proxying to Python SIP server at ${PYTHON_SERVER_URL}`);
  console.log("=".repeat(60));
});

// WebSocket upgrade handling for media-stream
server.on("upgrade", (req, socket, head) => {
  console.log(`WebSocket upgrade request: ${req.url}`);

  if (req.url.startsWith("/media-stream")) {
    const options = {
      hostname: "127.0.0.1",
      port: PYTHON_SERVER_PORT,
      path: req.url,
      method: "GET",
      headers: req.headers
    };

    const proxyReq = http.request(options);
    proxyReq.on("upgrade", (proxyRes, proxySocket, proxyHead) => {
      socket.write("HTTP/1.1 101 Switching Protocols\r\n" +
        "Upgrade: websocket\r\n" +
        "Connection: Upgrade\r\n" +
        `Sec-WebSocket-Accept: ${proxyRes.headers["sec-websocket-accept"]}\r\n` +
        "\r\n");
      proxySocket.pipe(socket);
      socket.pipe(proxySocket);
    });
    proxyReq.on("error", (err) => {
      console.error("WebSocket proxy error:", err);
      socket.destroy();
    });
    proxyReq.end();
  } else {
    socket.destroy();
  }
});
