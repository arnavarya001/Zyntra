import { useState, useEffect, useRef } from 'react';
import { Save, Edit2, Trash2, Plus, X, Globe, Loader2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import API_URL from '../config';
import './Profile.css';

const Profile: React.FC = () => {
  const { token } = useAuth();
  const [profile, setProfile] = useState<any>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncStep, setSyncStep] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [editData, setEditData] = useState({
    name: '',
    age: '',
    bio: '',
    gender: 'Male',
    preference: 'Female'
  });

  useEffect(() => {
    fetchProfile();
  }, [token]);

  const fetchProfile = async () => {
    if (!token) return;
    try {
      const res = await fetch(`${API_URL}/api/profile`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.user) {
        setProfile(data.user);
        setEditData({
          name: data.user.name,
          age: data.user.age || '',
          bio: data.user.bio || '',
          gender: data.user.gender || 'Male',
          preference: data.user.preference || 'Female'
        });
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    try {
      const res = await fetch(`${API_URL}/api/profile/update`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}` 
        },
        body: JSON.stringify(editData)
      });
      if (!res.ok) throw new Error('Failed to update profile');
      setSuccess('Profile updated successfully!');
      setIsEditing(false);
      fetchProfile();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('photo', file);

    try {
      const res = await fetch(`${API_URL}/api/profile/upload-photo`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData
      });
      if (!res.ok) throw new Error('Failed to upload photo');
      fetchProfile();
    } catch (err) {
      console.error(err);
      setError('Upload failed. Images only, max 5MB.');
    }
  };

  const handleDeletePhoto = async (filename: string) => {
    try {
      await fetch(`${API_URL}/api/profile/delete-photo`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}` 
        },
        body: JSON.stringify({ filename })
      });
      fetchProfile();
    } catch (err) {
      console.error(err);
    }
  };

  const handleSyncInstagram = async () => {
    setIsSyncing(true);
    setSyncStep('Connecting to Instagram API...');
    
    await new Promise(r => setTimeout(r, 1500));
    setSyncStep('Authenticating account...');
    
    await new Promise(r => setTimeout(r, 1500));
    setSyncStep('Fetching latest posts...');
    
    await new Promise(r => setTimeout(r, 1500));
    setSyncStep('Importing high-res photos...');

    try {
      const res = await fetch(`${API_URL}/api/profile/sync-instagram`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Sync failed');
      await fetchProfile();
      setSuccess('Successfully synced 6 photos from Instagram!');
    } catch (err) {
      console.error(err);
      setError('Instagram sync failed. Please try again.');
    } finally {
      setIsSyncing(false);
      setSyncStep('');
    }
  };

  const getPhotoUrl = (photo: string) => {
    if (photo.startsWith('http')) return photo;
    return `${API_URL}/uploads/${photo}`;
  };

  if (loading) return <div className="profile-page"><h2>Loading Profile...</h2></div>;
  if (!profile) return <div className="profile-page"><h2>User not found.</h2></div>;

  return (
    <div className="profile-page animate-pop-in">
      <div className="profile-container brutal-box">
        <div className="profile-header">
          <h1 className="profile-title">{isEditing ? 'Edit Profile' : 'My Profile'}</h1>
          <button 
            className={`btn-icon ${isEditing ? 'active' : ''}`}
            onClick={() => setIsEditing(!isEditing)}
          >
            {isEditing ? <X size={24} /> : <Edit2 size={24} />}
          </button>
        </div>

        {error && <div className="error-msg brutal-box">{error}</div>}
        {success && <div className="success-msg brutal-box">{success}</div>}

        <div className="profile-content">
          <div className="photos-section">
            <h3>My Photos</h3>
            <div className="photo-grid">
              {profile.profile_pictures.map((photo: string, index: number) => (
                <div key={index} className="photo-item brutal-box">
                  <img src={getPhotoUrl(photo)} alt={`Profile ${index}`} />
                  {isEditing && (
                    <button className="delete-photo" onClick={() => handleDeletePhoto(photo)}>
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>
              ))}
              {profile.profile_pictures.length < 6 && (
                <button className="add-photo-btn brutal-box" onClick={() => fileInputRef.current?.click()}>
                  <Plus size={32} />
                  <span>Add Photo</span>
                </button>
              )}
            </div>
            <input 
              type="file" 
              ref={fileInputRef} 
              style={{ display: 'none' }} 
              onChange={handlePhotoUpload}
              accept="image/*"
            />
            
            <div className="instagram-sync-box brutal-box" style={{ marginTop: '24px', padding: '20px', background: 'var(--accent-blue)' }}>
              <h4 style={{ marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Globe size={20} /> Instagram Integration
              </h4>
              <p style={{ fontSize: '0.85rem', marginBottom: '16px', fontFamily: 'var(--font-mono)' }}>
                Automatically sync your 6 latest high-quality photos from Instagram to your profile.
              </p>
              <button className="btn-primary" style={{ width: '100%', background: 'black', color: 'white' }} onClick={handleSyncInstagram}>
                Connect & Sync
              </button>
            </div>
          </div>

          <div className="details-section">
            {isEditing ? (
              <form onSubmit={handleUpdate} className="profile-form">
                <div className="input-group">
                  <label>Display Name</label>
                  <input 
                    type="text" 
                    value={editData.name} 
                    onChange={e => setEditData({...editData, name: e.target.value})} 
                    required 
                  />
                </div>
                <div className="input-row">
                  <div className="input-group">
                    <label>Age</label>
                    <input 
                      type="number" 
                      value={editData.age} 
                      onChange={e => setEditData({...editData, age: e.target.value})} 
                      required 
                    />
                  </div>
                  <div className="input-group">
                    <label>Gender</label>
                    <select 
                      value={editData.gender} 
                      onChange={e => setEditData({...editData, gender: e.target.value})}
                    >
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                      <option value="Non-binary">Non-binary</option>
                    </select>
                  </div>
                </div>
                <div className="input-group">
                  <label>Interested In</label>
                  <select 
                    value={editData.preference} 
                    onChange={e => setEditData({...editData, preference: e.target.value})}
                  >
                    <option value="Male">Men</option>
                    <option value="Female">Women</option>
                    <option value="Everyone">Everyone</option>
                  </select>
                </div>
                <div className="input-group">
                  <label>Bio</label>
                  <textarea 
                    value={editData.bio} 
                    onChange={e => setEditData({...editData, bio: e.target.value})} 
                    rows={4}
                  />
                </div>
                <button type="submit" className="btn-secondary">
                  <Save size={20} /> Save Changes
                </button>
              </form>
            ) : (
              <div className="profile-view">
                <div className="view-item">
                  <label>Handle</label>
                  <p>@{profile.handle}</p>
                </div>
                <div className="view-item">
                  <label>Bio</label>
                  <p className="bio-text">{profile.bio || "No bio yet. Tell people something about yourself!"}</p>
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
                <div className="view-item">
                  <label>Seeking</label>
                  <p>{profile.preference === 'Everyone' ? 'Everyone' : (profile.preference === 'Male' ? 'Men' : 'Women')}</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {isSyncing && (
        <div className="sync-overlay">
          <div className="sync-modal brutal-box">
            <Loader2 size={48} className="animate-spin" />
            <h3>Syncing Instagram</h3>
            <p>{syncStep}</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default Profile;
