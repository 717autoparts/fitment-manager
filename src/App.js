import React, { useState, useEffect } from 'react';
import ApplyTab from './tabs/ApplyTab';
import LibraryTab from './tabs/LibraryTab';
import ConfigTab from './tabs/ConfigTab';
import { sb } from './supabase';
import './App.css';

export default function App() {
  const [tab, setTab] = useState('apply');
  const [dbStatus, setDbStatus] = useState('checking');

  useEffect(() => {
    sb.from('fitment_profiles').select('id').limit(1)
      .then(({ error }) => setDbStatus(error ? 'error' : 'connected'))
      .catch(() => setDbStatus('error'));
  }, []);

  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="app-header-inner">
          <div className="app-title">
            <i className="ti ti-car" />
            Fitment Manager
            <span className={`db-pill ${dbStatus}`}>
              <span className="db-dot" />
              {dbStatus === 'connected' ? 'Supabase connected' : dbStatus === 'checking' ? 'Connecting...' : 'DB error'}
            </span>
          </div>
        </div>
      </header>

      <main className="app-main">
        <div className="tabs">
          {[
            { id: 'apply', icon: 'ti-copy', label: 'Apply fitment' },
            { id: 'library', icon: 'ti-database', label: 'Library' },
            { id: 'config', icon: 'ti-settings', label: 'Config' },
          ].map(t => (
            <button
              key={t.id}
              className={`tab ${tab === t.id ? 'active' : ''}`}
              onClick={() => setTab(t.id)}
            >
              <i className={`ti ${t.icon}`} />
              {t.label}
            </button>
          ))}
        </div>

        {tab === 'apply' && <ApplyTab />}
        {tab === 'library' && <LibraryTab />}
        {tab === 'config' && <ConfigTab />}
      </main>
    </div>
  );
}
