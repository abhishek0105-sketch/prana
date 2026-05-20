import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Search, MapPin, ExternalLink } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useSocket } from '../contexts/SocketContext';
import api from '../lib/api';

const VIBES = ['☕ Coffee', '🍺 Bar', '🍕 Pizza', '🍣 Sushi', '🍔 Burger', '🍜 Noodles', '🍦 Ice cream', '🥂 Wine bar'];

export default function PlaceFinder() {
  const { id } = useParams();
  const nav = useNavigate();
  const { user } = useAuth();
  const socket = useSocket();

  const [query, setQuery] = useState('');
  const [myCity, setMyCity] = useState(user?.city || '');
  const [friendCity, setFriendCity] = useState('');
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const search = async () => {
    if (!query || !myCity || !friendCity) {
      setError('Please fill in all fields'); return;
    }
    setError(''); setLoading(true);
    try {
      const data = await api.post('/places/search', { query, my_city: myCity, friend_city: friendCity });
      setResults(data);
    } catch { setError('Could not find places. Try different search terms.'); }
    finally { setLoading(false); }
  };

  const sharePlace = (place, forUser) => {
    socket?.emit('place-selected', { hangoutId: id, place, forUser });
  };

  const openMaps = (name, address) => {
    window.open(`https://www.google.com/maps/search/${encodeURIComponent(name + ' ' + address)}`, '_blank');
  };

  return (
    <div className="min-h-screen bg-bg flex flex-col max-w-lg mx-auto px-6 py-8 fade-in">
      <button onClick={() => nav(-1)} className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors mb-6">
        <ArrowLeft size={20} /> Back to Hangout
      </button>

      <h1 className="text-3xl font-black mb-2">🗺️ Find a Place</h1>
      <p className="text-gray-400 mb-6">Find the same spot in both your cities so you feel like you're really there together</p>

      {/* Vibe quick-picks */}
      <div className="flex flex-wrap gap-2 mb-6">
        {VIBES.map(v => (
          <button key={v} onClick={() => setQuery(v.split(' ').slice(1).join(' '))}
            className={`px-4 py-2 rounded-xl text-sm font-semibold border transition-all ${query === v.split(' ').slice(1).join(' ') ? 'bg-primary text-black border-primary' : 'bg-surface border-border text-gray-300 hover:border-primary'}`}>
            {v}
          </button>
        ))}
      </div>

      {/* Search form */}
      <div className="flex flex-col gap-4 mb-6">
        <div>
          <label className="text-gray-300 font-semibold block mb-2">What are you looking for?</label>
          <input className="input" placeholder="e.g. Starbucks, bar, sushi restaurant..."
            value={query} onChange={e => setQuery(e.target.value)} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-gray-300 font-semibold block mb-2 text-sm">📍 Your city</label>
            <input className="input text-base" placeholder="Your city" value={myCity} onChange={e => setMyCity(e.target.value)} />
          </div>
          <div>
            <label className="text-gray-300 font-semibold block mb-2 text-sm">📍 Friend's city</label>
            <input className="input text-base" placeholder="Their city" value={friendCity} onChange={e => setFriendCity(e.target.value)} />
          </div>
        </div>
        {error && <p className="text-red-400 font-medium">{error}</p>}
        <button className="btn-primary w-full" onClick={search} disabled={loading}>
          {loading ? <div className="w-6 h-6 rounded-full border-2 border-black border-t-transparent animate-spin" />
            : <><Search size={20} /> Find Matching Places</>}
        </button>
      </div>

      {/* Results */}
      {results && (
        <div className="flex flex-col gap-6 fade-in">
          {[{ label: `📍 Near you in ${myCity}`, places: results.my_places, forUser: 'me' },
            { label: `📍 Near them in ${friendCity}`, places: results.friend_places, forUser: 'friend' }].map(({ label, places, forUser }) => (
            <div key={forUser}>
              <h3 className="text-lg font-bold mb-3">{label}</h3>
              {places.length === 0
                ? <p className="text-gray-500 text-sm">No results found — try different search terms</p>
                : places.map(p => (
                  <div key={p.id} className="card flex items-start gap-4 mb-3">
                    <div className="w-10 h-10 rounded-xl bg-surface2 flex items-center justify-center flex-shrink-0">
                      <MapPin size={18} className="text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-base truncate">{p.name}</p>
                      <p className="text-gray-400 text-sm mt-0.5 line-clamp-2">{p.address}</p>
                    </div>
                    <div className="flex flex-col gap-2">
                      <button onClick={() => openMaps(p.name, p.address)}
                        className="p-2 rounded-xl bg-surface2 hover:bg-border transition-colors">
                        <ExternalLink size={16} className="text-gray-400" />
                      </button>
                      <button onClick={() => sharePlace(p, forUser)}
                        className="p-2 rounded-xl bg-primary hover:brightness-110 transition-all">
                        <span className="text-black text-xs font-black">GO</span>
                      </button>
                    </div>
                  </div>
                ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
