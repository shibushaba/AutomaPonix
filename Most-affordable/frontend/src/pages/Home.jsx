import { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';
import { Link } from 'react-router-dom';
import { ChevronRight, Zap } from 'lucide-react';

export default function Home() {
  const [bikes, setBikes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterBrand, setFilterBrand] = useState('All');
  const [filterBudget, setFilterBudget] = useState('All');

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

  const brands = ['All', ...new Set(bikes.map(b => b.make))];

  const filteredBikes = bikes.filter(bike => {
    const query = searchQuery.toLowerCase();
    const matchesSearch = (
      (bike.id && bike.id.toLowerCase().includes(query)) ||
      (bike.make && bike.make.toLowerCase().includes(query)) ||
      (bike.model && bike.model.toLowerCase().includes(query))
    );
    
    const matchesBrand = filterBrand === 'All' || bike.make === filterBrand;
    
    let matchesBudget = true;
    if (filterBudget !== 'All') {
      const price = bike.price || 0;
      if (filterBudget === 'Under ₹1L') matchesBudget = price < 100000;
      else if (filterBudget === '₹1L - ₹2L') matchesBudget = price >= 100000 && price <= 200000;
      else if (filterBudget === 'Over ₹2L') matchesBudget = price > 200000;
    }

    return matchesSearch && matchesBrand && matchesBudget;
  });

  return (
    <div className="page-wrapper container">
      <div style={{ textAlign: 'center', margin: '60px 0 80px 0' }}>
        <h1 className="hero-title" style={{ fontSize: '4rem', marginBottom: '40px', lineHeight: '1.2' }}>
          Discover the Art of <br />
          <span style={{ color: 'var(--accent)', fontStyle: 'italic' }}>High-Performance</span> Riding.
        </h1>
        
        <div className="search-filter-container">
          <div className="search-wrapper" style={{ flex: 1, margin: 0, maxWidth: '100%' }}>
            <input 
              type="text" 
              placeholder="Search by ID, Make, or Model..." 
              className="search-input"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <select 
            className="search-input filter-dropdown" 
            value={filterBrand} 
            onChange={(e) => setFilterBrand(e.target.value)}
          >
            {brands.map(brand => (
              <option key={brand} value={brand}>{brand === 'All' ? 'All Brands' : brand}</option>
            ))}
          </select>
          <select 
            className="search-input filter-dropdown" 
            value={filterBudget} 
            onChange={(e) => setFilterBudget(e.target.value)}
          >
            <option value="All">All Budgets</option>
            <option value="Under ₹1L">Under ₹1,00,000</option>
            <option value="₹1L - ₹2L">₹1L - ₹2L</option>
            <option value="Over ₹2L">Over ₹2,00,000</option>
          </select>
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
            <div key={bike.id} className="bike-list-item">
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
                  <div className="bike-price">₹{(bike.price || 0).toLocaleString('en-IN')}</div>
                </div>
                <div>
                  <Link to={`/bike/${bike.id}`} className="glass-btn" style={{ width: '100%', marginTop: '30px' }}>
                    View Details
                  </Link>
                </div>
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
