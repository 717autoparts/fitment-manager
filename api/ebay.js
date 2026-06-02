import { request } from 'https';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).end();

  const { endpoint, xml, headers } = req.body;
  const url = new URL(endpoint);

  const options = {
    hostname: url.hostname,
    path: url.pathname,
    method: 'POST',
    rejectUnauthorized: false,
    headers: {
      'Content-Type': 'text/xml;charset=utf-8',
      'Content-Length': Buffer.byteLength(xml),
      'User-Agent': 'Mozilla/5.0',
      ...headers
    }
  };

  const proxyReq = request(options, (proxyRes) => {
    let data = '';
    proxyRes.on('data', chunk => data += chunk);
    proxyRes.on('end', () => {
      res.setHeader('Content-Type', 'text/xml');
      res.status(200).send(data);
    });
  });

  proxyReq.on('error', err => res.status(500).json({ error: err.message }));
  proxyReq.write(xml);
  proxyReq.end();
}
