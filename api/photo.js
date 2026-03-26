// Vercel serverless function for sp.keybo.ai photo sharing
// Handles both short tokens (6 chars) and long tokens (32+ chars)

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://rfylaeapulczgqrrcicy.supabase.co';
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || 'sb_publishable_DwskAb_cvJJknLJMHGWmvA_Q4arXIbp';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

export default async function handler(req, res) {
  const { token } = req.query;
  
  // Test endpoint
  if (token === 'test') {
    return res.status(200).json({ 
      message: 'Vercel API is working',
      timestamp: new Date().toISOString(),
      url: req.url,
      query: req.query
    });
  }
  
  if (!token) {
    return res.status(400).json({ error: 'Token required' });
  }

  try {
    // Query database to find photo by either short_token or share_token
    const query = token.length <= 6 
      ? `short_token=eq.${token}`
      : `share_token=eq.${token}`;
    
    const dbResponse = await fetch(`${SUPABASE_URL}/rest/v1/photo_shares?${query}&select=photo_id,expires_at`, {
      headers: {
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'apikey': SUPABASE_ANON_KEY,
        'Content-Type': 'application/json'
      }
    });

    if (!dbResponse.ok) {
      const errorText = await dbResponse.text();
      return res.status(404).json({ error: 'Photo not found', debug: errorText });
    }

    const shares = await dbResponse.json();
    
    if (!shares || shares.length === 0) {
      return res.status(404).json({ error: 'Photo not found' });
    }

    const share = shares[0];
    
    // Check if expired
    if (new Date(share.expires_at) < new Date()) {
      return res.status(410).json({ error: 'Photo link has expired' });
    }

    // Get photo details
    const photoResponse = await fetch(`${SUPABASE_URL}/rest/v1/photos?id=eq.${share.photo_id}&select=storage_path`, {
      headers: {
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'apikey': SUPABASE_ANON_KEY,
        'Content-Type': 'application/json'
      }
    });

    if (!photoResponse.ok) {
      return res.status(404).json({ error: 'Photo not found' });
    }

    const photos = await photoResponse.json();
    
    if (!photos || photos.length === 0) {
      return res.status(404).json({ error: 'Photo not found' });
    }

    const photo = photos[0];
    
    // Get the photo data directly from Supabase Storage
    const storageResponse = await fetch(`${SUPABASE_URL}/storage/v1/object/photos/${photo.storage_path}`, {
      headers: {
        'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
        'apikey': SUPABASE_SERVICE_KEY
      }
    });

    if (!storageResponse.ok) {
      return res.status(500).json({ error: 'Failed to load photo' });
    }

    // Get the photo data as buffer
    const photoBuffer = await storageResponse.arrayBuffer();
    
    // Set appropriate headers for image display
    const contentType = photo.storage_path.toLowerCase().endsWith('.png') ? 'image/png' : 'image/jpeg';
    
    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 'public, max-age=3600');
    res.setHeader('Content-Length', photoBuffer.byteLength);
    
    // Send the photo data directly
    return res.send(Buffer.from(photoBuffer));
    
  } catch (error) {
    console.error('Photo sharing error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
