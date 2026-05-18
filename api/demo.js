// Vercel serverless function for demo photo showcase
// Serves a demo image to show users how the secure photo feature works

const DEMO_IMAGE_URL = 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80';

export default async function handler(req, res) {
  // Return the demo viewer page HTML
  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Secure Photo Demo - Keybo</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            color: white;
        }
        .container {
            max-width: 600px;
            width: 90%;
            text-align: center;
        }
        h1 {
            font-size: 2rem;
            margin-bottom: 1rem;
        }
        p {
            font-size: 1.1rem;
            margin-bottom: 2rem;
            opacity: 0.9;
        }
        .demo-card {
            background: white;
            border-radius: 16px;
            padding: 20px;
            box-shadow: 0 20px 60px rgba(0,0,0,0.3);
        }
        .demo-image {
            width: 100%;
            height: 300px;
            object-fit: cover;
            border-radius: 12px;
            margin-bottom: 20px;
        }
        .reveal-bar {
            background: rgba(255,255,255,0.25);
            border: 2px solid white;
            border-radius: 8px;
            padding: 12px;
            margin: 20px 0;
            font-weight: 600;
        }
        .features {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 16px;
            margin-top: 20px;
            text-align: left;
        }
        .feature {
            background: rgba(255,255,255,0.1);
            padding: 16px;
            border-radius: 8px;
        }
        .feature-icon {
            font-size: 1.5rem;
            margin-bottom: 8px;
        }
        .feature-text {
            font-size: 0.9rem;
            opacity: 0.9;
        }
        .cta {
            margin-top: 30px;
            padding: 16px 32px;
            background: white;
            color: #667eea;
            border: none;
            border-radius: 50px;
            font-size: 1.1rem;
            font-weight: 600;
            cursor: pointer;
            transition: transform 0.2s;
        }
        .cta:hover {
            transform: scale(1.05);
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>🔐 Secure Photo Sharing</h1>
        <p>Share photos privately with a reveal bar — the recipient swipes to see the image. Links expire in 1 minute after opening.</p>
        
        <div class="demo-card">
            <img src="${DEMO_IMAGE_URL}" alt="Demo mountain landscape" class="demo-image">
            <div class="reveal-bar">👆 Recipient swipes here to reveal</div>
        </div>
        
        <div class="features">
            <div class="feature">
                <div class="feature-icon">🔒</div>
                <div class="feature-text">Photos are encrypted and private</div>
            </div>
            <div class="feature">
                <div class="feature-icon">⏰</div>
                <div class="feature-text">Links expire after 24 hours</div>
            </div>
            <div class="feature">
                <div class="feature-icon">👆</div>
                <div class="feature-text">Swipe-to-reveal prevents screenshots</div>
            </div>
            <div class="feature">
                <div class="feature-icon">🔗</div>
                <div class="feature-text">Short, clean URLs (sp.keybo.ai/abc123)</div>
            </div>
        </div>
        
        <button class="cta" onclick="window.close()">Got it!</button>
    </div>
</body>
</html>
  `;

  res.setHeader('Content-Type', 'text/html');
  res.setHeader('Cache-Control', 'public, max-age=3600');
  return res.status(200).send(html);
}
