# Vercel Deployment Guide for Reveal Photo Sharing

## What Changed

Updated the Vercel API to support two types of photo links:

1. **Preview Links** (`/p/[token]`) - For sender to preview
   - 30 minute expiration
   - One-time view
   - Example: `https://sp.keybo.ai/p/2122CC`

2. **Share Links** (`/s/[token]`) - For receiver
   - 1 minute after first view OR 1 hour (whichever comes first)
   - One-time view
   - Example: `https://sp.keybo.ai/s/ABC123`

3. **Legacy Links** (`/[token]`) - Backward compatibility
   - 60 second timer
   - Example: `https://sp.keybo.ai/Qk3p4q`

## Files Modified

1. **`vercel.json`** - Added routing for `/p/` and `/s/` prefixes
2. **`api/view.js`** - Updated to handle different link types with appropriate timers

## How to Deploy

### Option 1: Vercel CLI (Recommended)

```bash
cd /Users/mac/CascadeProjects/passbro-keyboard/vercel-project
vercel --prod
```

### Option 2: Vercel Dashboard

1. Go to https://vercel.com/dashboard
2. Select your `sp-keybo-ai` project
3. Click **"Settings"** → **"Git"**
4. Push changes to your connected Git repository
5. Vercel will auto-deploy

### Option 3: Manual Deploy

```bash
cd /Users/mac/CascadeProjects/passbro-keyboard/vercel-project
vercel deploy --prod
```

## Testing After Deployment

1. **Test Preview Link**:
   ```
   https://sp.keybo.ai/p/2122CC
   ```
   - Should show 30m timer
   - Should work in WKWebView

2. **Test Share Link**:
   ```
   https://sp.keybo.ai/s/ABC123
   ```
   - Should show 60s timer
   - Should expire after 1 view

3. **Test Legacy Link**:
   ```
   https://sp.keybo.ai/Qk3p4q
   ```
   - Should work as before

## Features

- ✅ Different timers for preview (30 min) vs share (60 sec)
- ✅ View count tracking
- ✅ 1-minute expiry after first view for share links
- ✅ Backward compatibility with legacy links
- ✅ Reveal bar drag system
- ✅ Anti-screenshot protection
- ✅ Mobile & desktop support

## Troubleshooting

### "Not Found" Error
- Make sure you've deployed to Vercel
- Check that the token exists in the database
- Verify the URL format matches: `/p/[token]` or `/s/[token]`

### Timer Not Working
- Clear browser cache
- Check browser console for JavaScript errors
- Verify the `linkType` is being passed correctly

### Database Errors
- Ensure the migration `20250919_add_link_types.sql` has been run
- Check that `link_type` and `first_viewed_at` columns exist in `photo_shares` table

## Environment Variables

No additional environment variables needed. The API uses:
- `SUPABASE_URL`: Hardcoded in `api/view.js`
- `SUPABASE_ANON_KEY`: Hardcoded in `api/view.js`

If you want to use environment variables instead:
1. Add to Vercel project settings
2. Update `api/view.js` to use `process.env.SUPABASE_URL`
