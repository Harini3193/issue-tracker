import React, { useState, useEffect } from 'react';

const API_BASE = 'http://localhost:8000/api';

export default function App() {
  // Authentication State
  const [currentUser, setCurrentUser] = useState(() => {
    const saved = localStorage.getItem('currentUser');
    return saved ? JSON.parse(saved) : null;
  });
  const [isLoggedIn, setIsLoggedIn] = useState(!!currentUser);
  const [authView, setAuthView] = useState('login'); // 'login' | 'signup'
  const [usernameInput, setUsernameInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [emailInput, setEmailInput] = useState('');
  const [roleInput, setRoleInput] = useState('Submitter');
  const [authError, setAuthError] = useState('');

  // Navigation & Views
  const [activePage, setActivePage] = useState('dashboard'); // 'dashboard' | 'issues' | 'search'
  const [selectedIssueId, setSelectedIssueId] = useState(null);
  
  // Data Store
  const [issues, setIssues] = useState([]);
  const [users, setUsers] = useState([]);
  const [statuses, setStatuses] = useState([]);
  const [globalLogs, setGlobalLogs] = useState([]);
  
  // Issue Detail States
  const [selectedIssue, setSelectedIssue] = useState(null);
  const [issueComments, setIssueComments] = useState([]);
  const [issueLogs, setIssueLogs] = useState([]);
  const [newComment, setNewComment] = useState('');
  
  // Search State
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  
  // Create Modal State
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newAssigneeId, setNewAssigneeId] = useState('');
  
  // Client Side Filtering on Issues Page
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [filterAssignee, setFilterAssignee] = useState('ALL');
  const [filterText, setFilterText] = useState('');

  // Load Base Data when logged in
  useEffect(() => {
    if (isLoggedIn) {
      fetchBaseData();
    }
  }, [isLoggedIn]);

  // Poll for global logs every 10 seconds to keep Dashboard timeline updated
  useEffect(() => {
    const timer = setInterval(() => {
      if (isLoggedIn && activePage === 'dashboard' && !selectedIssueId) {
        fetchGlobalLogs();
      }
    }, 10000);
    return () => clearInterval(timer);
  }, [isLoggedIn, activePage, selectedIssueId]);

  // Load Issue Details when Selected
  useEffect(() => {
    if (isLoggedIn && selectedIssueId) {
      fetchIssueDetails(selectedIssueId);
    } else {
      setSelectedIssue(null);
      setIssueComments([]);
      setIssueLogs([]);
    }
  }, [isLoggedIn, selectedIssueId]);

  const fetchBaseData = async () => {
    try {
      // Fetch users
      const usersRes = await fetch(`${API_BASE}/users`);
      const usersData = await usersRes.json();
      setUsers(usersData);

      // Fetch statuses
      const statusRes = await fetch(`${API_BASE}/status`);
      const statusData = await statusRes.json();
      setStatuses(statusData);

      // Fetch issues
      const issuesRes = await fetch(`${API_BASE}/issues`);
      const issuesData = await issuesRes.json();
      setIssues(issuesData);

      // Fetch global activity logs
      fetchGlobalLogs();
    } catch (err) {
      console.error('Error fetching base data:', err);
    }
  };

  const fetchGlobalLogs = async () => {
    try {
      const logsRes = await fetch(`${API_BASE}/issues/logs`);
      if (logsRes.ok) {
        const logsData = await logsRes.json();
        setGlobalLogs(logsData);
      }
    } catch (err) {
      console.error('Error fetching global logs:', err);
    }
  };

  const fetchIssueDetails = async (id) => {
    try {
      // Fetch issue object
      const issueRes = await fetch(`${API_BASE}/issues/${id}`);
      if (issueRes.ok) {
        const issueData = await issueRes.json();
        setSelectedIssue(issueData);
      }

      // Fetch comments from FastAPI via Spring Boot proxy
      const commentsRes = await fetch(`${API_BASE}/issues/${id}/comments`);
      if (commentsRes.ok) {
        const commentsData = await commentsRes.json();
        setIssueComments(commentsData);
      }

      // Fetch audit logs from FastAPI via Spring Boot proxy
      const logsRes = await fetch(`${API_BASE}/issues/${id}/logs`);
      if (logsRes.ok) {
        const logsData = await logsRes.json();
        setIssueLogs(logsData);
      }
    } catch (err) {
      console.error('Error loading issue details:', err);
    }
  };

  // Auth Operations
  const handleLogin = async (e) => {
    e.preventDefault();
    setAuthError('');
    if (!usernameInput.trim() || !passwordInput.trim()) return;

    try {
      const res = await fetch(`${API_BASE}/users/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: usernameInput, password: passwordInput })
      });

      if (res.ok) {
        const userData = await res.json();
        localStorage.setItem('currentUser', JSON.stringify(userData));
        setCurrentUser(userData);
        setIsLoggedIn(true);
        // Clear forms
        setUsernameInput('');
        setPasswordInput('');
      } else {
        const errorData = await res.json();
        setAuthError(errorData.message || 'Invalid username or password.');
      }
    } catch (err) {
      setAuthError('Connection refused. Is the Spring Boot backend running?');
    }
  };

  const handleSignup = async (e) => {
    e.preventDefault();
    setAuthError('');
    if (!usernameInput.trim() || !emailInput.trim() || !passwordInput.trim()) return;

    const payload = {
      username: usernameInput,
      email: emailInput,
      password: passwordInput,
      role: roleInput
    };

    try {
      const res = await fetch(`${API_BASE}/users/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        const userData = await res.json();
        // Log them in immediately upon successful registration
        localStorage.setItem('currentUser', JSON.stringify(userData));
        setCurrentUser(userData);
        setIsLoggedIn(true);
        // Clear forms
        setUsernameInput('');
        setPasswordInput('');
        setEmailInput('');
        setRoleInput('Submitter');
      } else {
        const errorData = await res.json();
        setAuthError(errorData.message || 'Signup failed.');
      }
    } catch (err) {
      setAuthError('Connection error. Please try again.');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('currentUser');
    setCurrentUser(null);
    setIsLoggedIn(false);
    setSelectedIssueId(null);
    setActivePage('dashboard');
  };

  // Issue Operations
  const handleCreateIssue = async (e) => {
    e.preventDefault();
    if (!newTitle.trim() || !newDescription.trim()) return;

    const chosenStatus = statuses.find(s => s.name === 'OPEN') || statuses[0];
    const chosenAssignee = users.find(u => u.id === parseInt(newAssigneeId)) || null;

    const payload = {
      title: newTitle,
      description: newDescription,
      status: chosenStatus,
      assignedTo: chosenAssignee,
      createdBy: currentUser
    };

    try {
      const res = await fetch(`${API_BASE}/issues`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        // Reset form
        setNewTitle('');
        setNewDescription('');
        setNewAssigneeId('');
        setIsCreateOpen(false);
        
        // Refresh
        await fetchBaseData();
        setActivePage('issues');
      }
    } catch (err) {
      console.error('Error creating issue:', err);
    }
  };

  const handleUpdateStatus = async (statusId) => {
    if (!selectedIssue || !currentUser) return;
    const targetStatus = statuses.find(s => s.id === parseInt(statusId));
    if (!targetStatus) return;

    const updatedPayload = {
      ...selectedIssue,
      status: targetStatus
    };

    try {
      const res = await fetch(`${API_BASE}/issues/${selectedIssue.id}?updater=${currentUser.username}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedPayload)
      });

      if (res.ok) {
        fetchIssueDetails(selectedIssue.id);
        fetchBaseData();
      }
    } catch (err) {
      console.error('Error updating status:', err);
    }
  };

  const handleUpdateAssignee = async (assigneeId) => {
    if (!selectedIssue || !currentUser) return;
    const targetAssignee = users.find(u => u.id === parseInt(assigneeId)) || null;

    const updatedPayload = {
      ...selectedIssue,
      assignedTo: targetAssignee
    };

    try {
      const res = await fetch(`${API_BASE}/issues/${selectedIssue.id}?updater=${currentUser.username}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedPayload)
      });

      if (res.ok) {
        fetchIssueDetails(selectedIssue.id);
        fetchBaseData();
      }
    } catch (err) {
      console.error('Error updating assignee:', err);
    }
  };

  const handleAddComment = async (e) => {
    e.preventDefault();
    if (!newComment.trim() || !selectedIssue || !currentUser) return;

    const payload = {
      author: currentUser.username,
      content: newComment
    };

    try {
      const res = await fetch(`${API_BASE}/issues/${selectedIssue.id}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        setNewComment('');
        fetchIssueDetails(selectedIssue.id);
      }
    } catch (err) {
      console.error('Error adding comment:', err);
    }
  };

  const handleSemanticSearch = async (e) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    setIsSearching(true);
    try {
      const res = await fetch(`${API_BASE}/issues/search?query=${encodeURIComponent(searchQuery)}`);
      if (res.ok) {
        const data = await res.json();
        setSearchResults(data);
      }
    } catch (err) {
      console.error('Error executing semantic search:', err);
    } finally {
      setIsSearching(false);
    }
  };

  // Helper formatting dates
  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Filter Issues
  const filteredIssues = issues.filter(issue => {
    const matchesStatus = filterStatus === 'ALL' || issue.status.name === filterStatus;
    const matchesAssignee = filterAssignee === 'ALL' || 
      (filterAssignee === 'UNASSIGNED' && !issue.assignedTo) ||
      (issue.assignedTo && issue.assignedTo.id === parseInt(filterAssignee));
    const matchesText = filterText.trim() === '' || 
      issue.title.toLowerCase().includes(filterText.toLowerCase()) || 
      issue.description.toLowerCase().includes(filterText.toLowerCase());
    return matchesStatus && matchesAssignee && matchesText;
  });

  /* -------------------------------------------------------------
     AUTH LAYOUT SCREEN (If not logged in)
     ------------------------------------------------------------- */
  if (!isLoggedIn) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '100vh',
        width: '100vw',
        padding: '20px'
      }}>
        {authView === 'login' ? (
          <div className="modal-content" style={{ maxWidth: '400px' }}>
            <div className="modal-header">
              <h2 className="modal-title" style={{ fontSize: '1.6rem', background: 'var(--color-accent-grad)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>ResolveIt Sign In</h2>
            </div>
            
            {authError && (
              <div style={{ 
                color: '#ef4444', 
                fontSize: '0.85rem', 
                marginBottom: '16px', 
                background: 'rgba(239, 68, 68, 0.1)', 
                padding: '10px 14px', 
                borderRadius: '8px', 
                border: '1px solid rgba(239, 68, 68, 0.2)' 
              }}>
                {authError}
              </div>
            )}

            <form onSubmit={handleLogin}>
              <div className="form-group">
                <label className="form-label">Username</label>
                <input 
                  type="text" 
                  className="form-input" 
                  placeholder="Enter your username"
                  value={usernameInput}
                  onChange={(e) => setUsernameInput(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Password</label>
                <input 
                  type="password" 
                  className="form-input" 
                  placeholder="Enter your password"
                  value={passwordInput}
                  onChange={(e) => setPasswordInput(e.target.value)}
                  required
                />
              </div>

              <button type="submit" className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', marginTop: '12px' }}>
                Sign In
              </button>

              <div style={{ marginTop: '20px', textAlign: 'center', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                Don't have an account?{' '}
                <span 
                  style={{ color: 'var(--color-primary)', cursor: 'pointer', fontWeight: '600' }} 
                  onClick={() => { setAuthView('signup'); setAuthError(''); }}
                >
                  Sign Up
                </span>
              </div>
            </form>
            
            <div style={{ marginTop: '24px', borderTop: '1px solid var(--border-glass)', paddingTop: '16px', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              <strong>Demo credentials:</strong><br />
              Username: <code>admin</code> or <code>john_dev</code><br />
              Password: <code>password123</code>
            </div>
          </div>
        ) : (
          <div className="modal-content" style={{ maxWidth: '450px' }}>
            <div className="modal-header">
              <h2 className="modal-title" style={{ fontSize: '1.6rem', background: 'var(--color-accent-grad)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Create ResolveIt Account</h2>
            </div>
            
            {authError && (
              <div style={{ 
                color: '#ef4444', 
                fontSize: '0.85rem', 
                marginBottom: '16px', 
                background: 'rgba(239, 68, 68, 0.1)', 
                padding: '10px 14px', 
                borderRadius: '8px', 
                border: '1px solid rgba(239, 68, 68, 0.2)' 
              }}>
                {authError}
              </div>
            )}

            <form onSubmit={handleSignup}>
              <div className="form-group">
                <label className="form-label">Username</label>
                <input 
                  type="text" 
                  className="form-input" 
                  placeholder="Choose a username"
                  value={usernameInput}
                  onChange={(e) => setUsernameInput(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Email Address</label>
                <input 
                  type="email" 
                  className="form-input" 
                  placeholder="you@example.com"
                  value={emailInput}
                  onChange={(e) => setEmailInput(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Password</label>
                <input 
                  type="password" 
                  className="form-input" 
                  placeholder="Create a strong password"
                  value={passwordInput}
                  onChange={(e) => setPasswordInput(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">System Role</label>
                <select 
                  className="form-select"
                  value={roleInput}
                  onChange={(e) => setRoleInput(e.target.value)}
                  required
                >
                  <option value="Submitter">Submitter (Report bugs)</option>
                  <option value="Developer">Developer (Resolve bugs)</option>
                  <option value="Admin">System Administrator</option>
                </select>
              </div>

              <button type="submit" className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', marginTop: '12px' }}>
                Register Account
              </button>

              <div style={{ marginTop: '20px', textAlign: 'center', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                Already have an account?{' '}
                <span 
                  style={{ color: 'var(--color-primary)', cursor: 'pointer', fontWeight: '600' }} 
                  onClick={() => { setAuthView('login'); setAuthError(''); }}
                >
                  Sign In
                </span>
              </div>
            </form>
          </div>
        )}
      </div>
    );
  }

  /* -------------------------------------------------------------
     MAIN APP LAYOUT (If logged in)
     ------------------------------------------------------------- */
  return (
    <div className="app-container">
      {/* Sidebar Navigation */}
      <aside className="sidebar">
        <div className="sidebar-logo">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{color: '#3b82f6'}}>
            <path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z"></path>
            <path d="M12 8v4"></path>
            <path d="M12 16h.01"></path>
          </svg>
          <span>ResolveIt</span>
        </div>

        <nav style={{ flexGrow: 1 }}>
          <ul className="sidebar-menu">
            <li 
              className={`sidebar-item ${activePage === 'dashboard' && !selectedIssueId ? 'active' : ''}`}
              onClick={() => { setActivePage('dashboard'); setSelectedIssueId(null); }}
            >
              <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <rect x="3" y="3" width="7" height="9" rx="1" />
                <rect x="14" y="3" width="7" height="5" rx="1" />
                <rect x="14" y="12" width="7" height="9" rx="1" />
                <rect x="3" y="16" width="7" height="5" rx="1" />
              </svg>
              Dashboard
            </li>
            <li 
              className={`sidebar-item ${activePage === 'issues' && !selectedIssueId ? 'active' : ''}`}
              onClick={() => { setActivePage('issues'); setSelectedIssueId(null); }}
            >
              <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z"/>
                <path d="m9 12 2 2 4-4"/>
              </svg>
              Issue Board
            </li>
            <li 
              className={`sidebar-item ${activePage === 'search' && !selectedIssueId ? 'active' : ''}`}
              onClick={() => { setActivePage('search'); setSelectedIssueId(null); }}
            >
              <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <circle cx="11" cy="11" r="8"/>
                <path d="m21 21-4.3-4.3"/>
              </svg>
              Semantic Search
            </li>
          </ul>
        </nav>

        {/* User Card & Log Out */}
        <div className="sidebar-footer">
          {currentUser && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span className="avatar" style={{ margin: 0, width: '32px', height: '32px', fontSize: '0.9rem' }}>
                  {currentUser.username[0].toUpperCase()}
                </span>
                <div>
                  <div className="sidebar-user">{currentUser.username}</div>
                  <div className="sidebar-user-role">{currentUser.role}</div>
                </div>
              </div>
              <button className="btn btn-secondary" style={{ padding: '6px 10px', fontSize: '0.8rem', width: '100%', justifyContent: 'center' }} onClick={handleLogout}>
                <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" style={{ marginRight: '4px' }}>
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/>
                </svg>
                Sign Out
              </button>
            </div>
          )}
        </div>
      </aside>

      {/* Main Content Router */}
      <main className="main-content">
        
        {/* VIEW: ISSUE DETAILS VIEW */}
        {selectedIssueId && selectedIssue ? (
          <div>
            <div className="page-header">
              <div>
                <button className="btn btn-secondary" style={{ marginBottom: '16px' }} onClick={() => setSelectedIssueId(null)}>
                  &larr; Back to List
                </button>
                <h1 className="page-title">{selectedIssue.title}</h1>
                <div style={{ marginTop: '4px' }}>
                  <span className={`badge badge-${selectedIssue.status.name.toLowerCase().replace('_', '')}`}>
                    {selectedIssue.status.name.replace('_', ' ')}
                  </span>
                  <span style={{ marginLeft: '12px', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                    Created by <strong>{selectedIssue.createdBy.username}</strong> on {formatDate(selectedIssue.createdAt)}
                  </span>
                </div>
              </div>
            </div>

            <div className="detail-layout">
              {/* Left Column: Details & Comments */}
              <div className="detail-main">
                <div className="glass-card">
                  <h3 className="form-label" style={{ marginBottom: '12px' }}>Description</h3>
                  <div className="detail-description">{selectedIssue.description}</div>
                </div>

                {/* MongoDB Comments Thread */}
                <div className="glass-card comments-section">
                  <h3 className="form-label">Discussion Comments (Stored in MongoDB)</h3>
                  
                  <form onSubmit={handleAddComment} className="comment-input-box">
                    <textarea 
                      className="form-textarea"
                      placeholder="Ask a question or add resolution progress notes..."
                      value={newComment}
                      onChange={(e) => setNewComment(e.target.value)}
                    ></textarea>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                        Posting as <strong>{currentUser?.username}</strong>
                      </span>
                      <button type="submit" className="btn btn-primary" style={{ padding: '8px 16px' }}>
                        Post Comment
                      </button>
                    </div>
                  </form>

                  <div className="comments-list">
                    {issueComments.length === 0 ? (
                      <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', textAlign: 'center', padding: '12px 0' }}>
                        No comments on this issue yet.
                      </p>
                    ) : (
                      issueComments.map((comment) => (
                        <div key={comment._id} className="comment-card">
                          <div className="comment-header">
                            <span className="comment-author">
                              <span className="avatar">{comment.author[0].toUpperCase()}</span>
                              {comment.author}
                            </span>
                            <span className="comment-date">{formatDate(comment.created_at)}</span>
                          </div>
                          <div className="comment-body">{comment.content}</div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>

              {/* Right Column: Sidebar Actions & Audit Logs */}
              <div className="detail-sidebar">
                <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <h3 className="form-label" style={{ borderBottom: '1px solid var(--border-glass)', paddingBottom: '8px' }}>Properties</h3>
                  
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label">Status</label>
                    <select 
                      className="form-select" 
                      value={selectedIssue.status.id}
                      onChange={(e) => handleUpdateStatus(e.target.value)}
                      disabled={currentUser?.role === 'Submitter'}
                    >
                      {statuses.map(s => (
                        <option key={s.id} value={s.id}>{s.name.replace('_', ' ')}</option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label">Assignee</label>
                    <select 
                      className="form-select" 
                      value={selectedIssue.assignedTo ? selectedIssue.assignedTo.id : ''}
                      onChange={(e) => handleUpdateAssignee(e.target.value)}
                      disabled={currentUser?.role === 'Submitter'}
                    >
                      <option value="">Unassigned</option>
                      {users.map(u => (
                        <option key={u.id} value={u.id}>{u.username} ({u.role})</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* MongoDB Audit Logs */}
                <div className="glass-card">
                  <h3 className="form-label" style={{ marginBottom: '16px' }}>Audit Log History</h3>
                  <div className="timeline">
                    {issueLogs.length === 0 ? (
                      <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>No activity logged.</p>
                    ) : (
                      issueLogs.map((log) => (
                        <div key={log._id} className="timeline-item">
                          <span className="timeline-dot"></span>
                          <div className="timeline-header">
                            <span className="timeline-action">{log.action}</span>
                            <span className="timeline-time">{formatDate(log.created_at)}</span>
                          </div>
                          <div className="timeline-details">{log.details}</div>
                          <div className="timeline-user">by {log.performed_by}</div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : activePage === 'dashboard' ? (
          /* VIEW: DASHBOARD */
          <div>
            <div className="page-header">
              <div>
                <h1 className="page-title">Dashboard</h1>
                <p className="page-subtitle">Track key system stability metrics and resolved bugs.</p>
              </div>
              <button className="btn btn-primary" onClick={() => setIsCreateOpen(true)}>
                <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                  <path d="M12 5v14M5 12h14"/>
                </svg>
                New Issue
              </button>
            </div>

            {/* Statistics Row */}
            <div className="stats-grid">
              <div className="glass-card stat-card">
                <span className="stat-label">Total Reported</span>
                <span className="stat-value">{issues.length}</span>
                <span className="stat-change">Lifetime bugs</span>
              </div>
              <div className="glass-card stat-card" style={{ borderLeft: '3px solid #3b82f6' }}>
                <span className="stat-label">Open Issues</span>
                <span className="stat-value">{issues.filter(i => i.status.name === 'OPEN').length}</span>
                <span className="stat-change" style={{color: '#60a5fa'}}>Requires action</span>
              </div>
              <div className="glass-card stat-card" style={{ borderLeft: '3px solid #eab308' }}>
                <span className="stat-label">In Progress</span>
                <span className="stat-value">{issues.filter(i => i.status.name === 'IN_PROGRESS').length}</span>
                <span className="stat-change" style={{color: '#facc15'}}>Actively coding</span>
              </div>
              <div className="glass-card stat-card" style={{ borderLeft: '3px solid #22c55e' }}>
                <span className="stat-label">Resolved</span>
                <span className="stat-value">{issues.filter(i => i.status.name === 'RESOLVED' || i.status.name === 'CLOSED').length}</span>
                <span className="stat-change positive">✓ Completed</span>
              </div>
            </div>

            {/* Recent Issues Table & Global Log Activity Timeline */}
            <div className="dashboard-sections">
              {/* Left Column: Recent Issues */}
              <div className="glass-card">
                <h3 className="form-label" style={{ marginBottom: '16px' }}>Recent Reported Issues (SQL Data)</h3>
                <div className="issues-table-container">
                  <table className="issues-table">
                    <thead>
                      <tr>
                        <th>Issue</th>
                        <th>Status</th>
                        <th>Assignee</th>
                        <th>Reported</th>
                      </tr>
                    </thead>
                    <tbody>
                      {issues.slice(0, 5).map((issue) => (
                        <tr key={issue.id} onClick={() => setSelectedIssueId(issue.id)}>
                          <td>
                            <div className="issue-title-cell">{issue.title}</div>
                            <span className="issue-desc-preview">{issue.description}</span>
                          </td>
                          <td>
                            <span className={`badge badge-${issue.status.name.toLowerCase().replace('_', '')}`}>
                              {issue.status.name.replace('_', ' ')}
                            </span>
                          </td>
                          <td>
                            {issue.assignedTo ? (
                              <span>
                                <span className="avatar">{issue.assignedTo.username[0].toUpperCase()}</span>
                                {issue.assignedTo.username}
                              </span>
                            ) : (
                              <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Unassigned</span>
                            )}
                          </td>
                          <td style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                            {formatDate(issue.createdAt)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Right Column: Global Action Audit Stream */}
              <div className="glass-card">
                <h3 className="form-label" style={{ marginBottom: '16px' }}>Live Activity Stream (MongoDB Data)</h3>
                <div className="timeline">
                  {globalLogs.slice(0, 6).map((log) => (
                    <div key={log._id} className="timeline-item">
                      <span className="timeline-dot" style={{ background: log.action === 'CREATED' ? '#3b82f6' : log.action === 'COMMENT_ADDED' ? '#8b5cf6' : '#eab308' }}></span>
                      <div className="timeline-header">
                        <span className="timeline-action">{log.action}</span>
                        <span className="timeline-time">{formatDate(log.created_at)}</span>
                      </div>
                      <div className="timeline-details" style={{ fontSize: '0.75rem' }}>
                        Issue #{log.issue_id}: {log.details}
                      </div>
                      <div className="timeline-user" style={{ fontSize: '0.7rem' }}>by {log.performed_by}</div>
                    </div>
                  ))}
                  {globalLogs.length === 0 && (
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', textAlign: 'center' }}>No activities recorded yet.</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        ) : activePage === 'issues' ? (
          /* VIEW: ISSUES LIST BOARD */
          <div>
            <div className="page-header">
              <div>
                <h1 className="page-title">Issue Board</h1>
                <p className="page-subtitle">Filter, inspect, and update reported bug logs.</p>
              </div>
              <button className="btn btn-primary" onClick={() => setIsCreateOpen(true)}>
                <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                  <path d="M12 5v14M5 12h14"/>
                </svg>
                New Issue
              </button>
            </div>

            {/* Filters bar */}
            <div className="glass-card" style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', marginBottom: '24px', padding: '16px' }}>
              <div style={{ flexGrow: 1, minWidth: '200px' }}>
                <input 
                  type="text" 
                  className="form-input" 
                  placeholder="Filter issues by title or description text..."
                  value={filterText}
                  onChange={(e) => setFilterText(e.target.value)}
                  style={{ padding: '8px 12px', fontSize: '0.85rem' }}
                />
              </div>

              <div>
                <select 
                  className="form-select" 
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  style={{ padding: '8px 12px', fontSize: '0.85rem', minWidth: '130px' }}
                >
                  <option value="ALL">All Statuses</option>
                  {statuses.map(s => (
                    <option key={s.id} value={s.name}>{s.name.replace('_', ' ')}</option>
                  ))}
                </select>
              </div>

              <div>
                <select 
                  className="form-select" 
                  value={filterAssignee}
                  onChange={(e) => setFilterAssignee(e.target.value)}
                  style={{ padding: '8px 12px', fontSize: '0.85rem', minWidth: '150px' }}
                >
                  <option value="ALL">All Assignees</option>
                  <option value="UNASSIGNED">Unassigned</option>
                  {users.map(u => (
                    <option key={u.id} value={u.id}>{u.username}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Issues Table */}
            <div className="glass-card">
              <div className="issues-table-container">
                <table className="issues-table">
                  <thead>
                    <tr>
                      <th style={{ width: '60px' }}>ID</th>
                      <th>Title & Description</th>
                      <th>Status</th>
                      <th>Assignee</th>
                      <th>Created By</th>
                      <th>Last Updated</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredIssues.map((issue) => (
                      <tr key={issue.id} onClick={() => setSelectedIssueId(issue.id)}>
                        <td style={{ color: 'var(--text-muted)', fontWeight: 'bold' }}>#{issue.id}</td>
                        <td>
                          <div className="issue-title-cell">{issue.title}</div>
                          <span className="issue-desc-preview">{issue.description}</span>
                        </td>
                        <td>
                          <span className={`badge badge-${issue.status.name.toLowerCase().replace('_', '')}`}>
                            {issue.status.name.replace('_', ' ')}
                          </span>
                        </td>
                        <td>
                          {issue.assignedTo ? (
                            <span>
                              <span className="avatar">{issue.assignedTo.username[0].toUpperCase()}</span>
                              {issue.assignedTo.username}
                            </span>
                          ) : (
                            <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Unassigned</span>
                          )}
                        </td>
                        <td>{issue.createdBy.username}</td>
                        <td style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                          {formatDate(issue.updatedAt)}
                        </td>
                      </tr>
                    ))}
                    {filteredIssues.length === 0 && (
                      <tr>
                        <td colSpan="6" style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)' }}>
                          No issues match the selected filters.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        ) : (
          /* VIEW: SEMANTIC VECTOR SEARCH */
          <div className="search-container">
            <div className="page-header" style={{ marginBottom: 0 }}>
              <div>
                <h1 className="page-title">Semantic Search</h1>
                <p className="page-subtitle">Query the MongoDB issue database using natural language vector search matches.</p>
              </div>
            </div>

            <form onSubmit={handleSemanticSearch} className="search-box-wrapper">
              <input 
                type="text" 
                className="search-input-field"
                placeholder="Describe your bug (e.g. 'verification error', 'Stripe checkout socket freezing', 'RAM leaking')"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <button type="submit" className="btn btn-primary" style={{ padding: '16px 28px', fontSize: '1rem', borderRadius: '12px' }}>
                {isSearching ? 'Searching...' : 'Search Vectors'}
              </button>
            </form>

            <div className="search-results">
              {searchResults.length > 0 ? (
                searchResults.map((hit) => {
                  const issue = issues.find(i => i.id === hit.issue_id);
                  if (!issue) return null;

                  // Similarity percentage helper
                  const percentScore = Math.min(100, Math.max(0, Math.round((hit.score * 100))));

                  return (
                    <div 
                      key={hit.issue_id} 
                      className="glass-card search-hit-card"
                      onClick={() => setSelectedIssueId(issue.id)}
                    >
                      <div className="search-hit-left">
                        <span style={{ fontSize: '0.8rem', fontWeight: 'bold', color: 'var(--text-muted)' }}>ISSUE #{issue.id}</span>
                        <div className="search-hit-title">{issue.title}</div>
                        <div className="search-hit-snippet">{issue.description}</div>
                        <div style={{ marginTop: '8px' }}>
                          <span className={`badge badge-${issue.status.name.toLowerCase().replace('_', '')}`}>
                            {issue.status.name.replace('_', ' ')}
                          </span>
                        </div>
                      </div>
                      
                      <div className="search-hit-score-badge">
                        <span className="score-percent">{percentScore}%</span>
                        <span className="score-label">Cosine Similarity</span>
                      </div>
                    </div>
                  );
                })
              ) : searchQuery && !isSearching ? (
                <div className="glass-card" style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)' }}>
                  No issues matched your semantic query. Try search terms like "payment", "login code", or "RAM consumption".
                </div>
              ) : (
                <div className="glass-card" style={{ padding: '32px' }}>
                  <h4 className="form-label" style={{ marginBottom: '12px' }}>Try Example Searches:</h4>
                  <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <li style={{ cursor: 'pointer', color: 'var(--color-primary)' }} onClick={() => { setSearchQuery('Login failure issues'); }}>
                      &rarr; "Login failure issues" (matches Google OAuth verification problems)
                    </li>
                    <li style={{ cursor: 'pointer', color: 'var(--color-primary)' }} onClick={() => { setSearchQuery('Payment related bugs'); }}>
                      &rarr; "Payment related bugs" (matches Stripe checkout gateway timeouts)
                    </li>
                    <li style={{ cursor: 'pointer', color: 'var(--color-primary)' }} onClick={() => { setSearchQuery('Memory consumption problem'); }}>
                      &rarr; "Memory consumption problem" (matches Node RAM worker thread issues)
                    </li>
                  </ul>
                </div>
              )}
            </div>
          </div>
        )}

      </main>

      {/* -------------------------------------------------------------
         CREATE NEW ISSUE MODAL COMPONENT
         ------------------------------------------------------------- */}
      {isCreateOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h2 className="modal-title">Report New System Bug</h2>
              <button className="modal-close-btn" onClick={() => setIsCreateOpen(false)}>&times;</button>
            </div>
            
            <form onSubmit={handleCreateIssue}>
              <div className="form-group">
                <label className="form-label">Issue Title</label>
                <input 
                  type="text" 
                  className="form-input" 
                  placeholder="Brief summary of the issue..."
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Description Details</label>
                <textarea 
                  className="form-textarea" 
                  placeholder="Please describe steps to reproduce the issue, errors logs, or symptoms..."
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  required
                ></textarea>
              </div>

              <div className="form-group">
                <label className="form-label">Assignee</label>
                <select 
                  className="form-select"
                  value={newAssigneeId}
                  onChange={(e) => setNewAssigneeId(e.target.value)}
                >
                  <option value="">Choose Developer (Optional)</option>
                  {users.filter(u => u.role === 'Developer' || u.role === 'Admin').map(u => (
                    <option key={u.id} value={u.id}>{u.username} ({u.role})</option>
                  ))}
                </select>
              </div>

              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '16px' }}>
                Reporting as user: <strong>{currentUser?.username} ({currentUser?.role})</strong>
              </div>

              <div className="modal-actions">
                <button type="button" className="btn btn-secondary" onClick={() => setIsCreateOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Submit Issue
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
