import { useState } from 'react';
import { Heart, X, Camera, CheckCircle2 } from 'lucide-react';
import './ProfileCard.css';

export interface UserProfile {
  id: string;
  name: string;
  age: number;
  handle: string;
  bio: string;
  photos: string[];
  followers: string;
}

interface ProfileCardProps {
  profile: UserProfile;
  onMatch: (id: string) => void;
  onSkip: (id: string) => void;
}

const ProfileCard: React.FC<ProfileCardProps> = ({ profile, onMatch, onSkip }) => {
  const [currentPhoto, setCurrentPhoto] = useState(0);
  const [isMatched, setIsMatched] = useState(false);

  const nextPhoto = () => {
    setCurrentPhoto((prev) => (prev + 1) % profile.photos.length);
  };

  const handleMatch = () => {
    setIsMatched(true);
    setTimeout(() => {
      onMatch(profile.id);
    }, 1000);
  };

  return (
    <div className={`profile-card glass-panel ${isMatched ? 'matched-animation' : ''}`}>
      <div className="profile-photos" onClick={nextPhoto}>
        <img src={profile.photos[currentPhoto]} alt={`${profile.name}'s photo`} className="photo-main" />
        <div className="photo-indicators">
          {profile.photos.map((_, idx) => (
            <div key={idx} className={`indicator ${idx === currentPhoto ? 'active' : ''}`} />
          ))}
        </div>
      </div>
      
      <div className="profile-info">
        <div className="profile-header">
          <h2>{profile.name}, {profile.age}</h2>
          <div className="ig-handle">
            <Camera size={16} /> Hidden until match
          </div>
        </div>
        
        <div className="profile-stats">
          <span className="stat-pill">{profile.followers} Followers</span>
          <span className="stat-pill"><CheckCircle2 size={14} className="verified-icon" /> Verified</span>
        </div>
        
        <p className="profile-bio">{profile.bio}</p>
        
        <div className="profile-actions">
          <button className="action-btn skip-btn hover-scale" onClick={() => onSkip(profile.id)}>
            <X size={28} />
          </button>
          <button className="action-btn match-btn hover-scale" onClick={handleMatch}>
            <Heart size={28} className="heart-icon" />
          </button>
        </div>
      </div>
      
      {isMatched && (
        <div className="match-overlay">
          <Heart size={64} className="animate-match-heart" />
          <h2>It's a Match!</h2>
        </div>
      )}
    </div>
  );
};

export default ProfileCard;
