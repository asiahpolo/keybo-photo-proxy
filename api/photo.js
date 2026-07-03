// Vercel serverless function for sp.keybo.ai photo sharing
// Handles both short tokens (6 chars) and long tokens (32+ chars)

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://rfylaeapulczgqrrcicy.supabase.co';
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJmeWxhZWFwdWxjemdxcnJjaWN5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTcxMzcyMTgsImV4cCI6MjA3MjcxMzIxOH0.H5WUfwszUTUGBhiUedx3Nwa_zk-Hn5hjUB1T2u7Rh7E';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJmeWxhZWFwdWxjemdxcnJjaWN5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NzEzNzIxOCwiZXhwIjoyMDcyNzEzMjE4fQ.80VWdHRNc9V55A8Twl4BSxzLbgCcRCJzXwhbPHAd4Eo';

function detectBot(userAgent) {
  const botPatterns = [
    /facebookexternalhit/i, /Twitterbot/i, /LinkedInBot/i, /WhatsApp/i,
    /TelegramBot/i, /SkypeUriPreview/i, /Slackbot/i, /DiscordBot/i,
    /com\.apple\.WebKit\.Networking/i, /LinkPreview/i,
    /Googlebot/i, /Bingbot/i, /YandexBot/i, /DuckDuckBot/i,
    /crawler/i, /spider/i, /scraper/i, /preview/i, /unfurl/i, /embed/i, /thumbnail/i,
  ];
  return botPatterns.some(p => p.test(userAgent));
}

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
    console.log(`[PHOTO] Token: ${token}, Length: ${token.length}`);
    
    // Query database to find photo by either short_token or share_token
    const query = token.length <= 6 
      ? `short_token=eq.${token}`
      : `share_token=eq.${token}`;
    
    console.log(`[PHOTO] Query: ${query}`);
    
    const dbResponse = await fetch(`${SUPABASE_URL}/rest/v1/photo_shares?${query}&select=photo_id,expires_at,first_opened_at,view_window_seconds,max_views,current_views,id,is_active`, {
      headers: {
        'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
        'apikey': SUPABASE_SERVICE_KEY,
        'Content-Type': 'application/json'
      }
    });

    if (!dbResponse.ok) {
      const errorText = await dbResponse.text();
      console.log(`[PHOTO] DB Error: ${dbResponse.status} - ${errorText}`);
      return res.status(404).json({ error: 'Photo not found', debug: errorText });
    }

    const shares = await dbResponse.json();
    console.log(`[PHOTO] Shares found: ${shares.length}`, shares);
    
    if (!shares || shares.length === 0) {
      console.log(`[PHOTO] No shares found for token: ${token}`);
      return res.status(404).json({ error: 'Photo not found' });
    }

    const share = shares[0];
    console.log(`[PHOTO] Share record: ${JSON.stringify(share)}`);

    if (!share.is_active) {
      return res.status(410).json({ error: 'Photo link is no longer active' });
    }

    if (share.current_views >= share.max_views) {
      return res.status(410).json({ error: 'Photo link view limit exceeded' });
    }

    const userAgent = req.headers['user-agent'] || 'unknown';
    const isBot = detectBot(userAgent);

    const now = new Date();

    // First-open logic: record when a human first opens the link
    if (!share.first_opened_at && !isBot) {
      await fetch(`${SUPABASE_URL}/rest/v1/photo_shares?id=eq.${share.id}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
          'apikey': SUPABASE_SERVICE_KEY,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ first_opened_at: now.toISOString() }),
      });
      share.first_opened_at = now.toISOString();
    }

    // Effective expiry: first_opened_at + view_window_seconds
    if (share.first_opened_at) {
      const firstOpened = new Date(share.first_opened_at);
      const windowSeconds = share.view_window_seconds || 60;
      const effectiveExpiry = new Date(firstOpened.getTime() + windowSeconds * 1000);
      if (now > effectiveExpiry) {
        console.log(`[PHOTO] Link expired after viewing window`);
        return res.status(410).json({ error: 'Photo link has expired' });
      }
    }

    // Hard cap from expires_at
    if (share.expires_at && new Date(share.expires_at) < now) {
      console.log(`[PHOTO] Link expired: ${share.expires_at}`);
      return res.status(410).json({ error: 'Photo link has expired' });
    }

    // Get photo details
    console.log(`[PHOTO] Looking up photo with ID: ${share.photo_id}`);
    const photoResponse = await fetch(`${SUPABASE_URL}/rest/v1/photos?id=eq.${share.photo_id}&select=storage_path`, {
      headers: {
        'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
        'apikey': SUPABASE_SERVICE_KEY,
        'Content-Type': 'application/json'
      }
    });

    if (!photoResponse.ok) {
      const photoErrorText = await photoResponse.text();
      console.log(`[PHOTO] Photo lookup error: ${photoResponse.status} - ${photoErrorText}`);
      return res.status(404).json({ error: 'Photo not found', debug: photoErrorText });
    }

    const photos = await photoResponse.json();
    console.log(`[PHOTO] Photos found: ${photos.length}`, photos);
    
    if (!photos || photos.length === 0) {
      console.log(`[PHOTO] No photos found with ID: ${share.photo_id}`);
      return res.status(404).json({ error: 'Photo not found' });
    }

    const photo = photos[0];
    console.log(`[PHOTO] Photo record: ${JSON.stringify(photo)}`);
    console.log(`[PHOTO] Storage path: ${photo.storage_path}`);
    
    // Get the photo data directly from Supabase Storage
    const storageUrl = `${SUPABASE_URL}/storage/v1/object/photos/${photo.storage_path}`;
    console.log(`[PHOTO] Fetching from storage: ${storageUrl}`);
    
    const storageResponse = await fetch(storageUrl, {
      headers: {
        'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
        'apikey': SUPABASE_SERVICE_KEY
      }
    });

    if (!storageResponse.ok) {
      console.log(`[PHOTO] Storage fetch failed: ${storageResponse.status}`);
      const storageError = await storageResponse.text();
      console.log(`[PHOTO] Storage error: ${storageError}`);
      return res.status(500).json({ error: 'Failed to load photo', debug: storageError });
    }
    
    console.log(`[PHOTO] Storage fetch successful`);

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
