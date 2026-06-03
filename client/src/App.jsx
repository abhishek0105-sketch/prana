import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';
import Welcome from './pages/Welcome';
import Auth from './pages/Auth';
import Home from './pages/Home';
import Hangout from './pages/Hangout';
import PlaceFinder from './pages/PlaceFinder';
import SendRound from './pages/SendRound';
import Memories from './pages/Memories';
import Invite from './pages/Invite';
import InstallPrompt from './components/InstallPrompt';

const Spinner = () => (
  <div className="flex items-center justify-center h-screen bg-bg">
    <div className="w-12 h-12 rounded-full border-4 border-violet border-t-transparent animate-spin" />
  </div>
);

// Protects routes that require login — shows spinner while auth resolves
function Protected({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <Spinner />;
  return user ? children : <Navigate to="/" replace />;
}

// Public routes (/ and /auth) that redirect away once logged in
function PublicOnly({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <Spinner />;
  return user ? <Navigate to="/home" replace /> : children;
}

export default function App() {
  return (
    <>
      <Routes>
        {/* Public — redirect to /home if already logged in */}
        <Route path="/"     element={<PublicOnly><Welcome /></PublicOnly>} />
        <Route path="/auth" element={<PublicOnly><Auth /></PublicOnly>} />

        {/* Protected — require login */}
        <Route path="/home"                    element={<Protected><Home /></Protected>} />
        <Route path="/hangout/:id"             element={<Protected><Hangout /></Protected>} />
        <Route path="/hangout/:id/places"      element={<Protected><PlaceFinder /></Protected>} />
        <Route path="/hangout/:id/send-round"  element={<Protected><SendRound /></Protected>} />
        <Route path="/memories"               element={<Protected><Memories /></Protected>} />

        {/* Fully public — invite links work without any account */}
        <Route path="/invite/:code" element={<Invite />} />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <InstallPrompt />
    </>
  );
}
