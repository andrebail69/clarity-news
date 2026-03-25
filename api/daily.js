import { put, list } from '@vercel/blob';

const ANTHROPIC_API = 'https://api.anthropic.com/v1/messages';
const SONNET = 'claude-sonnet-4-20250514';

const CATS = [
  { id: 'breaking', label: 'Breaking', isBreaking: true },
  { id: 'world', label: 'World', q: 'international geopolitics diplomacy conflict US and global politics policy legislation' },
  { id: 'business', label: 'Business', q: 'business corporate markets finance deals' },
  { id: 'energy', label: 'Energy', q: 'energy oil gas OPEC commodities renewables' },
  { id: 'tech', label: 'Tech', q: 'technology AI big tech startups regulation' },
];

const SYS = `You are an intelligence briefing service. Your job is to present what is true, what is connected, what is unresolved, and what would resolve it. You have no opinion. You have no editorial voice. You simply present the complete picture and let the reader decide.

Return 5 stories as a JSON array with four layers.

STORY SELECTION: Choose the 5 stories in this category that informed professionals need to know right now. These are the stories shaping decisions in boardrooms, trading floors, and policy meetings this week.

RECENCY RULE: At least 3 of the 5 stories must have had a significant new development in the last 24 hours — a decision announced, data released, event occurred, or situation materially changed. The other 1-2 may be critical ongoing stories where the context and stakes are essential background, even if the latest development was 2-3 days ago. Do not include stories where nothing meaningful has happened in the past week.

Some stories may be dominating headlines — include these because you provide the full picture others don't. Others may be developing below the surface but are likely to become major stories soon — include these because knowing them early is an edge. The test: if a well-connected person walked into a room and hadn't heard about these, they'd be behind.

When searching for stories, search in multiple languages including English, Hebrew, Arabic, Farsi, Mandarin, Russian, French, and German. Synthesize perspectives and facts from non-English sources that add dimensions not visible in English-language coverage. Cite the original source language and outlet in the src field. The output must be in English but the inputs should be genuinely global.

Go beyond mainstream news aggregation. Search for and incorporate: government filings and regulatory documents (SEC, OPEC technical reports, central bank minutes, congressional testimony), think tank analysis (RAND, Brookings, CFR, IISS, Chatham House), academic research and working papers, industry-specific trade publications, earnings call transcripts and investor presentations, court filings and legal documents, patent filings where relevant, and podcast transcripts or interviews where experts have made specific claims or provided analysis not available in written reporting. When sourcing from podcasts, interviews, or think tank briefings, note the specific source and date. Primary documents are preferred over journalist interpretations of those documents.

For each story, set the "stage" field to either "front page" (dominating informed conversation now) or "developing" (material story building momentum that will break soon).

LAYER 1 — FACTS ("facts" field): Array of 5-8 undeniable, verifiable facts. No interpretation, no framing, no adjectives. Dates, numbers, named actions, confirmed events only.

LAYER 2 — THE FULL STORY ("story" field): 4-5 substantial paragraphs connecting the facts into the complete picture. Write for a smart, curious reader who wants depth. Cover what happened, why, and the structural forces and interdependencies at play. Do NOT editorialize. Do NOT comment on media coverage. Just tell the full story. Write as continuous text with paragraph breaks as double newlines.

LAYER 3 — OPEN QUESTIONS ("questions" field): Array of 2-3 genuinely unresolved questions. Each is an object:
- "question": The question stated plainly
- "why": One substantial paragraph on why this is unresolved. Present the range of honest answers.

LAYER 4 — SIGNALS ("resolution" field): Array of 2-4 specific, observable signals. Each is an object:
- "watch": What specifically to watch for — a specific event, data release, decision, or outcome. One clear sentence.
- "if_yes": What it means if this happens or trends in one direction. 2-3 sentences explaining the implications and what it would confirm or undermine.
- "if_no": What it means if it doesn't happen or trends the other direction. 2-3 sentences explaining the alternative implications.

RULES:
- No editorializing. No opinion. No bias. Present facts and connections.
- Do NOT include any citation markup, cite tags, or reference annotations. Clean plain text only.
- The story field must be genuinely thorough — 4-5 real paragraphs.
- Return ONLY a valid JSON array. No markdown. No backticks. No preamble.
- When non-English sources provide facts or perspectives not available in English-language coverage, explicitly note the source and language in the story narrative (e.g. "According to reporting in Haaretz..." or "Iranian state media IRNA reported..."). This signals to the reader that the analysis draws from a wider information base than typical English-language aggregation.

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
      {"watch": "Specific thing to watch", "if_yes": "2-3 sentences on what this outcome would mean", "if_no": "2-3 sentences on what the alternative outcome would mean"}
    ]
  }
]`;

