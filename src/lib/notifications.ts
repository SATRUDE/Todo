// Push notification utilities for iOS PWA

export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (!('Notification' in window)) {
    console.warn('This browser does not support notifications');
    return 'denied';
  }

  if (Notification.permission === 'granted') {
    return 'granted';
  }

  if (Notification.permission === 'denied') {
    console.warn('Notification permission was previously denied');
    return 'denied';
  }

  // Request permission
  const permission = await Notification.requestPermission();
  return permission;
}

export async function subscribeToPushNotifications(): Promise<PushSubscription | null> {
  // #region agent log
  fetch('http://127.0.0.1:7242/ingest/4cc0016e-9fdc-4dbd-bc07-aa68fd3a2227',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'notifications.ts:subscribeToPushNotifications:entry',message:'Starting push subscription',data:{hasServiceWorker:'serviceWorker' in navigator,hasPushManager:'PushManager' in window},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'2'})}).catch(()=>{});
  // #endregion
  if (!('serviceWorker' in navigator)) {
    console.warn('Service workers are not supported');
    return null;
  }

  if (!('PushManager' in window)) {
    console.warn('Push messaging is not supported');
    return null;
  }

  try {
    // Check if service worker is already registered
    let registration = await navigator.serviceWorker.getRegistration();
    
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/4cc0016e-9fdc-4dbd-bc07-aa68fd3a2227',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'notifications.ts:subscribeToPushNotifications:checkRegistration',message:'Checking for existing service worker registration',data:{hasRegistration:!!registration},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'2'})}).catch(()=>{});
    // #endregion
    
    // If not registered, try to register it
    if (!registration) {
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/4cc0016e-9fdc-4dbd-bc07-aa68fd3a2227',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'notifications.ts:subscribeToPushNotifications:registeringSW',message:'No registration found, attempting to register service worker',data:{swPath:'/sw.js'},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'2'})}).catch(()=>{});
      // #endregion
      try {
        registration = await navigator.serviceWorker.register('/sw.js', {
          scope: '/',
        });
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/4cc0016e-9fdc-4dbd-bc07-aa68fd3a2227',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'notifications.ts:subscribeToPushNotifications:swRegistered',message:'Service worker registration attempted',data:{hasRegistration:!!registration,registrationState:registration?.installing?.state || registration?.waiting?.state || registration?.active?.state},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'2'})}).catch(()=>{});
        // #endregion
        console.log('Service worker registration initiated');
      } catch (regError) {
        console.error('Failed to register service worker:', regError);
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/4cc0016e-9fdc-4dbd-bc07-aa68fd3a2227',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'notifications.ts:subscribeToPushNotifications:swRegisterError',message:'Service worker registration failed',data:{errorName:regError?.name,errorMessage:regError?.message},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'2'})}).catch(()=>{});
        // #endregion
        return null;
      }
    }
    
    // Wait for service worker to be ready (with timeout)
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/4cc0016e-9fdc-4dbd-bc07-aa68fd3a2227',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'notifications.ts:subscribeToPushNotifications:waitingForSW',message:'Waiting for service worker ready',data:{hasRegistration:!!registration},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'2'})}).catch(()=>{});
    // #endregion
    
    // Wait for service worker to be ready with a timeout
    const readyPromise = navigator.serviceWorker.ready;
    const timeoutPromise = new Promise<ServiceWorkerRegistration>((_, reject) => 
      setTimeout(() => reject(new Error('Service worker ready timeout after 10 seconds')), 10000)
    );
    
    let readyRegistration: ServiceWorkerRegistration;
    try {
      readyRegistration = await Promise.race([readyPromise, timeoutPromise]);
    } catch (timeoutError) {
      // If timeout, try to use the registration we have
      if (registration) {
        readyRegistration = registration;
      } else {
        throw timeoutError;
      }
    }
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/4cc0016e-9fdc-4dbd-bc07-aa68fd3a2227',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'notifications.ts:subscribeToPushNotifications:swReady',message:'Service worker ready',data:{hasRegistration:!!readyRegistration},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'2'})}).catch(()=>{});
    // #endregion

    // Check if already subscribed
    let subscription = await readyRegistration.pushManager.getSubscription();
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/4cc0016e-9fdc-4dbd-bc07-aa68fd3a2227',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'notifications.ts:subscribeToPushNotifications:checkExisting',message:'Checking existing subscription',data:{hasSubscription:!!subscription},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'3'})}).catch(()=>{});
    // #endregion
    
    if (subscription) {
      console.log('Already subscribed to push notifications');
      return subscription;
    }

    // Request notification permission first
    const permission = await requestNotificationPermission();
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/4cc0016e-9fdc-4dbd-bc07-aa68fd3a2227',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'notifications.ts:subscribeToPushNotifications:permissionCheck',message:'Notification permission check',data:{permission},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'3'})}).catch(()=>{});
    // #endregion
    if (permission !== 'granted') {
      console.warn('Notification permission not granted');
      return null;
    }

    // Subscribe to push notifications
    // Note: You'll need to generate VAPID keys for production
    // Generate keys with: web-push generate-vapid-keys
    // Add VITE_VAPID_PUBLIC_KEY to your .env file
    const vapidPublicKey = import.meta.env.VITE_VAPID_PUBLIC_KEY;
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/4cc0016e-9fdc-4dbd-bc07-aa68fd3a2227',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'notifications.ts:subscribeToPushNotifications:vapidCheck',message:'Checking VAPID key',data:{hasVapidKey:!!vapidPublicKey,vapidKeyLength:vapidPublicKey?.length},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'4'})}).catch(()=>{});
    // #endregion
    
    if (!vapidPublicKey) {
      console.warn('VAPID public key not found. Push notifications will not work.');
      console.warn('Generate VAPID keys with: web-push generate-vapid-keys');
      console.warn('Add VITE_VAPID_PUBLIC_KEY to your .env file');
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/4cc0016e-9fdc-4dbd-bc07-aa68fd3a2227',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'notifications.ts:subscribeToPushNotifications:noVapidKey',message:'VAPID key missing',data:{},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'4'})}).catch(()=>{});
      // #endregion
      return null;
    }
    
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/4cc0016e-9fdc-4dbd-bc07-aa68fd3a2227',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'notifications.ts:subscribeToPushNotifications:beforeSubscribe',message:'About to subscribe to push',data:{hasReadyRegistration:!!readyRegistration},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'3'})}).catch(()=>{});
    // #endregion
    subscription = await readyRegistration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
    });
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/4cc0016e-9fdc-4dbd-bc07-aa68fd3a2227',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'notifications.ts:subscribeToPushNotifications:subscribed',message:'Successfully subscribed',data:{hasSubscription:!!subscription,subscriptionEndpoint:subscription?.endpoint?.substring(0,50)},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'3'})}).catch(()=>{});
    // #endregion

    console.log('Successfully subscribed to push notifications');
    return subscription;
  } catch (error) {
    console.error('Error subscribing to push notifications:', error);
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/4cc0016e-9fdc-4dbd-bc07-aa68fd3a2227',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'notifications.ts:subscribeToPushNotifications:catch',message:'Exception in subscribeToPushNotifications',data:{errorName:error?.name,errorMessage:error?.message,errorStack:error?.stack?.substring(0,300)},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'2'})}).catch(()=>{});
    // #endregion
    return null;
  }
}

