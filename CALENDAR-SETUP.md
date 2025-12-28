# Google Calendar Integration Setup Guide

## Step 1: Enable Anonymous Authentication in Supabase

1. Go to your Supabase Dashboard
2. Navigate to **Authentication** → **Providers**
3. Find **Anonymous** in the list of providers
4. Toggle it **ON**
5. Save the changes

This allows users to use the app without email/password authentication. Each user will automatically get an anonymous account when they first use the app.

## Step 2: Set Up Google OAuth Credentials

### 2.1 Create Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Click **Select a project** → **New Project**
3. Enter a project name (e.g., "Todo App Calendar")
4. Click **Create**

### 2.2 Enable Google Calendar API

1. In your Google Cloud project, go to **APIs & Services** → **Library**
2. Search for "Google Calendar API"
3. Click on it and press **Enable**

### 2.3 Create OAuth 2.0 Credentials

1. Go to **APIs & Services** → **Credentials**
2. Click **Create Credentials** → **OAuth client ID**
3. If prompted, configure the OAuth consent screen first:
   - Choose **External** (unless you have a Google Workspace)
   - Fill in required fields:
     - App name: "Todo App" (or your app name)
     - User support email: Your email
     - Developer contact: Your email
   - Click **Save and Continue**
   - Add scopes (if needed):
     - `https://www.googleapis.com/auth/calendar.events`
     - `https://www.googleapis.com/auth/calendar.readonly`
   - Click **Save and Continue**
   - Add test users (if in testing mode)
   - Click **Save and Continue**
   - Review and click **Back to Dashboard**

4. Create OAuth Client ID:
   - Application type: **Web application**
   - Name: "Todo App Calendar"
   - Authorized redirect URIs:
     - For local development: `http://localhost:5173/api/calendar/callback`
     - For production: `https://your-app.vercel.app/api/calendar/callback`
     - Replace `your-app.vercel.app` with your actual Vercel domain
   - Click **Create**
   - **Copy the Client ID and Client Secret** (you'll need these for Step 3)

## Step 3: Add Environment Variables to Vercel

1. Go to your Vercel project dashboard
2. Navigate to **Settings** → **Environment Variables**
3. Add the following variables:

### Required Variables:

```
GOOGLE_CLIENT_ID=your-google-client-id-here
GOOGLE_CLIENT_SECRET=your-google-client-secret-here
GOOGLE_REDIRECT_URI=https://your-app.vercel.app/api/calendar/callback
```

**Important Notes:**
- Replace `your-app.vercel.app` with your actual Vercel domain
- For local development, you can also add these to your `.env` file:
  ```
  GOOGLE_CLIENT_ID=your-google-client-id-here
  GOOGLE_CLIENT_SECRET=your-google-client-secret-here
  GOOGLE_REDIRECT_URI=http://localhost:5173/api/calendar/callback
  ```

### Existing Variables (should already be set):

Make sure these are also set in Vercel:
```
VITE_SUPABASE_URL=your-supabase-url
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_URL=your-supabase-url (for serverless functions)
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key (for serverless functions)
```

4. After adding variables, **redeploy your Vercel project** for the changes to take effect

## Step 4: Install Dependencies

Make sure the `googleapis` package is installed:

```bash
npm install
```

This should install `googleapis` which was added to `package.json` during the implementation.

## Step 5: Test the Integration

1. **Deploy your app** to Vercel (or run locally with `npm run dev`)
2. **Open your app** in a browser
3. **Go to Settings** (if you have a settings page)
4. **Click "Connect Google Calendar"**
5. You should be redirected to Google's OAuth consent screen
6. **Authorize the app** to access your calendar
7. You should be redirected back to your app with a success message

## Step 6: Verify Everything Works

1. **Check Calendar Connection:**
   - In Settings, you should see "Connected to [Your Calendar Name]"
   - The connection status should show as active

2. **Test Calendar Sync:**
   - Create a new task with a deadline
   - The task should automatically sync to your Google Calendar
   - Check your Google Calendar to verify the event was created

3. **Test Calendar Event Suggestions:**
   - If you have events in your Google Calendar for the next month
   - They should appear as suggested tasks in your app

## Troubleshooting

### "Google OAuth not configured" error
- Check that `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` are set in Vercel
- Make sure you've redeployed after adding the variables

### "Redirect URI mismatch" error
- Verify the redirect URI in Google Cloud Console matches exactly:
  - `https://your-actual-domain.vercel.app/api/calendar/callback`
- Make sure there are no trailing slashes or extra characters

### "Failed to authenticate user" error
- Make sure Anonymous Authentication is enabled in Supabase
- Check browser console for detailed error messages

### Calendar events not syncing
- Check Vercel function logs for errors
- Verify the `googleapis` package is installed
- Check that the OAuth tokens are being stored correctly in the database

### RLS Policy Errors
- Make sure the migration was applied successfully
- Verify that `user_id` columns exist in all tables
- Check that RLS policies are active

## Next Steps

Once everything is working:
- Users can connect their Google Calendar from the Settings page
- Tasks with deadlines will automatically sync to Google Calendar
- Calendar events will be suggested as tasks
- The cron job will sync calendars hourly for all connected users

## Security Notes

- Never commit `.env` files or expose your `GOOGLE_CLIENT_SECRET`
- The `SUPABASE_SERVICE_ROLE_KEY` should only be used in serverless functions
- OAuth tokens are stored encrypted in the database
- Each user can only access their own calendar connection

