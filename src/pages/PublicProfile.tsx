import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, MessageCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import API_URL from '../config';
import './Profile.css';

const PublicProfile: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { token } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await fetch(`${API_URL}/api/user/${id}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (!res.ok) throw new Error('User not found');
        const data = await res.json();
        setProfile(data.user);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, [id, token]);

  const getPhotoUrl = (photo: string) => {
    if (photo.startsWith('http')) return photo;
    return `${API_URL}/uploads/${photo}`;
  };

  if (loading) return (
    <div className="profile-page" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
      <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '2rem' }}>LOADING PROFILE...</h2>
    </div>
  );
  
  if (!profile) return (
    <div className="profile-page" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', textAlign: 'center', padding: '20px' }}>
      <div className="brutal-box" style={{ padding: '40px', background: 'var(--accent-pink)' }}>
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '2rem', marginBottom: '20px' }}>USER NOT FOUND</h2>
        <p style={{ fontFamily: 'var(--font-mono)', fontWeight: 'bold' }}>We couldn't find a user with ID: {id}</p>
        <button className="btn-secondary" style={{ marginTop: '20px' }} onClick={() => navigate(-1)}>Go Back</button>
      </div>
    </div>
  );

  return (
    <div className="profile-page animate-pop-in">
      <div className="profile-container brutal-box">
        <div className="profile-header">
          <button className="btn-icon" onClick={() => navigate(-1)}>
            <ArrowLeft size={24} />
          </button>
          <h1 className="profile-title" style={{ fontSize: '2rem' }}>{profile.name}</h1>
          <button className="btn-icon" onClick={() => navigate('/messages')}>
            <MessageCircle size={24} />
          </button>
        </div>

        <div className="profile-content">
          <div className="photos-section">
            <div className="photo-grid">
              {profile.profile_pictures.length > 0 ? (
                profile.profile_pictures.map((photo: string, index: number) => (
                  <div key={index} className="photo-item brutal-box">
                    <img src={getPhotoUrl(photo)} alt={`Profile ${index}`} />
                  </div>
                ))
              ) : (
                <div className="photo-item brutal-box" style={{ background: '#eee', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem', textAlign: 'center' }}>No photos yet</p>
                </div>
              )}
            </div>
          </div>

          <div className="details-section">
            <div className="profile-view">
              <div className="view-item">
                <label>User ID</label>
                <p>@{profile.handle}</p>
              </div>
              <div className="view-item">
                <label>Bio</label>
                <p className="bio-text">{profile.bio || "This user hasn't added a bio yet."}</p>
              </div>
              <div className="view-row">
                <div className="view-item">
                  <label>Age</label>
                  <p>{profile.age || 'Not set'}</p>
                </div>
                <div className="view-item">
                  <label>Gender</label>
                  <p>{profile.gender}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PublicProfile;
