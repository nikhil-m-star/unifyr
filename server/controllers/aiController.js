const { fetchUtsavEvents } = require('../services/utsavService');

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
const MAX_AI_EVENTS = 36;
const STOPWORDS = new Set([
  'the', 'and', 'for', 'with', 'from', 'that', 'this', 'want', 'looking', 'need', 'open',
  'events', 'event', 'show', 'find', 'best', 'good', 'nice', 'like', 'campus',
]);
const TOKEN_ALIASES = {
  ai: ['ai', 'ml', 'machine', 'learning', 'genai', 'llm', 'neural'],
  ml: ['ai', 'ml', 'machine', 'learning', 'genai', 'llm', 'neural'],
  coding: ['coding', 'code', 'developer', 'programming', 'hack', 'hackathon', 'tech', 'software'],
  programing: ['coding', 'code', 'developer', 'programming', 'hack', 'hackathon', 'tech', 'software'],
  music: ['music', 'band', 'dj', 'singing', 'concert', 'battle'],
  dance: ['dance', 'choreo', 'choreography', 'crew'],
  startup: ['startup', 'entrepreneur', 'pitch', 'business', 'innovation'],
  gaming: ['gaming', 'game', 'esports', 'bgmi', 'valorant', 'fifa'],
  design: ['design', 'ui', 'ux', 'creative', 'poster', 'art'],
  workshop: ['workshop', 'hands', 'practical', 'bootcamp'],
  beginner: ['beginner', 'intro', 'basic', 'foundation'],
};

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

const promptTokens = (prompt = '') =>
  normalize(prompt)
    .split(' ')
    .filter((token) => token.length > 2 && !STOPWORDS.has(token));

const expandPromptTokens = (tokens) => {
  const expanded = new Set(tokens);
  tokens.forEach((token) => {
    const aliases = TOKEN_ALIASES[token] || [];
    aliases.forEach((alias) => expanded.add(alias));
  });
  return [...expanded];
};

const tokenHits = (text, tokens) => {
  if (!text || !tokens.length) return 0;
  return tokens.reduce((hits, token) => (text.includes(token) ? hits + 1 : hits), 0);
};

const lexicalScore = (event, tokens) => {
  if (!tokens.length) return event.registration_open ? 0.3 : 0.1;

  const title = normalize(event.title);
  const category = normalize(event.category);
  const venue = normalize(event.venue);
  const description = normalize(event.description);

  const titleHits = tokenHits(title, tokens);
  const categoryHits = tokenHits(category, tokens);
  const venueHits = tokenHits(venue, tokens);
  const descriptionHits = tokenHits(description, tokens);

  const weightedHits = (titleHits * 3) + (categoryHits * 2.2) + (venueHits * 1.2) + descriptionHits;
  const normalizedScore = weightedHits / (tokens.length * 3.6);
  const registrationBoost = event.registration_open ? 0.12 : 0;
  return Math.min(1, normalizedScore + registrationBoost);
};

const scoreEventForPrompt = (event, tokens) => {
  return lexicalScore(event, tokens);
};

const selectCandidateEvents = (events, prompt) => {
  const tokens = expandPromptTokens(promptTokens(prompt));

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
    const expandedTokens = expandPromptTokens(promptTokens(prompt));
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
              'You are an event recommendation engine. Return only strict JSON with shape {"recommendations":[{"id":"event-id","score":0-1,"reason":"short reason"}]}. Pick up to 8 highly relevant events from provided list. Strongly prioritize semantic relevance to the user prompt and explicit keyword overlap. Prefer registration_open=true as a tie-breaker only.',
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
        const aiScore = Number(row.score) || 0;
        const relevance = lexicalScore(event, expandedTokens);
        const combinedScore = Math.min(1, (aiScore * 0.68) + (relevance * 0.32));
        return {
          ...event,
          ai_score: combinedScore,
          ai_reason: row.reason || 'Matches your preference.',
        };
      })
      .filter(Boolean)
      .sort((a, b) => (b.ai_score || 0) - (a.ai_score || 0))
      .slice(0, 8);

    return res.status(200).json({ recommendations });
  } catch (error) {
    console.error('AI recommendation error:', error);
    return res.status(500).json({ message: 'Failed to generate recommendations.' });
  }
};

module.exports = { recommendEvents };
