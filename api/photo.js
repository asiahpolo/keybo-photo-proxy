// Vercel serverless function for keybo.ai photo proxy
// This will be accessible at https://keybo.ai/api/photo?token=xyz

export default async function handler(req, res) {
  const { token } = req.query;
  
  if (!token) {
    return res.status(400).json({ error: 'Token required' });
  }
  
  const supabaseUrl = `https://rfylaeapulczgqrrcicy.supabase.co/functions/v1/secure-photo?token=${encodeURIComponent(token)}`;
  
  try {
    const response = await fetch(supabaseUrl, {
      headers: {
        'User-Agent': 'KeyboProxy/1.0'
      }
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    
    const content = await response.text();
    const contentType = response.headers.get('content-type') || 'text/html; charset=utf-8';
    
    // Force HTML content type for proper rendering
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(content);
  } catch (error) {
    console.error('Proxy error:', error);
    res.status(500).json({ error: 'Failed to fetch content' });
  }
}
