// Vercel serverless function for photo viewing with reveal bar
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://rfylaeapulczgqrrcicy.supabase.co';
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || 'sb_publishable_DwskAb_cvJJknLJMHGWmvA_Q4arXIbp';
// Use service key if available, otherwise fall back to anon key
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || SUPABASE_ANON_KEY;

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
    const dbUrl = `${SUPABASE_URL}/rest/v1/photo_shares?short_token=eq.${token}&select=photo_id,expires_at,current_views,max_views,first_viewed_at`;
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
    
    // Check if expired
    if (new Date(share.expires_at) < new Date()) {
      return res.status(410).send('<html><body style="background:#000;color:#fff;text-align:center;padding:50px"><h1>Link Expired</h1><p>This photo link has expired</p></body></html>');
    }
    
    // Check if max views reached
    if (share.current_views >= share.max_views) {
      return res.status(410).send('<html><body style="background:#000;color:#fff;text-align:center;padding:50px"><h1>Link Used</h1><p>This link has already been viewed</p></body></html>');
    }
    
    // Check if 1 minute has passed since first view
    if (share.first_viewed_at) {
      const firstViewTime = new Date(share.first_viewed_at);
      const now = new Date();
      const minutesPassed = (now - firstViewTime) / 1000 / 60;
      if (minutesPassed > 1) {
        return res.status(410).send('<html><body style="background:#000;color:#fff;text-align:center;padding:50px"><h1>Link Expired</h1><p>This link expired after 1 minute</p></body></html>');
      }
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
            align-items: flex-start; /* Align to top */
            padding-top: 30px; /* Add 30px space at the top */
            width: 100%;
            height: 100%;
        }

        .photo-wrapper {
            position: relative;
            width: 100%;
            max-width: 500px;
            background: black;
        }

        .photo {
            display: block;
            width: 100%;
            height: 100%;
            object-fit: contain;
            clip-path: inset(0 0 calc(100% - 35px) 0); /* Initially reveal top slice */
            transition: clip-path 0.3s ease;
            image-rendering: -webkit-optimize-contrast;
        }

        .reveal-bar {
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 35px;
            border-top: 2px solid rgba(255, 255, 255, 0.9);
            border-bottom: 2px solid rgba(255, 255, 255, 0.9);
            cursor: grab;
            z-index: 10;
            transition: top 0.3s ease;
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

        .expired {
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            text-align: center;
            display: none;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="photo-wrapper">
            <img src="/api/photo?token=${token}" alt="Secure Photo" class="photo">
            <div class="onboarding-hint" id="onboardingHint">
                <span>Drag down to reveal</span>
                <div class="arrows">
                    <div class="arrow"></div>
                    <div class="arrow"></div>
                    <div class="arrow"></div>
                </div>
            </div>
            <div class="reveal-bar" id="revealBar"></div>
        </div>
        <div class="timer" id="timer">60s</div>
        <div class="watermark">Shared via Keybo</div>
        <div class="expired" id="expired"></div>
    </div>

    <script>
        document.addEventListener('contextmenu', event => event.preventDefault());

        const photo = document.querySelector('.photo');
        const revealBar = document.getElementById('revealBar');
        const photoWrapper = document.querySelector('.photo-wrapper');
        const onboardingHint = document.getElementById('onboardingHint');
        let isDragging = false;
        let hasDragged = false;

        function updateReveal(clientY) {
            const wrapperRect = photoWrapper.getBoundingClientRect();
            const barHeight = revealBar.offsetHeight;
            const photoHeight = wrapperRect.height;

            let barTop = clientY - wrapperRect.top;
            barTop = Math.max(0, Math.min(photoHeight - barHeight, barTop));

            revealBar.style.top = barTop + 'px';

            const clipTop = barTop;
            const clipBottom = photoHeight - (barTop + barHeight);

            photo.style.clipPath = 'inset(' + clipTop + 'px 0 ' + clipBottom + 'px 0)';
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
            revealBar.style.cursor = 'grabbing';
            document.body.style.cursor = 'grabbing';
            photo.style.transition = 'none';
            revealBar.style.transition = 'none';

            if (!hasDragged) {
                hasDragged = true;
                onboardingHint.style.opacity = '0';
            }

            if (event.type === 'touchstart') event.preventDefault();
        }

        function endDrag() {
            if (!isDragging) return;
            isDragging = false;
            revealBar.style.cursor = 'grab';
            document.body.style.cursor = 'default';

            photo.style.transition = 'clip-path 0.3s ease';
            revealBar.style.transition = 'top 0.3s ease';
            revealBar.style.top = '0px';
            photo.style.clipPath = 'inset(0 0 calc(100% - 35px) 0)';
        }

        function onDrag(event) {
            if (!isDragging) return;
            const clientY = event.type === 'touchmove' ? event.touches[0].clientY : event.clientY;
            updateReveal(clientY);
        }

        revealBar.addEventListener('mousedown', startDrag);
        document.addEventListener('mouseup', endDrag);
        document.addEventListener('mousemove', onDrag);

        revealBar.addEventListener('touchstart', startDrag);
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
