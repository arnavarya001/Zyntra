import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import API_URL from '../config';
import './Auth.css';

const Login = () => {
  const [handle, setHandle] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    try {
      const res = await fetch(`${API_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ handle, password })
      });
      
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Login failed');
      
      login(data.token, data.user);
      navigate('/discover');
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card brutal-box">
        <h2 className="auth-title">Log In</h2>
        {error && <div className="auth-error brutal-box">{error}</div>}
        <form onSubmit={handleSubmit} className="auth-form">
          <div className="input-group">
            <label>User ID</label>
            <input 
              type="text" 
              value={handle} 
              onChange={e => setHandle(e.target.value)} 
              placeholder="Your User ID" 
              required 
            />
          </div>
          <div className="input-group">
            <label>Password</label>
            <input 
              type="password" 
              value={password} 
              onChange={e => setPassword(e.target.value)} 
              placeholder="********" 
              required 
            />
          </div>
          <button type="submit" className="btn-primary auth-submit">Login</button>
        </form>
        <p className="auth-switch">
          Don't have an account? <Link to="/register">Register here.</Link>
        </p>
      </div>
    </div>
  );
};

export default Login;
