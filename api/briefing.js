import { list } from '@vercel/blob';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    const { blobs } = await list({ prefix: 'clarity-briefing', limit: 1 });

    if (!blobs || blobs.length === 0) {
      return res.status(404).json({ error: 'No briefing yet. Tap refresh to generate one.' });
    }

    const response = await fetch(blobs[0].url);
    const data = await response.json();
    return res.status(200).json(data);
  } catch (e) {
    return res.status(500).json({ error: 'Failed to read briefing: ' + e.message });
  }
}
