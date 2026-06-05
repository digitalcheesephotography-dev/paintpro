// PaintPro AI Proxy — Cloudflare Worker
// Deploy this at dash.cloudflare.com → Workers & Pages → Create Worker
// Paste this entire file, click Deploy. Copy the *.workers.dev URL into
// the app's Settings tab → Proxy URL field.

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

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

    const { apiKey, base64, testOnly } = body;

    if (!apiKey) {
      return new Response(JSON.stringify({ error: { message: 'Missing API key' } }),
        { status: 400, headers: { ...CORS, 'Content-Type': 'application/json' } });
    }

    // Quick key-test ping (no image needed)
    if (testOnly) {
      const r = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'x-api-key': apiKey, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
        body: JSON.stringify({ model: 'claude-haiku-4-5-20251001', max_tokens: 5, messages: [{ role: 'user', content: 'Hi' }] }),
      });
      const d = await r.json();
      return new Response(JSON.stringify(d), { status: r.status, headers: { ...CORS, 'Content-Type': 'application/json' } });
    }

    if (!base64) {
      return new Response(JSON.stringify({ error: { message: 'Missing image data' } }),
        { status: 400, headers: { ...CORS, 'Content-Type': 'application/json' } });
    }

    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'x-api-key': apiKey, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 512,
        messages: [{
          role: 'user',
          content: [
            { type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: base64 } },
            { type: 'text', text: `You are a painting estimator. Analyze this room photo and estimate dimensions in feet.
Respond with ONLY valid JSON — no explanation, no markdown:
{"walls":[w1,w2,w3,w4],"height":h,"floorLength":l,"floorWidth":w,"doors":d,"windows":win}
- walls: array of 4 wall widths in feet (best estimates, include all 4)
- height: ceiling height in feet
- floorLength: longer floor dimension in feet
- floorWidth: shorter floor dimension in feet
- doors: number of doors visible
- windows: number of windows visible
Use typical residential proportions if unsure.` }
          ]
        }]
      }),
    });

    const d = await r.json();
    return new Response(JSON.stringify(d), { status: r.status, headers: { ...CORS, 'Content-Type': 'application/json' } });
  }
};
