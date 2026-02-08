/**
 * Vercel serverless function: AI status + short explanation for a single goal.
 * Used on the goal detail page. Returns status ("On track" | "At risk" | "Failing") and a
 * simple 2–4 sentence paragraph explaining why.
 */

const OpenAI = require('openai');

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

function parseBody(req) {
  if (!req.body) return null;
  if (typeof req.body === 'string') {
    try {
      return JSON.parse(req.body);
    } catch (e) {
      return null;
    }
  }
  return req.body;
}

function formatGoalForAnalysis(goal, milestones = [], tasks = [], milestoneUpdates = []) {
  const gid = goal && (goal.id != null) ? Number(goal.id) : null;
  const goalMilestones = Array.isArray(milestones)
    ? milestones.filter(m => m && (Number(m.goal_id) === gid || Number(m.goalId) === gid))
    : [];
  const goalTasks = Array.isArray(tasks)
    ? tasks.filter(t => t && t.milestone_id != null && goalMilestones.some(m => m.id === t.milestone_id))
    : [];
  const goalMilestoneIds = goalMilestones.map(m => m.id).filter(Boolean);
  const updates = Array.isArray(milestoneUpdates) ? milestoneUpdates : [];
  const goalUpdates = updates.filter(u => u && goalMilestoneIds.includes(u.milestone_id));

  const totalMilestones = goalMilestones.length;
  const completedMilestones = goalMilestones.filter(m => m.completed).length;
  const totalTasks = goalTasks.length;
  const completedTasks = goalTasks.filter(t => t.completed).length;

  const oneWeekAgo = new Date();
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
  const recentCompletedTasks = goalTasks.filter(t => {
    if (!t.completed || !t.updated_at) return false;
    try {
      return new Date(t.updated_at) >= oneWeekAgo;
    } catch {
      return false;
    }
  }).length;

  const goalText = goal && typeof goal.text === 'string' ? goal.text : 'Untitled goal';
  let analysis = `Goal: "${goalText}"`;
  if (goal.description && typeof goal.description === 'string') {
    analysis += `\nDescription: ${goal.description}`;
  }
  if (goal.deadline_date) {
    try {
      const d = new Date(goal.deadline_date);
      const days = Math.ceil((d.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
      analysis += `\nGoal Deadline: ${goal.deadline_date} (${days > 0 ? `${days} days remaining` : `OVERDUE by ${Math.abs(days)} days`})`;
    } catch {
      analysis += `\nGoal Deadline: ${goal.deadline_date}`;
    }
  }

  analysis += `\n\nMilestones: ${completedMilestones}/${totalMilestones} completed`;
  if (goalMilestones.length > 0) {
    analysis += '\nMilestone Details:';
    goalMilestones.forEach(m => {
      analysis += `\n  - ${m.name || 'Unnamed'}`;
      if (m.description) analysis += `\n    Description: ${m.description}`;
      if (m.completed) analysis += ' ✓ COMPLETED';
      else {
        analysis += ' ⏳ INCOMPLETE';
        if (m.deadline_date) {
          try {
            const md = new Date(m.deadline_date);
            const mDays = Math.ceil((md.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
            analysis += ` [Due: ${m.deadline_date}${mDays < 0 ? ` - OVERDUE by ${Math.abs(mDays)} days` : ` - ${mDays} days remaining`}]`;
          } catch {
            analysis += ` [Due: ${m.deadline_date}]`;
          }
        }
      }
      const mu = goalUpdates.filter(u => u.milestone_id === m.id);
      if (mu.length > 0) {
        analysis += `\n    Updates (${mu.length}):`;
        mu.forEach(u => {
          const dateStr = u.created_at ? new Date(u.created_at).toLocaleDateString() : '';
          analysis += `\n      - [${dateStr}] ${u.content || ''}`;
        });
      }
    });
  }

  analysis += `\n\nTasks: ${completedTasks}/${totalTasks} completed`;
  analysis += `\nRecent Activity: ${recentCompletedTasks} tasks completed in the last 7 days`;
  if (goal.created_at) {
    try {
      const daysSince = Math.max(1, Math.ceil((Date.now() - new Date(goal.created_at).getTime()) / (1000 * 60 * 60 * 24)));
      const vel = (completedTasks / daysSince) * 7;
      analysis += `\nVelocity: ~${vel.toFixed(1)} tasks per week`;
    } catch {
      /* skip velocity */
    }
  }

  return analysis;
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed. Use POST.' });
  }

  if (!process.env.OPENAI_API_KEY) {
    return res.status(500).json({
      error: 'OpenAI API key not configured',
      message: 'Please set OPENAI_API_KEY in your environment variables',
    });
  }

  try {
    const body = parseBody(req) || {};
    const { goal, milestones = [], tasks = [], milestoneUpdates = [] } = body;

    if (!goal || !goal.id) {
      return res.status(400).json({
        error: 'Invalid request',
        message: 'goal (with id) is required',
      });
    }

    const analysis = formatGoalForAnalysis(goal, milestones, tasks, milestoneUpdates);

    const systemMessage = `You are a friendly project management assistant. For the given goal, do two things:

1. Decide its status: exactly one of "On track", "At risk", or "Failing".
   - "On track": Progress is good; likely to finish on time. Default to this when reasonable.
   - "At risk": May not finish on time, but still possible with focus.
   - "Failing": Clearly behind; unlikely to finish on time.

2. Write a short explanation (2–4 sentences) in plain English. Explain why you chose that status. Be encouraging but honest. Use simple words. No jargon.

Return ONLY a JSON object in this exact format:
{
  "status": "On track",
  "explanation": "Your 2–4 sentence explanation here."
}`;

    const userMessage = `Analyze this goal and return its status plus a short explanation.\n\n${analysis}\n\nReturn JSON with "status" and "explanation" only.`;

    let completion;
    try {
      completion = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemMessage },
          { role: 'user', content: userMessage },
        ],
        temperature: 0.3,
        response_format: { type: 'json_object' },
      });
    } catch (openaiErr) {
      console.error('[goal-status-explanation] OpenAI error:', openaiErr?.message || openaiErr);
      const msg = openaiErr?.message || String(openaiErr);
      const friendly = msg.includes('api_key') || msg.includes('API key') || msg.includes('Incorrect API key')
        ? 'OpenAI API key is missing or invalid. Set OPENAI_API_KEY in .env.local (local) or Vercel env (production).'
        : msg.length > 120 ? `OpenAI error: ${msg.slice(0, 120)}…` : `OpenAI error: ${msg}`;
      return res.status(500).json({
        error: 'OpenAI error',
        message: friendly,
      });
    }

    const raw = completion.choices[0]?.message?.content;
    if (!raw) {
      console.error('[goal-status-explanation] No content from OpenAI');
      return res.status(500).json({
        error: 'Internal server error',
        message: 'No response from OpenAI',
      });
    }

    let data;
    try {
      data = JSON.parse(raw);
    } catch (e) {
      console.error('[goal-status-explanation] Parse error:', raw);
      return res.status(500).json({
        error: 'Invalid AI response',
        message: 'Could not parse AI response',
      });
    }

    const status = data.status;
    const explanation = typeof data.explanation === 'string' ? data.explanation.trim() : '';

    if (!['On track', 'At risk', 'Failing'].includes(status)) {
      console.error('[goal-status-explanation] Invalid status:', status);
      return res.status(500).json({
        error: 'Invalid AI response',
        message: `Unexpected status: ${status}`,
      });
    }

    return res.status(200).json({
      success: true,
      status,
      explanation: explanation || 'No explanation provided.',
    });
  } catch (error) {
    console.error('[goal-status-explanation] Error:', error?.message || error, error?.stack);
    return res.status(500).json({
      error: 'Internal server error',
      message: error?.message || 'Something went wrong',
    });
  }
};
