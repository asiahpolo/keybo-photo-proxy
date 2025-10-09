export default async function handler(req, res) {
  const { token } = req.query;
  
  if (!token) {
    return res.status(400).send('Token required');
  }
  
  try {
    // Forward request to Supabase Edge Function
    const response = await fetch(
      `https://rfylaeapulczgqrrcicy.supabase.co/functions/v1/secure-photo?token=${token}`,
      {
        method: req.method,
        headers: {
          'User-Agent': req.headers['user-agent'] || 'unknown',
          'X-Forwarded-For': req.headers['x-forwarded-for'] || req.socket.remoteAddress
        }
      }
    );
    
    // Get the response body
    const body = await response.text();
    
    // Forward the status code
    res.status(response.status);
    
    // Forward important headers
    const contentType = response.headers.get('content-type');
    if (contentType) {
      res.setHeader('Content-Type', contentType);
    }
    
    // Send the response
    res.send(body);
  } catch (error) {
    console.error('Proxy error:', error);
    res.status(500).send('Internal server error');
  }
}
