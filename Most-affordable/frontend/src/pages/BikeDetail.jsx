import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { ArrowLeft, MessageCircle } from 'lucide-react';

export default function BikeDetail() {
  const { id } = useParams();
  const [bike, setBike] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchBike() {
      const { data, error } = await supabase
        .from('bikes')
        .select('*')
        .eq('id', id)
        .single();
      
      if (error) {
        console.error('Error fetching bike:', error);
      } else {
        setBike(data);
      }
      setLoading(false);
    }
    fetchBike();
  }, [id]);

  if (loading) {
    return (
      <div className="container" style={{ paddingTop: '100px' }}>
        <div className="loading-container">
          <div className="spinner"></div>
          <p>Loading bike details...</p>
        </div>
      </div>
    );
  }

  if (!bike) {
    return (
      <div className="container" style={{ paddingTop: '100px', textAlign: 'center' }}>
        <h2>Bike not found</h2>
        <Link to="/" className="glass-btn" style={{ marginTop: '20px' }}>
          <ArrowLeft size={16} /> Back to Inventory
        </Link>
      </div>
    );
  }

  // Pre-fill a WhatsApp message
  const waMessage = encodeURIComponent(`Hi! Is ${bike.id} (${bike.year} ${bike.make} ${bike.model}) still available?`);
  const imageUrl = (bike.image_urls && bike.image_urls[0]) || 'https://images.unsplash.com/photo-1558981403-c5f9899a28bc?q=80&w=1000&auto=format&fit=crop';

  return (
    <div className="container page-wrapper">
      <Link to="/" className="glass-btn" style={{ marginBottom: '32px' }}>
        <ArrowLeft size={16} /> Back to Inventory
      </Link>
      
      <div className="detail-layout">
        <div className="detail-img-section glass-panel">
          <img src={imageUrl} alt={`${bike.make} ${bike.model}`} />
        </div>
        
        <div className="detail-info-section glass-panel">
          <div className={`status-badge ${bike.status === 'available' ? 'status-available' : 'status-sold'}`} style={{ alignSelf: 'flex-start', position: 'relative', top: '0', right: '0', marginBottom: '16px' }}>
            {bike.status}
          </div>
          
          <div className="bike-id" style={{ fontSize: '1rem', marginBottom: '8px' }}>ID: {bike.id}</div>
          <h1 className="detail-title">{bike.year} {bike.make} {bike.model}</h1>
          
          <div className="price-tag">
            ₹{(bike.price || 0).toLocaleString('en-IN')}
          </div>
          
          <div className="spec-list">
            <div className="spec-item">
              <span className="spec-label">Make</span>
              <span className="spec-value">{bike.make}</span>
            </div>
            <div className="spec-item">
              <span className="spec-label">Model</span>
              <span className="spec-value">{bike.model}</span>
            </div>
            <div className="spec-item">
              <span className="spec-label">Year</span>
              <span className="spec-value">{bike.year}</span>
            </div>
            {bike.km != null && (
              <div className="spec-item">
                <span className="spec-label">Mileage</span>
                <span className="spec-value">{bike.km.toLocaleString('en-IN')} km</span>
              </div>
            )}
            {bike.color && (
              <div className="spec-item">
                <span className="spec-label">Color</span>
                <span className="spec-value">{bike.color}</span>
              </div>
            )}
          </div>
          
          <div style={{ marginBottom: '32px' }}>
            <h3 style={{ marginBottom: '8px', color: 'var(--text-muted)' }}>Description</h3>
            <p style={{ lineHeight: '1.6' }}>{bike.description || "No description provided."}</p>
          </div>
          
          <div className="action-row">
            {bike.status === 'available' ? (
              <a href={`https://wa.me/1234567890?text=${waMessage}`} target="_blank" rel="noreferrer" className="glass-btn primary-btn">
                <MessageCircle size={20} /> Inquire Now
              </a>
            ) : (
              <div className="glass-btn" style={{ opacity: 0.5, cursor: 'not-allowed' }}>
                Currently Sold Out
              </div>
            )}
            <a href="https://instagram.com/your_handle" target="_blank" rel="noreferrer" className="glass-btn">
              DM on Instagram
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
