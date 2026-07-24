// Vercel serverless function for sp.keybo.ai photo sharing
// Handles both short tokens (6 chars) and long tokens (32+ chars)

import { createClient } from '@supabase/supabase-js';
import sharp from 'sharp';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

let supabase = null;
function getSupabase() {
  if (!supabase) {
    supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
  }
  return supabase;
}

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('[PHOTO] Missing required environment variables: SUPABASE_URL, SUPABASE_SERVICE_KEY');
}

function detectBot(userAgent) {
  const botPatterns = [
    /facebookexternalhit/i, /Twitterbot/i, /LinkedInBot/i, /WhatsApp/i,
    /TelegramBot/i, /SkypeUriPreview/i, /Slackbot/i, /DiscordBot/i,
    /com\.apple\.WebKit\.Networking/i, /LinkPreview/i,
    /Googlebot/i, /Bingbot/i, /YandexBot/i, /DuckDuckBot/i,
    /crawler/i, /spider/i, /scraper/i, /preview/i, /unfurl/i, /embed/i, /thumbnail/i,
    /WhatsApp/i,  // WhatsApp (all versions)
    /MicroMessenger/i,  // WeChat
    /Viber/i,  // Viber
    /Line/i,  // Line
    /Messenger/i,  // Facebook Messenger
    /Snapchat/i,  // Snapchat
    /Instagram/i,  // Instagram
    /Twitter/i,  // Twitter app
    /FB_IAB/i,  // Facebook in-app browser
    /FBAN/i,  // Facebook app
    /FBAV/i,  // Facebook app
    /Telegram/i,  // Telegram app
    /VK/i,  // VKontakte
    /Kakao/i,  // KakaoTalk
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

  const isDemo = token === 'demo' || token === 'demo-share-token-fixed-non-expiring';
  const DEMO_PLACEHOLDER_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="600"><rect width="100%" height="100%" fill="#111"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="#fff" font-size="48" font-family="sans-serif">Demo Photo</text></svg>`;

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

    if (!isDemo && share.current_views >= share.max_views) {
      return res.status(410).json({ error: 'Photo link view limit exceeded' });
    }

    const userAgent = req.headers['user-agent'] || 'unknown';
    const isBot = detectBot(userAgent);

    const now = new Date();

    // First-open logic: record when a human first opens the link
    if (!isDemo && !share.first_opened_at && !isBot) {
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
    if (!isDemo && share.first_opened_at) {
      const firstOpened = new Date(share.first_opened_at);
      const windowSeconds = share.view_window_seconds || 60;
      const effectiveExpiry = new Date(firstOpened.getTime() + windowSeconds * 1000);
      if (now > effectiveExpiry) {
        console.log(`[PHOTO] Link expired after viewing window`);
        return res.status(410).json({ error: 'Photo link has expired' });
      }
    }

    // Hard cap from expires_at
    if (!isDemo && share.expires_at && new Date(share.expires_at) < now) {
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

    let imageUrl = null;

    if (photo.storage_path) {
      // The 'photos' bucket is private, so we must create a signed URL instead of
      // fetching the object directly with the service key.
      try {
        const { data: signedUrlData, error: signError } = await getSupabase()
          .storage
          .from('photos')
          .createSignedUrl(photo.storage_path, 3600);

        if (signError) {
          console.log(`[PHOTO] Signed URL creation error: ${signError.message}`);
        } else if (signedUrlData?.signedUrl) {
          imageUrl = signedUrlData.signedUrl;
          console.log(`[PHOTO] Signed URL created: ${imageUrl}`);
        } else {
          console.log('[PHOTO] Signed URL response missing signedUrl');
        }
      } catch (signErr) {
        console.error('[PHOTO] Error creating signed URL:', signErr);
      }
    }

    // For demo, fall back to an inline SVG placeholder so /demo always renders something
    // without depending on any external service.
    if (isDemo && !imageUrl) {
      console.log('[PHOTO] Demo real photo missing; using placeholder');
      res.setHeader('Content-Type', 'image/svg+xml');
      res.setHeader('Cache-Control', 'public, max-age=3600');
      return res.send(DEMO_PLACEHOLDER_SVG);
    }

    if (!imageUrl) {
      return res.status(500).json({ error: 'Failed to create signed photo URL' });
    }

    console.log(`[PHOTO] Fetching image URL: ${imageUrl}`);
    const storageResponse = await fetch(imageUrl);

    if (!storageResponse.ok) {
      console.log(`[PHOTO] Image fetch failed: ${storageResponse.status}`);
      const storageError = await storageResponse.text();
      console.log(`[PHOTO] Storage error: ${storageError}`);
      return res.status(500).json({ error: 'Failed to load photo', debug: storageError });
    }

    console.log(`[PHOTO] Image fetch successful`);

    // Get the photo data as buffer
    const photoBuffer = await storageResponse.arrayBuffer();

    // Set appropriate headers for image display
    const contentType = photo.storage_path?.toLowerCase().endsWith('.png') ? 'image/png' : 'image/jpeg';

    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 'public, max-age=3600');
    
    // If this is a bot/link preview scraper, return 403 to prevent preview
    if (isBot) {
      console.log('[PHOTO] Bot detected, blocking image preview');
      return res.status(403).json({ error: 'Preview not allowed' });
    }

    res.setHeader('Content-Length', photoBuffer.byteLength);

    // Send the photo data directly
    return res.send(Buffer.from(photoBuffer));
    
  } catch (error) {
    console.error('Photo sharing error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
