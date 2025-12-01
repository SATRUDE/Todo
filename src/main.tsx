
  import { createRoot } from "react-dom/client";
  import App from "./App.tsx";
  import "./index.css";

  // Register push notification handlers after service worker is ready
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', async () => {
      try {
        const registration = await navigator.serviceWorker.ready;
        
        // Add push notification event listeners
        navigator.serviceWorker.addEventListener('message', (event) => {
          if (event.data && event.data.type === 'SKIP_WAITING') {
            registration.update();
          }
        });

        // Push notification handler
        self.addEventListener?.('push', function(event: any) {
          console.log('Push notification received:', event);
          
          let notificationData = {
            title: 'Todo App',
            body: 'You have a new notification',
            icon: '/icon-192.png',
            badge: '/icon-192.png',
            tag: 'todo-notification',
            data: {}
          };

          if (event.data) {
            try {
              const data = event.data.json();
              notificationData = { ...notificationData, ...data };
            } catch (e) {
              notificationData.body = event.data.text() || notificationData.body;
            }
          }

          event.waitUntil(
            registration.showNotification(notificationData.title, {
              body: notificationData.body,
              icon: notificationData.icon,
              badge: notificationData.badge,
              tag: notificationData.tag,
              data: notificationData.data,
              vibrate: [200, 100, 200],
            })
          );
        });
      } catch (error) {
        console.error('Error setting up push notifications:', error);
      }
    });
  }

  createRoot(document.getElementById("root")!).render(<App />);
  