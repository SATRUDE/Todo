# Supabase Setup Guide

## Quick Setup

### Option 1: Use the Test Connection Tool

1. Open `test-supabase-connection.html` in your browser
2. Enter your Supabase credentials
3. Click "Test Connection" to verify
4. Click "Save to .env file" to download the file
5. Move the downloaded `.env` file to your project root

### Option 2: Manual Setup

1. **Get your Supabase credentials:**
   - Go to [supabase.com](https://supabase.com) and sign in
   - Create a new project or select existing
   - Navigate to **Project Settings** → **API**
   - Copy your **Project URL** and **anon/public key**

2. **Create `.env` file:**
   ```bash
   # In the project root directory
   VITE_SUPABASE_URL=https://your-project.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-key-here
   ```

3. **Set up the database:**
   - In Supabase dashboard, go to **SQL Editor**
   - Copy the contents of `supabase-schema.sql`
   - Paste and run it in the SQL Editor
   - This creates the `lists`, `todos`, and calendar-related tables
   - **Important**: If you get errors about missing `calendar_event_processed` table, run `migration-create-calendar-event-processed.sql`

4. **Restart your dev server:**
   ```bash
   npm run dev
   ```

## Verify Connection

The app will automatically test the connection on startup. If there's an error, you'll see a helpful message with instructions.

## Troubleshooting

- **"Invalid API key"**: Check that your anon key is correct
- **"Tables not found"**: Run the SQL schema in Supabase SQL Editor
- **"Missing environment variables"**: Make sure `.env` file exists in project root
- **Changes not saving**: Check browser console for errors

