const { GoogleGenerativeAI } = require('@google/generative-ai');
const logger = require('../utils/logger');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// ✅ Use stable + cheap model
const MODEL_NAME = process.env.GEMINI_MODEL || 'gemini-1.5-flash-latest';

// Retry helper
const sleep = (ms) => new Promise((res) => setTimeout(res, ms));

// ✅ CENTRALIZED SAFE CALL (THIS IS THE REAL FIX)
const safeGenerate = async (prompt) => {
  const candidateModels = [
    MODEL_NAME,
    'gemini-1.5-flash-latest',
    'gemini-1.5-flash',
    'gemini-1.5-pro-latest',
  ];

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
    return JSON.parse(cleanJSON(text));
  } catch (err) {
    logger.error('analyzeReport error', { error: err.message });

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
    logger.error('prioritizeTasks error', { error: err.message });

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
    logger.error('matchVolunteers error', { error: err.message });

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
  const prompt = `Analyze NGO area: ${areaName} with ${tasks.length} tasks`;

  try {
    const text = await safeGenerate(prompt);
    return JSON.parse(cleanJSON(text));
  } catch (err) {
    logger.error('areaInsights error', { error: err.message });

    return {
      headline: `${tasks.length} tasks in ${areaName}`,
      trends: [],
      alerts: [],
      recommendations: ['Manual review'],
      resource_needs: { volunteers_needed: tasks.length },
      full_insight: 'AI unavailable',
    };
  }
};


// ─── 5. Weekly Summary ───────────────────────
const generateWeeklySummary = async (stats) => {
  const prompt = `Generate NGO weekly summary:
${JSON.stringify(stats)}

Return JSON`;

  try {
    const text = await safeGenerate(prompt);
    return JSON.parse(cleanJSON(text));
  } catch (err) {
    logger.error('weeklySummary error', { error: err.message });

    return {
      title: 'Weekly Report',
      executive_summary: `Handled ${stats.total_tasks} tasks.`,
      highlights: [],
      concerns: [],
      next_week_focus: [],
      impact_statement: 'Fallback summary',
    };
  }
};

module.exports = {
  analyzeReport,
  prioritizeTasks,
  matchVolunteers,
  generateAreaInsights,
  generateWeeklySummary,
};