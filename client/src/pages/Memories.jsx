import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Flame, Clock, Star, Heart } from 'lucide-react';
import api from '../lib/api';

export default function Memories() {
  const nav = useNavigate();
  const [friends, setFriends] = useState([]);
  const [stats, setStats]     = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/friends').then(async (fs) => {
      setFriends(fs);
      const results = await Promise.all(
        fs.map(f => api.get(`/friends/stats/${f.id}`).then(s => [f.id, s]).catch(() => [f.id, null]))
      );
      setStats(Object.fromEntries(results));
    }).finally(() => setLoading(false));
  }, []);

  const formatDate = (ts) => ts ? new Date(ts).toLocaleDateString('en', { month: 'short', day: 'numeric', year: 'numeric' }) : null;

  const totalHangouts = Object.values(stats).reduce((s, v) => s + (v?.totalHangouts || 0), 0);
  const bestStreak    = Math.max(0, ...Object.values(stats).map(v => v?.streak || 0));
  const topFriend     = friends.reduce((best, f) => {
    const count = stats[f.id]?.totalHangouts || 0;
    return count > (stats[best?.id]?.totalHangouts || 0) ? f : best;
  }, null);

  const onThisDayFriends = friends.filter(f => stats[f.id]?.onThisDay?.length > 0);

  return (
    <div className="min-h-screen bg-bg flex flex-col max-w-lg mx-auto px-6 py-8 fade-in">
      <button onClick={() => nav('/home')} className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors mb-6">
        <ArrowLeft size={20} /> Back
      </button>

      <div className="flex items-center gap-3 mb-8">
        <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl"
          style={{ background: 'linear-gradient(135deg, #00B4FF, #00E5A0)' }}>
          ✨
        </div>
        <div>
          <h1 className="text-3xl font-black">Memories</h1>
          <p className="text-gray-400">Your friendship history</p>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-10 h-10 rounded-full border-4 border-primary border-t-transparent animate-spin" />
        </div>
      ) : friends.length === 0 ? (
        <div className="card text-center py-12">
          <p className="text-4xl mb-4">🌱</p>
          <p className="text-white font-bold text-xl mb-2">No memories yet</p>
          <p className="text-gray-400">Add friends and start hanging out to build your history</p>
        </div>
      ) : (
        <>
          {/* Global stats */}
          <div className="grid grid-cols-3 gap-3 mb-8">
            <div className="card text-center">
              <p className="text-3xl font-black text-white">{totalHangouts}</p>
              <p className="text-gray-400 text-xs mt-1 flex items-center justify-center gap-1">
                <Clock size={10} /> Total hangouts
              </p>
            </div>
            <div className="card text-center">
              <p className="text-3xl font-black text-white">{bestStreak}</p>
              <p className="text-gray-400 text-xs mt-1 flex items-center justify-center gap-1">
                <Flame size={10} className="text-orange-400" /> Best streak
              </p>
            </div>
            <div className="card text-center">
              <p className="text-3xl font-black text-white">{friends.length}</p>
              <p className="text-gray-400 text-xs mt-1 flex items-center justify-center gap-1">
                <Heart size={10} className="text-pink-400" /> Friends
              </p>
            </div>
          </div>

          {/* On this day */}
          {onThisDayFriends.length > 0 && (
            <div className="mb-6">
              <h2 className="text-lg font-bold mb-3 flex items-center gap-2">
                <Star size={18} className="text-yellow-400" /> On This Day ✨
              </h2>
              {onThisDayFriends.map(f => (
                <div key={f.id} className="card mb-3 border-yellow-800 bg-yellow-950/20">
                  <div className="flex items-center gap-3">
                    <div className="avatar" style={{ background: f.avatar_color }}>
                      {f.name?.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <p className="font-bold text-white">You hung out with {f.name}!</p>
                      <p className="text-yellow-400 text-sm">On this day in a previous year 🎉</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Top friend */}
          {topFriend && stats[topFriend.id]?.totalHangouts > 0 && (
            <div className="mb-6">
              <h2 className="text-lg font-bold mb-3 flex items-center gap-2">
                <Flame size={18} className="text-orange-400" /> Your Ride-or-Die
              </h2>
              <div className="card border-purple-800 bg-purple-950/20">
                <div className="flex items-center gap-4">
                  <div className="avatar w-16 h-16 text-2xl" style={{ background: topFriend.avatar_color }}>
                    {topFriend.name?.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <p className="text-xl font-black text-white">{topFriend.name}</p>
                    <p className="text-purple-300 font-semibold">
                      🏆 {stats[topFriend.id]?.totalHangouts} hangouts together
                    </p>
                    {stats[topFriend.id]?.firstHangout && (
                      <p className="text-gray-400 text-sm mt-1">
                        Friends since {formatDate(stats[topFriend.id].firstHangout.started_at)}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Per-friend breakdown */}
          <h2 className="text-lg font-bold mb-3">All Friendships</h2>
          <div className="flex flex-col gap-3">
            {friends.map(f => {
              const s = stats[f.id];
              if (!s) return null;
              return (
                <div key={f.id} className="card">
                  <div className="flex items-center gap-4 mb-3">
                    <div className="avatar" style={{ background: f.avatar_color }}>
                      {f.name?.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()}
                    </div>
                    <div className="flex-1">
                      <p className="font-bold text-lg">{f.name}</p>
                      {s.firstHangout
                        ? <p className="text-gray-400 text-sm">Since {formatDate(s.firstHangout.started_at)}</p>
                        : <p className="text-gray-500 text-sm">No hangouts yet</p>}
                    </div>
                  </div>
                  {s.totalHangouts > 0 && (
                    <div className="grid grid-cols-2 gap-2">
                      <div className="bg-surface2 rounded-xl px-3 py-2 text-center">
                        <p className="text-xl font-black text-white">{s.totalHangouts}</p>
                        <p className="text-gray-500 text-xs">hangouts</p>
                      </div>
                      <div className="bg-surface2 rounded-xl px-3 py-2 text-center">
                        <p className="text-xl font-black text-white">{s.streak}🔥</p>
                        <p className="text-gray-500 text-xs">day streak</p>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
