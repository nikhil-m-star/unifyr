const { fetchUtsavEvents } = require('../services/utsavService');

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
const MAX_AI_EVENTS = 32;

const toCompactEvent = (event) => ({
  id: event.id,
  title: event.title,
  category: event.category,
  venue: event.venue,
  date: event.date,
  registration_open: Boolean(event.registration_open),
  description: (event.description || '').slice(0, 90),
});

const normalize = (value = '') =>
  String(value)
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const promptTokens = (prompt = '') => normalize(prompt).split(' ').filter((token) => token.length > 2);

const scoreEventForPrompt = (event, tokens) => {
  if (!tokens.length) return event.registration_open ? 1 : 0;
  const haystack = normalize([event.title, event.category, event.venue, event.description].filter(Boolean).join(' '));
  const matched = tokens.filter((token) => haystack.includes(token)).length;
  return matched + (event.registration_open ? 0.35 : 0);
};

const selectCandidateEvents = (events, prompt) => {
  const tokens = promptTokens(prompt);

  return [...events]
    .map((event) => ({ event, score: scoreEventForPrompt(event, tokens) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, MAX_AI_EVENTS)
    .map((entry) => entry.event);
};

const extractJsonPayload = (content = '') => {
  const trimmed = String(content).trim();
  if (!trimmed) return null;

  try {
    return JSON.parse(trimmed);
  } catch {
    // continue
  }

  const fencedMatch = trimmed.match(/```json\s*([\s\S]*?)```/i) || trimmed.match(/```\s*([\s\S]*?)```/i);
  if (fencedMatch?.[1]) {
    try {
      return JSON.parse(fencedMatch[1].trim());
    } catch {
      // continue
    }
  }

  const start = trimmed.indexOf('{');
  const end = trimmed.lastIndexOf('}');
  if (start !== -1 && end > start) {
    try {
      return JSON.parse(trimmed.slice(start, end + 1));
    } catch {
      return null;
    }
  }

  return null;
};

const recommendEvents = async (req, res) => {
  try {
    const prompt = String(req.body?.prompt || '').trim();
    if (!prompt) {
      return res.status(400).json({ message: 'Prompt is required.' });
    }

    const groqApiKey = process.env.GROQ_API_KEY;
    if (!groqApiKey) {
      return res.status(503).json({ message: 'AI recommendations are not configured yet.' });
    }

    const model = process.env.GROQ_MODEL || 'llama-3.3-70b-versatile';
    const events = await fetchUtsavEvents();
    const candidateEvents = selectCandidateEvents(events, prompt);
    const compactEvents = candidateEvents.map(toCompactEvent);

    const response = await fetch(GROQ_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${groqApiKey}`,
      },
      body: JSON.stringify({
        model,
        temperature: 0.2,
        max_tokens: 500,
        messages: [
          {
            role: 'system',
            content:
              'You are an event recommendation engine. Return only strict JSON with shape {"recommendations":[{"id":"event-id","score":0-1,"reason":"short reason"}]}. Pick up to 8 highly relevant events from provided list. Prefer registration_open=true.',
          },
          {
            role: 'user',
            content: JSON.stringify({
              user_prompt: prompt,
              events: compactEvents,
            }),
          },
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Groq API error:', response.status, errorText);
      return res.status(502).json({
        message: response.status === 413 || response.status === 429
          ? 'AI is temporarily rate-limited. Please try again in a few seconds.'
          : 'Failed to fetch AI recommendations.',
      });
    }

    const payload = await response.json();
    const content = payload?.choices?.[0]?.message?.content || '';
    const parsed = extractJsonPayload(content);
    const rows = Array.isArray(parsed?.recommendations) ? parsed.recommendations : [];

    const byId = new Map(events.map((event) => [String(event.id), event]));
    const recommendations = rows
      .map((row) => {
        const event = byId.get(String(row.id));
        if (!event) return null;
        return {
          ...event,
          ai_score: Number(row.score) || 0,
          ai_reason: row.reason || 'Matches your preference.',
        };
      })
      .filter(Boolean)
      .slice(0, 8);

    return res.status(200).json({ recommendations });
  } catch (error) {
    console.error('AI recommendation error:', error);
    return res.status(500).json({ message: 'Failed to generate recommendations.' });
  }
};

module.exports = { recommendEvents };
