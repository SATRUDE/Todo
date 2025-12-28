# Google OAuth Setup for Calendar Sync

## The Error You're Seeing

If you see "This browser or app may not be secure" when trying to connect Google Calendar, it means the redirect URI is not properly configured in Google Cloud Console.

## Step-by-Step Fix

### 1. Go to Google Cloud Console

1. Visit [Google Cloud Console](https://console.cloud.google.com/)
2. Select your project (or create one if you don't have one)
3. Go to **APIs & Services** → **Credentials**

### 2. Find Your OAuth 2.0 Client

1. Look for your OAuth 2.0 Client ID (should match the one in your `.env` file)
2. Click on it to edit

### 3. Add Authorized Redirect URIs

In the **Authorized redirect URIs** section, add:

**For Local Development:**
```
http://localhost:3000/api/calendar/callback
```

**For Production (replace with your actual domain):**
```
https://your-app.vercel.app/api/calendar/callback
```

**Important:** 
- Add BOTH localhost and production URLs
- Make sure there are no trailing slashes
- The URLs must match EXACTLY (including http vs https)

### 4. Configure OAuth Consent Screen

1. Go to **APIs & Services** → **OAuth consent screen**
2. Make sure:
   - **User Type**: External (unless you have a Google Workspace)
   - **App name**: Your app name
   - **User support email**: Your email
   - **Developer contact information**: Your email
   - **Scopes**: Add these scopes:
     - `https://www.googleapis.com/auth/calendar.events`
     - `https://www.googleapis.com/auth/calendar.readonly`

### 5. Add Test Users (if app is in Testing mode) ⚠️ **MOST COMMON ISSUE**

If your OAuth consent screen is in "Testing" mode (which is the default):
1. Scroll down to **Test users**
2. Click **+ ADD USERS**
3. Add your Google account email address (e.g., `markjdiffey@gmail.com`)
4. Click **SAVE**
5. **Wait 1-2 minutes** for changes to propagate
6. Try connecting again

**OR** publish your app to allow all users:
1. At the top of the OAuth consent screen, click **PUBLISH APP**
2. Confirm the publishing
3. This allows any Google user to sign in (not just test users)

### 6. Verify Application Type

Make sure your OAuth client is configured as:
- **Application type**: Web application
- **Authorized JavaScript origins**: 
  - `http://localhost:3000` (for local dev)
  - `https://your-app.vercel.app` (for production)

### 7. Save and Wait

1. Click **SAVE** in Google Cloud Console
2. Wait 1-2 minutes for changes to propagate
3. Try connecting the calendar again

## Environment Variables

Make sure these are set in your `.env.local` file (for local dev) or Vercel (for production):

```bash
GOOGLE_CLIENT_ID=your-client-id-here
GOOGLE_CLIENT_SECRET=your-client-secret-here
GOOGLE_REDIRECT_URI=http://localhost:3000/api/calendar/callback  # For local dev
# OR
GOOGLE_REDIRECT_URI=https://your-app.vercel.app/api/calendar/callback  # For production
```

## Troubleshooting

### Still seeing "This browser or app may not be secure"?

1. **Check the redirect URI matches exactly** - No trailing slashes, correct protocol (http vs https)
2. **Wait a few minutes** - Google changes can take time to propagate
3. **Clear browser cache** - Sometimes cached OAuth settings cause issues
4. **Check OAuth consent screen status** - If in "Testing", make sure your email is added as a test user
5. **Verify the Client ID** - Make sure the Client ID in your `.env` matches the one in Google Cloud Console

### Common Issues

- **Redirect URI mismatch**: The redirect URI in your code must match EXACTLY what's in Google Cloud Console
- **App in Testing mode**: If your app is in testing mode, only test users can sign in
- **Wrong application type**: Must be "Web application", not "Desktop app" or "iOS/Android"
- **Missing scopes**: Make sure calendar scopes are added to the OAuth consent screen

## Production Setup

For production, you'll need to:
1. **Set `GOOGLE_REDIRECT_URI` in Vercel**:
   - Go to Vercel Dashboard → Your Project → Settings → Environment Variables
   - Add: `GOOGLE_REDIRECT_URI` = `https://your-app.vercel.app/api/calendar/callback`
   - Make sure it's set for **Production** environment
   - **Redeploy your app** after adding the env var

2. **Add production redirect URI to Google Cloud Console**:
   - Go to APIs & Services → Credentials → Your OAuth Client
   - Add to **Authorized redirect URIs**: `https://your-app.vercel.app/api/calendar/callback`
   - Add to **Authorized JavaScript origins**: `https://your-app.vercel.app`
   - Click **SAVE**

3. **Publish OAuth consent screen**:
   - Go to APIs & Services → OAuth consent screen
   - Click **PUBLISH APP** (required for production)
   - Wait 1-2 minutes

4. **Redeploy your Vercel app** to pick up the new environment variables

See `GOOGLE-OAUTH-PRODUCTION-FIX.md` for detailed production troubleshooting.

