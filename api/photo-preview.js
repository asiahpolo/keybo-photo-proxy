// Vercel serverless function for photo preview (blurred placeholder for link previews)
// This endpoint serves a blurred placeholder image for WhatsApp, SMS, and other link preview scrapers

const BLURRED_PLACEHOLDER_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630">
  <rect width="1200" height="630" fill="#000000"/>
  <rect x="400" y="150" width="400" height="330" rx="20" fill="#1C1C1E"/>
  <defs>
    <filter id="blur">
      <feGaussianBlur stdDeviation="20"/>
    </filter>
  </defs>
  <circle cx="600" cy="280" r="80" fill="#333333" filter="url(#blur)"/>
  <rect x="450" y="380" width="300" height="30" rx="15" fill="#333333" filter="url(#blur)"/>
  <rect x="500" y="420" width="200" height="20" rx="10" fill="#333333" filter="url(#blur)"/>
  <text x="600" y="480" font-family="Arial, sans-serif" font-size="28" font-weight="bold" fill="#FFFFFF" text-anchor="middle">Secure Photo</text>
  <text x="600" y="515" font-family="Arial, sans-serif" font-size="18" fill="#888888" text-anchor="middle">Tap to view</text>
</svg>`;

export default async function handler(req, res) {
  // Convert SVG to PNG for better compatibility with iOS SMS and other platforms
  try {
    const sharp = require('sharp');
    const svgBuffer = Buffer.from(BLURRED_PLACEHOLDER_SVG);
    
    // Convert SVG to PNG for better platform compatibility
    const pngBuffer = await sharp(svgBuffer)
      .png()
      .toBuffer();
    
    res.setHeader('Content-Type', 'image/png');
    res.setHeader('Cache-Control', 'public, max-age=3600');
    res.setHeader('Content-Security-Policy', "default-src 'none'");
    res.setHeader('X-Content-Type-Options', 'nosniff');
    return res.send(pngBuffer);
  } catch (error) {
    // Fallback to SVG if sharp is not available
    console.error('[PHOTO-PREVIEW] Sharp not available, falling back to SVG');
    res.setHeader('Content-Type', 'image/svg+xml');
    res.setHeader('Cache-Control', 'public, max-age=3600');
    res.setHeader('Content-Security-Policy', "default-src 'none'");
    res.setHeader('X-Content-Type-Options', 'nosniff');
    return res.send(BLURRED_PLACEHOLDER_SVG);
  }
}
