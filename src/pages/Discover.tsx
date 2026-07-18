import { useState, useEffect, useRef } from 'react';
import ProfileCard from '../components/ProfileCard';
import type { UserProfile } from '../components/ProfileCard';
import { useAuth } from '../context/AuthContext';
import API_URL from '../config';
import './Discover.css';

const Discover: React.FC = () => {
  const [profiles, setProfiles] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [matchMessage, setMatchMessage] = useState<string | null>(null);
  const [newRequestNotif, setNewRequestNotif] = useState<string | null>(null);
  const { token } = useAuth();
  const prevRequestCount = useRef<number | null>(null);

  useEffect(() => {
    const fetchUsers = async () => {
      if (!token) return;
      try {
        const res = await fetch(`${API_URL}/api/users`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (!res.ok) throw new Error('Failed to fetch users');
        const data = await res.json();
        
        const formattedProfiles: UserProfile[] = data.users.map((u: any) => {
          const photos = u.profile_pictures ? JSON.parse(u.profile_pictures) : [];
          return {
            id: u.id.toString(),
            name: u.name,
            age: u.age || 20,
            handle: '', 
            bio: u.bio || "No bio provided.",
            photos: photos.length > 0 
              ? photos.map((p: string) => `${API_URL}/uploads/${p}`)
              : [`https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&q=80&random=${u.id}`],
            followers: `${Math.floor(Math.random() * 10) + 1}k`
          };
        });

        setProfiles(formattedProfiles);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchUsers();
  }, [token]);

  // Poll for new incoming requests and notify user
  useEffect(() => {
    if (!token) return;

    const checkNewRequests = async () => {
      try {
        const res = await fetch(`${API_URL}/api/requests`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (!res.ok) return;
        const data = await res.json();
        const count = data.requests?.length || 0;

        if (prevRequestCount.current !== null && count > prevRequestCount.current) {
          const diff = count - prevRequestCount.current;
          setNewRequestNotif(`💌 ${diff} new person${diff > 1 ? 's' : ''} liked you! Check Requests.`);
          setTimeout(() => setNewRequestNotif(null), 5000);
        }
        prevRequestCount.current = count;
      } catch {
        // silently fail
      }
    };

    checkNewRequests();
    const interval = setInterval(checkNewRequests, 30000);
    return () => clearInterval(interval);
  }, [token]);

  const interact = async (id: string, type: 'like' | 'skip') => {
    try {
      const res = await fetch(`${API_URL}/api/interact`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}` 
        },
        body: JSON.stringify({ target_id: parseInt(id), type })
      });
      const data = await res.json();
      if (data.match) {
        setMatchMessage("🎉 MUTUAL MATCH! Check your messages!");
        setTimeout(() => setMatchMessage(null), 4000);
      }
    } catch (err) {
      console.error(err);
    }
  }

  const handleMatch = (id: string) => {
    interact(id, 'like');
    setTimeout(() => {
      setProfiles(prev => prev.filter(p => p.id !== id));
    }, 1500);
  };

  const handleSkip = (id: string) => {
    interact(id, 'skip');
    setProfiles(prev => prev.filter(p => p.id !== id));
  };

  if (loading) {
    return (
      <div className="discover-page">
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '2rem' }}>LOADING PROFILES...</h2>
      </div>
    );
  }

  return (
    <div className="discover-page">
      {/* Match notification */}
      {matchMessage && (
        <div className="toast-notification toast-match">
          {matchMessage}
        </div>
      )}
      {/* New request notification */}
      {newRequestNotif && (
        <div className="toast-notification toast-request">
          {newRequestNotif}
        </div>
      )}
      {profiles.length > 0 ? (
        <div className="card-container animate-pop-in">
          <ProfileCard 
            profile={profiles[0]} 
            onMatch={handleMatch} 
            onSkip={handleSkip} 
          />
        </div>
      ) : (
        <div className="no-more-profiles animate-pop-in brutal-box">
          <h2>You've caught up!</h2>
          <p>There are no other registered users that match your preferences right now. Come back later!</p>
        </div>
      )}
    </div>
  );
};

export default Discover;
