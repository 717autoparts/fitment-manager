export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).end();

  try {
    const { endpoint, xml, headers } = req.body;

    if (!xml || !endpoint) {
      return res.status(400).json({ error: 'Missing xml or endpoint' });
    }

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        ...headers,
        'Content-Type': 'text/xml',
        'Content-Length': Buffer.byteLength(xml, 'utf8').toString()
      },
      body: xml
    });

    const text = await response.text();
    res.setHeader('Content-Type', 'text/xml');
    res.status(200).send(text);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
