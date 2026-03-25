import { put, list } from '@vercel/blob';

const ANTHROPIC_API = 'https://api.anthropic.com/v1/messages';
const HAIKU = 'claude-haiku-4-5-20251001';
const SONNET = 'claude-sonnet-4-20250514';

const CATS = {
  world: { label: 'World', q: 'international geopolitics diplomacy conflict US and global politics policy legislation' },
  business: { label: 'Business', q: 'business corporate markets finance deals' },
  energy: { label: 'Energy', q: 'energy oil gas OPEC commodities renewables' },
  tech: { label: 'Tech', q: 'technology AI big tech startups regulation' },
};

const STORY_SYS = `You are an intelligence briefing service. Your job is to present what is true, what is connected, what is unresolved, and what would resolve it. You have no opinion. You have no editorial voice.

Return exactly 1 story as a JSON array with one object. Include all four layers.

Set "stage" to "breaking".

LAYER 1 — FACTS ("facts" field): Array of 5-8 undeniable, verifiable facts.
LAYER 2 — THE FULL STORY ("story" field): 4-5 substantial paragraphs. No editorializing.
LAYER 3 — OPEN QUESTIONS ("questions" field): Array of 2-3 genuinely unresolved questions. Each: {"question": "...", "why": "..."}
LAYER 4 — SIGNALS ("resolution" field): Array of 2-4 observable indicators. Each: {"indicator": "...", "meaning": "..."}

RULES:
- No citation markup, cite tags, or reference annotations. Clean plain text only.
- Return ONLY a valid JSON array with one object. No markdown. No backticks.

[{"hl":"...","sum":"...","sev":"critical|significant|notable|routine","fq":"verified|likely|developing|contested","stage":"breaking","src":"...","facts":[],"story":"...","questions":[],"resolution":[]}]`;

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

async function loadExisting() {
  try {
    const { blobs } = await list({ prefix: 'clarity-briefing', limit: 1 });
    if (blobs && blobs.length > 0) {
      const res = await fetch(blobs[0].url);
      return await res.json();
    }
  } catch {}
  return { fetchedAt: null, date: null, categories: {} };
}

async function saveBriefing(data) {
  await put('clarity-briefing.json', JSON.stringify(data), {
    access: 'public',
    addRandomSuffix: false,
    allowOverwrite: true,
    contentType: 'application/json',
  });
}

export default async function handler(req, res) {
  // Only allow cron or auth key
  if (!req.headers['x-vercel-cron'] && req.query.key !== 'clarity2026') {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'No API key configured' });

  const today = new Date().toISOString().split('T')[0];
  const existing = await loadExisting();
  const results = [];

  // Cap: max 10 hourly-added breaking stories per day total
  const breakingToday = (existing.categories?.breaking?.stories || [])
    .filter(s => s.addedAt && s.addedAt.startsWith(today)).length;
  if (breakingToday >= 10) {
    return res.status(200).json({ success: true, skipped: 'daily breaking cap reached (10/day)', results: [] });
  }

  for (const [catId, cat] of Object.entries(CATS)) {
    const currentStories = existing.categories?.[catId]?.stories || [];
    const currentHeadlines = currentStories.map(s => s.hl).join(' | ');

    if (!currentHeadlines) {
      results.push({ cat: catId, skipped: 'no existing stories' });
      continue;
    }

    // Step 1: Haiku checks if there's breaking news more important than current stories
    try {
      const checkRes = await fetch(ANTHROPIC_API, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: HAIKU, max_tokens: 500,
          messages: [{ role: 'user', content: `Search the web for any major ${cat.label.toLowerCase()} news that broke in the last 2 hours. Today is ${today}.

Current stories in the briefing:
${currentHeadlines}

Is there a breaking story that is MORE important than any of the current stories listed above? This must be genuinely major — a significant event, not routine news.

Respond with ONLY valid JSON, no other text:
{"breaking": true, "headline": "Brief headline of breaking story", "category": "${catId}"} 
OR
{"breaking": false}` }],
          tools: [{ type: 'web_search_20250305', name: 'web_search' }],
        }),
      });

      if (!checkRes.ok) {
        results.push({ cat: catId, error: `Haiku check failed: ${checkRes.status}` });
        continue;
      }

      const checkData = await checkRes.json();
      const checkTxt = (checkData.content || []).filter(b => b.type === 'text').map(b => b.text).join('');
      
      let check;
      try {
        const jsonMatch = checkTxt.match(/\{[\s\S]*\}/);
        check = jsonMatch ? JSON.parse(jsonMatch[0]) : null;
      } catch { check = null; }

      if (!check || !check.breaking) {
        results.push({ cat: catId, breaking: false });
        continue;
      }

      // Step 2: Sonnet writes the full story
      const storyRes = await fetch(ANTHROPIC_API, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: SONNET, max_tokens: 8000, system: STORY_SYS,
          messages: [{ role: 'user', content: `Write a full briefing on this breaking ${cat.label.toLowerCase()} story: "${check.headline}". Today: ${today}. Search the web for details. Return the JSON array.` }],
          tools: [{ type: 'web_search_20250305', name: 'web_search' }],
        }),
      });

      if (!storyRes.ok) {
        results.push({ cat: catId, error: `Sonnet story failed: ${storyRes.status}` });
        continue;
      }

      const storyData = await storyRes.json();
      const storyTxt = (storyData.content || []).filter(b => b.type === 'text').map(b => b.text).join('\n');
      const newStories = extractJSON(storyTxt);

      if (!Array.isArray(newStories) || newStories.length === 0) {
        results.push({ cat: catId, error: 'Failed to parse breaking story' });
        continue;
      }

      // Add timestamp and prepend to breaking category
      const now = new Date().toISOString();
      newStories[0].addedAt = now;
      newStories[0].stage = 'breaking';

      const breakingStories = existing.categories?.breaking?.stories || [];
      existing.categories.breaking = { id: 'breaking', stories: [newStories[0], ...breakingStories] };
      existing.fetchedAt = now;

      results.push({ cat: catId, breaking: true, headline: check.headline });

    } catch (e) {
      results.push({ cat: catId, error: e.message });
    }
  }

  // Always update fetchedAt so the app shows the scan ran, save regardless
  const hasBreaking = results.some(r => r.breaking);
  existing.fetchedAt = new Date().toISOString();
  await saveBriefing(existing);

  return res.status(200).json({ success: true, hasBreaking, results });
}