const BREAKING_SYS = `You are an intelligence briefing service. Your job is to present what is true, what is connected, what is unresolved, and what would resolve it. You have no opinion. You have no editorial voice. You simply present the complete picture and let the reader decide.

Return 5 stories as a JSON array with four layers.

STORY SELECTION: These are the 5 most significant breaking or urgent news stories happening RIGHT NOW, spanning any topic — geopolitics, international events, US and global politics, business, markets, energy, technology. Every story must have had a major development in the last 24 hours. Set "stage" to "breaking" for ALL stories.

LAYER 1 — FACTS ("facts" field): Array of 5-8 undeniable, verifiable facts. No interpretation, no framing, no adjectives. Dates, numbers, named actions, confirmed events only.

LAYER 2 — THE FULL STORY ("story" field): 4-5 substantial paragraphs connecting the facts into the complete picture. Write for a smart, curious reader who wants depth. Do NOT editorialize. Write as continuous text with paragraph breaks as double newlines.

LAYER 3 — OPEN QUESTIONS ("questions" field): Array of 2-3 genuinely unresolved questions. Each is an object:
- "question": The question stated plainly
- "why": One substantial paragraph on why this is unresolved.

LAYER 4 — SIGNALS ("resolution" field): Array of 2-4 specific, observable signals. Each is an object:
- "watch": What specifically to watch for — a specific event, data release, decision, or outcome. One clear sentence.
- "if_yes": What it means if this happens or trends in one direction. 2-3 sentences explaining the implications and what it would confirm or undermine.
- "if_no": What it means if it doesn't happen or trends the other direction. 2-3 sentences explaining the alternative implications.

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
    "stage": "breaking",
    "src": "Source outlets comma separated",
    "facts": ["Fact 1", "Fact 2"],
    "story": "Paragraph 1\\n\\nParagraph 2\\n\\nParagraph 3\\n\\nParagraph 4",
    "questions": [
      {"question": "The question", "why": "Why it's unresolved"}
    ],
    "resolution": [
      {"watch": "Specific thing to watch", "if_yes": "2-3 sentences on what this outcome would mean", "if_no": "2-3 sentences on what the alternative outcome would mean"}
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
  if (!req.headers['x-vercel-cron'] && req.query.key !== 'clarity2026') {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'No API key configured' });

  const today = new Date().toISOString().split('T')[0];
  const now = new Date().toISOString();
  const briefing = { fetchedAt: now, date: today, categories: {} };
  const results = [];
  const usedHeadlines = [];

  console.log(`[daily] Starting full refresh for ${today}`);

  for (const cat of CATS) {
    console.log(`[daily] Fetching category: ${cat.id}`);
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 120000);

      const noOverlap = (!cat.isBreaking && usedHeadlines.length > 0)
        ? `\n\nALREADY COVERED IN OTHER CATEGORIES — do not duplicate these stories: ${usedHeadlines.join(' | ')}`
        : '';

      const userMsg = cat.isBreaking
        ? `The 5 most significant breaking news stories happening right now across all topics. Today: ${today}. Search the web for the latest. Return the JSON array with all fields filled in thoroughly.`
        : `The 5 ${cat.label.toLowerCase()} stories that informed professionals need to know right now. Focus: ${cat.q}. Today: ${today}. Search the web for current stories. Return the JSON array with all fields filled in thoroughly.${noOverlap}`;

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
            model: SONNET, max_tokens: 16000, system: cat.isBreaking ? BREAKING_SYS : SYS,
            messages: [{ role: 'user', content: userMsg }],
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

      stories.forEach(s => { s.addedAt = now; if (cat.isBreaking) s.stage = 'breaking'; });
      briefing.categories[cat.id] = { id: cat.id, stories };
      if (!cat.isBreaking) stories.forEach(s => { if (s.hl) usedHeadlines.push(s.hl); });

      // Save incrementally after each successful category
      await put('clarity-briefing.json', JSON.stringify(briefing), {
        access: 'public',
        addRandomSuffix: false,
        allowOverwrite: true,
        contentType: 'application/json',
      });

      console.log(`[daily] ✓ ${cat.id}: ${stories.length} stories saved`);
      results.push({ cat: cat.id, stories: stories.length });

    } catch (e) {
      const err = e.name === 'AbortError' ? 'Timed out (120s)' : e.message;
      console.log(`[daily] ✗ ${cat.id}: ${err}`);
      results.push({ cat: cat.id, error: err });
    }
  }

  console.log(`[daily] Done. Results: ${JSON.stringify(results)}`);
  return res.status(200).json({ success: true, results });
}
