import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { Plus, Search, LogOut, MessageSquare, AlertCircle, BarChart2, Filter, Users, Trash2, Clock } from 'lucide-react';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { io } from 'socket.io-client';

const API_URL = import.meta.env.VITE_API_URL || '/api-gateway';
const SPRING_URL = import.meta.env.VITE_SPRING_URL || '/spring-api';
const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || '/socket.io';

const Dashboard = () => {
  const [issues, setIssues] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [usersList, setUsersList] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [viewMode, setViewMode] = useState('all'); // 'all' or 'assigned'
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isAdminModalOpen, setIsAdminModalOpen] = useState(false);
  const [showAnalytics, setShowAnalytics] = useState(true);
  const [newIssue, setNewIssue] = useState({ title: '', description: '', category: 'Login Issues' });
  const [toastMessage, setToastMessage] = useState('');
  
  const { user, logout, getAuthHeader } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    fetchIssues();
    fetchAnalytics();
    
    // Setup WebSocket
    const socket = io(`http://${window.location.hostname}:3000`);
    socket.on('issue_update', (log) => {
      setToastMessage(`Update: ${log.action.replace('_', ' ')} by ${log.performed_by}`);
      setTimeout(() => setToastMessage(''), 5000);
      fetchIssues(); // Refresh list automatically
      fetchAnalytics();
    });

    return () => socket.disconnect();
  }, []);

  const fetchIssues = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/issues`, { headers: getAuthHeader() });
      setIssues(response.data);
    } catch (err) {
      console.error('Failed to fetch issues', err);
    }
  };

  const fetchAnalytics = async () => {
    try {
      const response = await axios.get(`${SPRING_URL}/api/analytics`, { headers: getAuthHeader() });
      setAnalytics(response.data);
    } catch (err) {
      console.error('Failed to fetch analytics', err);
    }
  };

  const fetchUsers = async () => {
    try {
      const response = await axios.get(`${SPRING_URL}/api/users`, { headers: getAuthHeader() });
      setUsersList(response.data);
    } catch (err) {
      console.error('Failed to fetch users', err);
    }
  };

  const handleDeleteUser = async (id) => {
    if (!window.confirm('Delete this user?')) return;
    try {
      await axios.delete(`${SPRING_URL}/api/users/${id}`, { headers: getAuthHeader() });
      fetchUsers(); // Refresh list
    } catch (err) {
      console.error('Failed to delete user', err);
      alert('Could not delete user. They might have issues associated with them.');
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
      const issuePayload = { ...newIssue, status: { id: 1, name: 'OPEN' }, createdBy: { id: user.id } };
      const response = await axios.post(`${API_URL}/api/issues`, issuePayload, { headers: getAuthHeader() });
      const createdIssue = response.data;
      
      setIsModalOpen(false);
      setNewIssue({ title: '', description: '', category: 'Login Issues' });
      fetchIssues();
      fetchAnalytics();
    } catch (err) {
      console.error('Failed to create issue', err);
      const errorMsg = err.response?.data?.message || err.response?.data?.error || err.message;
      alert(`Failed to create issue: ${errorMsg}. If you recently restarted the server, please log out and log back in, as your session may be out of sync with the database.`);
    }
  };

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#a288ff', '#ff6b6b'];

  const filteredIssues = useMemo(() => {
    return issues.filter(issue => {
      if (filterCategory && issue.category !== filterCategory) return false;
      if (filterStatus && issue.status?.name !== filterStatus) return false;
      if (viewMode === 'assigned' && issue.assignedTo?.id !== user.id) return false;
      return true;
    });
  }, [issues, filterCategory, filterStatus, viewMode, user.id]);

  const pieData = useMemo(() => {
    if (!analytics) return [];
    return Object.entries(analytics.issuesByStatus || {}).map(([name, value]) => ({ name, value }));
  }, [analytics]);

  const barData = useMemo(() => {
    if (!analytics) return [];
    return Object.entries(analytics.issuesByCategory || {}).map(([name, value]) => ({ name, value }));
  }, [analytics]);

  const isAdmin = user?.roles?.includes('ROLE_ADMIN');
  const isEngineer = user?.roles?.includes('ROLE_SUPPORT_ENGINEER');

  return (
    <div className="container py-6">
      {/* Toast Notification */}
      {toastMessage && (
        <div style={{ position: 'fixed', bottom: '20px', right: '20px', background: 'var(--success)', color: '#fff', padding: '15px 25px', borderRadius: '8px', zIndex: 9999, boxShadow: '0 4px 12px rgba(0,0,0,0.5)', animation: 'fadeIn 0.3s ease' }}>
          {toastMessage}
        </div>
      )}

      <header className="flex" style={{ justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h1 className="gradient-text" style={{ fontSize: '2.5rem' }}>Issue Tracker</h1>
          <p style={{ color: 'var(--text-secondary)' }}>Welcome back, {user?.username} ({user?.roles?.[0]?.replace('ROLE_', '')})</p>
        </div>
        <div className="flex" style={{ gap: '1rem' }}>
          {isAdmin && (
            <button className="btn btn-secondary" onClick={() => { fetchUsers(); setIsAdminModalOpen(true); }}>
              <Users size={18} /> Manage Users
            </button>
          )}
          <button className="btn btn-secondary" onClick={() => setShowAnalytics(!showAnalytics)}>
            <BarChart2 size={18} /> {showAnalytics ? 'Hide Analytics' : 'Show Analytics'}
          </button>
          <button className="btn btn-secondary" onClick={logout}>
            <LogOut size={18} /> Logout
          </button>
          <button className="btn btn-primary" onClick={() => setIsModalOpen(true)}>
            <Plus size={18} /> New Issue
          </button>
        </div>
      </header>

      {showAnalytics && (
        <div className="animate-fade-in mb-6">
          {!analytics ? (
            <div className="glass-panel p-6 text-center" style={{ color: 'var(--text-secondary)' }}>
              Loading analytics data... (If this persists, check console for API errors)
            </div>
          ) : (
            <>
              <div className="grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)', gap: '15px', marginBottom: '20px' }}>
                <div className="glass-card p-4 text-center">
                  <h3 style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Total Issues</h3>
                  <p style={{ fontSize: '2rem', fontWeight: 'bold', margin: '5px 0 0' }}>{analytics.totalIssues}</p>
                </div>
                <div className="glass-card p-4 text-center">
                  <h3 style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Open Issues</h3>
                  <p style={{ fontSize: '2rem', fontWeight: 'bold', margin: '5px 0 0', color: 'var(--primary)' }}>{analytics.openIssues}</p>
                </div>
                <div className="glass-card p-4 text-center">
                  <h3 style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Resolved</h3>
                  <p style={{ fontSize: '2rem', fontWeight: 'bold', margin: '5px 0 0', color: 'var(--success)' }}>{analytics.resolvedIssues}</p>
                </div>
                <div className="glass-card p-4 text-center">
                  <h3 style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Resolution Rate</h3>
                  <p style={{ fontSize: '2rem', fontWeight: 'bold', margin: '5px 0 0', color: 'var(--accent)' }}>
                    {analytics.totalIssues > 0 ? Math.round((analytics.resolvedIssues / analytics.totalIssues) * 100) : 0}%
                  </p>
                </div>
              </div>
              
              <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                <div className="glass-panel p-6">
                  <h3 className="mb-4">Issues by Status</h3>
                  <div style={{ height: 250 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={pieData} cx="50%" cy="50%" outerRadius={80} fill="#8884d8" dataKey="value" label>
                          {pieData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </div>
                <div className="glass-panel p-6">
                  <h3 className="mb-4">Issues by Category</h3>
                  <div style={{ height: 250 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={barData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                        <XAxis dataKey="name" stroke="#ccc" />
                        <YAxis stroke="#ccc" />
                        <Tooltip contentStyle={{ backgroundColor: '#1f2937', border: 'none', borderRadius: '8px' }} />
                        <Bar dataKey="value" fill="var(--primary)" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      <div className="glass-panel p-6 animate-fade-in mb-6">
        <form onSubmit={handleSearch} style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <div style={{ position: 'relative', flexGrow: 1, minWidth: '250px' }}>
            <Search style={{ position: 'absolute', top: '12px', left: '12px', color: 'var(--text-secondary)' }} size={20} />
            <input 
              type="text" 
              placeholder="Semantic search issues (e.g. 'login button not working')" 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ paddingLeft: '40px' }}
            />
          </div>
          
          <div style={{ display: 'flex', gap: '10px' }}>
            {isEngineer && (
              <select value={viewMode} onChange={(e) => setViewMode(e.target.value)} style={{ padding: '10px' }}>
                <option value="all">All Issues</option>
                <option value="assigned">Assigned To Me</option>
              </select>
            )}

            <select value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)} style={{ padding: '10px' }}>
              <option value="">All Categories</option>
              <option value="Login Issues">Login Issues</option>
              <option value="Payment Issues">Payment Issues</option>
              <option value="Performance Issues">Performance Issues</option>
              <option value="Security Issues">Security Issues</option>
              <option value="Other">Other</option>
            </select>
            
            <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} style={{ padding: '10px' }}>
              <option value="">All Statuses</option>
              <option value="OPEN">Open</option>
              <option value="IN PROGRESS">In Progress</option>
              <option value="RESOLVED">Resolved</option>
              <option value="CLOSED">Closed</option>
            </select>
            
            <button type="submit" className="btn btn-primary">Search</button>
          </div>
        </form>
      </div>

      <div className="grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px' }}>
        {filteredIssues.map((issue) => (
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
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                <span style={{background: 'rgba(255,255,255,0.1)', color: '#fff', padding: '2px 6px', borderRadius: '4px'}}>{issue.category || 'General'}</span>
                <span style={{color: issue.priority === 'Critical' ? 'var(--danger)' : 'var(--text-secondary)'}}>
                  <AlertCircle size={14} style={{display:'inline', marginRight:'2px'}}/> {issue.priority || 'Low'}
                </span>
                {issue.slaDeadline && issue.status?.name !== 'RESOLVED' && issue.status?.name !== 'CLOSED' && (
                  <span style={{color: new Date(issue.slaDeadline) < new Date() ? 'var(--danger)' : 'var(--success)'}}>
                    <Clock size={14} style={{display:'inline', marginRight:'2px'}}/> 
                    {new Date(issue.slaDeadline) < new Date() ? 'Overdue!' : 'On Track'}
                  </span>
                )}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '5px', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                <MessageSquare size={14} /> View Details
              </div>
            </div>
          </div>
        ))}
        {filteredIssues.length === 0 && (
          <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>
            No issues match your criteria.
          </div>
        )}
      </div>

      {/* NEW ISSUE MODAL */}
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
                <select value={newIssue.category || ''} onChange={e => setNewIssue({...newIssue, category: e.target.value})} style={{ flexGrow: 1 }}>
                  <option value="" disabled>Select Category</option>
                  <option value="Login Issues">Login Issues</option>
                  <option value="Payment Issues">Payment Issues</option>
                  <option value="Performance Issues">Performance Issues</option>
                  <option value="Security Issues">Security Issues</option>
                  <option value="Other">Other</option>
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

      {/* ADMIN USERS MODAL */}
      {isAdminModalOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(5px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div className="glass-panel p-6 animate-fade-in" style={{ width: '100%', maxWidth: '600px', maxHeight: '80vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2 style={{ margin: 0 }}>Manage Users</h2>
              <button className="btn btn-secondary" onClick={() => setIsAdminModalOpen(false)}>Close</button>
            </div>
            
            <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                  <th style={{ padding: '10px' }}>ID</th>
                  <th style={{ padding: '10px' }}>Username</th>
                  <th style={{ padding: '10px' }}>Role</th>
                  <th style={{ padding: '10px' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {usersList.map(u => (
                  <tr key={u.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                    <td style={{ padding: '10px' }}>{u.id}</td>
                    <td style={{ padding: '10px' }}>{u.username}</td>
                    <td style={{ padding: '10px' }}>{u.role}</td>
                    <td style={{ padding: '10px' }}>
                      <button 
                        className="btn" 
                        style={{ padding: '5px 10px', background: 'transparent', color: 'var(--danger)', border: '1px solid var(--danger)' }}
                        onClick={() => handleDeleteUser(u.id)}
                        disabled={u.id === user.id}
                      >
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
