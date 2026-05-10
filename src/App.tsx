import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import CursorParticles from './components/CursorParticles';
import Navbar from './components/Navbar';
import Landing from './pages/Landing';
import Discover from './pages/Discover';
import Messages from './pages/Messages';
import Login from './pages/Login';
import Register from './pages/Register';
import Requests from './pages/Requests';
import Profile from './pages/Profile';
import { AuthProvider, useAuth } from './context/AuthContext';
import './App.css';

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();
  if (loading) return <div style={{padding: '100px', textAlign: 'center', fontFamily: 'var(--font-display)', fontSize: '2rem'}}>LOADING...</div>;
  if (!user) return <Navigate to="/login" />;
  return <>{children}</>;
};

function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="app-container">
          <CursorParticles />
          <Navbar />
          <main className="main-content">
            <Routes>
              <Route path="/" element={<Landing />} />
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/discover" element={
                <ProtectedRoute>
                  <Discover />
                </ProtectedRoute>
              } />
              <Route path="/messages" element={
                <ProtectedRoute>
                  <Messages />
                </ProtectedRoute>
              } />
              <Route path="/requests" element={
                <ProtectedRoute>
                  <Requests />
                </ProtectedRoute>
              } />
              <Route path="/profile" element={
                <ProtectedRoute>
                  <Profile />
                </ProtectedRoute>
              } />
            </Routes>
          </main>
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;
