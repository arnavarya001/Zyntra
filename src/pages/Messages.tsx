import { useState, useEffect, useRef } from 'react';
import { Search, MoreVertical, Send, Phone, Video, ChevronLeft } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import './Messages.css';

interface Match {
  id: number;
  handle: string;
  name: string;
  age: number;
  bio: string;
  photo: string;
}

const Messages: React.FC = () => {
  const [matches, setMatches] = useState<Match[]>([]);
  const [activeMatch, setActiveMatch] = useState<Match | null>(null);
  const [messageText, setMessageText] = useState('');
  const [messages, setMessages] = useState<any[]>([]);
  const [isCalling, setIsCalling] = useState(false);
  const { user, token } = useAuth();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Fetch mutual matches
  useEffect(() => {
    const fetchMatches = async () => {
      if (!token) return;
      try {
        const res = await fetch('/api/matches', {
          headers: { Authorization: `Bearer ${token}` }
        });
        const data = await res.json();
        if (data.matches) {
          const formatted = data.matches.map((m: any) => ({
            ...m,
            photo: `https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&q=80&random=${m.id}`
          }));
          setMatches(formatted);
        }
      } catch (err) {
        console.error(err);
      }
    };
    fetchMatches();
  }, [token]);

  // Fetch messages for active match (Polling every 3 seconds)
  useEffect(() => {
    let interval: NodeJS.Timeout;

    const fetchMessages = async () => {
      if (!token || !activeMatch) return;
      try {
        const res = await fetch(`/api/messages/${activeMatch.id}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const data = await res.json();
        if (data.messages) {
          setMessages(data.messages);
        }
      } catch (err) {
        console.error(err);
      }
    };

    if (activeMatch) {
      fetchMessages(); // Initial fetch
      interval = setInterval(fetchMessages, 3000); // Poll every 3s
    }

    return () => clearInterval(interval);
  }, [token, activeMatch]);

  // Auto-scroll to bottom of chat
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageText.trim() || !activeMatch || !token || !user) return;

    const textToSend = messageText;
    setMessageText('');

    // Optimistic UI update
    const tempMsg = {
      id: Date.now(),
      sender_id: user.id,
      receiver_id: activeMatch.id,
      text: textToSend,
      created_at: new Date().toISOString()
    };
    setMessages(prev => [...prev, tempMsg]);

    try {
      await fetch('/api/messages', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}` 
        },
        body: JSON.stringify({ receiver_id: activeMatch.id, text: textToSend })
      });
      // The polling will fetch the confirmed message shortly
    } catch (err) {
      console.error(err);
    }
  };

  const startCall = () => setIsCalling(true);
  const endCall = () => setIsCalling(false);

  return (
    <div className="messages-layout brutal-box">
      
      {/* Sidebar - Hides on Mobile when a chat is open */}
      <div className={`messages-sidebar ${activeMatch ? 'hidden-on-mobile' : ''}`}>
        <div className="sidebar-header">
          <h2>Messages</h2>
          <div className="search-bar">
            <Search size={18} className="search-icon" />
            <input type="text" placeholder="Search matches..." />
          </div>
        </div>
        
        <div className="matches-list">
          {matches.length === 0 ? (
            <div style={{padding: '20px', textAlign: 'center'}}>No mutual matches yet. Keep swiping!</div>
          ) : (
            matches.map((match) => (
              <div 
                key={match.id} 
                className={`match-item ${activeMatch?.id === match.id ? 'active' : ''}`}
                onClick={() => setActiveMatch(match)}
              >
                <img src={match.photo} alt={match.name} className="match-avatar" />
                <div className="match-info">
                  <h4>{match.name}</h4>
                  <span className="match-preview">Tap to chat!</span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
      
      {/* Chat Area - Shows on Mobile only when a chat is open */}
      <div className={`chat-area ${activeMatch ? 'active-on-mobile' : ''}`}>
        {activeMatch ? (
          <>
            <div className="chat-header">
              <div className="chat-user-info">
                <button className="mobile-back-btn" onClick={() => setActiveMatch(null)}>
                  <ChevronLeft size={24} />
                </button>
                <img src={activeMatch.photo} alt={activeMatch.name} className="chat-avatar" />
                <div className="chat-user-details">
                  <h3>{activeMatch.name}</h3>
                  <div className="ig-reveal">@{activeMatch.handle}</div>
                </div>
              </div>
              <div className="chat-actions">
                <button className="icon-btn" onClick={startCall}><Phone size={20} /></button>
                <button className="icon-btn" onClick={startCall}><Video size={20} /></button>
                <button className="icon-btn"><MoreVertical size={20} /></button>
              </div>
            </div>
            
            <div className="messages-container">
              {messages.length === 0 && (
                <div style={{textAlign: 'center', color: '#8e8e8e', marginTop: '20px'}}>
                  Say hi to {activeMatch.name}!
                </div>
              )}
              {messages.map((msg) => {
                const isMe = msg.sender_id === user?.id;
                return (
                  <div key={msg.id} className={`message-wrapper ${isMe ? 'sent' : 'received'}`}>
                    <div className="message-row">
                      {!isMe && <img src={activeMatch.photo} alt="Avatar" className="message-avatar" />}
                      <div className={`message-bubble ${isMe ? 'me' : 'them'}`}>
                        {msg.text}
                      </div>
                    </div>
                    <span className="message-time">
                      {new Date(msg.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                    </span>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>
            
            <form className="message-input-area" onSubmit={handleSendMessage}>
              <input 
                type="text" 
                placeholder="Message..." 
                value={messageText}
                onChange={(e) => setMessageText(e.target.value)}
              />
              <button type="submit" className="send-btn" disabled={!messageText.trim()}>
                <Send size={24} />
              </button>
            </form>

            {/* FAKE CALL OVERLAY */}
            {isCalling && (
              <div className="call-overlay">
                <img src={activeMatch.photo} alt="Calling" className="call-avatar" />
                <h2>Ringing {activeMatch.name}...</h2>
                <p>Establishing secure Neo-Brutalist connection...</p>
                <button className="end-call-btn hover-scale" onClick={endCall}>End Call</button>
              </div>
            )}
          </>
        ) : (
          <div className="no-chat-selected">
            <div className="empty-state-icon">💬</div>
            <h2>Your Messages</h2>
            <p>Send private photos and messages to a friend or group.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Messages;
