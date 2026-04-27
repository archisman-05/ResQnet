const { GoogleGenerativeAI } = require('@google/generative-ai');
const logger = require('../utils/logger');

const hasGeminiKey = Boolean(process.env.GEMINI_API_KEY);
const genAI = hasGeminiKey ? new GoogleGenerativeAI(process.env.GEMINI_API_KEY) : null;

// ✅ Use stable + cheap model
const MODEL_NAME = process.env.GEMINI_MODEL || 'gemini-1.5-flash';

// Retry helper
const sleep = (ms) => new Promise((res) => setTimeout(res, ms));

// ✅ CENTRALIZED SAFE CALL (THIS IS THE REAL FIX)
const safeGenerate = async (prompt) => {
  if (!genAI) {
    throw new Error('Gemini API key not configured');
  }

  const normalizedModel = MODEL_NAME
    .replace('gemini-1.5-flash-latest', 'gemini-1.5-flash')
    .replace('gemini-1.5-pro-latest', 'gemini-1.5-pro');
  const candidateModels = [...new Set([normalizedModel, 'gemini-1.5-flash', 'gemini-1.5-pro'])];

  let lastErr = null;
  for (const modelName of candidateModels) {
    const model = genAI.getGenerativeModel({
      model: modelName,
      generationConfig: {
        temperature: 0.7,
        topP: 0.9,
        maxOutputTokens: 2048,
      },
    });

    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        const result = await model.generateContent(prompt);
        return result.response.text().trim();
      } catch (err) {
        lastErr = err;
        if (err.message?.includes('429') && attempt < 2) {
          logger.warn(`Gemini rate limited on ${modelName}. Retry ${attempt}...`);
          await sleep(1200 * attempt);
          continue;
        }
        // Try next model on 404/unsupported model errors.
        if (err.message?.includes('404') || err.message?.includes('not found') || err.message?.includes('not supported')) {
          logger.warn(`Gemini model unavailable: ${modelName}`);
          break;
        }
        throw err;
      }
    }
  }

  throw lastErr || new Error('Gemini generation failed');
};

// Helper to clean JSON
const cleanJSON = (text) => text.replace(/```json|```/g, '').trim();
const tryParseJSON = (text) => {
  try {
    return JSON.parse(cleanJSON(text));
  } catch {
    return null;
  }
};

const buildWeeklyFallback = (stats) => {
  const totalTasks = Number(stats.total_tasks || 0);
  const completedTasks = Number(stats.completed_tasks || 0);
  const newVolunteers = Number(stats.new_volunteers || 0);
  const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
  const topAreas = Array.isArray(stats.top_areas) ? stats.top_areas.filter(Boolean).slice(0, 3) : [];

  const highlights = [
    `${completedTasks} of ${totalTasks} reported tasks were completed this week (${completionRate}% completion).`,
    `${newVolunteers} new volunteers joined in the last 7 days.`,
    topAreas.length > 0 ? `Highest task activity was seen in ${topAreas.join(', ')}.` : 'Task activity was distributed across multiple areas.',
  ];

  const concerns = [];
  if (completionRate < 50 && totalTasks > 0) concerns.push('Completion rate is below 50%; pending workload is growing.');
  if (newVolunteers === 0) concerns.push('No new volunteers were onboarded this week.');
  if (concerns.length === 0) concerns.push('No major operational risks detected from this week\'s summary data.');

  return {
    title: 'Weekly NGO Operations Report',
    executive_summary: `This week recorded ${totalTasks} tasks with ${completedTasks} completions and ${newVolunteers} new volunteers.`,
    highlights,
    concerns,
    next_week_focus: [
      'Prioritize high-urgency pending tasks for assignment within 24 hours.',
      'Run local outreach in top-demand areas to expand volunteer capacity.',
      'Track closure time for critical incidents and reduce delay week-over-week.',
    ],
    impact_statement: `With a ${completionRate}% completion rate, sustained coordination can improve next week response speed.`,
  };
};

