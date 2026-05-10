import React from 'react';
import { Camera, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import './Hero.css';

const Hero: React.FC = () => {
  const navigate = useNavigate();

  const handleConnect = () => {
    // Mock login flow
    navigate('/discover');
  };

  return (
    <div className="hero-section">
      <div className="hero-background">
        <div className="gradient-blob blob-1"></div>
        <div className="gradient-blob blob-2"></div>
      </div>
      
      <div className="hero-content animate-fade-in">
        <div className="hero-badge">
          <span>✨ The new way to meet</span>
        </div>
        <h1 className="hero-title">
          Match through your <br />
          <span className="gradient-text">Instagram Aesthetic</span>
        </h1>
        <p className="hero-subtitle">
          Connect your Instagram to discover people with matching vibes. Real photos, real interests, real connections.
        </p>
        
        <div className="hero-actions">
          <button className="btn-primary connect-btn" onClick={handleConnect}>
            <Camera size={24} />
            Connect Instagram to Start
            <ArrowRight size={20} className="arrow-icon" />
          </button>
        </div>
        
        <div className="social-proof">
          <div className="avatars-group">
            <img src="https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?w=100&q=80" alt="User" />
            <img src="https://images.unsplash.com/photo-1517841905240-472988babdf9?w=100&q=80" alt="User" />
            <img src="https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=100&q=80" alt="User" />
          </div>
          <p>Join 10,000+ users finding love today</p>
        </div>
      </div>
    </div>
  );
};

export default Hero;
