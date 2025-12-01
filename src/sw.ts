/// <reference lib="webworker" />

import { cleanupOutdatedCaches, precacheAndRoute } from "workbox-precaching";
import { registerRoute } from "workbox-routing";
import { NetworkFirst } from "workbox-strategies";
import { ExpirationPlugin } from "workbox-expiration";
import { clientsClaim } from "workbox-core";

declare const self: ServiceWorkerGlobalScope & {
  __WB_MANIFEST: Array<import("workbox-precaching").ManifestEntry>;
};

self.skipWaiting();
clientsClaim();

precacheAndRoute(self.__WB_MANIFEST);
cleanupOutdatedCaches();

registerRoute(
  ({ url }) => /^https:\/\/.*\.supabase\.co\/.*/i.test(url.href),
  new NetworkFirst({
    cacheName: "supabase-api-cache",
    networkTimeoutSeconds: 10,
    plugins: [
      new ExpirationPlugin({
        maxEntries: 50,
        maxAgeSeconds: 60 * 60 * 24,
      }),
    ],
  }),
  "GET"
);

self.addEventListener("notificationclick", (event) => {
  const taskId = event.notification.data?.taskId;
  event.notification.close();

  event.waitUntil(
    (async () => {
      const clientList = await self.clients.matchAll({
        type: "window",
        includeUncontrolled: true,
      });

      if (clientList.length > 0) {
        const client = clientList[0];
        if ("focus" in client) {
          await client.focus();
        }
        if (typeof taskId === "number") {
          client.postMessage({ type: "OPEN_TASK", taskId });
        }
        return;
      }

      if (typeof taskId === "number") {
        await self.clients.openWindow(`/?openTaskId=${taskId}`);
      } else {
        await self.clients.openWindow("/");
      }
    })()
  );
});
