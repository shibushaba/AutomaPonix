import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { useNavigate, useParams } from 'react-router-dom';

const AdminEditBike = ({ isAdmin }) => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [formData, setFormData] = useState({
    make: '',
    model: '',
    year: '',
    price: '',
    km: '',
    color: '',
    description: '',
    status: 'available',
    images: null // For new uploads
  });

  useEffect(() => {
    if (!isAdmin) {
      navigate('/admin');
      return;
    }
    fetchBikeData();
  }, [isAdmin, navigate, id]);

  const fetchBikeData = async () => {
    try {
      const { data, error } = await supabase.from('bikes').select('*').eq('id', id).single();
      if (error) throw error;
      if (data) {
        setFormData({
          make: data.make || '',
          model: data.model || '',
          year: data.year || '',
          price: data.price || '',
          km: data.km || '',
          color: data.color || '',
          description: data.description || '',
          status: data.status || 'available',
          images: null
        });
      }
    } catch (error) {
      console.error('Error fetching bike data:', error.message);
      alert('Failed to load bike details.');
      navigate('/admin/dashboard');
    } finally {
      setFetching(false);
    }
  };

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

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      let uploadedUrls = [];
      // If new images are selected, upload them
      if (formData.images && formData.images.length > 0) {
        for (const file of formData.images) {
          const fileExt = file.name.split('.').pop();
          const fileName = `${id}-${Math.random().toString(36).substring(2, 9)}.${fileExt}`;
          
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

      const updatePayload = {
        make: formData.make,
        model: formData.model,
        year: parseInt(formData.year),
        price: parseFloat(formData.price),
        km: formData.km ? parseInt(formData.km) : null,
        color: formData.color,
        description: formData.description,
        status: formData.status
      };

      // Only overwrite images if new ones were uploaded
      if (uploadedUrls.length > 0) {
        updatePayload.image_urls = uploadedUrls;
      }

      const { error } = await supabase.from('bikes').update(updatePayload).eq('id', id);
      if (error) throw error;

      alert(`Successfully updated bike ${id}!`);
      navigate('/admin/dashboard');

    } catch (error) {
      console.error('Error updating bike:', error.message);
      alert('Failed to update bike. Check the console.');
    } finally {
      setLoading(false);
    }
  };

  if (fetching) {
    return <div className="loading" style={{textAlign: 'center', margin: '40px'}}>Loading {id} details...</div>;
  }

  return (
    <div className="add-bike-container fade-in">
      <div className="add-bike-card glass-panel">
        <button className="back-btn" onClick={() => navigate('/admin/dashboard')}>&larr; Back to Dashboard</button>
        <h2>Edit Vehicle: {id}</h2>
        <p className="subtitle">Modify the details for {formData.make} {formData.model}</p>

        <form onSubmit={handleSubmit} className="add-form">
          <div className="form-row">
            <div className="form-group">
              <label>Make</label>
              <input type="text" name="make" value={formData.make} onChange={handleChange} required />
            </div>
            <div className="form-group">
              <label>Model</label>
              <input type="text" name="model" value={formData.model} onChange={handleChange} required />
            </div>
          </div>
          
          <div className="form-row">
            <div className="form-group">
              <label>Year</label>
              <input type="number" name="year" value={formData.year} onChange={handleChange} required />
            </div>
            <div className="form-group">
              <label>Price (₹)</label>
              <input type="number" name="price" value={formData.price} onChange={handleChange} required />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Kilometers (KM)</label>
              <input type="number" name="km" value={formData.km} onChange={handleChange} />
            </div>
            <div className="form-group">
              <label>Color</label>
              <input type="text" name="color" value={formData.color} onChange={handleChange} />
            </div>
          </div>

          <div className="form-row">
             <div className="form-group">
                <label>Status</label>
                <select name="status" value={formData.status} onChange={handleChange} style={{padding: '14px', width: '100%', border: '1px solid var(--border-classic)', background: 'var(--bg-dark)', color: 'white'}}>
                  <option value="available">Available</option>
                  <option value="sold">Sold</option>
                </select>
             </div>
             <div className="form-group">
                <label>New Images (Optional)</label>
                <input type="file" name="images" onChange={handleChange} multiple accept="image/*" style={{ padding: '10px' }} />
                <small style={{ color: 'var(--text-muted)' }}>Uploading new images overrides existing ones.</small>
             </div>
          </div>

          <div className="form-group">
            <label>Description (Optional)</label>
            <textarea name="description" value={formData.description} onChange={handleChange} rows="3"></textarea>
          </div>

          <button type="submit" className="primary-btn submit-btn" disabled={loading}>
            {loading ? 'Saving...' : 'Update Vehicle Details'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default AdminEditBike;
