# Keybo.ai Photo Proxy

This Vercel project creates a proxy for Supabase photo URLs using your custom domain.

## Setup Steps

1. **Create Vercel Account**: Go to vercel.com and sign up
2. **Deploy Project**: 
   - Connect your GitHub repo or upload this folder
   - Vercel will auto-deploy
3. **Add Custom Domain**:
   - Go to Project Settings → Domains
   - Add `keybo.ai`
   - Follow DNS configuration instructions

## Usage

Once deployed, your photos will be accessible at:
`https://keybo.ai/photo?token=YOUR_TOKEN`

The URL will show your custom domain while properly rendering the HTML content.

## Files

- `api/photo.js` - Serverless function that proxies to Supabase
- `vercel.json` - Configuration for URL rewriting
- `package.json` - Project metadata