const buildAreaFallback = (areaName, tasks) => {
  const safeTasks = Array.isArray(tasks) ? tasks : [];
  const urgencyCount = safeTasks.reduce((acc, task) => {
    const key = task.urgency || 'unknown';
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});
  const categoryCount = safeTasks.reduce((acc, task) => {
    const key = task.category || 'other';
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});

  const critical = urgencyCount.critical || 0;
  const high = urgencyCount.high || 0;
  const volunteersNeeded = Math.max(1, critical * 3 + high * 2 + Math.ceil((safeTasks.length - critical - high) * 0.7));
  const topCategories = Object.entries(categoryCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([name]) => name);

  return {
    headline: `${safeTasks.length} active tasks in ${areaName}. ${critical + high} are high-priority.`,
    trends: [
      topCategories.length > 0 ? `Most frequent categories: ${topCategories.join(', ')}.` : 'No dominant category trend yet.',
      `Urgency spread: critical ${critical}, high ${high}, medium ${urgencyCount.medium || 0}, low ${urgencyCount.low || 0}.`,
    ],
    alerts: critical > 0 ? [`${critical} critical tasks need immediate assignment and monitoring.`] : [],
    recommendations: [
      'Assign at least one coordinator to monitor unresolved high-priority tasks.',
      'Cluster nearby tasks to reduce volunteer travel time and improve throughput.',
      'Pre-position category-specific kits in top-demand areas.',
    ],
    resource_needs: {
      volunteers_needed: volunteersNeeded,
      key_skills: topCategories,
    },
    full_insight: `Deterministic analysis generated for ${areaName} from live task urgency/category distribution.`,
  };
};

const buildCentralFallback = (payload) => {
  const topCities = (payload.top_cities || []).slice(0, 3).map((c) => c.city).filter(Boolean);
  const totalReports = Number(payload.total_reports || 0);
  const pendingReports = Number(payload.pending_reports || 0);
  const reportsLast30d = Number(payload.reports_last_30d || 0);
  const openTasks = Array.isArray(payload.open_tasks) ? payload.open_tasks : [];
  const futureMonthlyDemand = Math.max(1, Math.round(reportsLast30d * 1.15));

  const base = buildAreaFallback('Central NGO Network', openTasks);
  return {
    ...base,
    headline: `${reportsLast30d} reports were filed in the last 30 days, with ${pendingReports} still pending conversion.`,
    trends: [
      topCities.length > 0 ? `Highest report volume: ${topCities.join(', ')}.` : 'Report volume is not concentrated in specific cities.',
      `Total reports in system: ${totalReports}. Open task snapshot size: ${openTasks.length}.`,
      ...base.trends,
    ],
    future_needs_forecast: {
      next_30_days_estimated_reports: futureMonthlyDemand,
      risk_areas: topCities,
      primary_resource_focus: (base.resource_needs?.key_skills || []).slice(0, 3),
    },
    volunteer_forecast: {
      volunteers_needed_total: Math.max(base.resource_needs?.volunteers_needed || 1, Math.ceil(futureMonthlyDemand * 0.6)),
      surge_buffer: Math.ceil(futureMonthlyDemand * 0.2),
    },
    full_insight: 'Central analysis generated from report volume, city concentration, and open-task pressure.',
  };
};


// ─── 1. Analyze Report ─────────────────────────
const analyzeReport = async ({ title, description, category, location_address }) => {
  const prompt = `You are an AI assistant for an NGO resource allocation system.
Analyze this report and respond ONLY JSON:

Title: "${title}"
Description: "${description}"
Category: "${category}"
Location: "${location_address || 'Unknown'}"

{
  "summary": "",
  "urgency": "low|medium|high|critical",
  "urgency_reason": "",
  "classified_category": "",
  "required_skills": [],
  "estimated_volunteers": 1,
  "key_concerns": [],
  "recommended_action": ""
}`;

  try {
    const text = await safeGenerate(prompt);
    const parsed = tryParseJSON(text);
    if (parsed) return parsed;
    throw new Error('Invalid JSON from Gemini');
  } catch (err) {
    logger.warn('analyzeReport fallback used', { error: err.message });

    return {
      summary: description.slice(0, 200),
      urgency: category === 'health' ? 'high' : 'medium',
      urgency_reason: 'Fallback',
      classified_category: category,
      required_skills: [],
      estimated_volunteers: 1,
      key_concerns: [],
      recommended_action: 'Manual review required',
    };
  }
};


