import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { useNavigate } from 'react-router-dom';

const AdminRequests = ({ isAdmin }) => {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    if (!isAdmin) {
      navigate('/admin');
      return;
    }
    fetchRequests();
  }, [isAdmin, navigate]);

  const fetchRequests = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('requests')
        .select('*')
        .order('created_at', { ascending: false });
        
      if (error) {
        // Failing silently mostly, since table might not exist yet if user didn't run SQL
        console.error('Error fetching requests (Table might not exist yet):', error.message);
      } else {
        setRequests(data || []);
      }
    } catch (error) {
      console.error('Exception fetching requests:', error.message);
    } finally {
      setLoading(false);
    }
  };

  const markResolved = async (id) => {
    try {
      const { error } = await supabase
        .from('requests')
        .update({ status: 'resolved' })
        .eq('id', id);
        
      if (error) throw error;
      
      setRequests(requests.map(req => req.id === id ? { ...req, status: 'resolved' } : req));
    } catch (error) {
      alert('Failed to update request status.');
      console.error(error);
    }
  };

  const deleteRequest = async (id) => {
    if(!window.confirm('Delete this request entirely?')) return;
    try {
      const { error } = await supabase.from('requests').delete().eq('id', id);
      if (error) throw error;
      setRequests(requests.filter(req => req.id !== id));
    } catch (error) {
      alert('Failed to delete request.');
      console.error(error);
    }
  }

  if (loading) return <div className="loading" style={{textAlign: 'center', marginTop: '40px'}}>Loading Inbox...</div>;

  return (
    <div className="admin-dashboard fade-in">
      <div className="admin-header-stacked">
        <h1>Requests Inbox</h1>
        <p className="admin-subtitle">General chatbot inquiries and unmatched requests.</p>
        <button className="back-btn" onClick={() => navigate('/admin/dashboard')} style={{marginTop: '20px'}}>
          &larr; Back to Dashboard
        </button>
      </div>

      <div className="admin-table-container glass-panel" style={{marginTop: '40px'}}>
        <table className="admin-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Customer Message</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {requests.map(req => (
              <tr key={req.id} className={req.status === 'resolved' ? 'row-sold' : ''}>
                <td data-label="Date">{new Date(req.created_at).toLocaleString()}</td>
                <td data-label="Message" style={{maxWidth: '400px', whiteSpace: 'normal', wordWrap: 'break-word'}}>"{req.message}"</td>
                <td data-label="Status">
                  <span className={`status-badge ${req.status === 'resolved' ? 'status-sold' : 'status-available'}`}>
                    {req.status.toUpperCase()}
                  </span>
                </td>
                <td data-label="Actions" className="actions-cell">
                  {req.status === 'unread' && (
                    <button onClick={() => markResolved(req.id)} className="action-btn toggle-btn">
                      Mark Resolved
                    </button>
                  )}
                  <button onClick={() => deleteRequest(req.id)} className="action-btn delete-btn">
                    Delete
                  </button>
                </td>
              </tr>
            ))}
            {requests.length === 0 && (
              <tr>
                <td colSpan="4" style={{ textAlign: 'center', padding: '2rem' }}>
                  No unmet requests right now. The database table might be empty or you still need to run the Phase 19 SQL script!
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default AdminRequests;
