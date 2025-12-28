# Calendar Connection Debugging Guide

## Quick Checklist

### 1. Verify Environment Variables in Vercel
Go to Vercel Dashboard → Your Project → Settings → Environment Variables

**Required variables:**
- ✅ `GOOGLE_CLIENT_ID` - Your Google OAuth Client ID
- ✅ `GOOGLE_CLIENT_SECRET` - Your Google OAuth Client Secret  
- ✅ `GOOGLE_REDIRECT_URI` - Must be exactly: `https://todo-delta-navy.vercel.app/api/calendar/callback`
- ✅ `VITE_SUPABASE_URL` - Your Supabase project URL
- ✅ `VITE_SUPABASE_ANON_KEY` - Your Supabase anon key
- ✅ `SUPABASE_URL` - Same as VITE_SUPABASE_URL (for serverless functions)
- ✅ `SUPABASE_ANON_KEY` - Same as VITE_SUPABASE_ANON_KEY (for serverless functions)

**Important:** After adding/updating environment variables, **redeploy your app**.

### 2. Verify Google Cloud Console Settings

1. Go to [Google Cloud Console](https://console.cloud.google.com/apis/credentials)
2. Click on your OAuth 2.0 Client ID
3. Check **Authorized redirect URIs** includes:
   - `https://todo-delta-navy.vercel.app/api/calendar/callback`
   - (Optional for local dev: `http://localhost:5173/api/calendar/callback`)
4. Make sure there are **no trailing slashes** or extra characters
5. The URI must match **exactly** what's in `GOOGLE_REDIRECT_URI`

### 3. Verify OAuth Consent Screen

1. Go to [OAuth Consent Screen](https://console.cloud.google.com/apis/credentials/consent)
2. Make sure your email (`markjdiffey@gmail.com`) is in the **Test users** list
3. If you're in "Testing" mode, only test users can connect

### 4. Check Browser Console

1. Open your production app: `https://todo-delta-navy.vercel.app`
2. Open Developer Tools (F12)
3. Go to Console tab
4. Click "Connect Google Calendar"
5. Look for these logs:
   - `[Settings] Initiating calendar connection...`
   - `[calendar] API error:` (if there's an error)
   - `[Settings] Got auth URL, redirecting...` (if successful)

### 5. Check Vercel Function Logs

1. Go to Vercel Dashboard → Your Project → Functions tab
2. Look for `/api/calendar/auth` logs
3. You should see:
   - `[calendar/auth] Request received:` with configuration details
   - `[calendar/auth] Generated auth URL:` with the OAuth URL
4. If there are errors, they'll show here

### 6. Check Callback Logs

After clicking "Connect" and authorizing with Google:

1. Check `/api/calendar/callback` logs in Vercel
2. You should see:
   - `[calendar/callback] Request received:`
   - `[calendar/callback] Exchanging code for tokens...`
   - `[calendar/callback] Tokens received successfully`
   - `[calendar/callback] Calendar connection saved successfully`

## Common Issues & Solutions

### Issue: "Access blocked: app has not completed Google verification"
**Solution:** Add your email to Test users in OAuth Consent Screen

### Issue: "redirect_uri_mismatch" error
**Solution:** 
- Check that `GOOGLE_REDIRECT_URI` in Vercel exactly matches the URI in Google Cloud Console
- No trailing slashes, correct protocol (https), correct domain

### Issue: "Failed to connect" or hanging
**Solution:**
1. Check browser console for errors
2. Check Vercel function logs
3. Verify all environment variables are set
4. Make sure you redeployed after adding env vars

### Issue: "Missing Google OAuth credentials"
**Solution:**
- Verify `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` are set in Vercel
- Make sure they're set for the correct environment (Production, Preview, Development)
- Redeploy after adding them

### Issue: "token_exchange_failed"
**Solution:**
- Check that redirect URI matches exactly
- Verify OAuth client credentials are correct
- Check Vercel logs for detailed error message

## Testing the Connection

1. **Clear browser cache/cookies** (sometimes helps)
2. Go to your production app
3. Open Settings
4. Click "Connect Google Calendar"
5. You should be redirected to Google
6. Sign in and authorize
7. You should be redirected back to your app
8. Settings should show "Connected to [Your Calendar Name]"

## Getting Help

If it's still not working:
1. Check browser console for errors
2. Check Vercel function logs for `/api/calendar/auth` and `/api/calendar/callback`
3. Share the error messages you see
4. Verify all items in the checklist above

