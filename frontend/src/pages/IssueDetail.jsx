import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { ArrowLeft, Clock, MessageCircle, Send, CheckCircle, AlertTriangle } from 'lucide-react';

const API_URL = 'http://localhost:8000';

const IssueDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, getAuthHeader } = useAuth();
  
  const [issue, setIssue] = useState(null);
  const [comments, setComments] = useState([]);
  const [logs, setLogs] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchIssueData();
  }, [id]);

  const fetchIssueData = async () => {
    setLoading(true);
    try {
      const [issueRes, commentsRes, logsRes] = await Promise.all([
        axios.get(`${API_URL}/api/issues/${id}`, { headers: getAuthHeader() }),
        axios.get(`${API_URL}/api/issues/${id}/comments`, { headers: getAuthHeader() }),
        axios.get(`${API_URL}/api/issues/${id}/logs`, { headers: getAuthHeader() })
      ]);
      setIssue(issueRes.data);
      setComments(commentsRes.data || []);
      setLogs(logsRes.data || []);
    } catch (err) {
      console.error('Failed to fetch issue details', err);
    }
    setLoading(false);
  };

  const handleAddComment = async (e) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    try {
      await axios.post(`${API_URL}/api/issues/${id}/comments`, {
        author: user.username,
        content: newComment
      }, { headers: getAuthHeader() });
      
      setNewComment('');
      // Refresh comments and logs
      const [commentsRes, logsRes] = await Promise.all([
        axios.get(`${API_URL}/api/issues/${id}/comments`, { headers: getAuthHeader() }),
        axios.get(`${API_URL}/api/issues/${id}/logs`, { headers: getAuthHeader() })
      ]);
      setComments(commentsRes.data || []);
      setLogs(logsRes.data || []);
    } catch (err) {
      console.error('Failed to add comment', err);
    }
  };

  const handleResolve = async () => {
    try {
      const updatedIssue = { ...issue, status: { id: 3, name: 'RESOLVED' } };
      await axios.put(`${API_URL}/api/issues/${id}?updater=${user.username}`, updatedIssue, { headers: getAuthHeader() });
      fetchIssueData();
    } catch (err) {
      console.error('Failed to resolve issue', err);
    }
  };

  if (loading) return <div className="flex-center" style={{ height: '100vh' }}>Loading...</div>;
  if (!issue) return <div className="container py-6">Issue not found</div>;

  return (
    <div className="container py-6">
      <button className="btn btn-secondary mb-6" onClick={() => navigate('/')}>
        <ArrowLeft size={18} /> Back to Dashboard
      </button>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '20px' }}>
        {/* Main Content */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div className="glass-panel p-6 animate-fade-in">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
              <div>
                <h1 style={{ fontSize: '2rem', marginBottom: '10px' }}>{issue.title}</h1>
                <div style={{ display: 'flex', gap: '15px', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}><AlertTriangle size={16}/> {issue.priority}</span>
                  <span>Component: {issue.component}</span>
                  <span>Reported by: {issue.author}</span>
                </div>
              </div>
              <span className={`badge badge-${issue.status?.name?.toLowerCase() || 'open'}`} style={{ fontSize: '1rem', padding: '8px 16px' }}>
                {issue.status?.name || 'OPEN'}
              </span>
            </div>
            
            <div style={{ background: 'rgba(0,0,0,0.2)', padding: '20px', borderRadius: '8px', lineHeight: '1.6' }}>
              {issue.description}
            </div>

            {issue.status?.name !== 'RESOLVED' && (
              <div className="mt-6" style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <button className="btn btn-primary" onClick={handleResolve} style={{ background: 'var(--success)' }}>
                  <CheckCircle size={18} /> Mark as Resolved
                </button>
              </div>
            )}
          </div>

          <div className="glass-panel p-6 animate-fade-in" style={{ animationDelay: '0.1s' }}>
            <h3 style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
              <MessageCircle size={20} /> Discussion ({comments.length})
            </h3>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', marginBottom: '20px' }}>
              {comments.map((comment, idx) => (
                <div key={idx} style={{ background: 'rgba(255,255,255,0.03)', padding: '15px', borderRadius: '8px', borderLeft: comment.author === user.username ? '3px solid var(--primary)' : '3px solid var(--secondary)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <span style={{ fontWeight: '600', color: comment.author === user.username ? 'var(--primary)' : 'var(--text-primary)' }}>{comment.author}</span>
                    <span style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>
                      {new Date(comment.created_at).toLocaleString()}
                    </span>
                  </div>
                  <p style={{ margin: 0 }}>{comment.content}</p>
                </div>
              ))}
              {comments.length === 0 && <p style={{ color: 'var(--text-secondary)', fontStyle: 'italic' }}>No comments yet.</p>}
            </div>

            <form onSubmit={handleAddComment} style={{ display: 'flex', gap: '10px' }}>
              <input 
                type="text" 
                placeholder="Add a comment..." 
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                style={{ flexGrow: 1 }}
              />
              <button type="submit" className="btn btn-primary"><Send size={18} /></button>
            </form>
          </div>
        </div>

        {/* Sidebar: Activity Logs */}
        <div className="glass-panel p-6 animate-fade-in" style={{ animationDelay: '0.2s', alignSelf: 'start' }}>
          <h3 style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
            <Clock size={20} /> Activity Logs
          </h3>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
            {logs.map((log, idx) => (
              <div key={idx} style={{ position: 'relative', paddingLeft: '20px', borderLeft: '2px solid rgba(255,255,255,0.1)' }}>
                <div style={{ position: 'absolute', left: '-6px', top: '5px', width: '10px', height: '10px', borderRadius: '50%', background: 'var(--primary)' }}></div>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                  {new Date(log.created_at).toLocaleString()}
                </div>
                <div style={{ fontSize: '0.9rem', fontWeight: '500' }}>
                  {log.action.replace('_', ' ')}
                </div>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                  by {log.performed_by}
                </div>
              </div>
            ))}
            {logs.length === 0 && <p style={{ color: 'var(--text-secondary)', fontStyle: 'italic' }}>No activity yet.</p>}
          </div>
        </div>
      </div>
    </div>
  );
};

export default IssueDetail;
