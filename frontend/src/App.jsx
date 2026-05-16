import React, { useState, useEffect } from 'react';
import { Activity, Settings, Briefcase, Play, Square, Save, MapPin, Clock, RefreshCw } from 'lucide-react';

function App() {
  const [isRunning, setIsRunning] = useState(false);
  const [jobs, setJobs] = useState([]);
  const [config, setConfig] = useState({
    searchCriteria: '',
    notificationEmails: '',
    frequencyMinutes: 5,
    targetUrls: '',
    maxDaysOld: 7
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchStatus();
    fetchConfig();
    fetchJobs();
    
    // Poll for jobs and status every 10 seconds
    const interval = setInterval(() => {
      fetchStatus();
      fetchJobs();
    }, 10000);
    return () => clearInterval(interval);
  }, []);

  const fetchStatus = async () => {
    try {
      const res = await fetch('/api/status');
      const data = await res.json();
      setIsRunning(data.isRunning);
    } catch (e) { console.error("Could not fetch status"); }
  };

  const fetchConfig = async () => {
    try {
      const res = await fetch('/api/config');
      const data = await res.json();
      setConfig(data);
    } catch (e) { console.error("Could not fetch config"); }
  };

  const fetchJobs = async () => {
    try {
      const res = await fetch('/api/jobs');
      const data = await res.json();
      setJobs(data);
    } catch (e) { console.error("Could not fetch jobs"); }
  };

  const handleStartStop = async () => {
    try {
      const endpoint = isRunning ? '/api/stop' : '/api/start';
      const res = await fetch(endpoint, { method: 'POST' });
      const data = await res.json();
      setIsRunning(data.isRunning);
      if (!isRunning) fetchJobs(); // Fetch immediately if started
    } catch (e) { console.error("Error toggling status"); }
  };

  const handleManualCheck = async () => {
    if (!isRunning) return alert("Please start the agent first.");
    try {
      await fetch('/api/check', { method: 'POST' });
      setTimeout(fetchJobs, 2000); // Fetch latest jobs after 2 seconds
    } catch (e) { console.error("Error triggering check"); }
  };

  const handleSaveConfig = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await fetch('/api/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config)
      });
      alert('Configuration saved successfully!');
    } catch (e) {
      alert('Failed to save configuration');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="app-container">
      <header>
        <h1>Antigravity ATS Agent</h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', color: 'var(--text-secondary)' }}>
            <span className={`status-indicator ${isRunning ? 'status-active' : 'status-inactive'}`}></span>
            {isRunning ? 'Agent Running' : 'Agent Stopped'}
          </div>
          {isRunning && (
            <button 
              className="btn-primary" 
              style={{ width: 'auto', padding: '0.5rem 1rem' }}
              onClick={handleManualCheck}
              title="Force check now"
            >
              <RefreshCw size={18} />
            </button>
          )}
          <button 
            className={isRunning ? 'btn-danger' : 'btn-success'} 
            style={{ width: 'auto' }}
            onClick={handleStartStop}
          >
            {isRunning ? <><Square size={18} /> Stop Agent</> : <><Play size={18} /> Start Agent</>}
          </button>
        </div>
      </header>

      <aside style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
        <div className="card">
          <h2 className="card-title"><Activity size={20} className="accent-icon" /> Dashboard</h2>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '1rem' }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '2rem', fontWeight: 'bold', color: 'var(--accent)' }}>{jobs.length}</div>
              <div style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>Total Jobs Found</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '2rem', fontWeight: 'bold', color: 'var(--accent)' }}>{config.frequencyMinutes}</div>
              <div style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>Check Interval (m)</div>
            </div>
          </div>
        </div>

        <div className="card">
          <h2 className="card-title"><Settings size={20} /> Settings</h2>
          <form onSubmit={handleSaveConfig}>
            <div className="form-group">
              <label>Search Criteria (comma separated)</label>
              <input 
                type="text" 
                value={config.searchCriteria} 
                onChange={e => setConfig({...config, searchCriteria: e.target.value})} 
                placeholder="e.g. Clinical Care Technician, Medical Assistant"
                required
              />
            </div>
            <div className="form-group">
              <label>Notification Emails (comma separated)</label>
              <input 
                type="text" 
                value={config.notificationEmails} 
                onChange={e => setConfig({...config, notificationEmails: e.target.value})} 
                placeholder="e.g. email@example.com"
                required
              />
            </div>
            <div className="form-group">
              <label>Check Frequency (minutes)</label>
              <input 
                type="number" 
                min="1"
                value={config.frequencyMinutes} 
                onChange={e => setConfig({...config, frequencyMinutes: parseInt(e.target.value)})} 
                required
              />
            </div>
            <div className="form-group">
              <label>Target URLs (comma separated)</label>
              <textarea 
                value={config.targetUrls} 
                onChange={e => setConfig({...config, targetUrls: e.target.value})} 
                placeholder="e.g. https://pm.healthcaresource.com/CS/rwjbarnabashealth"
                required
                style={{ width: '100%', padding: '0.75rem', backgroundColor: '#0f172a', border: '1px solid var(--border)', borderRadius: '6px', color: 'var(--text-primary)', fontSize: '1rem', outline: 'none', resize: 'vertical', minHeight: '80px' }}
              />
            </div>
            <div className="form-group">
              <label>Include Only Postings Newer Than (Days)</label>
              <input 
                type="number" 
                min="1"
                max="365"
                value={config.maxDaysOld} 
                onChange={e => setConfig({...config, maxDaysOld: parseInt(e.target.value)})} 
                required
              />
            </div>
            <button type="submit" className="btn-primary" disabled={saving}>
              <Save size={18} /> {saving ? 'Saving...' : 'Save Configuration'}
            </button>
          </form>
        </div>
      </aside>

      <main>
        <div className="card" style={{ height: '100%' }}>
          <h2 className="card-title"><Briefcase size={20} /> Job Matches</h2>
          
          {jobs.length === 0 ? (
            <div className="empty-state">
              <Briefcase size={48} style={{ opacity: 0.2, marginBottom: '1rem' }} />
              <p>No jobs found yet.</p>
              <p style={{ fontSize: '0.875rem', marginTop: '0.5rem' }}>Start the agent to begin monitoring.</p>
            </div>
          ) : (
            <div className="job-list">
              {jobs.map(job => (
                <div key={job.id} className="job-item">
                  <div className="job-header">
                    <a href={job.url} target="_blank" rel="noreferrer" className="job-title">
                      {job.title}
                    </a>
                    <span className="badge">{job.type}</span>
                  </div>
                  <div className="job-details">
                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <MapPin size={14} /> {job.location}
                    </span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Clock size={14} /> {new Date(job.datePosted).toLocaleDateString()}
                    </span>
                  </div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--success)' }}>
                    Matched: {job.matchedCriteria}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

export default App;
