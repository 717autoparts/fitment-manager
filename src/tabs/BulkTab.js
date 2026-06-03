import React, { useState, useRef } from 'react';

const REQUIRED_COLUMNS = ['ebay_item_id', 'title', 'sku'];

function parseCSV(text) {
  const lines = text.trim().split('\n');
  const headers = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/\s+/g, '_'));
  const rows = lines.slice(1).map(line => {
    const values = line.split(',').map(v => v.trim().replace(/^"|"$/g, ''));
    const row = {};
    headers.forEach((h, i) => row[h] = values[i] || '');
    return row;
  });
  return { headers, rows };
}

export default function BulkTab() {
  const [dragging, setDragging] = useState(false);
  const [parsed, setParsed] = useState(null);
  const [mapping, setMapping] = useState({});
  const [step, setStep] = useState('upload');
  const [selected, setSelected] = useState([]);
  const [profileAssignments, setProfileAssignments] = useState({});
  const fileRef = useRef();

  function handleFile(file) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = e => {
      try {
        const { headers, rows } = parseCSV(e.target.result);
        setParsed({ headers, rows });
        const autoMap = {};
        REQUIRED_COLUMNS.forEach(col => {
          const match = headers.find(h => h.includes(col.replace('ebay_item_id', 'item').replace('_', '')));
          if (match) autoMap[col] = match;
        });
        setMapping(autoMap);
        setSelected(rows.map((_, i) => i));
        setStep('map');
      } catch(e) {
        alert('Could not parse CSV. Make sure it has a header row.');
      }
    };
    reader.readAsText(file);
  }

  function handleDrop(e) {
    e.preventDefault();
    setDragging(false);
    handleFile(e.dataTransfer.files[0]);
  }

  function getMapped(row, field) {
    return mapping[field] ? row[mapping[field]] || '—' : '—';
  }

  function toggleSelect(i) {
    setSelected(s => s.includes(i) ? s.filter(x => x !== i) : [...s, i]);
  }

  function toggleAll() {
    setSelected(s => s.length === parsed.rows.length ? [] : parsed.rows.map((_, i) => i));
  }

  return (
    <div>
      {step === 'upload' && (
        <div className="card">
          <div className="card-title"><i className="ti ti-upload" /> Bulk CSV upload</div>
          <div
            className={`drop-zone ${dragging ? 'dragging' : ''}`}
            onDragOver={e => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={handleDrop}
            onClick={() => fileRef.current.click()}
          >
            <i className="ti ti-file-spreadsheet" style={{fontSize:36,display:'block',marginBottom:12,color:'var(--text3)'}} />
            <div style={{fontSize:15,fontWeight:500,marginBottom:6}}>Drop your CSV here</div>
            <div style={{fontSize:13,color:'var(--text2)'}}>or click to browse</div>
            <input ref={fileRef} type="file" accept=".csv" style={{display:'none'}} onChange={e => handleFile(e.target.files[0])} />
          </div>
          <div style={{marginTop:'1.5rem'}}>
            <div className="card-title">Expected CSV format</div>
            <div className="compat-wrap">
              <table className="compat-table">
                <thead><tr><th>sku</th><th>ebay_item_id</th><th>title</th><th>donor_url</th></tr></thead>
                <tbody>
                  <tr><td>CP-247</td><td>123456789012</td><td>07-12 Honda Accord Front Strut</td><td>https://ebay.com/itm/...</td></tr>
                  <tr><td>CP-248</td><td>987654321098</td><td>05-09 Toyota Camry Rotor</td><td></td></tr>
                  <tr><td>CP-249</td><td></td><td>03-07 Honda Accord Control Arm</td><td>https://ebay.com/itm/...</td></tr>
                </tbody>
              </table>
            </div>
            <div style={{fontSize:12,color:'var(--text3)',marginTop:8}}>
              Only <strong>title</strong> is required. SKU, eBay Item ID, and donor URL are optional but enable more features.
            </div>
          </div>
        </div>
      )}

      {step === 'map' && parsed && (
        <div>
          <div className="card">
            <div className="card-title"><i className="ti ti-columns" /> Map your columns</div>
            <div style={{fontSize:13,color:'var(--text2)',marginBottom:12}}>
              Tell us which columns in your CSV match each field. We've auto-detected what we can.
            </div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
              {[
                { field: 'sku', label: 'SKU', icon: 'ti-tag' },
                { field: 'ebay_item_id', label: 'eBay Item ID', icon: 'ti-hash' },
                { field: 'title', label: 'Listing title', icon: 'ti-text-size' },
                { field: 'donor_url', label: 'Donor URL', icon: 'ti-link' },
              ].map(({ field, label, icon }) => (
                <div key={field} className="field">
                  <label><i className={`ti ${icon}`} /> {label}</label>
                  <select
                    value={mapping[field] || ''}
                    onChange={e => setMapping(m => ({ ...m, [field]: e.target.value }))}
                    style={{padding:'8px 12px',border:'1px solid var(--border)',borderRadius:'var(--radius)',background:'var(--bg2)',color:'var(--text)',fontSize:14}}
                  >
                    <option value="">— not in CSV —</option>
                    {parsed.headers.map(h => <option key={h} value={h}>{h}</option>)}
                  </select>
                </div>
              ))}
            </div>
            <div className="btn-row">
              <button className="btn btn-primary" onClick={() => setStep('preview')} disabled={!mapping.title}>
                <i className="ti ti-arrow-right" /> Preview listings
              </button>
              <button className="btn" onClick={() => { setParsed(null); setStep('upload'); }}>
                <i className="ti ti-x" /> Start over
              </button>
            </div>
          </div>
        </div>
      )}

      {step === 'preview' && parsed && (
        <div>
          <div className="card">
            <div className="card-title"><i className="ti ti-list-check" /> Preview &amp; assign profiles</div>
            <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:12}}>
              <div style={{fontSize:13,color:'var(--text2)'}}>
                {selected.length} of {parsed.rows.length} listings selected
              </div>
              <div style={{display:'flex',gap:8}}>
                <button className="btn btn-sm" onClick={toggleAll}>
                  {selected.length === parsed.rows.length ? 'Deselect all' : 'Select all'}
                </button>
                <button className="btn btn-sm" onClick={() => setStep('map')}>
                  <i className="ti ti-arrow-left" /> Back
                </button>
              </div>
            </div>
            <div className="compat-wrap" style={{maxHeight:340}}>
              <table className="compat-table">
                <thead>
                  <tr>
                    <th style={{width:32}}></th>
                    <th>SKU</th>
                    <th>eBay Item ID</th>
                    <th>Title</th>
                    <th>Donor URL</th>
                    <th>Profile</th>
                  </tr>
                </thead>
                <tbody>
                  {parsed.rows.map((row, i) => (
                    <tr key={i} style={{opacity: selected.includes(i) ? 1 : 0.4}}>
                      <td>
                        <input type="checkbox" checked={selected.includes(i)} onChange={() => toggleSelect(i)} />
                      </td>
                      <td>{getMapped(row, 'sku')}</td>
                      <td>{getMapped(row, 'ebay_item_id')}</td>
                      <td style={{maxWidth:200}}>{getMapped(row, 'title')}</td>
                      <td>
                        {getMapped(row, 'donor_url') !== '—'
                          ? <span style={{color:'var(--blue)',fontSize:12}}>✓ has donor</span>
                          : <span style={{color:'var(--text3)',fontSize:12}}>no donor</span>
                        }
                      </td>
                      <td>
                        <input
                          type="text"
                          value={profileAssignments[i] || ''}
                          onChange={e => setProfileAssignments(p => ({ ...p, [i]: e.target.value }))}
                          placeholder="Profile name..."
                          style={{width:140,padding:'3px 8px',border:'1px solid var(--border)',borderRadius:'var(--radius)',background:'var(--bg)',color:'var(--text)',fontSize:12}}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="card">
            <div className="card-title"><i className="ti ti-bolt" /> Bulk actions</div>
            <div style={{fontSize:13,color:'var(--text2)',marginBottom:12}}>
              Apply to {selected.length} selected listing{selected.length !== 1 ? 's' : ''}
            </div>
            <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
              <button className="btn btn-primary" onClick={() => setStep('ready')}>
                <i className="ti ti-check" /> Queue for fitment apply
              </button>
              <button className="btn" onClick={() => setStep('upload')}>
                <i className="ti ti-upload" /> Upload different CSV
              </button>
            </div>
          </div>
        </div>
      )}

      {step === 'ready' && (
        <div className="card">
          <div style={{textAlign:'center',padding:'2rem 1rem'}}>
            <i className="ti ti-circle-check" style={{fontSize:48,color:'var(--teal)',display:'block',marginBottom:12}} />
            <div style={{fontSize:16,fontWeight:500,marginBottom:8}}>{selected.length} listings queued</div>
            <div style={{fontSize:13,color:'var(--text2)',marginBottom:24}}>
              These listings are ready for bulk fitment. Once your eBay API is connected, hit apply to process them all.
            </div>
            <div className="btn-row" style={{justifyContent:'center'}}>
              <button className="btn btn-success" disabled>
                <i className="ti ti-bolt" /> Apply all fitment (API pending)
              </button>
              <button className="btn" onClick={() => { setParsed(null); setStep('upload'); setSelected([]); setProfileAssignments({}); }}>
                <i className="ti ti-refresh" /> Start over
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
