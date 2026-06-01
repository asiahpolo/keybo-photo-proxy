// Vercel serverless function for photo viewing with reveal bar
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://rfylaeapulczgqrrcicy.supabase.co';
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJmeWxhZWFwdWxjemdxcnJjaWN5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTcxMzcyMTgsImV4cCI6MjA3MjcxMzIxOH0.H5WUfwszUTUGBhiUedx3Nwa_zk-Hn5hjUB1T2u7Rh7E';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJmeWxhZWFwdWxjemdxcnJjaWN5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NzEzNzIxOCwiZXhwIjoyMDcyNzEzMjE4fQ.80VWdHRNc9V55A8Twl4BSxzLbgCcRCJzXwhbPHAd4Eo';

export default async function handler(req, res) {
  const { token } = req.query;
  if (!token) {
    return res.status(400).send('<html><body style="background:#000;color:#fff;text-align:center;padding:50px">Token required</body></html>');
  }

  const normalizedToken = String(token).trim().toLowerCase();
  const resolvedToken = normalizedToken === 'demo'
    ? 'demo-share-token-fixed-non-expiring'
    : normalizedToken;

  try {
    const upstreamUrl = `${SUPABASE_URL}/functions/v1/secure-photo?token=${encodeURIComponent(resolvedToken)}`;
    const upstreamResponse = await fetch(upstreamUrl, {
      method: 'GET',
      headers: {
        'User-Agent': req.headers['user-agent'] || 'unknown',
        'Accept': 'text/html',
        'X-Forwarded-For': req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown'
      }
    });

    const upstreamBody = await upstreamResponse.text();

    if (upstreamResponse.ok && upstreamResponse.headers.get('content-type')?.includes('text/html')) {
      res.status(upstreamResponse.status);
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.setHeader('Content-Disposition', 'inline');
      res.setHeader('Cache-Control', 'no-store, max-age=0, must-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
      const deployMarker = upstreamResponse.headers.get('x-secure-photo-deploy');
      if (deployMarker) {
        res.setHeader('X-Secure-Photo-Deploy', deployMarker);
      }
      return res.send(upstreamBody);
    }

    const dbUrl = `${SUPABASE_URL}/rest/v1/photo_shares?short_token=eq.${token}&select=photo_id,expires_at,is_active`;
    const dbResponse = await fetch(dbUrl, {
      headers: {
        'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
        'apikey': SUPABASE_SERVICE_KEY,
        'Content-Type': 'application/json'
      }
    });

    if (!dbResponse.ok) {
      return res.status(404).send('<html><body style="background:#000;color:#fff;text-align:center;padding:50px"><h1>Photo Not Found</h1><p>This link may have expired or is invalid</p></body></html>');
    }

    const shares = await dbResponse.json();
    if (!shares || shares.length === 0) {
      return res.status(404).send('<html><body style="background:#000;color:#fff;text-align:center;padding:50px"><h1>Photo Not Found</h1><p>This link may have expired or is invalid</p></body></html>');
    }

    const share = shares[0];
    if (!share.is_active) {
      return res.status(410).send('<html><body style="background:#000;color:#fff;text-align:center;padding:50px"><h1>Link Expired</h1><p>This photo link is no longer active</p></body></html>');
    }
    if (new Date(share.expires_at) < new Date()) {
      return res.status(410).send('<html><body style="background:#000;color:#fff;text-align:center;padding:50px"><h1>Link Expired</h1><p>This photo link has expired</p></body></html>');
    }

    let appLinkUrl = 'https://keybo.ai';
    const currentDate = new Date().toLocaleString();
    try {
      const linkRes = await fetch(`${SUPABASE_URL}/rest/v1/app_links?select=url,link_type&limit=1`, {
        headers: {
          Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
          apikey: SUPABASE_SERVICE_KEY,
          'Content-Type': 'application/json',
        },
      });
      if (linkRes.ok) {
        const links = await linkRes.json();
        if (links.length > 0 && links[0].url) {
          appLinkUrl = links[0].url;
        }
      }
    } catch (e) {
      console.error('[VIEW] Failed to fetch app link:', e);
    }

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=no, viewport-fit=cover">
<title>Secure Photo - Keybo</title>
<style>
:root {
  --primary: #007AFF;
  --bg: #000000;
  --surface: #1C1C1E;
  --text: #FFFFFF;
  --safe-top: env(safe-area-inset-top, 0px);
  --safe-bottom: env(safe-area-inset-bottom, 0px);
}
body, html {
  margin: 0; padding: 0;
  width: 100%; height: 100%;
  background: var(--bg);
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
  overflow: hidden;
  color: var(--text);
  -webkit-user-select: none;
  user-select: none;
  touch-action: none;
}
.main-container {
  display: flex;
  flex-direction: column;
  width: 100%; height: 100%;
  padding-top: var(--safe-top);
  padding-bottom: var(--safe-bottom);
  box-sizing: border-box;
}
.header {
  padding: 16px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  z-index: 100;
  background: rgba(0,0,0,0.5);
  backdrop-filter: blur(10px);
}
.brand { font-weight: 700; font-size: 20px; letter-spacing: -0.5px; color: var(--primary); }
.timer-container {
  display: flex; align-items: center; gap: 8px;
  background: rgba(255,255,255,0.1);
  padding: 6px 12px;
  border-radius: 20px;
  border: 1px solid rgba(255,255,255,0.1);
}
.timer-icon {
  width: 12px; height: 12px; border-radius: 50%; background: #FF3B30;
  animation: pulse 1s infinite;
}
@keyframes pulse {
  0% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.5; transform: scale(0.8); }
  100% { opacity: 1; transform: scale(1); }
}
#timer { font-variant-numeric: tabular-nums; font-weight: 600; font-size: 14px; }

.photo-area {
  flex: 1; position: relative;
  display: flex; justify-content: center; align-items: center;
  overflow: hidden; background: #000;
}
.photo-container {
  position: relative;
  width: 100%; height: 100%;
  max-width: 100vw; max-height: 80vh;
  display: flex; justify-content: center; align-items: center;
}
.photo {
  display: block; width: 100%; height: 100%;
  object-fit: contain;
  animation: aggressiveFlicker 0.15s infinite;
  clip-path: polygon(0 0, 100% 0, 100% 36px, 0 36px);
}
@keyframes aggressiveFlicker {
  0%, 100% { filter: brightness(1); }
  50% { filter: brightness(0); }
}
.reveal-bar {
  position: absolute; top: 0; left: 0;
  width: 100%; height: 36px;
  background: transparent;
  border-top: 1px solid rgba(255,255,255,0.5);
  border-bottom: 1px solid rgba(255,255,255,0.5);
  z-index: 50;
  display: flex; justify-content: center; align-items: center;
  cursor: grab; touch-action: none;
}
.reveal-bar::after {
  content: ""; width: 40px; height: 4px;
  background: rgba(255,255,255,0.8); border-radius: 2px;
}
.reveal-bar.dragging { cursor: grabbing; }
.reveal-bar.dragging::after { opacity: 0; }
.reveal-bar.dragging .grab-hand { display: none; }

.grab-hand {
  position: absolute;
  top: 50%; left: 50%;
  transform: translate(-50%, -50%);
  font-size: 26px;
  z-index: 55;
  pointer-events: none;
  animation: grabBounce 0.8s ease-in-out infinite;
}
@keyframes grabBounce {
  0%, 100% { transform: translate(-50%, -50%) translateY(0); }
  50% { transform: translate(-50%, -50%) translateY(8px); }
}

/* Drag hint in unrevealed area */
.drag-hint {
  position: absolute;
  top: 86px; left: 50%;
  transform: translateX(-50%);
  color: white;
  text-align: center;
  z-index: 40;
  pointer-events: none;
  transition: opacity 0.3s ease;
}
.drag-hint-text {
  font-size: 14px;
  opacity: 0.7;
  letter-spacing: 0.5px;
}

.info-overlay {
  position: absolute; bottom: 20px; left: 50%;
  transform: translateX(-50%);
  width: 90%;
  display: flex;
  justify-content: center;
  align-items: center;
  flex-wrap: nowrap;
  gap: 8px;
  pointer-events: none; z-index: 60;
}
.status-pill {
  display: inline-block;
  background: rgba(0,0,0,0.6); backdrop-filter: blur(5px);
  padding: 8px 16px; border-radius: 20px;
  font-size: 13px;
  border: 1px solid rgba(255,255,255,0.1);
  white-space: nowrap;
}
.status-pill.expiry { color: #FF9500; font-weight: 500; }

.watermark {
  margin-top: auto; padding: 24px;
  text-align: center;
  background: linear-gradient(to top, rgba(0,0,0,0.8), transparent);
}
.download-btn {
  display: inline-flex; align-items: center; gap: 10px;
  background: var(--surface); color: white;
  text-decoration: none; padding: 12px 24px;
  border-radius: 12px; font-weight: 600; font-size: 15px;
  transition: transform 0.2s;
  border: 1px solid rgba(255,255,255,0.1);
}
.download-btn:active { transform: scale(0.95); }
.footer-text { font-size: 11px; color: rgba(255,255,255,0.4); margin-top: 12px; }

.expired-overlay {
  position: absolute; inset: 0; background: #000;
  display: none; flex-direction: column;
  justify-content: center; align-items: center;
  z-index: 1000; padding: 40px; text-align: center;
}
.expired-icon { font-size: 48px; margin-bottom: 24px; }
.expired-title { font-size: 24px; font-weight: 700; margin-bottom: 12px; }
.expired-subtitle { font-size: 16px; color: rgba(255,255,255,0.6); line-height: 1.5; }

.scanlines {
  position: absolute; inset: 0;
  background: linear-gradient(to bottom, rgba(255,255,255,0) 50%, rgba(0,0,0,0.2) 50%);
  background-size: 100% 4px;
  z-index: 55; pointer-events: none; opacity: 0.1;
}
</style>
</head>
<body>
<div class="main-container">
  <header class="header">
    <div class="brand">keybo.ai</div>
    <div class="timer-container">
      <div class="timer-icon"></div>
      <div id="timer">60s</div>
    </div>
  </header>

  <main class="photo-area">
    <div class="photo-container" id="photoContainer">
      <img src="/api/photo?token=${token}" alt="Secure Photo" class="photo" id="photo">
      <div class="scanlines"></div>
      <div class="reveal-bar" id="revealBar">
        <div class="grab-hand" id="grabHand">&#128071;</div>
      </div>
      <div class="drag-hint" id="dragHint">
        <div class="drag-hint-text">Drag down to reveal</div>
      </div>
    </div>
    <div class="info-overlay" id="infoOverlay">
      <div class="status-pill expiry" id="expiryPill">Link expires in 60s</div>
      <div class="status-pill">One-time view only</div>
    </div>
  </main>

  <footer class="watermark">
    <a href="${appLinkUrl}" target="_blank" class="download-btn">
      <span>Get Keybo App</span>
    </a>
    <div class="footer-text">Securely shared via keybo.ai &bull; ${currentDate} &bull; BUILD: v-2026-0601-1818-expiredbtn</div>
  </footer>

  <div class="expired-overlay" id="expiredOverlay">
    <div class="expired-icon">&#128274;</div>
    <div class="expired-title">Link Expired</div>
    <div class="expired-subtitle">This secure photo has been permanently deleted for your protection.</div>
    <br><br>
    <a href="${appLinkUrl}" target="_blank" class="download-btn">Get Keybo App</a>
  </div>
</div>

<script>
  document.addEventListener('contextmenu', e => e.preventDefault());
  document.addEventListener('dragstart', e => e.preventDefault());

  const photo = document.getElementById('photo');
  const revealBar = document.getElementById('revealBar');
  const container = document.getElementById('photoContainer');
  const timerLabel = document.getElementById('timer');
  const expiryLabel = document.getElementById('expiryPill');
  const expiredOverlay = document.getElementById('expiredOverlay');
  const infoOverlay = document.getElementById('infoOverlay');
  const dragHint = document.getElementById('dragHint');
  const grabHand = document.getElementById('grabHand');

  let isDragging = false;
  let hasDraggedOnce = false;
  let timeLeft = 60;

  function updateReveal(clientY) {
    const rect = container.getBoundingClientRect();
    const barHeight = revealBar.offsetHeight;
    const containerHeight = rect.height;
    let relativeY = clientY - rect.top;
    relativeY = Math.max(0, Math.min(containerHeight - barHeight, relativeY));
    revealBar.style.top = relativeY + 'px';
    const start = relativeY;
    const end = relativeY + barHeight;
    photo.style.clipPath = 'polygon(0 ' + start + 'px, 100% ' + start + 'px, 100% ' + end + 'px, 0 ' + end + 'px)';
    // Hide info overlay only when bar is more than halfway down
    if (relativeY > containerHeight / 2) {
      infoOverlay.style.opacity = '0';
      infoOverlay.style.transition = 'opacity 0.2s ease';
    } else {
      infoOverlay.style.opacity = '1';
    }
    // Hide drag hint when bar moves past initial area
    if (relativeY > barHeight * 2) {
      dragHint.style.opacity = '0';
    } else {
      dragHint.style.opacity = '1';
    }
  }

  function handleStart(e) {
    isDragging = true;
    if (!hasDraggedOnce) {
      hasDraggedOnce = true;
      if (grabHand) grabHand.style.display = 'none';
    }
    revealBar.classList.add('dragging');
    revealBar.style.transition = '';
    photo.style.transition = '';
    const clientY = e.type.startsWith('touch') ? e.touches[0].clientY : e.clientY;
    updateReveal(clientY);
  }
  function handleMove(e) {
    if (!isDragging) return;
    const clientY = e.type.startsWith('touch') ? e.touches[0].clientY : e.clientY;
    updateReveal(clientY);
  }
  function handleEnd() {
    if (!isDragging) return;
    isDragging = false;
    revealBar.classList.remove('dragging');
    // Smoothly snap back to top
    revealBar.style.transition = 'top 0.3s ease-out';
    photo.style.transition = 'clip-path 0.3s ease-out';
    revealBar.style.top = '0px';
    photo.style.clipPath = 'polygon(0 0, 100% 0, 100% 36px, 0 36px)';
    infoOverlay.style.opacity = '1';
    dragHint.style.opacity = '1';
    // Clear transitions after animation completes
    setTimeout(() => {
      revealBar.style.transition = '';
      photo.style.transition = '';
    }, 300);
  }

  window.addEventListener('mousedown', handleStart);
  window.addEventListener('mousemove', handleMove);
  window.addEventListener('mouseup', handleEnd);
  window.addEventListener('touchstart', handleStart, { passive: false });
  window.addEventListener('touchmove', handleMove, { passive: false });
  window.addEventListener('touchend', handleEnd);

  // Welcome animation: bar goes down twice to demonstrate usage
  (function welcomeAnimation() {
    const containerHeight = container.getBoundingClientRect().height;
    const barHeight = revealBar.offsetHeight;
    const targetY = containerHeight * 0.3;
    const endY = targetY + barHeight;
    
    // Cycle 1 down
    setTimeout(() => {
      revealBar.style.transition = 'top 0.5s ease-out';
      photo.style.transition = 'clip-path 0.5s ease-out';
      revealBar.style.top = targetY + 'px';
      photo.style.clipPath = 'polygon(0 ' + targetY + 'px, 100% ' + targetY + 'px, 100% ' + endY + 'px, 0 ' + endY + 'px)';
    }, 500);
    
    // Cycle 1 back
    setTimeout(() => {
      revealBar.style.top = '0px';
      photo.style.clipPath = 'polygon(0 0, 100% 0, 100% 36px, 0 36px)';
    }, 1000);
    
    // Cycle 2 down
    setTimeout(() => {
      revealBar.style.top = targetY + 'px';
      photo.style.clipPath = 'polygon(0 ' + targetY + 'px, 100% ' + targetY + 'px, 100% ' + endY + 'px, 0 ' + endY + 'px)';
    }, 1500);
    
    // Cycle 2 back, cleanup
    setTimeout(() => {
      revealBar.style.top = '0px';
      photo.style.clipPath = 'polygon(0 0, 100% 0, 100% 36px, 0 36px)';
      revealBar.style.transition = '';
      photo.style.transition = '';
      infoOverlay.style.opacity = '1';
      dragHint.style.opacity = '1';
    }, 2000);
  })();

  const countdown = setInterval(() => {
    timeLeft--;
    const display = timeLeft + 's';
    timerLabel.textContent = display;
    expiryLabel.textContent = 'Link expires in ' + display;
    if (timeLeft <= 0) {
      clearInterval(countdown);
      expiredOverlay.style.display = 'flex';
      infoOverlay.style.display = 'none';
    }
  }, 1000);

  window.addEventListener('keydown', (e) => {
    if (e.key === 'PrintScreen' || 
        (e.metaKey && e.shiftKey && (e.key === '3' || e.key === '4')) ||
        (e.ctrlKey && e.shiftKey && e.key === 'S')) {
      e.preventDefault();
      photo.style.display = 'none';
      setTimeout(() => photo.style.display = 'block', 1000);
    }
  });

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      photo.style.opacity = '0';
    } else {
      photo.style.opacity = '1';
    }
  });
</script>
</body>
</html>`;

    res.setHeader('Content-Type', 'text/html');
    return res.send(html);
  } catch (error) {
    console.error('Photo view error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
