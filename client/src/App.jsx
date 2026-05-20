import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';
import Welcome from './pages/Welcome';
import Auth from './pages/Auth';
import Home from './pages/Home';
import Hangout from './pages/Hangout';
import PlaceFinder from './pages/PlaceFinder';
import SendRound from './pages/SendRound';
import Memories from './pages/Memories';

function Protected({ children }) {
  const { user, loading } = useAuth();
  if (loading) return (
    <div className="flex items-center justify-center h-screen bg-bg">
      <div className="w-12 h-12 rounded-full border-4 border-primary border-t-transparent animate-spin" />
    </div>
  );
  return user ? children : <Navigate to="/" replace />;
}

export default function App() {
  const { user, loading } = useAuth();

  if (loading) return (
    <div className="flex items-center justify-center h-screen bg-bg">
      <div className="w-12 h-12 rounded-full border-4 border-primary border-t-transparent animate-spin" />
    </div>
  );

  return (
    <Routes>
      <Route path="/" element={user ? <Navigate to="/home" replace /> : <Welcome />} />
      <Route path="/auth" element={user ? <Navigate to="/home" replace /> : <Auth />} />
      <Route path="/home" element={<Protected><Home /></Protected>} />
      <Route path="/hangout/:id" element={<Protected><Hangout /></Protected>} />
      <Route path="/hangout/:id/places" element={<Protected><PlaceFinder /></Protected>} />
      <Route path="/hangout/:id/send-round" element={<Protected><SendRound /></Protected>} />
      <Route path="/memories" element={<Protected><Memories /></Protected>} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
