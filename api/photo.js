// Vercel serverless function for sp.keybo.ai photo sharing
// Handles both short tokens (6 chars) and long tokens (32+ chars)

const SUPABASE_URL = 'https://rfylaeapulczgqrrcicy.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJmeWxhZWFwdWxjemducXJyY2ljeSIsInJvbGUiOiJhbm9uIiwiaWF0IjoxNzI2NjQ3NzUxLCJleHAiOjIwNDIyMjM3NTF9.Ik_bJmhzJJHBCUUKvGUaJVJGKFhOdOhHwPvGvOvJhwE';

export default async function handler(req, res) {
  const { token } = req.query;
  
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
      return res.status(404).json({ error: 'Photo not found' });
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
    
    // Get signed URL from Supabase Storage
    const storageResponse = await fetch(`${SUPABASE_URL}/storage/v1/object/sign/photos/${photo.storage_path}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'apikey': SUPABASE_ANON_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        expiresIn: 3600 // 1 hour
      })
    });

    if (!storageResponse.ok) {
      return res.status(500).json({ error: 'Failed to generate photo URL' });
    }

    const storageData = await storageResponse.json();
    
    // Redirect to the actual photo
    return res.redirect(302, `${SUPABASE_URL}${storageData.signedURL}`);
    
  } catch (error) {
    console.error('Photo sharing error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
