/**
 * Vercel serverless function for AI-based goal status determination
 * Uses OpenAI to analyze goal progress and determine if goals are "On track", "At risk", or "Failing"
 */

const OpenAI = require('openai');
const { createClient } = require('@supabase/supabase-js');

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Helper function to parse request body
function parseBody(req) {
  if (!req.body) {
    return null;
  }
  if (typeof req.body === 'string') {
    try {
      return JSON.parse(req.body);
    } catch (error) {
      console.error('[goal-status] Failed to parse JSON body', error);
      return null;
    }
  }
  return req.body;
}

// Format goal data for AI analysis
function formatGoalForAnalysis(goal, milestones = [], tasks = [], milestoneUpdates = []) {
  const goalMilestones = milestones.filter(m => m.goal_id === goal.id || m.goalId === goal.id);
  const goalTasks = tasks.filter(t => {
    if (t.milestone_id) {
      return goalMilestones.some(m => m.id === t.milestone_id);
    }
    return false;
  });
  
  // Get updates for milestones in this goal
  const goalMilestoneIds = goalMilestones.map(m => m.id);
  const goalUpdates = milestoneUpdates.filter(u => goalMilestoneIds.includes(u.milestone_id));

  const totalMilestones = goalMilestones.length;
  const completedMilestones = goalMilestones.filter(m => m.completed).length;
  const totalTasks = goalTasks.length;
  const completedTasks = goalTasks.filter(t => t.completed).length;
  
  // Calculate recent activity (tasks completed in last 7 days)
  const oneWeekAgo = new Date();
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
  const recentCompletedTasks = goalTasks.filter(t => {
    if (!t.completed || !t.updated_at) return false;
    return new Date(t.updated_at) >= oneWeekAgo;
  }).length;

  let analysis = `Goal: "${goal.text}"`;
  if (goal.description) {
    analysis += `\nDescription: ${goal.description}`;
  }
  if (goal.deadline_date) {
    const deadlineDate = new Date(goal.deadline_date);
    const daysUntilDeadline = Math.ceil((deadlineDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
    analysis += `\nGoal Deadline: ${goal.deadline_date} (${daysUntilDeadline > 0 ? `${daysUntilDeadline} days remaining` : `OVERDUE by ${Math.abs(daysUntilDeadline)} days`})`;
  }
  
  analysis += `\n\nMilestones: ${completedMilestones}/${totalMilestones} completed (${totalMilestones > 0 ? Math.round((completedMilestones / totalMilestones) * 100) : 0}%)`;
  if (goalMilestones.length > 0) {
    analysis += '\nMilestone Details:';
    goalMilestones.forEach(m => {
      analysis += `\n  - ${m.name}`;
      if (m.description) {
        analysis += `\n    Description: ${m.description}`;
      }
      if (m.completed) {
        analysis += ' ✓ COMPLETED';
      } else {
        analysis += ' ⏳ INCOMPLETE';
        if (m.deadline_date) {
          const milestoneDeadline = new Date(m.deadline_date);
          const daysUntilMilestone = Math.ceil((milestoneDeadline.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
          analysis += ` [Due: ${m.deadline_date}${daysUntilMilestone < 0 ? ` - OVERDUE by ${Math.abs(daysUntilMilestone)} days` : daysUntilMilestone <= 7 ? ` - ${daysUntilMilestone} days remaining (URGENT)` : ` - ${daysUntilMilestone} days remaining`}]`;
        }
      }
      
      // Add updates for this milestone
      const milestoneUpdates = goalUpdates.filter(u => u.milestone_id === m.id);
      if (milestoneUpdates.length > 0) {
        analysis += `\n    Updates (${milestoneUpdates.length}):`;
        milestoneUpdates.forEach(update => {
          const updateDate = update.created_at ? new Date(update.created_at) : null;
          const dateStr = updateDate ? updateDate.toLocaleDateString() : '';
          analysis += `\n      - [${dateStr}] ${update.content}`;
        });
      }
    });
  }
  
  analysis += `\n\nTasks: ${completedTasks}/${totalTasks} completed (${totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0}%)`;
  analysis += `\nRecent Activity: ${recentCompletedTasks} tasks completed in the last 7 days`;
  
  // Calculate velocity
  if (goal.created_at) {
    const goalCreatedDate = new Date(goal.created_at);
    const daysSinceCreation = Math.max(1, Math.ceil((new Date().getTime() - goalCreatedDate.getTime()) / (1000 * 60 * 60 * 24)));
    const velocity = (completedTasks / daysSinceCreation) * 7; // tasks per week
    analysis += `\nVelocity: ~${velocity.toFixed(1)} tasks completed per week`;
  }

  return analysis;
}

module.exports = async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed. Use POST.' });
  }

  // Check if API key is configured
  if (!process.env.OPENAI_API_KEY) {
    console.error('❌ OpenAI API key not configured');
    return res.status(500).json({
      error: 'OpenAI API key not configured',
      message: 'Please set OPENAI_API_KEY in your environment variables'
    });
  }

  try {
    const body = parseBody(req) || {};
    const { goals = [], milestones = [], tasks = [], milestoneUpdates = [] } = body;

    if (!Array.isArray(goals) || goals.length === 0) {
      return res.status(400).json({
        error: 'Invalid request',
        message: 'goals array is required and must not be empty'
      });
    }

    // Format each goal for AI analysis
    const goalsAnalysis = goals.map(goal => formatGoalForAnalysis(goal, milestones, tasks, milestoneUpdates)).join('\n\n---\n\n');

    // Build system message for AI
    const systemMessage = `You are an expert project management assistant. Analyze goal progress data and determine the status of each goal.

For each goal, determine its status as one of:
- "On track": The goal is progressing well and likely to be completed on time. Use this as the DEFAULT status when progress is reasonable relative to available time. For consistency/habit-building goals (like "train consistently", "improve Norwegian"), mark as "On track" if the user has been maintaining activity or making steady progress, even if recent metrics temporarily show 0 tasks completed.
- "At risk": The goal may not be completed on time, but there's still a reasonable chance with focused effort. Only use this when there are CLEAR, SPECIFIC concerns such as: multiple overdue milestones, consistently declining velocity over time, or a significant gap between progress made and progress needed relative to the deadline.
- "Failing": The goal is significantly behind schedule and unlikely to be completed on time. Only use this for goals that are clearly off-track with little chance of recovery given remaining time and current trajectory.

**Critical Assessment Guidelines - READ CAREFULLY:**

1. **DEFAULT TO "ON TRACK"**: When in doubt or when progress is reasonable, default to "On track". A goal should only be marked "At risk" when there are SPECIFIC, IDENTIFIABLE concerns - not just because some metrics are low.

2. **Understand Goal Types**:
   - **Consistency/Habit Goals** (e.g., "train consistently", "improve Norwegian"): These are evaluated by whether the user is maintaining regular activity and building habits. Temporary dips in recent activity are normal and do NOT indicate "At risk". Look at milestone updates for positive momentum indicators.
   - **Project Goals** (e.g., "renovate house"): These have specific deadlines and deliverables. Evaluate based on progress toward deadline relative to work completed.

3. **Milestone Updates Are Highly Important**: Positive milestone updates (showing progress, momentum, adjustments, or continued effort) are STRONG indicators that a goal is "On track", even if recent task completion is temporarily low. Updates provide qualitative context that quantitative metrics alone cannot capture.

4. **Don't Over-Weight Recent Activity**: A temporary dip in recent activity (e.g., 0 tasks completed in last week) does NOT automatically mean "At risk" if:
   - Overall progress is reasonable for the time elapsed
   - The goal has adequate time remaining
   - Milestone updates show positive momentum
   - Previous activity was consistent
   - The goal type (consistency/habit) allows for natural variation

5. **Consider Time Horizons**: 
   - A goal with many months remaining can still be "On track" with modest completion rates
   - A goal with weeks remaining needs higher completion rates to be "On track"
   - Use deadline proximity as context, not a hard rule

6. **Be Encouraging, Not Pessimistic**: If a goal shows steady progress, positive updates, and has time remaining, it should be "On track". Only mark as "At risk" when there are genuine concerns about meeting the goal.

**Factor Priority (in order of importance):**
1. **Milestone Updates**: Strongest indicator - positive updates often mean "On track"
2. **Goal Type & Context**: Habit/consistency goals are evaluated differently than deadline-driven projects
3. **Overall Progress vs Time**: Is progress reasonable for the time elapsed?
4. **Deadline Proximity**: How much time remains relative to what's needed?
5. **Completion Rates**: In context of time and goal type
6. **Recent Activity**: A supporting metric, but don't over-weight temporary dips
7. **Overdue Items**: A stronger negative signal if multiple items are overdue

Be thoughtful, considerate, and default to optimism when progress is reasonable. Only use "At risk" or "Failing" when there are clear, specific concerns about goal achievement.

Return ONLY a JSON object with this exact format:
{
  "statuses": {
    "goalId1": "On track",
    "goalId2": "At risk",
    "goalId3": "Failing"
  }
}

Where goalId is the goal's ID number. Use only the exact status strings: "On track", "At risk", or "Failing".`;

    // Build user message
    const userMessage = `Analyze these goals and determine their status. Remember: default to "On track" when progress is reasonable. For consistency/habit goals like "train consistently", consider that temporary dips in recent activity are normal and not necessarily indicative of "At risk" status.\n\n${goalsAnalysis}\n\nReturn the status for each goal in the specified JSON format.`;

    // Call OpenAI API
    let completion;
    try {
      completion = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemMessage },
          { role: 'user', content: userMessage }
        ],
        temperature: 0.3, // Lower temperature for more consistent, analytical responses
        response_format: { type: 'json_object' }
      });
    } catch (openaiError) {
      console.error('[goal-status] OpenAI API error:', openaiError);
      throw openaiError;
    }

    const assistantMessage = completion.choices[0]?.message?.content;
    
    if (!assistantMessage) {
      throw new Error('No response from OpenAI');
    }

    // Parse the JSON response
    let statusData;
    try {
      statusData = JSON.parse(assistantMessage);
    } catch (parseError) {
      console.error('[goal-status] Failed to parse OpenAI response:', parseError);
      console.error('[goal-status] Response was:', assistantMessage);
      throw new Error('Invalid JSON response from AI');
    }

    // Validate the response format
    if (!statusData.statuses || typeof statusData.statuses !== 'object') {
      console.error('[goal-status] Invalid response format:', statusData);
      throw new Error('Invalid response format from AI');
    }

    // Return the statuses
    return res.status(200).json({
      success: true,
      statuses: statusData.statuses
    });

  } catch (error) {
    console.error('[goal-status] Error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: error.message || 'An error occurred while determining goal status'
    });
  }
};
