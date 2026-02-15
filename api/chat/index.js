module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const CLAUDE_API_KEY = process.env.CLAUDE_API_KEY;
  if (!CLAUDE_API_KEY) {
    return res.status(500).json({ error: 'CLAUDE_API_KEY not configured' });
  }

  const { messages, context } = req.body || {};
  if (!messages || !Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: 'Missing messages array' });
  }

  // Build a system prompt with the user's financial context
  let systemPrompt = `You are a calm, professional financial advisor within the Bocy app. You help users understand their finances and make better decisions.

Guidelines:
- Be warm but professional, like a trusted advisor
- Give specific, actionable advice based on the user's data
- Keep responses concise (2-4 paragraphs max)
- Use UK currency (£) and UK financial context
- Never recommend specific financial products or funds
- If you don't have enough data to answer, say so honestly
- Format amounts clearly (e.g. £1,200/month)`;

  if (context) {
    systemPrompt += `\n\nThe user's latest financial analysis:\n`;
    if (context.monthly_income) systemPrompt += `- Monthly income: £${context.monthly_income}\n`;
    if (context.monthly_spending) systemPrompt += `- Monthly spending: £${context.monthly_spending}\n`;
    if (context.surplus) systemPrompt += `- Monthly surplus: £${context.surplus}\n`;
    if (context.archetype) systemPrompt += `- Financial profile: ${context.archetype}\n`;
    if (context.goals) {
      systemPrompt += `- Current situation: ${context.goals.current_situation || 'Unknown'}\n`;
      systemPrompt += `- 1-year goal: ${context.goals.one_year_goal || 'Not set'}\n`;
      systemPrompt += `- 2-year goal: ${context.goals.two_year_goal || 'Not set'}\n`;
    }
    if (context.top_move?.action) {
      systemPrompt += `- Top recommendation: ${context.top_move.action}\n`;
    }
  }

  try {
    const resp = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': CLAUDE_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-5-20250929',
        max_tokens: 1024,
        system: systemPrompt,
        messages: messages.map(m => ({
          role: m.role,
          content: m.content,
        })),
      }),
    });

    if (!resp.ok) {
      const detail = await resp.text();
      return res.status(resp.status).json({ error: 'Claude API error', detail });
    }

    const data = await resp.json();
    const text = data.content?.[0]?.text || null;

    return res.status(200).json({ success: true, text });
  } catch (e) {
    return res.status(500).json({ error: 'Failed to call Claude', detail: e.message });
  }
};