export async function unsubscribeFromPushNotifications(): Promise<boolean> {
  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();
    
    if (subscription) {
      await subscription.unsubscribe();
      console.log('Unsubscribed from push notifications');
      return true;
    }
    
    return false;
  } catch (error) {
    console.error('Error unsubscribing from push notifications:', error);
    return false;
  }
}

export async function getPushSubscription(): Promise<PushSubscription | null> {
  try {
    const registration = await navigator.serviceWorker.ready;
    return await registration.pushManager.getSubscription();
  } catch (error) {
    console.error('Error getting push subscription:', error);
    return null;
  }
}

// Convert VAPID key from base64 URL to Uint8Array
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding)
    .replace(/\-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

// Send subscription to your backend
export async function sendSubscriptionToServer(subscription: PushSubscription): Promise<boolean> {
  // #region agent log
  fetch('http://127.0.0.1:7242/ingest/4cc0016e-9fdc-4dbd-bc07-aa68fd3a2227',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'notifications.ts:sendSubscriptionToServer:entry',message:'Starting sendSubscriptionToServer',data:{hasSubscription:!!subscription,hasEndpoint:!!subscription?.endpoint},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'1'})}).catch(()=>{});
  // #endregion
  try {
    // Get current user ID
    const { supabase } = await import('./supabase');
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/4cc0016e-9fdc-4dbd-bc07-aa68fd3a2227',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'notifications.ts:sendSubscriptionToServer:beforeGetUser',message:'About to get user',data:{},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'1'})}).catch(()=>{});
    // #endregion
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/4cc0016e-9fdc-4dbd-bc07-aa68fd3a2227',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'notifications.ts:sendSubscriptionToServer:afterGetUser',message:'Got user result',data:{hasUser:!!user,userId:user?.id?.substring(0,8),hasAuthError:!!authError,authErrorCode:authError?.code},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'1'})}).catch(()=>{});
    // #endregion
    
    if (!user) {
      console.error('No user authenticated');
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/4cc0016e-9fdc-4dbd-bc07-aa68fd3a2227',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'notifications.ts:sendSubscriptionToServer:noUser',message:'No user authenticated - returning false',data:{authError:authError?.message},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'1'})}).catch(()=>{});
      // #endregion
      return false;
    }
    
    const p256dhKey = subscription.getKey('p256dh');
    const authKey = subscription.getKey('auth');
    const p256dhBase64 = p256dhKey ? arrayBufferToBase64(p256dhKey) : null;
    const authBase64 = authKey ? arrayBufferToBase64(authKey) : null;
    
    const requestBody = {
      user_id: user.id,
      subscription: {
        endpoint: subscription.endpoint,
        keys: {
          p256dh: p256dhBase64,
          auth: authBase64,
        },
      },
    };
    
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/4cc0016e-9fdc-4dbd-bc07-aa68fd3a2227',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'notifications.ts:sendSubscriptionToServer:beforeFetch',message:'About to fetch /api/push/subscribe',data:{userId:user.id.substring(0,8),hasEndpoint:!!subscription.endpoint,hasP256dh:!!p256dhBase64,hasAuth:!!authBase64,endpointLength:subscription.endpoint?.length},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'2'})}).catch(()=>{});
    // #endregion
    
    console.log('📤 Sending subscription to /api/push/subscribe...');
    const response = await fetch('/api/push/subscribe', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/4cc0016e-9fdc-4dbd-bc07-aa68fd3a2227',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'notifications.ts:sendSubscriptionToServer:afterFetch',message:'Fetch completed',data:{status:response.status,statusText:response.statusText,ok:response.ok,contentType:response.headers.get('content-type')},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'3'})}).catch(()=>{});
    // #endregion

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Server responded with error:', response.status, errorText);
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/4cc0016e-9fdc-4dbd-bc07-aa68fd3a2227',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'notifications.ts:sendSubscriptionToServer:responseError',message:'Server returned error response',data:{status:response.status,statusText:response.statusText,errorText:errorText.substring(0,200)},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'3'})}).catch(()=>{});
      // #endregion
      throw new Error(`Failed to send subscription to server: ${response.status} ${errorText}`);
    }

    const result = await response.json();
    console.log('✅ Subscription sent to server successfully:', result);
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/4cc0016e-9fdc-4dbd-bc07-aa68fd3a2227',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'notifications.ts:sendSubscriptionToServer:success',message:'Successfully saved subscription',data:{resultId:result?.id},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'3'})}).catch(()=>{});
    // #endregion
    return true;
  } catch (error) {
    console.error('❌ Error sending subscription to server:', error);
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/4cc0016e-9fdc-4dbd-bc07-aa68fd3a2227',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'notifications.ts:sendSubscriptionToServer:catch',message:'Exception caught',data:{errorName:error?.name,errorMessage:error?.message,errorStack:error?.stack?.substring(0,300)},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'2'})}).catch(()=>{});
    // #endregion
    return false;
  }
}

export async function sendTestPushNotification(subscription: PushSubscription): Promise<boolean> {
  try {
    const response = await fetch('/api/push/test', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ subscription }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(errorText || 'Failed to trigger test push notification');
    }

    return true;
  } catch (error) {
    console.error('Error sending test push notification:', error);
    return false;
  }
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return window.btoa(binary);
}

