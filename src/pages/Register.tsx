import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import API_URL from '../config';
import './Auth.css';

const Register = () => {
  const [formData, setFormData] = useState({
    handle: '',
    name: '',
    age: '',
    bio: '',
    gender: 'Male',
    preference: 'Female',
    password: ''
  });
  const [error, setError] = useState('');
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    try {
      const res = await fetch(`${API_URL}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Registration failed');
      
      login(data.token, data.user);
      navigate('/discover');
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <div className="auth-page" style={{overflowY: 'auto'}}>
      <div className="auth-card brutal-box" style={{marginTop: 'auto', marginBottom: 'auto'}}>
        <h2 className="auth-title">Create Account</h2>
        {error && <div className="auth-error brutal-box">{error}</div>}
        <form onSubmit={handleSubmit} className="auth-form">
          <div className="input-row">
            <div className="input-group">
              <label>Name</label>
              <input 
                type="text" 
                value={formData.name} 
                onChange={e => setFormData({...formData, name: e.target.value})} 
                required 
              />
            </div>
            <div className="input-group">
              <label>Age</label>
              <input 
                type="number" 
                value={formData.age} 
                onChange={e => setFormData({...formData, age: e.target.value})} 
                required 
              />
            </div>
          </div>

          <div className="input-row">
            <div className="input-group">
              <label>Your Gender</label>
              <select 
                value={formData.gender} 
                onChange={e => setFormData({...formData, gender: e.target.value})}
                required
                style={{padding: '12px', border: '3px solid #000', fontFamily: 'var(--font-mono)'}}
              >
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Non-binary">Non-binary</option>
              </select>
            </div>
            <div className="input-group">
              <label>Interested In</label>
              <select 
                value={formData.preference} 
                onChange={e => setFormData({...formData, preference: e.target.value})}
                required
                style={{padding: '12px', border: '3px solid #000', fontFamily: 'var(--font-mono)'}}
              >
                <option value="Male">Men</option>
                <option value="Female">Women</option>
                <option value="Everyone">Everyone</option>
              </select>
            </div>
          </div>

          <div className="input-group">
            <label>User ID</label>
            <input 
              type="text" 
              value={formData.handle} 
              onChange={e => setFormData({...formData, handle: e.target.value.replace('@','')})} 
              placeholder="e.g. zyntra_user" 
              required 
            />
            <small style={{fontFamily: 'var(--font-mono)', fontSize: '0.8rem', marginTop: '-4px'}}>This will be hidden until you match!</small>
          </div>
          <div className="input-group">
            <label>Bio</label>
            <textarea 
              value={formData.bio} 
              onChange={e => setFormData({...formData, bio: e.target.value})} 
              rows={2}
            />
          </div>
          <div className="input-group">
            <label>Password</label>
            <input 
              type="password" 
              value={formData.password} 
              onChange={e => setFormData({...formData, password: e.target.value})} 
              required 
            />
          </div>
          <button type="submit" className="btn-secondary auth-submit">Register</button>
        </form>
        <p className="auth-switch">
          Already have an account? <Link to="/login">Login here.</Link>
        </p>
      </div>
    </div>
  );
};

export default Register;
