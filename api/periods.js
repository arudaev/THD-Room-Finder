module.exports = async function handler(req, res) {
  if (req.method === 'OPTIONS') return res.status(204).end();

  const { date } = req.query;
  if (!date) {
    return res.status(400).json({ error: 'date query parameter required (YYYY-MM-DD HH:mm)' });
  }

  try {
    const upstream = await fetch(
      `https://thabella.th-deg.de/thabella/opn/period/findByDate/${encodeURIComponent(date)}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sqlDate: date }),
      }
    );

    if (!upstream.ok) {
      return res.status(upstream.status).json({ error: 'upstream error', status: upstream.status });
    }

    const data = await upstream.json();
    res.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=60');
    return res.status(200).json(data);
  } catch (err) {
    return res.status(502).json({ error: err.message });
  }
};
