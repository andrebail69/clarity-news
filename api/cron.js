import { put, list } from '@vercel/blob';

const ANTHROPIC_API = 'https://api.anthropic.com/v1/messages';
const SONNET = 'claude-sonnet-4-20250514';

const CATS = {
  world: { label: 'World', q: 'international geopolitics diplomacy conflict' },
  politics: { label: 'Politics', q: 'US and global politics policy election legislation' },
  business: { label: 'Business', q: 'business corporate markets finance deals' },
  energy: { label: 'Energy', q: 'energy oil gas OPEC commodities renewables' },
  tech: { label: 'Tech', q: 'technology AI big tech startups regulation' },
};

const SYS = `You are an intelligence briefing service. Your job is to present what is true, what is connected, what is unresolved, and what would resolve it. You have no opinion. You have no editorial voice. You simply present the complete picture and let the reader decide.

Return 5 stories as a JSON array with four layers.

STORY SELECTION: Choose the 5 stories in this category that informed professionals need to know right now. These are the stories shaping decisions in boardrooms, trading floors, and policy meetings this week.

RECENCY RULE: At least 3 of the 5 stories must have had a significant new development in the last 24 hours — a decision announced, data released, event occurred, or situation materially changed. The other 1-2 may be critical ongoing stories where the context and stakes are essential background, even if the latest development was 2-3 days ago. Do not include stories where nothing meaningful has happened in the past week.

Some stories may be dominating headlines — include these because you provide the full picture others don't. Others may be developing below the surface but are likely to become major stories soon — include these because knowing them early is an edge. The test: if a well-connected person walked into a room and hadn't heard about these, they'd be behind.

For each story, set the "stage" field to either "front page" (dominating informed conversation now) or "developing" (material story building momentum that will break soon).

LAYER 1 — FACTS ("facts" field): Array of 5-8 undeniable, verifiable facts. No interpretation, no framing, no adjectives. Dates, numbers, named actions, confirmed events only.

LAYER 2 — THE FULL STORY ("story" field): 4-5 substantial paragraphs connecting the facts into the complete picture. Write for a smart, curious reader who wants depth. Cover what happened, why, and the structural forces and interdependencies at play. Do NOT editorialize. Do NOT comment on media coverage. Just tell the full story. Write as continuous text with paragraph breaks as double newlines.

LAYER 3 — OPEN QUESTIONS ("questions" field): Array of 2-3 genuinely unresolved questions. Each is an object:
- "question": The question stated plainly
- "why": One substantial paragraph on why this is unresolved. Present the range of honest answers.

LAYER 4 — SIGNALS ("resolution" field): Array of 2-4 specific, observable indicators. Each is an object:
- "indicator": A specific event, data release, decision to watch for
- "meaning": 2-3 sentences on what it would tell you.

RULES:
- No editorializing. No opinion. No bias. Present facts and connections.
- Do NOT include any citation markup, cite tags, or reference annotations. Clean plain text only.
- The story field must be genuinely thorough — 4-5 real paragraphs.
- Return ONLY a valid JSON array. No markdown. No backticks. No preamble.

[
  {
    "hl": "Precise factual headline",
    "sum": "2 sentence summary",
    "sev": "critical|significant|notable|routine",
    "fq": "verified|likely|developing|contested|editorial",
    "stage": "front page|developing",
    "src": "Source outlets comma separated",
    "facts": ["Fact 1", "Fact 2"],
    "story": "Paragraph 1\\n\\nParagraph 2\\n\\nParagraph 3\\n\\nParagraph 4",
    "questions": [
      {"question": "The question", "why": "Why it's unresolved"}
    ],
    "resolution": [
      {"indicator": "Thing to watch", "meaning": "What it tells you"}
    ]
  }
]`;

function extractJSON(text) {
  if (!text || !text.trim()) return null;
  let clean = text.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
  const arr = clean.match(/\[[\s\S]*\]/);
  if (arr) {
    try { return JSON.parse(arr[0]); } catch {}
    try {
      let s = arr[0].replace(/,\s*"[^"]*"?\s*:?\s*"?[^"]*$/, '').replace(/,\s*$/, '');
      const ob = (s.match(/{/g)||[]).length, cb = (s.match(/}/g)||[]).length;
      const osb = (s.match(/\[/g)||[]).length, csb = (s.match(/\]/g)||[]).length;
      for (let i = 0; i < ob - cb; i++) s += '}';
      for (let i = 0; i < osb - csb; i++) s += ']';
      return JSON.parse(s);
    } catch {}
  }
  return null;
}

export async function loadExisting() {
  try {
    const { blobs } = await list({ prefix: 'clarity-briefing', limit: 1 });
    if (blobs && blobs.length > 0) {
      const res = await fetch(blobs[0].url);
      return await res.json();
    }
  } catch {}
  return { fetchedAt: null, date: null, categories: {} };
}

export async function saveBriefing(data) {
  await put('clarity-briefing.json', JSON.stringify(data), {
    access: 'public',
    addRandomSuffix: false,
    allowOverwrite: true,
    contentType: 'application/json',
  });
}

export { extractJSON, ANTHROPIC_API, SONNET, CATS };

export default async function handler(req, res) {
  const key = req.query.key;
  if (key !== 'clarity2026' && !req.headers['x-vercel-cron']) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const catId = req.query.cat;
  if (!catId || !CATS[catId]) {
    return res.status(400).json({ error: 'Missing or invalid ?cat= parameter' });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'No API key configured' });

  const cat = CATS[catId];
  const today = new Date().toISOString().split('T')[0];

  try {
    const apiRes = await fetch(ANTHROPIC_API, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: SONNET, max_tokens: 16000, system: SYS,
        messages: [{ role: 'user', content: `The 5 ${cat.label.toLowerCase()} stories that informed professionals need to know right now. Focus: ${cat.q}. Today: ${today}. Search the web for current stories. Return the JSON array with all fields filled in thoroughly.` }],
        tools: [{ type: 'web_search_20250305', name: 'web_search' }],
      }),
    });

    if (!apiRes.ok) {
      const err = await apiRes.text().catch(() => '');
      return res.status(apiRes.status).json({ error: `API ${apiRes.status}: ${err.slice(0, 200)}` });
    }

    const data = await apiRes.json();
    const txt = (data.content || []).filter(b => b.type === 'text').map(b => b.text).join('\n');
    const stories = extractJSON(txt);

    if (!Array.isArray(stories)) {
      return res.status(500).json({ error: 'Failed to parse stories' });
    }

    const now = new Date().toISOString();
    stories.forEach(s => { s.addedAt = now; });

    const existing = await loadExisting();
    existing.categories[catId] = { id: catId, stories };
    existing.fetchedAt = now;
    existing.date = today;

    await saveBriefing(existing);

    return res.status(200).json({ success: true, category: catId, stories: stories.length });

  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
