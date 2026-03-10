import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { useNavigate } from 'react-router-dom';

const AdminDashboard = ({ isAdmin }) => {
  const [bikes, setBikes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    if (!isAdmin) {
      navigate('/admin');
      return;
    }
    fetchBikes();
  }, [isAdmin, navigate]);

  const fetchBikes = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase.from('bikes').select('*').order('id', { ascending: false });
      if (error) throw error;
      setBikes(data);
    } catch (error) {
      console.error('Error fetching bikes:', error.message);
    } finally {
      setLoading(false);
    }
  };

  const deleteBike = async (id) => {
    if (!window.confirm(`Are you sure you want to delete bike ${id}?`)) return;
    try {
      const { error } = await supabase.from('bikes').delete().eq('id', id);
      if (error) throw error;
      setBikes(bikes.filter(bike => bike.id !== id));
      alert(`Bike ${id} deleted successfully.`);
    } catch (error) {
      console.error('Error deleting bike:', error.message);
      alert('Failed to delete bike.');
    }
  };

  const toggleStatus = async (id, currentStatus) => {
    const newStatus = currentStatus === 'available' ? 'sold' : 'available';
    try {
      const { error } = await supabase.from('bikes').update({ status: newStatus }).eq('id', id);
      if (error) throw error;
      setBikes(bikes.map(bike => bike.id === id ? { ...bike, status: newStatus } : bike));
    } catch (error) {
      console.error('Error updating status:', error.message);
      alert('Failed to update status.');
    }
  };

  const filteredBikes = bikes.filter(bike => {
    const query = searchQuery.toLowerCase();
    return (
      bike.id.toLowerCase().includes(query) ||
      bike.make.toLowerCase().includes(query) ||
      bike.model.toLowerCase().includes(query)
    );
  });

  if (loading) return <div className="loading">Loading dashboard...</div>;

  return (
    <div className="admin-dashboard fade-in">
      <div className="admin-header-stacked">
        <h1>Dashboard Operations</h1>
        <p className="admin-subtitle">Manage your inventory, update pricing, and track availability.</p>
      </div>
      
      <div className="admin-controls glass-panel">
        <input 
          type="text" 
          placeholder="Search by ID, Make, or Model..." 
          className="search-input"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
        <div style={{ display: 'flex', gap: '16px' }}>
          <button className="glass-btn" onClick={() => navigate('/admin/requests')}>📬 Requests Inbox</button>
          <button className="primary-btn" onClick={() => navigate('/admin/add')}>+ Add New Vehicle</button>
        </div>
      </div>

      <div className="admin-table-container glass-panel">
        <table className="admin-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Make & Model</th>
              <th>Year</th>
              <th>Price</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredBikes.map(bike => (
              <tr key={bike.id} className={bike.status === 'sold' ? 'row-sold' : ''}>
                <td data-label="ID"><strong>{bike.id}</strong></td>
                <td data-label="Make & Model">{bike.make} {bike.model}</td>
                <td data-label="Year">{bike.year}</td>
                <td data-label="Price">₹{bike.price.toLocaleString('en-IN')}</td>
                <td data-label="Status">
                  <span className={`status-badge status-${bike.status}`}>
                    {bike.status.toUpperCase()}
                  </span>
                </td>
                <td data-label="Actions" className="actions-cell">
                  <button onClick={() => navigate(`/admin/edit/${bike.id}`)} className="action-btn toggle-btn">
                    Edit
                  </button>
                  <button onClick={() => toggleStatus(bike.id, bike.status)} className="action-btn toggle-btn">
                    Mark {bike.status === 'available' ? 'Sold' : 'Avail'}
                  </button>
                  <button onClick={() => deleteBike(bike.id)} className="action-btn delete-btn">
                    Delete
                  </button>
                </td>
              </tr>
            ))}
            {filteredBikes.length === 0 && (
              <tr>
                <td colSpan="6" style={{ textAlign: 'center', padding: '2rem' }}>No bikes found.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default AdminDashboard;
