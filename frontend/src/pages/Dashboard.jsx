import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { Plus, Search, LogOut, MessageSquare, AlertCircle } from 'lucide-react';

const API_URL = 'http://localhost:8000';

const Dashboard = () => {
  const [issues, setIssues] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newIssue, setNewIssue] = useState({ title: '', description: '', priority: 'MEDIUM', component: 'Frontend' });
  const { user, logout, getAuthHeader } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    fetchIssues();
  }, []);

  const fetchIssues = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/issues`, { headers: getAuthHeader() });
      setIssues(response.data);
    } catch (err) {
      console.error('Failed to fetch issues', err);
    }
  };

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!searchQuery.trim()) {
      fetchIssues();
      return;
    }
    try {
      const response = await axios.get(`${API_URL}/api/search?query=${searchQuery}`, { headers: getAuthHeader() });
      const searchResults = response.data.map(item => item.issue);
      setIssues(searchResults);
    } catch (err) {
      console.error('Search failed', err);
    }
  };

  const createIssue = async (e) => {
    e.preventDefault();
    try {
      const issuePayload = { ...newIssue, status: { id: 1, name: 'OPEN' }, author: user.username };
      await axios.post(`${API_URL}/api/issues`, issuePayload, { headers: getAuthHeader() });
      
      // Index the new issue
      await axios.post(`${API_URL}/api/embeddings`, {
          issue_id: Date.now(), // Real DB issue ID should be used here but assuming proxy handles it
          text: `${newIssue.title}. ${newIssue.description}`
      }, { headers: getAuthHeader() });

      setIsModalOpen(false);
      setNewIssue({ title: '', description: '', priority: 'MEDIUM', component: 'Frontend' });
      fetchIssues();
    } catch (err) {
      console.error('Failed to create issue', err);
    }
  };

  return (
    <div className="container py-6">
      <header className="flex" style={{ justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h1 className="gradient-text" style={{ fontSize: '2.5rem' }}>Issue Tracker</h1>
          <p style={{ color: 'var(--text-secondary)' }}>Welcome back, {user?.username}</p>
        </div>
        <div className="flex" style={{ gap: '1rem' }}>
          <button className="btn btn-secondary" onClick={logout}>
            <LogOut size={18} /> Logout
          </button>
          <button className="btn btn-primary" onClick={() => setIsModalOpen(true)}>
            <Plus size={18} /> New Issue
          </button>
        </div>
      </header>

      <div className="glass-panel p-6 animate-fade-in mb-6">
        <form onSubmit={handleSearch} style={{ display: 'flex', gap: '10px' }}>
          <div style={{ position: 'relative', flexGrow: 1 }}>
            <Search style={{ position: 'absolute', top: '12px', left: '12px', color: 'var(--text-secondary)' }} size={20} />
            <input 
              type="text" 
              placeholder="Semantic search issues (e.g. 'login button not working')" 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ paddingLeft: '40px' }}
            />
          </div>
          <button type="submit" className="btn btn-primary">Search</button>
        </form>
      </div>

      <div className="grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px' }}>
        {issues.map((issue) => (
          <div 
            key={issue.id} 
            className="glass-card p-6" 
            style={{ cursor: 'pointer' }}
            onClick={() => navigate(`/issues/${issue.id}`)}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '15px' }}>
              <h3 style={{ fontSize: '1.25rem', margin: 0, color: 'white' }}>{issue.title}</h3>
              <span className={`badge badge-${issue.status?.name?.toLowerCase() || 'open'}`}>
                {issue.status?.name || 'OPEN'}
              </span>
            </div>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '15px', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
              {issue.description}
            </p>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--glass-border)', paddingTop: '15px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '5px', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                <AlertCircle size={14} /> {issue.priority}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '5px', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                <MessageSquare size={14} /> View Details
              </div>
            </div>
          </div>
        ))}
        {issues.length === 0 && (
          <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>
            No issues found. Create one to get started!
          </div>
        )}
      </div>

      {isModalOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(5px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div className="glass-panel p-6 animate-fade-in" style={{ width: '100%', maxWidth: '500px' }}>
            <h2 className="mb-4">Create New Issue</h2>
            <form onSubmit={createIssue}>
              <div className="mb-4">
                <input required type="text" placeholder="Title" value={newIssue.title} onChange={e => setNewIssue({...newIssue, title: e.target.value})} />
              </div>
              <div className="mb-4">
                <textarea required placeholder="Description" rows="4" value={newIssue.description} onChange={e => setNewIssue({...newIssue, description: e.target.value})}></textarea>
              </div>
              <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
                <select value={newIssue.priority} onChange={e => setNewIssue({...newIssue, priority: e.target.value})}>
                  <option value="LOW">Low Priority</option>
                  <option value="MEDIUM">Medium Priority</option>
                  <option value="HIGH">High Priority</option>
                  <option value="CRITICAL">Critical</option>
                </select>
                <select value={newIssue.component} onChange={e => setNewIssue({...newIssue, component: e.target.value})}>
                  <option value="Frontend">Frontend</option>
                  <option value="Backend">Backend</option>
                  <option value="Database">Database</option>
                  <option value="Infrastructure">Infrastructure</option>
                </select>
              </div>
              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setIsModalOpen(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Create Issue</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
