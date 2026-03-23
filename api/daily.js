import { put, list } from '@vercel/blob';

const ANTHROPIC_API = 'https://api.anthropic.com/v1/messages';
const SONNET = 'claude-sonnet-4-20250514';

const CATS = [
  { id: 'world', label: 'World', q: 'international geopolitics diplomacy conflict' },
  { id: 'politics', label: 'Politics', q: 'US and global politics policy election legislation' },
  { id: 'business', label: 'Business', q: 'business corporate markets finance deals' },
  { id: 'energy', label: 'Energy', q: 'energy oil gas OPEC commodities renewables' },
  { id: 'tech', label: 'Tech', q: 'technology AI big tech startups regulation' },
];

const SYS = `You are an intelligence briefing service. Your job is to present what is true, what is connected, what is unresolved, and what would resolve it. You have no opinion. You have no editorial voice. You simply present the complete picture and let the reader decide.

Return 5 stories as a JSON array with four layers.

STORY SELECTION: Choose the 5 stories in this category that informed professionals need to know right now. These are the stories shaping decisions in boardrooms, trading floors, and policy meetings this week. Some may be dominating headlines — include these because you provide the full picture others don't. Others may be developing below the surface but are likely to become major stories soon — include these because knowing them early is an edge. The test: if a well-connected person walked into a room and hadn't heard about these, they'd be behind.

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

export default async function handler(req, res) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'No API key configured' });

  const today = new Date().toISOString().split('T')[0];
  const now = new Date().toISOString();
  const briefing = { fetchedAt: now, date: today, categories: {} };
  const results = [];

  for (const cat of CATS) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 150000);

      let apiRes;
      try {
        apiRes = await fetch(ANTHROPIC_API, {
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
          signal: controller.signal,
        });
      } finally {
        clearTimeout(timeout);
      }

      if (!apiRes.ok) {
        const err = await apiRes.text().catch(() => '');
        results.push({ cat: cat.id, error: `API ${apiRes.status}` });
        continue;
      }

      const data = await apiRes.json();
      const txt = (data.content || []).filter(b => b.type === 'text').map(b => b.text).join('\n');
      const stories = extractJSON(txt);

      if (!Array.isArray(stories)) {
        results.push({ cat: cat.id, error: 'Failed to parse' });
        continue;
      }

      stories.forEach(s => { s.addedAt = now; });
      briefing.categories[cat.id] = { id: cat.id, stories };

      // Save incrementally after each successful category
      await put('clarity-briefing.json', JSON.stringify(briefing), {
        access: 'public',
        addRandomSuffix: false,
        allowOverwrite: true,
        contentType: 'application/json',
      });

      results.push({ cat: cat.id, stories: stories.length });

    } catch (e) {
      results.push({ cat: cat.id, error: e.name === 'AbortError' ? 'Timed out (150s)' : e.message });
    }
  }

  return res.status(200).json({ success: true, results });
}
