export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const { endpoint, xml, headers } = req.body;

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: headers,
      body: xml
    });
    const text = await response.text();
    res.status(200).send(text);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
