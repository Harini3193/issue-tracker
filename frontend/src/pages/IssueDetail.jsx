import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { ArrowLeft, Clock, MessageCircle, Send, CheckCircle, AlertTriangle, Paperclip, Download, Brain, Link as LinkIcon } from 'lucide-react';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

const API_URL = import.meta.env.VITE_API_HOST ? `https://${import.meta.env.VITE_API_HOST}` : import.meta.env.VITE_API_URL || '/api-gateway';
const SPRING_URL = import.meta.env.VITE_SPRING_HOST ? `https://${import.meta.env.VITE_SPRING_HOST}` : import.meta.env.VITE_SPRING_URL || '/spring-api';

const IssueDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, getAuthHeader } = useAuth();
  
  const [issue, setIssue] = useState(null);
  const [comments, setComments] = useState([]);
  const [logs, setLogs] = useState([]);
  const [similarIssues, setSimilarIssues] = useState([]);
  const [aiSummary, setAiSummary] = useState('');
  const [prediction, setPrediction] = useState('');
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [rating, setRating] = useState(0);
  const [feedback, setFeedback] = useState('');

  useEffect(() => {
    fetchIssueData();
  }, [id]);

  const fetchIssueData = async () => {
    setLoading(true);
    try {
      const [issueRes, commentsRes, logsRes, similarRes, summaryRes, predictionRes] = await Promise.all([
        axios.get(`${API_URL}/api/issues/${id}`, { headers: getAuthHeader() }),
        axios.get(`${API_URL}/api/issues/${id}/comments`, { headers: getAuthHeader() }),
        axios.get(`${API_URL}/api/issues/${id}/logs`, { headers: getAuthHeader() }),
        axios.get(`${API_URL}/api/issues/${id}/similar`, { headers: getAuthHeader() }).catch(() => ({ data: [] })),
        axios.get(`${API_URL}/api/issues/${id}/summary`, { headers: getAuthHeader() }).catch(() => ({ data: { summary: '' } })),
        axios.get(`${API_URL}/api/issues/${id}/prediction`, { headers: getAuthHeader() }).catch(() => ({ data: { predictedResolutionTime: '' } }))
      ]);
      setIssue(issueRes.data);
      setComments(commentsRes.data || []);
      setLogs(logsRes.data || []);
      setSimilarIssues(similarRes.data || []);
      setAiSummary(summaryRes.data.summary);
      setPrediction(predictionRes.data.predictedResolutionTime);
    } catch (err) {
      console.error('Failed to fetch issue details', err);
    }
    setLoading(false);
  };

  const handleAddComment = async (e, fileUrl = null) => {
    if (e) e.preventDefault();
    if (!newComment.trim() && !fileUrl) return;

    const content = fileUrl ? `Uploaded file: ${fileUrl}` : newComment;

    try {
      await axios.post(`${API_URL}/api/issues/${id}/comments`, {
        issue_id: Number(id),
        author: user.username,
        content: content
      }, { headers: getAuthHeader() });
      
      setNewComment('');
      
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

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploading(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await axios.post(`${SPRING_URL}/api/files/upload`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          ...getAuthHeader()
        }
      });
      const fileUrl = SPRING_URL + response.data.url;
      await handleAddComment(null, fileUrl);
    } catch (err) {
      console.error('File upload failed', err);
      alert('File upload failed.');
    } finally {
      setUploading(false);
    }
  };

  const exportPDF = () => {
    const doc = new jsPDF();
    doc.text(`Issue Report: ${issue.title}`, 14, 15);
    doc.autoTable({
      startY: 20,
      head: [['Field', 'Value']],
      body: [
        ['Issue ID', issue.id],
        ['Status', issue.status?.name || 'OPEN'],
        ['Category', issue.category || 'General'],
        ['Reported By', issue.createdBy?.username || 'Unknown'],
        ['Description', issue.description]
      ]
    });
    doc.save(`Issue_${issue.id}_Report.pdf`);
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

  const handleDelete = async () => {
    if (!window.confirm("Are you sure you want to delete this issue?")) return;
    try {
      await axios.delete(`${API_URL}/api/issues/${id}`, { headers: getAuthHeader() });
      navigate('/');
    } catch (err) {
      console.error('Failed to delete issue', err);
    }
  };

  const submitFeedback = async (e) => {
    e.preventDefault();
    if (rating === 0) {
      alert("Please select a rating.");
      return;
    }
    try {
      await axios.post(`${SPRING_URL}/api/issues/${id}/feedback`, {
        rating,
        feedback,
        username: user.username
      }, { headers: getAuthHeader() });
      alert("Feedback submitted successfully!");
      fetchIssueData();
    } catch (err) {
      console.error('Failed to submit feedback', err);
      alert("Error submitting feedback.");
    }
  };

  const isAdmin = user?.roles?.includes('ROLE_ADMIN');

  if (loading) return <div className="flex-center" style={{ height: '100vh' }}>Loading...</div>;
  if (!issue) return <div className="container py-6">Issue not found</div>;

  return (
    <div className="container py-6">
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
        <button className="btn btn-secondary" onClick={() => navigate('/')}>
          <ArrowLeft size={18} /> Back to Dashboard
        </button>
        <button className="btn btn-primary" onClick={exportPDF}>
          <Download size={18} /> Export PDF
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '20px' }}>
        {/* Main Content */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div className="glass-panel p-6 animate-fade-in">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
              <div>
                <h1 style={{ fontSize: '2rem', marginBottom: '10px' }}>{issue.title}</h1>
                <div style={{ display: 'flex', gap: '15px', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>Category: {issue.category || 'General'}</span>
                  <span>Reported by: {issue.createdBy?.username}</span>
                </div>
              </div>
              <span className={`badge badge-${issue.status?.name?.toLowerCase() || 'open'}`} style={{ fontSize: '1rem', padding: '8px 16px' }}>
                {issue.status?.name || 'OPEN'}
              </span>
            </div>
            
            <div style={{ background: 'rgba(0,0,0,0.2)', padding: '20px', borderRadius: '8px', lineHeight: '1.6' }}>
              {issue.description}
            </div>

            <div className="mt-6" style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              {isAdmin && (
                <button className="btn btn-secondary" onClick={handleDelete} style={{ color: 'var(--danger)', borderColor: 'var(--danger)' }}>
                  <AlertTriangle size={18} /> Delete Issue
                </button>
              )}
              {issue.status?.name !== 'RESOLVED' && (
                <button className="btn btn-primary" onClick={handleResolve} style={{ background: 'var(--success)' }}>
                  <CheckCircle size={18} /> Mark as Resolved
                </button>
              )}
            </div>
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
                  <p style={{ margin: 0 }}>
                    {comment.content.includes('Uploaded file:') ? (
                      <a href={comment.content.replace('Uploaded file: ', '')} target="_blank" rel="noreferrer" style={{ color: 'var(--primary)', textDecoration: 'underline' }}>
                        <Paperclip size={14} style={{ display: 'inline', marginRight: '5px' }}/> 
                        View Attachment
                      </a>
                    ) : (
                      comment.content
                    )}
                  </p>
                </div>
              ))}
              {comments.length === 0 && <p style={{ color: 'var(--text-secondary)', fontStyle: 'italic' }}>No comments yet.</p>}
            </div>

            <form onSubmit={handleAddComment} style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
              <input 
                type="text" 
                placeholder="Add a comment..." 
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                style={{ flexGrow: 1 }}
              />
              <label style={{ cursor: 'pointer', padding: '10px', background: 'rgba(255,255,255,0.1)', borderRadius: '8px' }}>
                <input type="file" style={{ display: 'none' }} onChange={handleFileUpload} disabled={uploading} />
                <Paperclip size={18} />
              </label>
              <button type="submit" className="btn btn-primary" disabled={uploading}><Send size={18} /></button>
            </form>
            {uploading && <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '10px' }}>Uploading file...</p>}
          </div>
        </div>

        {/* Sidebar */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          {/* AI Panel */}
          {(aiSummary || prediction) && (
            <div className="glass-panel p-6 animate-fade-in" style={{ alignSelf: 'start', border: '1px solid var(--primary)' }}>
              <h3 style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '15px', color: 'var(--primary)' }}>
                <Brain size={20} /> AI Insights
              </h3>
              {aiSummary && (
                <div style={{ marginBottom: '15px' }}>
                  <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: '1.5' }}>{aiSummary}</p>
                </div>
              )}
              {prediction && (
                <div style={{ padding: '10px', background: 'rgba(0,0,0,0.3)', borderRadius: '8px' }}>
                  <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Predicted Resolution:</span>
                  <div style={{ fontSize: '1.1rem', fontWeight: 'bold', color: 'white', marginTop: '5px' }}>{prediction}</div>
                </div>
              )}
            </div>
          )}

          {/* SLA Tracking Panel */}
          {issue.slaDeadline && issue.status?.name !== 'RESOLVED' && issue.status?.name !== 'CLOSED' && (
            <div className="glass-panel p-6 animate-fade-in" style={{ alignSelf: 'start', border: new Date(issue.slaDeadline) < new Date() ? '1px solid var(--danger)' : '1px solid var(--success)' }}>
              <h3 style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '15px' }}>
                <Clock size={20} /> SLA Deadline
              </h3>
              <div style={{ fontSize: '1.2rem', fontWeight: 'bold', color: new Date(issue.slaDeadline) < new Date() ? 'var(--danger)' : 'var(--success)' }}>
                {new Date(issue.slaDeadline).toLocaleString()}
              </div>
              <p style={{ marginTop: '5px', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                {new Date(issue.slaDeadline) < new Date() ? 'This issue is overdue!' : 'This issue is on track.'}
              </p>
            </div>
          )}

          {/* Customer Feedback Panel */}
          {issue.status?.name === 'RESOLVED' && issue.createdBy?.username === user.username && !issue.rating && (
            <div className="glass-panel p-6 animate-fade-in" style={{ alignSelf: 'start', border: '1px solid var(--accent)' }}>
              <h3 style={{ marginBottom: '15px', color: 'var(--accent)' }}>Rate Your Experience</h3>
              <form onSubmit={submitFeedback}>
                <div style={{ display: 'flex', gap: '5px', marginBottom: '15px' }}>
                  {[1, 2, 3, 4, 5].map((star) => (
                    <span 
                      key={star} 
                      onClick={() => setRating(star)}
                      style={{ cursor: 'pointer', fontSize: '1.5rem', color: star <= rating ? 'var(--accent)' : 'var(--text-secondary)' }}
                    >
                      ★
                    </span>
                  ))}
                </div>
                <textarea 
                  placeholder="Leave some feedback..." 
                  value={feedback} 
                  onChange={(e) => setFeedback(e.target.value)}
                  style={{ width: '100%', marginBottom: '10px' }}
                  rows="3"
                ></textarea>
                <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>Submit Feedback</button>
              </form>
            </div>
          )}

          {/* Display Existing Feedback */}
          {issue.rating && (
            <div className="glass-panel p-6 animate-fade-in" style={{ alignSelf: 'start' }}>
              <h3 style={{ marginBottom: '15px', color: 'var(--accent)' }}>Customer Feedback</h3>
              <div style={{ display: 'flex', gap: '5px', marginBottom: '10px' }}>
                {[1, 2, 3, 4, 5].map((star) => (
                  <span key={star} style={{ fontSize: '1.5rem', color: star <= issue.rating ? 'var(--accent)' : 'var(--glass-border)' }}>★</span>
                ))}
              </div>
              {issue.feedback && (
                <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', fontStyle: 'italic' }}>"{issue.feedback}"</p>
              )}
            </div>
          )}

          {/* Similar Issues */}
          {similarIssues.length > 0 && (
            <div className="glass-panel p-6 animate-fade-in" style={{ alignSelf: 'start' }}>
              <h3 style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '15px' }}>
                <LinkIcon size={20} /> Similar Issues
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {similarIssues.map((sim, idx) => (
                  <div key={idx} style={{ padding: '10px', background: 'rgba(255,255,255,0.05)', borderRadius: '6px' }}>
                    <Link to={`/issues/${sim.issue_id}`} style={{ color: 'var(--primary)', fontWeight: '500', textDecoration: 'none', display: 'block', marginBottom: '5px' }}>
                      {sim.issue?.title || `Issue #${sim.issue_id}`}
                    </Link>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                      <span>Score: {(sim.score * 100).toFixed(1)}%</span>
                      <span>{sim.issue?.status?.name || 'OPEN'}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Activity Logs */}
          <div className="glass-panel p-6 animate-fade-in" style={{ alignSelf: 'start' }}>
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
    </div>
  );
};

export default IssueDetail;
