module.exports = async function handler(req, res) {
  if (req.method === 'OPTIONS') return res.status(204).end();

  try {
    const upstream = await fetch('https://thabella.th-deg.de/thabella/opn/room/findRooms', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{}',
    });

    if (!upstream.ok) {
      return res.status(upstream.status).json({ error: 'upstream error', status: upstream.status });
    }

    const data = await upstream.json();
    res.setHeader('Cache-Control', 'public, s-maxage=86400, stale-while-revalidate=3600');
    return res.status(200).json(data);
  } catch (err) {
    return res.status(502).json({ error: err.message });
  }
};
