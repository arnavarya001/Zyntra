import { useState, useEffect } from 'react';
import ProfileCard from '../components/ProfileCard';
import type { UserProfile } from '../components/ProfileCard';
import { useAuth } from '../context/AuthContext';
import './Discover.css';

const Requests: React.FC = () => {
  const [requests, setRequests] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);
  const { token } = useAuth();

  useEffect(() => {
    const fetchRequests = async () => {
      if (!token) return;
      try {
        const res = await fetch('/api/requests', {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (!res.ok) throw new Error('Failed to fetch requests');
        const data = await res.json();
        
        const formatted: UserProfile[] = data.requests.map((u: any) => ({
          id: u.id.toString(),
          name: u.name,
          age: u.age || 20,
          handle: u.handle,
          bio: u.bio || "No bio provided.",
          photos: u.profile_pictures && u.profile_pictures.length > 0 
            ? u.profile_pictures.map((p: string) => `/uploads/${p}`)
            : [`https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&q=80&random=${u.id}`],
          followers: `${Math.floor(Math.random() * 10) + 1}k`
        }));

        setRequests(formatted);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchRequests();
  }, [token]);

  const handleMatch = async (id: string) => {
    try {
      const res = await fetch('/api/interact', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}` 
        },
        body: JSON.stringify({ target_id: parseInt(id), type: 'like' })
      });
      const data = await res.json();
      if (data.match) {
        setMessage("IT'S A MATCH! You can now chat in Messages.");
        setTimeout(() => setMessage(null), 3000);
      }
      setRequests(prev => prev.filter(p => p.id !== id));
    } catch (err) {
      console.error(err);
    }
  };

  const handleSkip = async (id: string) => {
    try {
      await fetch('/api/interact', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}` 
        },
        body: JSON.stringify({ target_id: parseInt(id), type: 'skip' })
      });
      setRequests(prev => prev.filter(p => p.id !== id));
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) {
    return (
      <div className="discover-page">
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '2rem' }}>LOADING REQUESTS...</h2>
      </div>
    );
  }

  return (
    <div className="discover-page">
      <h1 className="auth-title" style={{ marginBottom: '2rem', fontSize: '2.5rem' }}>Match Requests</h1>
      {message && (
        <div style={{
          position: 'fixed', top: '100px', zIndex: 1000, 
          background: 'var(--accent-green)', padding: '20px', 
          border: '3px solid black', boxShadow: '8px 8px 0px black',
          fontFamily: 'var(--font-display)', fontSize: '1.5rem', fontWeight: 'bold'
        }}>
          {message}
        </div>
      )}
      {requests.length > 0 ? (
        <div className="card-container animate-pop-in">
          <ProfileCard 
            profile={requests[0]} 
            onMatch={handleMatch} 
            onSkip={handleSkip} 
          />
          <div style={{ marginTop: '1rem', fontFamily: 'var(--font-mono)', textAlign: 'center' }}>
            {requests.length} people like you!
          </div>
        </div>
      ) : (
        <div className="no-more-profiles animate-pop-in brutal-box">
          <h2>No pending requests!</h2>
          <p>Keep swiping in Discover to find more people.</p>
        </div>
      )}
    </div>
  );
};

export default Requests;
