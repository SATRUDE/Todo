# Quick Fix for "This browser or app may not be secure" Error

## The Problem
Google is blocking the OAuth sign-in because your app is in "Testing" mode and your email isn't added as a test user.

## The Solution (2 minutes)

### Option 1: Add Yourself as a Test User (Recommended for Development)

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Select your project
3. Go to **APIs & Services** → **OAuth consent screen**
4. Scroll down to **Test users** section
5. Click **+ ADD USERS**
6. Enter your email: `markjdiffey@gmail.com`
7. Click **ADD**
8. Click **SAVE** at the bottom
9. Wait 1-2 minutes
10. Try connecting the calendar again

### Option 2: Publish Your App (For Production)

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Select your project
3. Go to **APIs & Services** → **OAuth consent screen**
4. At the top, click **PUBLISH APP**
5. Confirm the publishing
6. Wait 1-2 minutes
7. Try connecting the calendar again

## Why This Happens

Google requires apps in "Testing" mode to explicitly list which users can sign in. This is a security feature. Once you add your email as a test user (or publish the app), Google will allow the sign-in.

## Still Not Working?

1. **Double-check the redirect URI** in Google Cloud Console:
   - Go to **APIs & Services** → **Credentials**
   - Click your OAuth 2.0 Client ID
   - Under **Authorized redirect URIs**, make sure you have:
     - `http://localhost:3000/api/calendar/callback` (exactly, no trailing slash)

2. **Check Authorized JavaScript origins**:
   - Should include: `http://localhost:3000` (no trailing slash)

3. **Wait longer**: Sometimes Google takes 5-10 minutes to propagate changes

4. **Clear browser cache**: Clear cookies for `accounts.google.com` and try again

