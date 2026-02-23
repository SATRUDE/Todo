# Vercel Cron Jobs Setup

This project uses Vercel cron jobs to send push notifications for due/overdue todos.

## How It Works

### Initial due reminders (`/api/reminders`)

Runs every minute that:
1. Fetches all incomplete todos with deadlines
2. Checks which todos are due (deadline was hit)
3. Sends push notifications to all registered subscriptions
4. Marks todos as notified to prevent duplicate notifications
5. **Quiet hours:** Skips entirely between 10pm and 9am (configurable via `REMINDER_TIMEZONE`)

### Periodic overdue reminders (`/api/reminders-overdue`)

Runs at 9am, 1pm, 5pm, and 9pm that:
1. Finds overdue todos (deadline passed, not completed)
2. Sends a summary notification: "You have N overdue items to address"
3. Throttled to at most one per user every 4 hours
4. **Quiet hours:** Never runs between 10pm and 9am

## Configuration

The cron job is configured in `vercel.json`:

```json
{
  "crons": [
    {
      "path": "/api/reminders",
      "schedule": "* * * * *"
    }
  ]
}
```

- **Path**: `/api/reminders` - The Vercel serverless function endpoint
- **Schedule**: `* * * * *` - Runs every minute for accurate deadline notifications

## Overdue reminders migration

Run the migration to create the `overdue_notification_log` table (required for `/api/reminders-overdue`):

```bash
# In Supabase SQL Editor, run:
# migration-create-overdue-notification-log.sql
```

## Required Environment Variables

Set these in your Vercel project settings:

1. **Supabase Credentials:**
   - `SUPABASE_URL` - Your Supabase project URL
   - `SUPABASE_SERVICE_ROLE_KEY` - Your Supabase service role key (bypasses RLS)

2. **VAPID Keys:**
   - `VAPID_PUBLIC_KEY` - Public VAPID key for push notifications
   - `VAPID_PRIVATE_KEY` - Private VAPID key for push notifications

3. **Optional:**
   - `REMINDER_TIMEZONE` - IANA timezone for quiet hours (e.g. `America/Los_Angeles`). Default: UTC.

## Setting Up in Vercel

1. **Add Environment Variables:**
   - Go to your Vercel project settings
   - Navigate to "Environment Variables"
   - Add all required variables listed above

2. **Deploy:**
   - The cron job will be automatically configured when you deploy
   - Vercel will detect the `crons` configuration in `vercel.json`

3. **Verify Cron Job:**
   - Go to your Vercel project dashboard
   - Navigate to "Settings" > "Cron Jobs"
   - You should see the `/api/reminders` cron job listed

## Testing

You can manually trigger the reminder endpoint:

```bash
curl https://your-project.vercel.app/api/reminders
```

Or use the Vercel dashboard to trigger it manually.

## Modifying the Schedule

Edit the `schedule` field in `vercel.json`:

```json
{
  "crons": [
    {
      "path": "/api/reminders",
      "schedule": "*/5 * * * *"  // Every 5 minutes
    }
  ]
}
```

Common schedules:
- `* * * * *` - Every minute (current - ensures accurate deadline notifications)
- `*/5 * * * *` - Every 5 minutes
- `*/15 * * * *` - Every 15 minutes
- `0 * * * *` - Every hour
- `0 9 * * *` - Every day at 9 AM UTC

Use [crontab.guru](https://crontab.guru/) to help create cron schedules.

## Premium Features

With Vercel Premium, you can:
- Run cron jobs as frequently as every minute
- Get better reliability and performance
- Access detailed logs and monitoring

## Troubleshooting

### Cron Job Not Running

1. **Check Vercel Dashboard:**
   - Go to your project dashboard
   - Check "Cron Jobs" section
   - Verify the job is listed and enabled

2. **Check Environment Variables:**
   - Ensure all required environment variables are set
   - Check that they're available in the production environment

3. **Check Logs:**
   - View function logs in Vercel dashboard
   - Look for errors in the `/api/reminders` function

### Notifications Not Sending

1. **Check Supabase Connection:**
   - Verify `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are correct
   - Test the connection in the function logs

2. **Check VAPID Keys:**
   - Verify `VAPID_PUBLIC_KEY` and `VAPID_PRIVATE_KEY` are set
   - Ensure they match the keys used for subscription

3. **Check Subscriptions:**
   - Verify push subscriptions exist in the database
   - Check that subscriptions are valid and not expired

4. **Check Todo Deadlines:**
   - Ensure todos have `deadline_date` set
   - Verify `deadline_time` format is correct (HH:MM)

## Migration from GitHub Actions

If you were previously using GitHub Actions:

1. The cron job logic is now in `/api/reminders.js`
2. The GitHub Actions workflow (`.github/workflows/reminders.yml`) can be disabled or removed
3. All environment variables should be moved to Vercel
4. The cron schedule is now configured in `vercel.json`

## Benefits of Vercel Cron

- **No external dependencies** - Everything runs within Vercel
- **Better integration** - Direct access to Vercel functions and environment variables
- **Easier debugging** - Logs are directly in Vercel dashboard
- **Better performance** - No need to checkout repo or install dependencies
- **Cost effective** - Included with Vercel Premium


