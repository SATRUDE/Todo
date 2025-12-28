# Fix "Error 400: invalid_request" on Production

## The Problem
The production redirect URI doesn't match what's configured in Google Cloud Console.

## Step-by-Step Fix

### 1. Find Your Production URL
Your Vercel app URL should be something like: `https://your-app-name.vercel.app`

### 2. Set Environment Variable in Vercel

1. Go to your [Vercel Dashboard](https://vercel.com/dashboard)
2. Select your project
3. Go to **Settings** → **Environment Variables**
4. Add or update:
   - **Name**: `GOOGLE_REDIRECT_URI`
   - **Value**: `https://your-actual-vercel-url.vercel.app/api/calendar/callback`
   - **Environment**: Select **Production** (and Preview if needed)
5. Click **Save**
6. **Redeploy your app** (this is important!)

### 3. Add Production Redirect URI to Google Cloud Console

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Select your project
3. Go to **APIs & Services** → **Credentials**
4. Click your OAuth 2.0 Client ID
5. Under **Authorized redirect URIs**, add:
   ```
   https://your-actual-vercel-url.vercel.app/api/calendar/callback
   ```
   **Important**: 
   - Replace `your-actual-vercel-url` with your actual Vercel domain
   - Use `https://` (not `http://`)
   - No trailing slash
   - Must match EXACTLY what you set in Vercel
6. Under **Authorized JavaScript origins**, add:
   ```
   https://your-actual-vercel-url.vercel.app
   ```
   (No trailing slash)
7. Click **SAVE**

### 4. Publish OAuth Consent Screen (Required for Production)

1. Go to **APIs & Services** → **OAuth consent screen**
2. Make sure all required fields are filled:
   - App name
   - User support email
   - Developer contact information
   - Scopes (calendar.events and calendar.readonly)
3. **Click "PUBLISH APP"** at the top
4. Confirm the publishing
5. Wait 1-2 minutes

### 5. Verify Everything

Checklist:
- ✅ `GOOGLE_REDIRECT_URI` is set in Vercel with your production URL
- ✅ Production redirect URI is added to Google Cloud Console
- ✅ Production JavaScript origin is added to Google Cloud Console
- ✅ OAuth consent screen is **PUBLISHED** (not in Testing mode)
- ✅ App has been redeployed after setting environment variables

### 6. Test Again

1. Wait 2-3 minutes for all changes to propagate
2. Go to your production site
3. Try connecting the calendar again

## Common Mistakes

1. **Not redeploying after setting environment variables** - Vercel needs a new deployment to pick up env vars
2. **Mismatched URLs** - The redirect URI in Vercel must match Google Cloud Console EXACTLY
3. **Using http instead of https** - Production must use `https://`
4. **Trailing slashes** - No trailing slashes in redirect URIs
5. **OAuth consent screen in Testing mode** - Must be PUBLISHED for production

## How to Find Your Exact Production URL

1. Go to Vercel Dashboard → Your Project
2. Go to **Deployments**
3. Click on the latest production deployment
4. Copy the URL from the address bar (e.g., `https://todo-app-abc123.vercel.app`)
5. Use this exact URL in both Vercel env vars and Google Cloud Console

## Debugging

If it still doesn't work:

1. **Check Vercel logs**:
   - Go to Vercel Dashboard → Your Project → **Logs**
   - Look for `[calendar/auth] Using redirect URI:` to see what URI is being used

2. **Check Google Cloud Console**:
   - Verify the redirect URI in your OAuth client matches exactly
   - Check that the OAuth consent screen shows "Published" (not "Testing")

3. **Verify environment variables**:
   - Make sure `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` are also set in Vercel
   - Make sure they're set for the **Production** environment

