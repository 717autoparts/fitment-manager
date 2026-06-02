import React, { useState, useEffect } from 'react';
import { sb } from '../supabase';
import { getEbayConfig, saveEbayConfig, testEbayConnection } from '../ebay';

export default function ConfigTab() {
  const [form, setForm] = useState({ appId: '', certId: '', devId: '', token: '', sandbox: true });
  const [ebayStatus, setEbayStatus] = useState({ msg: '', type: '' });
  const [dbStatus, setDbStatus] = useState({ msg: 'Not tested', type: '' });

  useEffect(() => {
    const cfg = getEbayConfig();
    setForm({ appId: cfg.appId||'', certId: cfg.certId||'', devId: cfg.devId||'', token: cfg.token||'', sandbox: cfg.sandbox ?? true });
  }, []);

  function update(key, val) { setForm(f => ({ ...f, [key]: val })); }

  function handleSave() {
    saveEbayConfig(form);
    setEbayStatus({ msg: 'Credentials saved.', type: 'success' });
  }

  async function handleTestEbay() {
    if (!form.token) { setEbayStatus({ msg: 'No token entered.', type: 'error' }); return; }
    setEbayStatus({ msg: 'Testing...', type: '' });
    try {
      const ok = await testEbayConnection(form);
      setEbayStatus({ msg: ok ? 'eBay connection successful!' : 'eBay returned an error. Check credentials.', type: ok ? 'success' : 'error' });
    } catch(e) { setEbayStatus({ msg: e.message, type: 'error' }); }
  }

  async function handleTestDb() {
    setDbStatus({ msg: 'Testing...', type: '' });
    try {
      const { error } = await sb.from('fitment_profiles').select('id').limit(1);
      if (error) throw error;
      setDbStatus({ msg: 'Supabase connected successfully!', type: 'success' });
    } catch(e) { setDbStatus({ msg: e.message, type: 'error' }); }
  }

  return (
    <div>
      <div className="card">
        <div className="card-title"><i className="ti ti-database" /> Supabase database</div>
        <div style={{fontSize:13,color:'var(--text2)',marginBottom:10}}>
          Connected to: <code style={{fontSize:12,background:'var(--bg2)',padding:'2px 6px',borderRadius:4}}>ayqtdxwfadmpryzhnuux.supabase.co</code>
        </div>
        <button className="btn" onClick={handleTestDb}><i className="ti ti-wifi" /> Test connection</button>
        {dbStatus.msg && <div className={`status ${dbStatus.type}`}>{dbStatus.msg}</div>}
      </div>

      <div className="card">
        <div className="card-title"><i className="ti ti-key" /> eBay API credentials</div>
        {[
          { key: 'appId', label: 'App ID (Client ID)', type: 'text', placeholder: 'JDMCompa-FitmentM-SBX-...' },
          { key: 'certId', label: 'Cert ID (Client Secret)', type: 'password', placeholder: 'SBX-...' },
          { key: 'devId', label: 'Dev ID', type: 'text', placeholder: 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx' },
          { key: 'token', label: 'User auth token', type: 'password', placeholder: 'v^1.1#i^1...' },
        ].map(f => (
          <div className="field" key={f.key}>
            <label>{f.label}</label>
            <input type={f.type} value={form[f.key]} onChange={e => update(f.key, e.target.value)} placeholder={f.placeholder} />
          </div>
        ))}
        <label style={{fontSize:13,display:'flex',alignItems:'center',gap:8,cursor:'pointer',marginBottom:12}}>
          <input type="checkbox" checked={form.sandbox} onChange={e => update('sandbox', e.target.checked)} />
          Use sandbox environment
        </label>
        <div className="btn-row">
          <button className="btn btn-primary" onClick={handleSave}><i className="ti ti-device-floppy" /> Save credentials</button>
          <button className="btn" onClick={handleTestEbay}><i className="ti ti-wifi" /> Test eBay connection</button>
        </div>
        {ebayStatus.msg && <div className={`status ${ebayStatus.type}`}>{ebayStatus.msg}</div>}
        <div style={{marginTop:'1.5rem',paddingTop:'1rem',borderTop:'1px solid var(--border)',fontSize:13,color:'var(--text2)',lineHeight:1.6}}>
          Credentials are stored in your browser's local storage and sent only to eBay's API directly.<br/>
          Get your keys at <a href="https://developer.ebay.com/my/keys" target="_blank" rel="noreferrer" style={{color:'var(--blue)'}}>developer.ebay.com/my/keys</a>.
        </div>
      </div>
    </div>
  );
}
