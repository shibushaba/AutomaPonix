import React, { useState } from 'react';
import { supabase } from '../supabaseClient';
import { useNavigate } from 'react-router-dom';

const AdminAddBike = ({ isAdmin }) => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    make: '',
    model: '',
    year: '',
    price: '',
    km: '',
    color: '',
    description: '',
    images: []
  });

  // Inform modal state
  const [addedBike, setAddedBike] = useState(null);
  const [showInformModal, setShowInformModal] = useState(false);
  const [matchingRequests, setMatchingRequests] = useState([]);
  const [selectedRequestIds, setSelectedRequestIds] = useState([]);
  const [sending, setSending] = useState(false);
  const [informDone, setInformDone] = useState(false);

  if (!isAdmin) {
    navigate('/admin');
    return null;
  }

  const handleChange = (e) => {
    if (e.target.name === 'images') {
      setFormData({ ...formData, images: Array.from(e.target.files) });
    } else {
      setFormData({ ...formData, [e.target.name]: e.target.value });
    }
  };

  const generateNextId = async () => {
    const { data, error } = await supabase.from('bikes').select('id');
    if (error) throw error;
    if (!data || data.length === 0) return 'BK-1';
    const ids = data.map(bike => {
      const match = bike.id.match(/\d+/);
      return match ? parseInt(match[0]) : 0;
    });
    const maxId = Math.max(...ids);
    return `BK-${maxId + 1}`;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const nextId = await generateNextId();

      const uploadedUrls = [];
      if (formData.images && formData.images.length > 0) {
        for (const file of formData.images) {
          const fileExt = file.name.split('.').pop();
          const fileName = `${nextId}-${Math.random().toString(36).substring(2, 9)}.${fileExt}`;
          const { error: uploadError } = await supabase.storage.from('bike-images').upload(fileName, file);
          if (uploadError) throw uploadError;
          const { data: publicUrlData } = supabase.storage.from('bike-images').getPublicUrl(fileName);
          uploadedUrls.push(publicUrlData.publicUrl);
        }
      }

      const newBike = {
        id: nextId,
        make: formData.make,
        model: formData.model,
        year: parseInt(formData.year),
        price: parseFloat(formData.price),
        km: formData.km ? parseInt(formData.km) : null,
        color: formData.color,
        description: formData.description,
        image_urls: uploadedUrls,
        status: 'available'
      };

      const { error } = await supabase.from('bikes').insert([newBike]);
      if (error) throw error;

      setAddedBike(newBike);

      // Find matching requests
      const bikeName = `${formData.make} ${formData.model}`.toLowerCase();
      const { data: reqs } = await supabase
        .from('requests')
        .select('*')
        .eq('status', 'pending')
        .neq('notified', true);

      const matched = (reqs || []).filter(req => {
        if (!req.bike_name) return false;
        return req.bike_name.toLowerCase().includes(formData.make.toLowerCase()) ||
               req.bike_name.toLowerCase().includes(formData.model.toLowerCase()) ||
               bikeName.includes(req.bike_name.toLowerCase().split(' ')[0]);
      });

      setMatchingRequests(matched);
      setShowInformModal(true);

    } catch (error) {
      console.error('Error adding bike:', error.message);
      alert('Failed to add bike. Check the console.');
    } finally {
      setLoading(false);
    }
  };

  const toggleSelect = (id) => {
    setSelectedRequestIds(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const selectAll = () => {
    if (selectedRequestIds.length === matchingRequests.length) {
      setSelectedRequestIds([]);
    } else {
      setSelectedRequestIds(matchingRequests.map(r => r.id));
    }
  };

  const handleSendNotifications = async () => {
    if (selectedRequestIds.length === 0) {
      alert('Please select at least one requester.');
      return;
    }
    setSending(true);
    try {
      const selected = matchingRequests.filter(r => selectedRequestIds.includes(r.id));

      for (const req of selected) {
        // Mark as notified in Supabase
        await supabase.from('requests').update({ notified: true, status: 'resolved' }).eq('id', req.id);

        // Send Instagram DM via n8n webhook (if session_id exists)
        if (req.session_id) {
          const webhookUrl = 'https://shhabas.app.n8n.cloud/webhook/inform-requester';
          const message = `🎉 Great news! The bike you requested (${addedBike.make} ${addedBike.model} ${addedBike.year}) is now available!\n\nView it here: https://your-site.com/bike/${addedBike.id}\n\nRef: ${req.session_id}`;
          try {
            await fetch(webhookUrl, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                session_id: req.session_id,
                instagram_id: req.instagram_id,
                message,
                bike_id: addedBike.id,
                request_id: req.session_id
              })
            });
          } catch (fetchErr) {
            console.warn('Webhook call failed for', req.id, fetchErr);
          }
        }
      }

      setInformDone(true);
    } catch (err) {
      console.error('Error sending notifications:', err);
      alert('Some notifications may have failed. Check the console.');
    } finally {
      setSending(false);
    }
  };

  const handleSkip = () => {
    setShowInformModal(false);
    alert(`Successfully added bike! Assigned ID: ${addedBike?.id}`);
    navigate('/admin/dashboard');
  };

  const handleInformClose = () => {
    setShowInformModal(false);
    navigate('/admin/dashboard');
  };

  return (
    <div className="add-bike-container fade-in">
      {/* Inform Requesters Modal */}
      {showInformModal && (
        <div className="inform-modal-overlay">
          <div className="inform-modal">
            {!informDone ? (
              <>
                <h3>✅ Bike Added: {addedBike?.id}</h3>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '20px' }}>
                  {matchingRequests.length > 0
                    ? `Found ${matchingRequests.length} request(s) matching this bike. Select who to notify:`
                    : 'No matching requests found for this bike. You can check the requests inbox manually.'}
                </p>

                {matchingRequests.length > 0 && (
                  <>
                    <button
                      className="glass-btn"
                      style={{ marginBottom: '12px', fontSize: '0.78rem', padding: '6px 14px' }}
                      onClick={selectAll}
                    >
                      {selectedRequestIds.length === matchingRequests.length ? 'Deselect All' : 'Select All'}
                    </button>

                    {/* WEB requests — show Call button */}
                    {matchingRequests.filter(r => r.source === 'web').length > 0 && (
                      <div style={{ marginBottom: '16px' }}>
                        <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '10px' }}>
                          📞 Website Requests — Call Directly
                        </p>
                        {matchingRequests.filter(r => r.source === 'web').map(req => (
                          <div key={req.id} className="inform-requester-item" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
                            <div>
                              <div className="inform-requester-name">
                                {req.customer_name || 'Unknown'}
                                <span className="source-label source-web" style={{ marginLeft: '8px' }}>WEB</span>
                              </div>
                              <div className="inform-requester-meta">
                                Bike: {req.bike_name} &bull; 📱 {req.contact || '—'}
                              </div>
                            </div>
                            {req.contact && (
                              <a
                                href={`tel:${req.contact.replace(/\D/g, '')}`}
                                className="primary-btn"
                                style={{ padding: '8px 16px', fontSize: '0.8rem', textDecoration: 'none', whiteSpace: 'nowrap', flexShrink: 0 }}
                              >
                                📞 Call
                              </a>
                            )}
                          </div>
                        ))}
                      </div>
                    )}

                    {/* INSTA requests — show checkboxes for DM notification */}
                    {matchingRequests.filter(r => r.source !== 'web').length > 0 && (
                      <div>
                        <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '10px' }}>
                          📲 Instagram Requests — Notify via DM
                        </p>
                        {matchingRequests.filter(r => r.source !== 'web').map(req => (
                          <div key={req.id} className="inform-requester-item">
                            <input
                              type="checkbox"
                              id={`req-${req.id}`}
                              checked={selectedRequestIds.includes(req.id)}
                              onChange={() => toggleSelect(req.id)}
                            />
                            <label htmlFor={`req-${req.id}`}>
                              <div className="inform-requester-name">
                                {req.customer_name || req.instagram_id || 'Unknown'}
                                <span className="source-label source-insta" style={{ marginLeft: '8px' }}>INSTA</span>
                              </div>
                              <div className="inform-requester-meta">
                                Bike: {req.bike_name} &bull; ID: {req.session_id || '—'}
                              </div>
                            </label>
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                )}

                <div className="inform-modal-actions">
                  <button className="glass-btn" onClick={handleSkip} disabled={sending}>
                    Skip
                  </button>
                  {matchingRequests.filter(r => r.source !== 'web').length > 0 && (
                    <button
                      className="primary-btn"
                      onClick={handleSendNotifications}
                      disabled={sending || selectedRequestIds.length === 0}
                    >
                      {sending ? 'Sending...' : `Notify ${selectedRequestIds.length} via DM`}
                    </button>
                  )}
                </div>
              </>
            ) : (
              <div style={{ textAlign: 'center', padding: '20px 0' }}>
                <div style={{ fontSize: '2.5rem', marginBottom: '12px' }}>🎉</div>
                <h3 style={{ marginBottom: '8px' }}>Notifications Sent!</h3>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '24px' }}>
                  {selectedRequestIds.length} requester(s) have been notified via Instagram.
                </p>
                <button className="primary-btn" onClick={handleInformClose}>
                  Go to Dashboard
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      <div className="add-bike-card glass-panel">
        <button className="back-btn" onClick={() => navigate('/admin/dashboard')}>&larr; Back to Dashboard</button>
        <h2>Add New Bike</h2>
        <p className="subtitle">System will automatically assign the next BK-ID.</p>

        <form onSubmit={handleSubmit} className="add-form">
          <div className="form-row">
            <div className="form-group">
              <label>Make</label>
              <input type="text" name="make" value={formData.make} onChange={handleChange} required placeholder="e.g. Yamaha" />
            </div>
            <div className="form-group">
              <label>Model</label>
              <input type="text" name="model" value={formData.model} onChange={handleChange} required placeholder="e.g. R1" />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Year</label>
              <input type="number" name="year" value={formData.year} onChange={handleChange} required placeholder="e.g. 2024" />
            </div>
            <div className="form-group">
              <label>Price (₹)</label>
              <input type="number" name="price" value={formData.price} onChange={handleChange} required placeholder="e.g. 150000" />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Kilometers (KM)</label>
              <input type="number" name="km" value={formData.km} onChange={handleChange} placeholder="e.g. 12000" />
            </div>
            <div className="form-group">
              <label>Color</label>
              <input type="text" name="color" value={formData.color} onChange={handleChange} placeholder="e.g. Matte Black" />
            </div>
          </div>

          <div className="form-group">
            <label>Images (Upload Multiple)</label>
            <input type="file" name="images" onChange={handleChange} multiple accept="image/*" required style={{ padding: '10px' }} />
            <small style={{ color: 'var(--text-muted)' }}>You can select multiple photos from your device.</small>
          </div>

          <div className="form-group">
            <label>Description (Optional)</label>
            <textarea name="description" value={formData.description} onChange={handleChange} rows="3" placeholder="Write a short summary..."></textarea>
          </div>

          <button type="submit" className="primary-btn submit-btn" disabled={loading}>
            {loading ? 'Processing...' : 'Add Vehicle to Database'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default AdminAddBike;
