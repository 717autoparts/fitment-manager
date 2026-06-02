import React, { useState } from 'react';
import { sb } from '../supabase';
import { getEbayConfig, extractItemId, getItem, reviseItem } from '../ebay';

function extractKeywords(title) {
  const stop = new Set(['the','a','an','and','or','for','with','to','of','in','on','at','fits','oem','new','used','pair','front','rear','left','right','upper','lower']);
  return title.toLowerCase().replace(/[^a-z0-9\s]/g,'').split(/\s+/).filter(w => w.length > 2 && !stop.has(w));
}

export default function ApplyTab() {
  const [yourUrl, setYourUrl] = useState('');
  const [donorUrl, setDonorUrl] = useState('');
  const [fetching, setFetching] = useState(false);
  const [applying, setApplying] = useState(false);
  const [status, setStatus] = useState({ msg: '', type: '' });
  const [preview, setPreview] = useState(null);
  const [saveToLib, setSaveToLib] = useState(false);
  const [profileName, setProfileName] = useState('');
  const [profileCat, setProfileCat] = useState('');

  function cfg() { return getEbayConfig(); }

  async function handleFetch() {
    const yourId = extractItemId(yourUrl);
    const donorId = extractItemId(donorUrl);
    if (!yourId || !donorId) { setStatus({ msg: 'Could not parse item IDs from URLs.', type: 'error' }); return; }
    const c = cfg();
    if (!c.token) { setStatus({ msg: 'eBay token not configured. Go to Config tab.', type: 'error' }); return; }
    setFetching(true);
    setStatus({ msg: 'Fetching from eBay...', type: '' });
    try {
      const [yourData, donorData] = await Promise.all([getItem(yourId, c), getItem(donorId, c)]);
      if (!donorData.compatibilities?.length) { setStatus({ msg: 'Donor listing has no compatibility data.', type: 'error' }); setFetching(false); return; }
      setPreview({ yourData, donorData, yourId });
      await sb.from('listings').upsert({ ebay_item_id: yourId, url: yourUrl, title: yourData.title, status: 'active' }, { onConflict: 'ebay_item_id' });
      setStatus({ msg: `Found ${donorData.compatibilities.length} vehicles.`, type: 'success' });
    } catch(e) { setStatus({ msg: e.message, type: 'error' }); }
    setFetching(false);
  }

  async function handleApply() {
    if (!preview) return;
    const c = cfg();
    setApplying(true);
    setStatus({ msg: 'Applying fitment to your listing...', type: '' });
    try {
      const ok = await reviseItem(preview.yourId, preview.donorData.compatibilities, c);
      if (!ok) { setStatus({ msg: 'eBay returned an error. Check your credentials.', type: 'error' }); setApplying(false); return; }
      let profileId = null;
      if (saveToLib && profileName.trim()) {
        const keywords = extractKeywords(profileName);
        const { data: prof } = await sb.from('fitment_profiles').insert({ name: profileName.trim(), part_category: profileCat.trim() || null, keywords }).select().single();
        if (prof) {
          profileId = prof.id;
          const entries = preview.donorData.compatibilities.map(c => ({ profile_id: prof.id, year: c.Year||null, make: c.Make||null, model: c.Model||null, trim: c.Trim||null, engine: c.Engine||null }));
          await sb.from('fitment_entries').insert(entries);
          const kwRows = keywords.map(kw => ({ profile_id: prof.id, keyword: kw, part_category: profileCat.trim()||null, match_weight: 1 }));
          if (kwRows.length) await sb.from('title_keyword_index').insert(kwRows);
          await sb.from('listings').update({ applied_profile_id: prof.id, applied_at: new Date().toISOString() }).eq('ebay_item_id', preview.yourId);
        }
      }
      const { data: listing } = await sb.from('listings').select('id').eq('ebay_item_id', preview.yourId).single();
      if (listing) await sb.from('listing_fitment_log').insert({ listing_id: listing.id, profile_id: profileId, action: 'applied', vehicle_count: preview.donorData.compatibilities.length, applied_by: 'manual' });
      setStatus({ msg: `Fitment applied successfully to item ${preview.yourId}!`, type: 'success' });
    } catch(e) { setStatus({ msg: e.message, type: 'error' }); }
    setApplying(false);
  }

  function clearPreview() {
    setPreview(null);
    setSaveToLib(false);
    setProfileName('');
    setProfileCat('');
    setStatus({ msg: '', type: '' });
  }

  return (
    <div>
      <div className="card">
        <div className="card-title"><i className="ti ti-link" /> Listing URLs</div>
        <div className="field">
          <label><i className="ti ti-tag" /> Your listing <span className="badge badge-yours">target</span></label>
          <input value={yourUrl} onChange={e => setYourUrl(e.target.value)} placeholder="https://www.ebay.com/itm/123456789012" />
        </div>
        <div className="divider"><div className="divider-line" /><span>copies from</span><div className="divider-line" /></div>
        <div className="field">
          <label><i className="ti ti-copy" /> Donor listing <span className="badge badge-donor">source</span></label>
          <input value={donorUrl} onChange={e => setDonorUrl(e.target.value)} placeholder="https://www.ebay.com/itm/987654321098" />
        </div>
        <div className="btn-row">
          <button className="btn btn-primary" onClick={handleFetch} disabled={fetching}>
            {fetching ? <><span className="spinner" /> Fetching...</> : <><i className="ti ti-search" /> Fetch &amp; preview</>}
          </button>
          <button className="btn btn-success" onClick={handleApply} disabled={!preview || applying}>
            {applying ? <><span className="spinner" /> Applying...</> : <><i className="ti ti-check" /> Apply fitment</>}
          </button>
        </div>
        {status.msg && <div className={`status ${status.type}`}>{status.msg}</div>}
      </div>

      {preview && (
        <div className="card">
          <div className="preview-header">
            <div className="preview-title">
              <i className="ti ti-list-check" />
              Compatibility preview
              <span className="count-pill">{preview.donorData.compatibilities.length} vehicles</span>
            </div>
            <button className="btn btn-sm" onClick={clearPreview}><i className="ti ti-x" /></button>
          </div>
          <div className="info-box"><strong>Your listing:</strong> {preview.yourData.title || 'Item #'+preview.yourId}</div>
          <div className="info-box"><strong>Donor listing:</strong> {preview.donorData.title || 'Item #'+preview.donorData.itemId}</div>
          <div className="compat-wrap">
            <table className="compat-table">
              <thead><tr><th>Year</th><th>Make</th><th>Model</th><th>Trim</th><th>Engine</th></tr></thead>
              <tbody>
                {preview.donorData.compatibilities.map((c, i) => (
                  <tr key={i}><td>{c.Year||'—'}</td><td>{c.Make||'—'}</td><td>{c.Model||'—'}</td><td>{c.Trim||'—'}</td><td>{c.Engine||'—'}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="save-row">
            <label><input type="checkbox" checked={saveToLib} onChange={e => setSaveToLib(e.target.checked)} /> Save to library</label>
            {saveToLib && <>
              <input value={profileName} onChange={e => setProfileName(e.target.value)} placeholder="Profile name (e.g. Accord Front Strut)" style={{flex:1,minWidth:160,padding:'6px 10px',border:'1px solid var(--border)',borderRadius:'var(--radius)',background:'var(--bg)',color:'var(--text)',fontSize:13}} />
              <input value={profileCat} onChange={e => setProfileCat(e.target.value)} placeholder="Category" style={{width:120,padding:'6px 10px',border:'1px solid var(--border)',borderRadius:'var(--radius)',background:'var(--bg)',color:'var(--text)',fontSize:13}} />
            </>}
          </div>
        </div>
      )}
    </div>
  );
}
