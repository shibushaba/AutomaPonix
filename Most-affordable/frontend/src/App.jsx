import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import Home from './pages/Home';
import BikeDetail from './pages/BikeDetail';
import AdminLogin from './pages/AdminLogin';
import AdminDashboard from './pages/AdminDashboard';
import AdminAddBike from './pages/AdminAddBike';
import './App.css';

function App() {
  const [isAdmin, setIsAdmin] = useState(false);

  return (
    <Router>
      <div className="app-container">
        <header className="navbar">
          <div className="nav-container">
            <div className="nav-top">
              <Link to="/" className="logo">MOST AFFORDABLE.</Link>
            </div>
            <nav className="nav-bottom">
              <Link to="/" className="nav-item">Inventory</Link>
              {isAdmin && (
                <Link to="/admin/dashboard" className="nav-item">Dashboard</Link>
              )}
            </nav>
          </div>
        </header>
        
        <main className="main-content">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/bike/:id" element={<BikeDetail />} />
            <Route path="/admin" element={<AdminLogin onLogin={setIsAdmin} />} />
            <Route path="/admin/dashboard" element={<AdminDashboard isAdmin={isAdmin} />} />
            <Route path="/admin/add" element={<AdminAddBike isAdmin={isAdmin} />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;
