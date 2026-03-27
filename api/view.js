// Vercel serverless function for photo viewing with reveal bar
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://rfylaeapulczgqrrcicy.supabase.co';
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJmeWxhZWFwdWxjemdxcnJjaWN5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTcxMzcyMTgsImV4cCI6MjA3MjcxMzIxOH0.H5WUfwszUTUGBhiUedx3Nwa_zk-Hn5hjUB1T2u7Rh7E';
// Use service key if available, otherwise fall back to anon key
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJmeWxhZWFwdWxjemdxcnJjaWN5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NzEzNzIxOCwiZXhwIjoyMDcyNzEzMjE4fQ.80VWdHRNc9V55A8Twl4BSxzLbgCcRCJzXwhbPHAd4Eo';

console.log(`[VIEW] Using SUPABASE_URL: ${SUPABASE_URL}`);
console.log(`[VIEW] Service key available: ${!!process.env.SUPABASE_SERVICE_KEY}`);

export default async function handler(req, res) {
  const { token } = req.query;
  
  if (!token) {
    return res.status(400).send('<html><body style="background:#000;color:#fff;text-align:center;padding:50px">Token required</body></html>');
  }

  try {
    console.log(`[VIEW] Token: ${token}`);
    
    // Query database to find photo by token
    const dbUrl = `${SUPABASE_URL}/rest/v1/photo_shares?short_token=eq.${token}&select=photo_id,expires_at,is_active`;
    console.log(`[VIEW] Query URL: ${dbUrl}`);
    
    const dbResponse = await fetch(dbUrl, {
      headers: {
        'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
        'apikey': SUPABASE_SERVICE_KEY,
        'Content-Type': 'application/json'
      }
    });

    console.log(`[VIEW] DB Response status: ${dbResponse.status}`);
    
    if (!dbResponse.ok) {
      const errorText = await dbResponse.text();
      console.log(`[VIEW] DB Error: ${errorText}`);
      return res.status(404).send('<html><body style="background:#000;color:#fff;text-align:center;padding:50px"><h1>Photo Not Found</h1><p>This link may have expired or is invalid</p></body></html>');
    }

    const shares = await dbResponse.json();
    console.log(`[VIEW] Shares found: ${shares.length}`, shares);
    
    if (!shares || shares.length === 0) {
      console.log(`[VIEW] No shares found for token: ${token}`);
      return res.status(404).send('<html><body style="background:#000;color:#fff;text-align:center;padding:50px"><h1>Photo Not Found</h1><p>This link may have expired or is invalid</p></body></html>');
    }

    const share = shares[0];
    
    // Check if link is active
    if (!share.is_active) {
      return res.status(410).send('<html><body style="background:#000;color:#fff;text-align:center;padding:50px"><h1>Link Expired</h1><p>This photo link is no longer active</p></body></html>');
    }
    
    // Check if expired
    if (new Date(share.expires_at) < new Date()) {
      return res.status(410).send('<html><body style="background:#000;color:#fff;text-align:center;padding:50px"><h1>Link Expired</h1><p>This photo link has expired</p></body></html>');
    }

    // Return HTML page with reveal functionality
    const html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=no">
    <title>Secure Photo</title>
    <style>
        body, html {
            margin: 0;
            padding: 0;
            width: 100%;
            height: 100%;
            background-color: #111;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            overflow: hidden;
            -webkit-user-select: none; /* Safari */
            -moz-user-select: none; /* Firefox */
            -ms-user-select: none; /* IE10+/Edge */
            user-select: none; /* Standard */
        }

        .container {
            display: flex;
            justify-content: center;
            align-items: center;
            width: 100%;
            height: 100%;
            flex-direction: column;
        }

        .photo-wrapper {
            position: relative;
            max-height: 80vh;
            aspect-ratio: auto;
            background: black;
            display: flex;
            align-items: center;
            justify-content: center;
        }

        .photo {
            display: block;
            max-height: 80vh;
            width: auto;
            object-fit: contain;
            clip-path: polygon(0 0, 100% 0, 100% 51px, 0 51px);
            transition: clip-path 0.3s ease;
            image-rendering: -webkit-optimize-contrast;
        }

        .reveal-bar {
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 45px;
            background: transparent;
            border: none;
            cursor: grab;
            z-index: 10;
            transition: top 0.3s ease;
            display: flex;
            align-items: center;
            justify-content: center;
            animation: demonstrateReveal 12s ease-in-out 1 forwards;
        }

        .reveal-bar.no-animation {
            animation: none !important;
        }

        .reveal-bar.dragging {
            cursor: grabbing;
        }

        @keyframes demonstrateReveal {
            0%, 100% { top: 0; }
            25% { top: 25%; }
            50% { top: 0; }
            75% { top: 25%; }
        }

        .photo.animating:not(.no-animation) {
            animation: revealAnimation 12s ease-in-out 1 forwards;
        }

        @keyframes revealAnimation {
            0% { clip-path: polygon(0 0, 100% 0, 100% 51px, 0 51px); }
            25% { clip-path: polygon(0 25%, 100% 25%, 100% calc(25% + 51px), 0 calc(25% + 51px)); }
            50% { clip-path: polygon(0 0, 100% 0, 100% 51px, 0 51px); }
            75% { clip-path: polygon(0 25%, 100% 25%, 100% calc(25% + 51px), 0 calc(25% + 51px)); }
            100% { clip-path: polygon(0 0, 100% 0, 100% 51px, 0 51px); }
        }

        .photo-wrapper {
            overflow: hidden;
        }

        .reveal-bar.dragging {
            animation: none;
        }

        .reveal-bar-handle {
            width: 50px;
            height: 5px;
            background: rgba(255, 255, 255, 0.8);
            border-radius: 3px;
            box-shadow: 0 2px 6px rgba(0, 0, 0, 0.3);
            cursor: grab;
            transition: opacity 0.2s ease;
        }

        .reveal-bar:active .reveal-bar-handle,
        .reveal-bar.dragging .reveal-bar-handle {
            cursor: grabbing;
            background: rgba(255, 255, 255, 1);
            box-shadow: 0 2px 8px rgba(255, 255, 255, 0.4);
            opacity: 0;
        }

        .reveal-bar:active {
            cursor: grabbing;
        }

        .onboarding-hint {
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            color: white;
            font-size: 16px;
            z-index: 15;
            pointer-events: none;
            opacity: 1;
            transition: opacity 0.5s ease;
            text-align: center;
        }

        .onboarding-hint .arrows {
            position: relative;
            width: 60px;
            height: 30px;
            margin: 10px auto 0;
        }

        .onboarding-hint .arrow {
            position: absolute;
            left: 50%;
            width: 12px;
            height: 12px;
            margin-left: -6px;
            border-left: 2px solid white;
            border-bottom: 2px solid white;
            transform: rotate(-45deg);
            animation: bounce 1.5s infinite;
        }

        .onboarding-hint .arrow:nth-child(2) {
            animation-delay: -0.2s;
        }

        .onboarding-hint .arrow:nth-child(3) {
            animation-delay: -0.4s;
        }

        @keyframes bounce {
            0%, 20%, 50%, 80%, 100% { transform: translateY(0) rotate(-45deg); }
            40% { transform: translateY(10px) rotate(-45deg); }
            60% { transform: translateY(5px) rotate(-45deg); }
        }

        .timer, .watermark, .expired {
            position: absolute;
            z-index: 20;
            color: white;
            background: rgba(0, 0, 0, 0.7);
            padding: 8px 15px;
            border-radius: 20px;
            font-size: 14px;
            backdrop-filter: blur(5px);
        }

        .timer {
            top: 20px;
            right: 20px;
        }

        .watermark {
            bottom: 20px;
            left: 50%;
            transform: translateX(-50%);
        }

        .watermark a {
            color: white;
            text-decoration: none;
            cursor: pointer;
            transition: opacity 0.2s;
        }

        .watermark a:hover {
            opacity: 0.8;
        }

        .expired {
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            text-align: center;
            display: none;
        }

        .guidance {
            position: absolute;
            top: 60px;
            left: 50%;
            transform: translateX(-50%);
            color: rgba(255, 255, 255, 0.7);
            font-size: 13px;
            text-align: center;
            pointer-events: none;
            animation: fadeInOut 3s ease-in-out;
        }

        @keyframes fadeInOut {
            0%, 100% { opacity: 0; }
            50% { opacity: 1; }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="photo-wrapper">
            <img src="/api/photo?token=${token}" alt="Secure Photo" class="photo">
            <div class="guidance" id="guidance">Drag the bar down to reveal photo</div>
            <div class="onboarding-hint" id="onboardingHint">
                <span>Drag down to reveal</span>
                <div class="arrows">
                    <div class="arrow"></div>
                    <div class="arrow"></div>
                    <div class="arrow"></div>
                </div>
            </div>
            <div class="reveal-bar" id="revealBar">
                <div class="reveal-bar-handle"></div>
            </div>
        </div>
        <div class="timer" id="timer">60s</div>
        <div class="watermark"><a href="https://keybo.ai" target="_blank">Shared via Keybo</a></div>
        <div class="expired" id="expired"></div>
    </div>

    <script>
        document.addEventListener('contextmenu', event => event.preventDefault());

        const photo = document.querySelector('.photo');
        const revealBar = document.getElementById('revealBar');
        const photoWrapper = document.querySelector('.photo-wrapper');
        const onboardingHint = document.getElementById('onboardingHint');
        const guidance = document.getElementById('guidance');
        let isDragging = false;
        let hasDragged = false;

        // Start animation on page load
        let animationStarted = false;
        photo.classList.add('animating');
        animationStarted = true;

        function updateReveal(clientY) {
            const wrapperRect = photoWrapper.getBoundingClientRect();
            const barHeight = revealBar.offsetHeight;
            const photoHeight = wrapperRect.height;

            let barTop = clientY - wrapperRect.top;
            barTop = Math.max(0, Math.min(photoHeight - barHeight, barTop));

            revealBar.style.top = barTop + 'px';

            // Use polygon to create a window that matches bar height exactly
            const barBottom = barTop + barHeight;
            photo.style.clipPath = 'polygon(0 ' + barTop + 'px, 100% ' + barTop + 'px, 100% ' + barBottom + 'px, 0 ' + barBottom + 'px)';
        }

        let hasInteracted = false;
        function trackInteraction() {
            if (!hasInteracted) {
                hasInteracted = true;
            }
        }

        function startDrag(event) {
            trackInteraction();
            isDragging = true;
            revealBar.classList.add('dragging');
            // Add no-animation class to both photo and reveal bar to prevent animation from running
            photo.classList.add('no-animation');
            revealBar.classList.add('no-animation');
            revealBar.style.cursor = 'grabbing';
            document.body.style.cursor = 'grabbing';
            photo.style.transition = 'none';
            revealBar.style.transition = 'none';

            if (!hasDragged) {
                hasDragged = true;
                onboardingHint.style.opacity = '0';
                guidance.style.opacity = '0';
            }

            if (event.type === 'touchstart') event.preventDefault();
        }

        function endDrag() {
            if (!isDragging) return;
            isDragging = false;
            revealBar.classList.remove('dragging');
            revealBar.style.cursor = 'grab';
            document.body.style.cursor = 'default';

            photo.style.transition = 'clip-path 0.3s ease';
            revealBar.style.transition = 'top 0.3s ease';
            revealBar.style.top = '0px';
            // Use polygon to match bar height exactly (51px)
            photo.style.clipPath = 'polygon(0 0, 100% 0, 100% 51px, 0 51px)';
        }

        function onDrag(event) {
            if (!isDragging) return;
            const clientY = event.type === 'touchmove' ? event.touches[0].clientY : event.clientY;
            updateReveal(clientY);
        }

        // Allow dragging from anywhere on the screen
        function startDragAnywhere(event) {
            // Only start drag if not already dragging
            if (isDragging) return;
            startDrag(event);
        }

        revealBar.addEventListener('mousedown', startDrag);
        photoWrapper.addEventListener('mousedown', startDragAnywhere);
        document.addEventListener('mouseup', endDrag);
        document.addEventListener('mousemove', onDrag);

        revealBar.addEventListener('touchstart', startDrag);
        photoWrapper.addEventListener('touchstart', startDragAnywhere);
        document.addEventListener('touchend', endDrag);
        document.addEventListener('touchmove', onDrag);

        // Countdown Timer (always 60s)
        let timeLeft = 60;
        const timerEl = document.getElementById('timer');
        const expiredEl = document.getElementById('expired');
        const photoWrapperEl = document.querySelector('.photo-wrapper');
        
        const countdown = setInterval(() => {
            timeLeft--;
            timerEl.textContent = timeLeft + 's';
            if (timeLeft <= 0) {
                clearInterval(countdown);
                photoWrapperEl.style.display = 'none';
                timerEl.style.display = 'none';
                expiredEl.innerHTML = '<h2>Photo Link Expired</h2><p>This secure photo is no longer available</p>';
                expiredEl.style.display = 'block';
            }
        }, 1000);

        setTimeout(() => window.location.reload(), 61000);

        // Prevent screenshot shortcuts
        document.addEventListener('keydown', (e) => {
            if (e.key === 'PrintScreen' || 
                (e.metaKey && e.shiftKey && (e.key === '3' || e.key === '4')) ||
                (e.ctrlKey && e.shiftKey && e.key === 'S')) {
                e.preventDefault();
                alert('Screenshots are not allowed');
            }
        });

        // Prevent drag and drop
        document.addEventListener('dragstart', (e) => {
            e.preventDefault();
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
