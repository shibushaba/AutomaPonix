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

  if (!isAdmin) {
    navigate('/admin');
    return null;
  }

  const handleChange = (e) => {
    if (e.target.name === 'images') {
      setFormData({
        ...formData,
        images: Array.from(e.target.files)
      });
    } else {
      setFormData({
        ...formData,
        [e.target.name]: e.target.value
      });
    }
  };

  const generateNextId = async () => {
    // Fetch all IDs
    const { data, error } = await supabase.from('bikes').select('id');
    if (error) throw error;
    
    if (!data || data.length === 0) return 'BK-1';

    // Extract numbers, find max
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
      
      // Upload images to Supabase Storage
      const uploadedUrls = [];
      if (formData.images && formData.images.length > 0) {
        for (const file of formData.images) {
          const fileExt = file.name.split('.').pop();
          const fileName = `${nextId}-${Math.random().toString(36).substring(2, 9)}.${fileExt}`;
          
          const { error: uploadError } = await supabase.storage
            .from('bike-images')
            .upload(fileName, file);
            
          if (uploadError) throw uploadError;
          
          const { data: publicUrlData } = supabase.storage
            .from('bike-images')
            .getPublicUrl(fileName);
            
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

      alert(`Successfully added new bike! Assigned ID: ${nextId}`);
      navigate('/admin/dashboard');

    } catch (error) {
      console.error('Error adding bike:', error.message);
      alert('Failed to add bike. Check the console.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="add-bike-container fade-in">
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
