# GitHub Actions Setup for Push Notifications

This document explains how to set up GitHub Actions to automatically send push notifications for due/overdue todos.

## Overview

GitHub Actions runs a scheduled workflow every 5 minutes that:
1. Queries the database for todos with deadlines that are due or overdue
2. Retrieves all push subscriptions from the database
3. Sends push notifications to all subscribed devices

## Prerequisites

1. A GitHub repository (public repos get free unlimited Actions minutes)
2. Supabase database with the `push_subscriptions` table created (run `supabase-schema.sql`)
3. VAPID keys generated (already done - see `VAPID-KEYS.txt`)

## Setup Steps

### 1. Create GitHub Secrets

Go to your GitHub repository → Settings → Secrets and variables → Actions → New repository secret

Add the following secrets:

#### `SUPABASE_URL`
- **Value**: Your Supabase project URL
- **Example**: `https://your-project.supabase.co`
- **Where to find**: Supabase Dashboard → Project Settings → API → Project URL

#### `SUPABASE_SERVICE_ROLE_KEY`
- **Value**: Your Supabase service role key (NOT the anon key)
- **Important**: This key bypasses Row Level Security (RLS) and should be kept secret
- **Where to find**: Supabase Dashboard → Project Settings → API → `service_role` key (under Project API keys)
- **Warning**: Never expose this key in client-side code or commit it to the repository

#### `VAPID_PUBLIC_KEY`
- **Value**: Your VAPID public key
- **From**: `VAPID-KEYS.txt` file in this repository
- **Example**: `BDJ7TIDnLub_PRAIaCLV0Lq2_7B879nLZfVcA5bz3BF86p7uyiNRURiN28XATbUtkJY0NIZYCUHXES5hZa46Mp4`

#### `VAPID_PRIVATE_KEY`
- **Value**: Your VAPID private key
- **From**: `VAPID-KEYS.txt` file in this repository
- **Example**: `pbaPnvtnpo-J8UlIAtU_v1FIj4Qxru8JcnPj-L8lV6A`
- **Important**: Keep this secret - never commit it to the repository

### 2. Verify Database Schema

Make sure you've run the SQL schema in your Supabase database:

1. Go to Supabase Dashboard → SQL Editor
2. Copy the contents of `supabase-schema.sql`
3. Paste and run it
4. Verify the `push_subscriptions` table exists

### 3. Workflow File

The workflow file is located at `.github/workflows/reminders.yml`. It's already configured to:
- Run every 5 minutes (`*/5 * * * *` cron schedule)
- Use Node.js 20
- Install dependencies with `npm ci`
- Run the reminder script

## How It Works

### Cron Schedule

The workflow runs on a cron schedule: `*/5 * * * *`

- `*/5` - Every 5 minutes
- `*` - Every hour
- `*` - Every day
- `*` - Every month
- `*` - Every day of the week

This means the script runs every 5 minutes, 24/7.

### Reminder Logic

The script (`scripts/send-reminders.js`) checks for todos that:
1. Are not completed (`completed = false`)
2. Have a `deadline_date` set
3. The `deadline_date` is today or in the past
4. If `deadline_time` is set, the current time is within ±5 minutes of the deadline time

### Notification Sending

For each due todo:
- The script sends a push notification to all registered push subscriptions
- If a subscription is invalid/expired (410 or 404 error), it's automatically removed from the database
- Failed notifications are logged but don't stop the process

## Testing

### Manual Testing

You can manually trigger the workflow:

1. Go to your GitHub repository
2. Click on the "Actions" tab
3. Select "Send Todo Reminders" workflow
4. Click "Run workflow" → "Run workflow"

### Local Testing

You can test the script locally:

1. Create a `.env` file (or export environment variables):
   ```bash
   export SUPABASE_URL="https://your-project.supabase.co"
   export SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"
   export VAPID_PUBLIC_KEY="your-public-key"
   export VAPID_PRIVATE_KEY="your-private-key"
   ```

2. Run the script:
   ```bash
   npm run send-reminders
   ```

### Testing with a Due Todo

1. Create a todo with:
   - `deadline_date`: Today's date (YYYY-MM-DD)
   - `deadline_time`: Current time ± 2 minutes (HH:MM format, e.g., "14:30")
   - `completed`: false

2. Make sure you have a push subscription registered (enable notifications in the PWA)

3. Wait for the next cron run (or trigger manually)

4. Check the workflow logs in GitHub Actions to see if notifications were sent

## Monitoring

### View Workflow Runs

1. Go to GitHub repository → Actions tab
2. Click on "Send Todo Reminders" workflow
3. View recent runs and their logs

### Check Logs

The script logs:
- ✅ Successful notification sends
- ⚠️ Invalid subscriptions (automatically removed)
- ❌ Errors
- 📋 Summary of todos found and processed

## Troubleshooting

### Workflow Not Running

- **Check cron syntax**: Verify the cron schedule in `.github/workflows/reminders.yml`
- **Check repository settings**: Make sure Actions are enabled for your repository
- **Check GitHub Actions limits**: Free tier has limits, but 5-minute intervals should be fine

### No Notifications Sent

- **Check secrets**: Verify all GitHub Secrets are set correctly
- **Check database**: Ensure `push_subscriptions` table exists and has subscriptions
- **Check todos**: Verify you have todos with `deadline_date` set and `completed = false`
- **Check timing**: If `deadline_time` is set, make sure current time is within ±5 minutes

### Invalid Subscription Errors

- This is normal - expired/invalid subscriptions are automatically removed
- Users need to re-enable notifications in the PWA to create a new subscription

### Database Connection Errors

- Verify `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` secrets are correct
- Check that the service role key has proper permissions
- Ensure RLS policies allow the service role to read/write

## GitHub Actions Limits

### Free Tier (Public Repos)
- Unlimited minutes
- Unlimited runs

### Free Tier (Private Repos)
- 2,000 minutes/month
- At 5-minute intervals: ~6,000 runs/month = well within limits

## Security Notes

1. **Service Role Key**: Never commit the service role key to the repository
2. **VAPID Private Key**: Keep this secret and only use it in GitHub Secrets
3. **RLS**: The service role key bypasses RLS, which is necessary for the script to work
4. **Secrets**: All sensitive values are stored as GitHub Secrets, not in code

## Modifying the Schedule

To change how often the workflow runs, edit `.github/workflows/reminders.yml`:

```yaml
schedule:
  - cron: '*/5 * * * *'  # Every 5 minutes
  # Other examples:
  # - cron: '*/15 * * * *'  # Every 15 minutes
  # - cron: '0 * * * *'     # Every hour
  # - cron: '0 9 * * *'     # Every day at 9 AM UTC
```

Use [crontab.guru](https://crontab.guru/) to help create cron schedules.

## Next Steps

1. Set up all GitHub Secrets
2. Verify the database schema is applied
3. Test the workflow manually
4. Create a test todo with a deadline
5. Monitor the workflow runs

The system will automatically start sending reminders once everything is configured!






