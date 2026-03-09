import { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';
import { Link } from 'react-router-dom';
import { ChevronRight, Zap } from 'lucide-react';

export default function Home() {
  const [bikes, setBikes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    async function fetchBikes() {
      // Fetch available bikes first
      const { data, error } = await supabase
        .from('bikes')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching bikes:', error);
      } else {
        setBikes(data || []);
      }
      setLoading(false);
    }
    fetchBikes();
  }, []);

  const filteredBikes = bikes.filter(bike => {
    const query = searchQuery.toLowerCase();
    return (
      (bike.id && bike.id.toLowerCase().includes(query)) ||
      (bike.make && bike.make.toLowerCase().includes(query)) ||
      (bike.model && bike.model.toLowerCase().includes(query))
    );
  });

  return (
    <div className="page-wrapper container">
      <div style={{ textAlign: 'center', marginBottom: '40px' }}>
        <h1 style={{ fontSize: '3rem', marginBottom: '16px' }}>
          Ride Your <span style={{ color: 'var(--accent)' }}>Dream</span>
        </h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '1.2rem', maxWidth: '600px', margin: '0 auto', marginBottom: '40px' }}>
          Explore our premium selection of pre-owned sports bikes and supercars, delivered with unmatched quality and service.
        </p>
        
        <div className="search-wrapper">
          <input 
            type="text" 
            placeholder="🔎 Search by ID, Make, or Model..." 
            className="search-input"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {loading ? (
        <div className="loading-container">
          <div className="spinner"></div>
          <p>Loading inventory...</p>
        </div>
      ) : bikes.length === 0 ? (
        <div className="glass-panel empty-state">
          <Zap size={48} className="empty-state-icon" />
          <h3>No bikes currently available.</h3>
          <p style={{ color: 'var(--text-muted)', marginTop: '8px' }}>Check back later or follow us on Instagram.</p>
        </div>
      ) : (
        <div className="bike-grid">
          {filteredBikes.map(bike => (
            <div key={bike.id} className="bike-card glass-panel">
              <span className={`status-badge ${bike.status === 'available' ? 'status-available' : 'status-sold'}`}>
                {bike.status}
              </span>
              <div className="bike-img-container">
                <img 
                  src={(bike.image_urls && bike.image_urls[0]) || 'https://images.unsplash.com/photo-1558981403-c5f9899a28bc?q=80&w=1000&auto=format&fit=crop'} 
                  alt={bike.make + ' ' + bike.model} 
                  className="bike-img"
                  onError={(e) => { e.target.src = 'https://images.unsplash.com/photo-1558981403-c5f9899a28bc?q=80&w=1000&auto=format&fit=crop' }}
                />
              </div>
              <div className="bike-info">
                <div>
                  <div className="bike-id">ID: {bike.id}</div>
                  <h3 className="bike-title">{bike.year} {bike.make} {bike.model}</h3>
                  <div className="bike-price">${(bike.price || 0).toLocaleString()}</div>
                </div>
                <Link to={`/bike/${bike.id}`} style={{ marginTop: '16px' }} className="glass-btn">
                  View Details <ChevronRight size={16} />
                </Link>
              </div>
            </div>
          ))}
          {filteredBikes.length === 0 && (
             <div style={{gridColumn: '1 / -1', textAlign: 'center', margin: '40px 0'}}>
                <p style={{color: 'var(--text-muted)'}}>No vehicles found matching that search.</p>
             </div>
          )}
        </div>
      )}
    </div>
  );
}
