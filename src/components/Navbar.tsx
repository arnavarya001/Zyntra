import { Link, useLocation } from 'react-router-dom';
import { MessageCircle, Heart, LogOut } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useState, useEffect } from 'react';
import API_URL from '../config';
import './Navbar.css';

const Navbar: React.FC = () => {
  const location = useLocation();
  const { user, token, logout } = useAuth();
  const [requestCount, setRequestCount] = useState(0);

  // Poll for new requests every 30 seconds
  useEffect(() => {
    if (!token || !user) return;

    const fetchRequestCount = async () => {
      try {
        const res = await fetch(`${API_URL}/api/requests`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (!res.ok) return;
        const data = await res.json();
        setRequestCount(data.requests?.length || 0);
      } catch {
        // silently fail
      }
    };

    fetchRequestCount();
    const interval = setInterval(fetchRequestCount, 30000);
    return () => clearInterval(interval);
  }, [token, user]);

  return (
    <nav className="navbar">
      <div className="navbar-container">
        <Link to="/" className="navbar-brand">
          <Heart className="brand-icon" size={28} />
          <span className="brand-text">Zyntra</span>
        </Link>
        
        <div className="navbar-links">
          {user ? (
            <>
              <Link to="/discover" className={`nav-link ${location.pathname === '/discover' ? 'active' : ''}`}>
                Discover
              </Link>
              <Link to="/requests" className={`nav-link ${location.pathname === '/requests' ? 'active' : ''}`} title="Requests">
                <Heart size={20} />
                {requestCount > 0 && (
                  <span className="badge">{requestCount > 9 ? '9+' : requestCount}</span>
                )}
              </Link>
              <Link to="/messages" className={`nav-link ${location.pathname === '/messages' ? 'active' : ''}`}>
                <MessageCircle size={20} />
              </Link>
              <Link to="/profile" className={`user-profile-nav ${location.pathname === '/profile' ? 'active' : ''}`} title={`@${user.handle}`}>
                <img src={`https://ui-avatars.com/api/?name=${user.name}&background=random&bold=true`} alt="Profile" className="avatar-small" />
              </Link>
              <button onClick={logout} className="nav-link" style={{border: 'none', background: 'none', cursor: 'pointer'}}>
                <LogOut size={20} />
              </button>
            </>
          ) : (
            <>
              <Link to="/login" className="nav-link">Login</Link>
              <Link to="/register" className="btn-primary" style={{padding: '8px 16px', fontSize: '1rem', border: '3px solid #000'}}>Sign Up</Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