// ─── 2. Prioritize Tasks ───────────────────────
const prioritizeTasks = async (tasks) => {
  const taskList = tasks.map((t, i) =>
    `${i + 1}. [${t.id}] ${t.title} | ${t.urgency}`
  ).join('\n');

  const prompt = `Rank these NGO tasks. Return JSON:
${taskList}

{
  "rankings": [],
  "overall_insight": ""
}`;

  try {
    const text = await safeGenerate(prompt);
    return JSON.parse(cleanJSON(text));
  } catch (err) {
    logger.warn('prioritizeTasks fallback used', { error: err.message });

    const map = { critical: 100, high: 75, medium: 50, low: 25 };

    return {
      rankings: tasks.map(t => ({
        task_id: t.id,
        priority_score: map[t.urgency] || 50,
        reasoning: 'Fallback urgency-based score',
      })),
      overall_insight: 'AI unavailable',
    };
  }
};


// ─── 3. Match Volunteers ───────────────────────
const matchVolunteers = async (task, volunteers) => {
  const prompt = `Match volunteers to task:
Task: ${task.title}
Volunteers: ${volunteers.length}

Return JSON with best match`;

  try {
    const text = await safeGenerate(prompt);
    return JSON.parse(cleanJSON(text));
  } catch (err) {
    logger.warn('matchVolunteers fallback used', { error: err.message });

    const matches = volunteers.map(v => ({
      volunteer_id: v.user_id,
      match_score: Math.max(10, 100 - (v.distance_km || 50) * 2),
      reasoning: 'Fallback distance-based',
      recommended: false,
    })).sort((a, b) => b.match_score - a.match_score);

    if (matches.length) matches[0].recommended = true;

    return {
      matches,
      best_match_id: matches[0]?.volunteer_id || null,
      matching_insight: 'Fallback matching',
    };
  }
};


// ─── 4. Area Insights ─────────────────────────
const generateAreaInsights = async (areaName, tasks) => {
  const prompt = `You are an NGO operations intelligence assistant.
Analyze this area snapshot and return ONLY valid JSON with this exact shape:
{
  "headline": "",
  "trends": [],
  "alerts": [],
  "recommendations": [],
  "resource_needs": { "volunteers_needed": 0, "key_skills": [] },
  "full_insight": ""
}

Area: "${areaName}"
Tasks: ${JSON.stringify(tasks)}
`;

  try {
    const text = await safeGenerate(prompt);
    const parsed = tryParseJSON(text);
    if (parsed) return parsed;
    throw new Error('Invalid JSON from Gemini');
  } catch (err) {
    logger.warn('areaInsights fallback used', { error: err.message });
    return buildAreaFallback(areaName, tasks);
  }
};


// ─── 5. Weekly Summary ───────────────────────
const generateWeeklySummary = async (stats) => {
  const prompt = `You are an NGO operations assistant.
Generate a concise weekly summary from the following stats and return ONLY valid JSON with this exact shape:
{
  "title": "",
  "executive_summary": "",
  "highlights": [],
  "concerns": [],
  "next_week_focus": [],
  "impact_statement": ""
}

Stats: ${JSON.stringify(stats)}
`;

  try {
    const text = await safeGenerate(prompt);
    const parsed = tryParseJSON(text);
    if (parsed) return parsed;
    throw new Error('Invalid JSON from Gemini');
  } catch (err) {
    logger.warn('weeklySummary fallback used', { error: err.message });
    return buildWeeklyFallback(stats);
  }
};

const generateCentralInsights = async (payload) => {
  const prompt = `You are an NGO central command analyst.
Use this nationwide/central report payload and return ONLY valid JSON with this exact shape:
{
  "headline": "",
  "trends": [],
  "alerts": [],
  "recommendations": [],
  "future_needs_forecast": {
    "next_30_days_estimated_reports": 0,
    "risk_areas": [],
    "primary_resource_focus": []
  },
  "volunteer_forecast": {
    "volunteers_needed_total": 0,
    "surge_buffer": 0
  },
  "resource_needs": { "volunteers_needed": 0, "key_skills": [] },
  "full_insight": ""
}

Payload: ${JSON.stringify(payload)}
`;

  try {
    const text = await safeGenerate(prompt);
    const parsed = tryParseJSON(text);
    if (parsed) return parsed;
    throw new Error('Invalid JSON from Gemini');
  } catch (err) {
    logger.warn('centralInsights fallback used', { error: err.message });
    return buildCentralFallback(payload);
  }
};

module.exports = {
  analyzeReport,
  prioritizeTasks,
  matchVolunteers,
  generateAreaInsights,
  generateWeeklySummary,
  generateCentralInsights,
};