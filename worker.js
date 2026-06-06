// PaintPro AI Proxy — Cloudflare Worker
// Deploy this at dash.cloudflare.com → Workers & Pages → Create Worker
// Paste this entire file, click Deploy. Copy the *.workers.dev URL into
// the app's Settings tab → Proxy URL field.

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

const MODEL = 'claude-sonnet-4-6';

const INTERIOR_PROMPT = `You are a painting estimator. Analyze this interior room photo and estimate dimensions in feet.
Respond with ONLY valid JSON — no explanation, no markdown:
{"walls":[w1,w2,w3,w4],"height":h,"floorLength":l,"floorWidth":w,"doors":d,"windows":win,"surfaceNotes":""}
Scale anchors: a standard interior door is 6.8 ft tall and 2.8 ft wide; a light switch plate is 4.5 inches tall; a standard outlet is 1.3 inches wide; counter height is 3 ft; standard ceiling height is 8-9 ft.
- walls: estimate each of the 4 wall widths in feet using the scale anchors above
- height: ceiling height in feet
- floorLength: longer floor dimension in feet
- floorWidth: shorter floor dimension in feet
- doors: number of doors visible
- windows: number of windows visible
- surfaceNotes: brief note on any surface issues visible (peeling paint, water stains, cracks, holes, texture damage) — empty string if surfaces look fine`;

export default {
  async fetch(request) {
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: CORS });
    }

    if (request.method === 'GET') {
      return new Response('PaintPro AI Proxy is running ✓', {
        status: 200,
        headers: { ...CORS, 'Content-Type': 'text/plain' },
      });
    }

    if (request.method !== 'POST') {
      return new Response('Method not allowed', { status: 405, headers: CORS });
    }

    let body;
    try { body = await request.json(); } catch {
      return new Response(JSON.stringify({ error: { message: 'Invalid JSON body' } }),
        { status: 400, headers: { ...CORS, 'Content-Type': 'application/json' } });
    }

    const { apiKey, base64, messages, model, max_tokens, testOnly } = body;

    if (!apiKey) {
      return new Response(JSON.stringify({ error: { message: 'Missing API key' } }),
        { status: 400, headers: { ...CORS, 'Content-Type': 'application/json' } });
    }

    // Quick key-test ping
    if (testOnly) {
      const r = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'x-api-key': apiKey, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
        body: JSON.stringify({ model: MODEL, max_tokens: 5, messages: [{ role: 'user', content: 'Hi' }] }),
      });
      const d = await r.json();
      return new Response(JSON.stringify(d), { status: r.status, headers: { ...CORS, 'Content-Type': 'application/json' } });
    }

    // Passthrough mode: app sends complete messages array (used for video frames and bid writer)
    if (messages) {
      const r = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'x-api-key': apiKey, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
        body: JSON.stringify({ model: model || MODEL, max_tokens: max_tokens || 1024, messages }),
      });
      const d = await r.json();
      return new Response(JSON.stringify(d), { status: r.status, headers: { ...CORS, 'Content-Type': 'application/json' } });
    }

    // Legacy single-image mode (base64)
    if (!base64) {
      return new Response(JSON.stringify({ error: { message: 'Missing image data or messages' } }),
        { status: 400, headers: { ...CORS, 'Content-Type': 'application/json' } });
    }

    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'x-api-key': apiKey, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 1024,
        messages: [{
          role: 'user',
          content: [
            { type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: base64 } },
            { type: 'text', text: INTERIOR_PROMPT },
          ]
        }]
      }),
    });

    const d = await r.json();
    return new Response(JSON.stringify(d), { status: r.status, headers: { ...CORS, 'Content-Type': 'application/json' } });
  }
};
