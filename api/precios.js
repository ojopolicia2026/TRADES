export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Método no permitido' });
  }

  const ticker = req.query.ticker?.toUpperCase();

  if (!ticker) {
    return res.status(400).json({ error: 'Falta el parámetro ticker' });
  }

  try {
    const POLYGON_API_KEY = process.env.POLYGON_API_KEY;

    if (!POLYGON_API_KEY) {
      return res.status(500).json({ error: 'API key no configurada' });
    }

    const now = new Date();
    const today = now.toISOString().split('T')[0];

    const priceUrl = `https://api.polygon.io/v1/open-close/${ticker}/${today}?apiKey=${POLYGON_API_KEY}`;
    
    const priceResponse = await fetch(priceUrl);
    const priceData = await priceResponse.json();

    if (!priceData.c) {
      return res.status(404).json({ error: `No se encontró precio para ${ticker}` });
    }

    const price = priceData.c;

    const oneYearAgo = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
    const fromDate = oneYearAgo.toISOString().split('T')[0];

    const histUrl = `https://api.polygon.io/v2/aggs/ticker/${ticker}/range/1/day/${fromDate}/${today}?apiKey=${POLYGON_API_KEY}`;

    const histResponse = await fetch(histUrl);
    const histData = await histResponse.json();

    let ath = price;
    let high52 = price;

    if (histData.results && Array.isArray(histData.results)) {
      const allHighs = histData.results.map(d => d.h).filter(h => h > 0);
      const last52Weeks = histData.results.slice(-52).map(d => d.h).filter(h => h > 0);

      if (allHighs.length) ath = Math.max(...allHighs);
      if (last52Weeks.length) high52 = Math.max(...last52Weeks);
    }

    return res.status(200).json({
      ticker,
      price: parseFloat(price.toFixed(2)),
      ath: parseFloat(ath.toFixed(2)),
      high52: parseFloat(high52.toFixed(2)),
      source: 'Polygon.io',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error:', error);
    return res.status(500).json({ 
      error: 'Error obteniendo datos',
      message: error.message 
    });
  }
}
