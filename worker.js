// PaintPro AI Proxy — Cloudflare Worker (deployed via GitHub Actions)
// Deploy this at dash.cloudflare.com → Workers & Pages → Create Worker
// Paste this entire file, click Deploy. Copy the *.workers.dev URL into
// the app's Settings tab → Proxy URL field.

const ALLOWED_ORIGINS = [
  'https://lovely-kitsune-6c5c82.netlify.app',
  'https://digitalcheesephotography-dev.github.io',
];

function corsHeaders(request) {
  const origin = request.headers.get('Origin') || '';
  const allow  = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    'Access-Control-Allow-Origin':  allow,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };
}

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
  async fetch(request, env) {
    const cors = corsHeaders(request);

    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: cors });
    }

    if (request.method === 'GET') {
      return new Response('PaintPro AI Proxy is running ✓', {
        status: 200,
        headers: { ...cors, 'Content-Type': 'text/plain' },
      });
    }

    if (request.method !== 'POST') {
      return new Response('Method not allowed', { status: 405, headers: cors });
    }

    let body;
    try { body = await request.json(); } catch {
      return new Response(JSON.stringify({ error: { message: 'Invalid JSON body' } }),
        { status: 400, headers: { ...cors, 'Content-Type': 'application/json' } });
    }

    const jsonOut = (obj, status = 200) => new Response(JSON.stringify(obj),
      { status, headers: { ...cors, 'Content-Type': 'application/json' } });

    // ── Stripe deposit collection ────────────────────────────────────────────
    // The Stripe SECRET key lives ONLY here, as a Cloudflare env var
    // (STRIPE_SECRET_KEY) — never in the app or on the client. Card data never
    // touches our code: we hand the client to Stripe's own hosted checkout page.
    if (body.stripe) {
      const key = (env && env.STRIPE_SECRET_KEY) || '';
      if (!key) return jsonOut({ error: { message: 'Payments not set up. Add STRIPE_SECRET_KEY to this Worker.' } }, 400);
      const stripeGet = (path) => fetch('https://api.stripe.com/v1/' + path, {
        headers: { 'Authorization': 'Bearer ' + key },
      });

      // Create a Checkout Session for a one-time deposit and return its URL.
      if (body.stripe === 'checkout') {
        const cents = Math.round(Number(body.amount) || 0);
        if (cents < 50) return jsonOut({ error: { message: 'Deposit amount too small.' } }, 400);
        const label   = String(body.label || 'Deposit').slice(0, 120);
        const propId  = String(body.proposalId || '').replace(/[^\w-]/g, '').slice(0, 80);
        const ret     = String(body.returnUrl || '');
        // Only accept a return URL on one of our known origins.
        if (!ALLOWED_ORIGINS.some(o => ret.startsWith(o))) {
          return jsonOut({ error: { message: 'Bad return URL' } }, 400);
        }
        const p = new URLSearchParams();
        p.append('mode', 'payment');
        p.append('success_url', ret + (ret.includes('?') ? '&' : '?') + 'paid={CHECKOUT_SESSION_ID}');
        p.append('cancel_url',  ret);
        p.append('line_items[0][price_data][currency]', 'usd');
        p.append('line_items[0][price_data][product_data][name]', label);
        p.append('line_items[0][price_data][unit_amount]', String(cents));
        p.append('line_items[0][quantity]', '1');
        p.append('payment_intent_data[description]', label);
        if (propId) p.append('metadata[proposalId]', propId);
        if (body.email && /.+@.+\..+/.test(body.email)) p.append('customer_email', String(body.email).slice(0, 120));
        const r = await fetch('https://api.stripe.com/v1/checkout/sessions', {
          method: 'POST',
          headers: { 'Authorization': 'Bearer ' + key, 'Content-Type': 'application/x-www-form-urlencoded' },
          body: p,
        });
        const d = await r.json();
        if (!r.ok) return jsonOut({ error: { message: (d.error && d.error.message) || 'Stripe error' } }, r.status);
        return jsonOut({ url: d.url, id: d.id });
      }

      // Verify a completed session so the confirmation shown to the client is
      // authoritative (checked against Stripe), not just a URL parameter.
      if (body.stripe === 'verify') {
        const sid = String(body.sessionId || '').replace(/[^\w-]/g, '').slice(0, 120);
        if (!sid) return jsonOut({ error: { message: 'Missing session id' } }, 400);
        const r = await stripeGet('checkout/sessions/' + sid);
        const d = await r.json();
        if (!r.ok) return jsonOut({ error: { message: (d.error && d.error.message) || 'Stripe error' } }, r.status);
        return jsonOut({ paid: d.payment_status === 'paid', amount: d.amount_total, currency: d.currency });
      }

      return jsonOut({ error: { message: 'Unknown stripe action' } }, 400);
    }

    const { apiKey, base64, messages, model, max_tokens, system, testOnly } = body;

    if (!apiKey) {
      return new Response(JSON.stringify({ error: { message: 'Missing API key' } }),
        { status: 400, headers: { ...cors, 'Content-Type': 'application/json' } });
    }

    // Quick key-test ping
    if (testOnly) {
      const r = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'x-api-key': apiKey, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
        body: JSON.stringify({ model: MODEL, max_tokens: 5, messages: [{ role: 'user', content: 'Hi' }] }),
      });
      const d = await r.json();
      return new Response(JSON.stringify(d), { status: r.status, headers: { ...cors, 'Content-Type': 'application/json' } });
    }

    // Passthrough mode: app sends complete messages array (used for video frames, bid writer, and AI chat)
    if (messages) {
      const payload = { model: model || MODEL, max_tokens: max_tokens || 1024, messages };
      if (system) payload.system = system;
      const r = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'x-api-key': apiKey, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const d = await r.json();
      return new Response(JSON.stringify(d), { status: r.status, headers: { ...cors, 'Content-Type': 'application/json' } });
    }

    // Legacy single-image mode (base64)
    if (!base64) {
      return new Response(JSON.stringify({ error: { message: 'Missing image data or messages' } }),
        { status: 400, headers: { ...cors, 'Content-Type': 'application/json' } });
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
    return new Response(JSON.stringify(d), { status: r.status, headers: { ...cors, 'Content-Type': 'application/json' } });
  }
};
