export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).end();

  try {
    const { endpoint, xml, headers } = req.body;

    const buf = Buffer.from(xml, 'utf8');

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/xml;charset=utf-8',
        'Content-Length': buf.length.toString(),
        'X-EBAY-API-COMPATIBILITY-LEVEL': headers['X-EBAY-API-COMPATIBILITY-LEVEL'],
        'X-EBAY-API-CALL-NAME': headers['X-EBAY-API-CALL-NAME'],
        'X-EBAY-API-APP-NAME': headers['X-EBAY-API-APP-NAME'],
        'X-EBAY-API-DEV-NAME': headers['X-EBAY-API-DEV-NAME'],
        'X-EBAY-API-CERT-NAME': headers['X-EBAY-API-CERT-NAME'],
        'X-EBAY-API-SITEID': headers['X-EBAY-API-SITEID']
      },
      body: buf
    });

    const text = await response.text();
    res.setHeader('Content-Type', 'text/xml');
    res.status(200).send(text);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
