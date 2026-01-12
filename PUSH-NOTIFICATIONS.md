# Push Notifications Setup for iOS PWA

## Requirements

1. **iOS 16.4+** - Push notifications for PWAs are only supported on iOS 16.4 and later
2. **HTTPS** - Your app must be served over HTTPS (Vercel provides this automatically)
3. **Service Worker** - Already configured via vite-plugin-pwa
4. **VAPID Keys** - You need to generate VAPID keys for push notifications

## Current Implementation

The push notification infrastructure has been added:
- `src/lib/notifications.ts` - Push notification utilities
- `public/sw.js` - Service worker with push event handlers
- Auto-initialization in `TodoApp.tsx`

## Issues and Solutions

### 1. Service Worker Configuration

The current setup uses `vite-plugin-pwa` which generates its own service worker. For push notifications to work, we need to use `injectManifest` strategy.

**Current Issue:** The service worker needs to be properly configured to handle push events.

### 2. VAPID Keys

You need to generate VAPID (Voluntary Application Server Identification) keys:

1. Install web-push: `npm install -g web-push`
2. Generate keys: `web-push generate-vapid-keys`
3. Add to `.env`:
   ```
   VITE_VAPID_PUBLIC_KEY=your_public_key_here
   ```

### 3. Backend Endpoint

You need to create a backend endpoint to:
- Store push subscriptions
- Send push notifications when tasks are due

**Example endpoint needed:** `/api/push/subscribe`

### 4. iOS-Specific Issues

**Common problems:**
- **Permission not requested:** iOS requires user interaction to request notification permission
- **Service worker not ready:** Wait for service worker to be ready before subscribing
- **VAPID key mismatch:** Ensure the VAPID public key matches your backend

## Testing

1. **Check Service Worker:**
   - Open DevTools > Application > Service Workers
   - Verify service worker is registered and active

2. **Check Notification Permission:**
   - Open DevTools > Console
   - Run: `Notification.permission`
   - Should be "granted" after user allows

3. **Check Push Subscription:**
   - Open DevTools > Console
   - Run: `navigator.serviceWorker.ready.then(r => r.pushManager.getSubscription())`
   - Should return a subscription object

4. **Test on iOS:**
   - Install PWA on iOS device (iOS 16.4+)
   - Open the app
   - Check if notification permission is requested
   - Check console logs for errors

## Next Steps

1. Generate VAPID keys and add to environment variables
2. Create backend endpoint to handle subscriptions
3. Implement notification sending logic (e.g., when tasks are due)
4. Test on iOS device (iOS 16.4+)

## Debugging

If push notifications aren't working:

1. Check browser console for errors
2. Verify service worker is registered
3. Check notification permission status
4. Verify VAPID keys are correct
5. Check network tab for subscription requests
6. Test on a physical iOS device (simulators don't support push)






