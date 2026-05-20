const router = require('express').Router();
const auth = require('../middleware/auth');

async function searchPlaces(query, city) {
  const encoded = encodeURIComponent(`${query} ${city}`);
  const url = `https://nominatim.openstreetmap.org/search?q=${encoded}&format=json&limit=5&addressdetails=1`;

  const res = await fetch(url, {
    headers: { 'User-Agent': 'PRANA-App/1.0 (remote-togetherness)' }
  });

  if (!res.ok) return [];
  const data = await res.json();

  return data.map(p => ({
    id: p.place_id,
    name: p.display_name.split(',').slice(0, 2).join(',').trim(),
    address: p.display_name,
    lat: p.lat,
    lon: p.lon,
    type: p.type
  }));
}

router.post('/search', auth, async (req, res) => {
  const { query, my_city, friend_city } = req.body;
  if (!query || !my_city || !friend_city)
    return res.status(400).json({ error: 'query, my_city, and friend_city are required' });

  const [myPlaces, friendPlaces] = await Promise.all([
    searchPlaces(query, my_city),
    searchPlaces(query, friend_city)
  ]);

  res.json({ my_places: myPlaces, friend_places: friendPlaces });
});

module.exports = router;
