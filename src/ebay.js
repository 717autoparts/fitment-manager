const EBAY_KEY = 'fitment_ebay_config';

export function getEbayConfig() {
  try { return JSON.parse(localStorage.getItem(EBAY_KEY)) || {}; } catch(e) { return {}; }
}

export function saveEbayConfig(cfg) {
  localStorage.setItem(EBAY_KEY, JSON.stringify(cfg));
}

export function extractItemId(url) {
  const m = url.match(/\/itm\/(\d+)/);
  return m ? m[1] : null;
}

export function getEndpoint(sandbox) {
  return sandbox
    ? 'https://api.sandbox.ebay.com/ws/api.dll'
    : 'https://api.ebay.com/ws/api.dll';
}

function ebayHeaders(callName, cfg) {
  return {
    'Content-Type': 'text/xml',
    'X-EBAY-API-COMPATIBILITY-LEVEL': '967',
    'X-EBAY-API-CALL-NAME': callName,
    'X-EBAY-API-APP-NAME': cfg.appId || '',
    'X-EBAY-API-DEV-NAME': cfg.devId || '',
    'X-EBAY-API-CERT-NAME': cfg.certId || '',
    'X-EBAY-API-SITEID': '0'
  };
}

async function ebayProxy(callName, xml, cfg) {
  const headers = ebayHeaders(callName, cfg);
  const endpoint = getEndpoint(cfg.sandbox);
  const res = await fetch('/api/ebay', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ endpoint, xml, headers })
  });
  if (!res.ok) throw new Error('Proxy error ' + res.status);
  return res.text();
}

export async function getItem(itemId, cfg) {
  const xml = `<?xml version="1.0" encoding="utf-8"?>
<GetItemRequest xmlns="urn:ebay:apis:eBLBaseComponents">
  <RequesterCredentials><eBayAuthToken>${cfg.token}</eBayAuthToken></RequesterCredentials>
  <ItemID>${itemId}</ItemID>
  <IncludeItemCompatibilityList>true</IncludeItemCompatibilityList>
  <DetailLevel>ReturnAll</DetailLevel>
</GetItemRequest>`;
  return parseGetItem(await ebayProxy('GetItem', xml, cfg));
}

function parseGetItem(xml) {
  const doc = new DOMParser().parseFromString(xml, 'text/xml');
  const title = doc.querySelector('Title')?.textContent || '';
  const itemId = doc.querySelector('ItemID')?.textContent || '';
  const compatibilities = [];
  doc.querySelectorAll('Compatibility').forEach(node => {
    const entry = {};
    node.querySelectorAll('NameValueList').forEach(nvl => {
      const n = nvl.querySelector('Name')?.textContent;
      const v = nvl.querySelector('Value')?.textContent;
      if (n && v) entry[n] = v;
    });
    if (Object.keys(entry).length) compatibilities.push(entry);
  });
  return { title, itemId, compatibilities };
}

export async function reviseItem(itemId, compatibilities, cfg) {
  const compatXml = compatibilities.map(c =>
    '<Compatibility>' +
    Object.entries(c).map(([k, v]) => `<NameValueList><Name>${k}</Name><Value>${v}</Value></NameValueList>`).join('') +
    '</Compatibility>'
  ).join('');
  const xml = `<?xml version="1.0" encoding="utf-8"?>
<ReviseFixedPriceItemRequest xmlns="urn:ebay:apis:eBLBaseComponents">
  <RequesterCredentials><eBayAuthToken>${cfg.token}</eBayAuthToken></RequesterCredentials>
  <Item>
    <ItemID>${itemId}</ItemID>
    <ItemCompatibilityList>
      <ReplaceAll>true</ReplaceAll>
      ${compatXml}
    </ItemCompatibilityList>
  </Item>
</ReviseFixedPriceItemRequest>`;
  const text = await ebayProxy('ReviseFixedPriceItem', xml, cfg);
  const doc = new DOMParser().parseFromString(text, 'text/xml');
  const ack = doc.querySelector('Ack')?.textContent;
  return ack === 'Success' || ack === 'Warning';
}

export async function testEbayConnection(cfg) {
  const xml = `<?xml version="1.0" encoding="utf-8"?>
<GeteBayOfficialTimeRequest xmlns="urn:ebay:apis:eBLBaseComponents">
  <RequesterCredentials><eBayAuthToken>${cfg.token}</eBayAuthToken></RequesterCredentials>
</GeteBayOfficialTimeRequest>`;
  const text = await ebayProxy('GeteBayOfficialTime', xml, cfg);
  const doc = new DOMParser().parseFromString(text, 'text/xml');
  return doc.querySelector('Ack')?.textContent === 'Success';
}
