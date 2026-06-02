import React, { useState, useEffect } from 'react';
import { sb } from '../supabase';

export default function LibraryTab() {
  const [profiles, setProfiles] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ profiles: '—', vehicles: '—', listings: '—' });

  useEffect(() => { loadAll(); }, []);

  async function loadAll() {
    setLoading(true);
    const [pRes, eRes, lRes, profRes] = await Promise.all([
      sb.from('fitment_profiles').select('id', { count: 'exact', head: true }),
      sb.from('fitment_entries').select('id', { count: 'exact', head: true }),
      sb.from('listings').select('id', { count: 'exact', head: true }),
      sb.from('fitment_profile_summary').select('*').order('created_at', { ascending: false })
    ]);
    setStats({ profiles: pRes.count ?? '—', vehicles: eRes.count ?? '—', listings: lRes.count ?? '—' });
    const data = profRes.data || [];
    setProfiles(data);
    setFiltered(data);
    setLoading(false);
  }

  function handleSearch(q) {
    setSearch(q);
    setFiltered(profiles.filter(p => p.name.toLowerCase().includes(q.toLowerCase()) || (p.part_category||'').toLowerCase().includes(q.toLowerCase())));
  }

  async function deleteProfile(id) {
    await sb.from('fitment_profiles').delete().eq('id', id);
    loadAll();
  }

  return (
    <div>
      <div className="metrics">
        <div className="metric"><div className="metric-label">Profiles</div><div className="metric-val">{stats.profiles}</div></div>
        <div className="metric"><div className="metric-label">Vehicles indexed</div><div className="metric-val">{stats.vehicles}</div></div>
        <div className="metric"><div className="metric-label">Listings tracked</div><div className="metric-val">{stats.listings}</div></div>
      </div>
      <div className="card">
        <div className="card-title"><i className="ti ti-database" /> Fitment profiles</div>
        <div className="search-row">
          <input value={search} onChange={e => handleSearch(e.target.value)} placeholder="Search profiles..." />
          <button className="btn btn-sm" onClick={loadAll}><i className="ti ti-refresh" /></button>
        </div>
        {loading ? (
          <div className="empty"><span className="spinner" style={{borderTopColor:'var(--text2)'}} /></div>
        ) : filtered.length === 0 ? (
          <div className="empty"><i className="ti ti-database-off" />No profiles yet.<br />Apply fitment and check "Save to library."</div>
        ) : filtered.map(p => (
          <div className="profile-row" key={p.id}>
            <div style={{flex:1,minWidth:0}}>
              <div className="profile-name">{p.name}</div>
              <div className="profile-meta">
                {p.vehicle_count ?? 0} vehicles · {p.listing_count ?? 0} listings · {new Date(p.created_at).toLocaleDateString()}
                {p.part_category && <> · <span className="badge badge-cat">{p.part_category}</span></>}
              </div>
            </div>
            <button className="btn btn-sm btn-danger" onClick={() => deleteProfile(p.id)}><i className="ti ti-trash" /></button>
          </div>
        ))}
      </div>
    </div>
  );
}
