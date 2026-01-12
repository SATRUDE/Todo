/**
 * Vercel serverless function for ChatGPT Workshop integration
 * This endpoint handles ChatGPT API requests securely from the client
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
      console.error('[workshop] Failed to parse JSON body', error);
      return null;
    }
  }
  return req.body;
}

// Format task for display in AI context
function formatTaskForAI(todo) {
  let formatted = `- ${todo.text}`;
  if (todo.completed) {
    formatted += ' (completed)';
  }
  if (todo.deadline_date) {
    formatted += ` [Due: ${todo.deadline_date}`;
    if (todo.deadline_time) {
      formatted += ` at ${todo.deadline_time}`;
    }
    formatted += ']';
  }
  if (todo.description) {
    formatted += ` - ${todo.description}`;
  }
  if (todo.effort) {
    formatted += ` (Effort: ${todo.effort}/10)`;
  }
  return formatted;
}

module.exports = async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
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
    const { message, conversationHistory = [], userId } = body;

    if (!message || typeof message !== 'string') {
      return res.status(400).json({
        error: 'Invalid request',
        message: 'Please provide a message string in the request body'
      });
    }

    if (!userId) {
      return res.status(400).json({
        error: 'Invalid request',
        message: 'User ID is required'
      });
    }

    // Get Supabase credentials
    const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
    const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    if (!supabaseUrl || !supabaseServiceRoleKey) {
      console.error('[workshop] Missing Supabase credentials');
      return res.status(500).json({
        error: 'Server configuration error',
        message: 'Supabase credentials not configured'
      });
    }

    // Create Supabase client with service role key (bypasses RLS)
    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

    // Fetch user's tasks
    let tasksContext = '';
    try {
      const { data: tasks, error: tasksError } = await supabase
        .from('todos')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(50); // Limit to most recent 50 tasks for context

      if (!tasksError && tasks && tasks.length > 0) {
        const incompleteTasks = tasks.filter(t => !t.completed);
        const completedTasks = tasks.filter(t => t.completed);

        tasksContext = '\n\nHere are the user\'s current tasks:\n';
        
        if (incompleteTasks.length > 0) {
          tasksContext += '\nActive Tasks:\n';
          incompleteTasks.slice(0, 20).forEach(todo => {
            tasksContext += formatTaskForAI(todo) + '\n';
          });
        }

        if (completedTasks.length > 0 && incompleteTasks.length < 10) {
          tasksContext += '\nRecently Completed Tasks:\n';
          completedTasks.slice(0, 5).forEach(todo => {
            tasksContext += formatTaskForAI(todo) + '\n';
          });
        }

        tasksContext += '\nYou can reference these tasks, suggest breaking them down, help prioritize, or answer questions about them.';
      }
    } catch (tasksError) {
      console.error('[workshop] Error fetching tasks:', tasksError);
      // Continue without task context if fetch fails
    }

    // Build system message with task context
    const systemMessage = 'You are a helpful AI assistant that helps users manage their tasks and productivity. You can help break down complex tasks, suggest improvements, provide motivation, and answer questions about task management.' + tasksContext;

    // Build conversation history for context
    const messages = [
      {
        role: 'system',
        content: systemMessage
      },
      ...conversationHistory,
      {
        role: 'user',
        content: message
      }
    ];

    // Call OpenAI API
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini', // Using gpt-4o-mini for cost-effectiveness, can change to gpt-4 if needed
      messages: messages,
      temperature: 0.7,
      max_tokens: 1000, // Increased to accommodate task context
    });

    const assistantMessage = completion.choices[0]?.message?.content;

    if (!assistantMessage) {
      return res.status(500).json({
        error: 'No response from OpenAI',
        message: 'The AI did not return a response'
      });
    }

    // Return the response
    return res.status(200).json({
      message: assistantMessage,
      usage: completion.usage,
    });

  } catch (error) {
    console.error('Error calling OpenAI API:', error);
    
    // Handle specific OpenAI errors
    if (error.response) {
      return res.status(error.response.status || 500).json({
        error: 'OpenAI API error',
        message: error.response.data?.error?.message || error.message,
        code: error.response.data?.error?.code
      });
    }

    return res.status(500).json({
      error: 'Internal server error',
      message: error.message || 'An unexpected error occurred'
    });
  }
};

