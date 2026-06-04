// Proxy for Anthropic API — avoids CORS issues in Android PWA / WebView
exports.handler = async (event) => {
  const cors = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers: cors, body: '' };
  }
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers: cors, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  try {
    const { base64, apiKey } = JSON.parse(event.body || '{}');
    if (!base64 || !apiKey) {
      return { statusCode: 400, headers: cors, body: JSON.stringify({ error: { message: 'Missing base64 image or API key' } }) };
    }

    const resp = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
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
- walls: array of wall widths you can see (best estimates in feet, include all 4 even if some are guessed from symmetry)
- height: ceiling height in feet
- floorLength: longer floor dimension in feet
- floorWidth: shorter floor dimension in feet
- doors: number of doors visible
- windows: number of windows visible
Use typical residential proportions if unsure. Omit a field only if you truly cannot estimate it.` }
          ]
        }]
      })
    });

    const data = await resp.json();
    return { statusCode: resp.status, headers: cors, body: JSON.stringify(data) };
  } catch (e) {
    return { statusCode: 500, headers: cors, body: JSON.stringify({ error: { message: e.message } }) };
  }
};
