/// <reference lib="webworker" />
/* eslint-disable @typescript-eslint/no-explicit-any */

import { precacheAndRoute } from 'workbox-precaching';

declare const self: ServiceWorkerGlobalScope & typeof globalThis;

/**
 * Workbox precache — populated by vite-plugin-pwa at build time.
 * Casting is required because injectManifest swaps `__WB_MANIFEST`.
 */
precacheAndRoute((self as any).__WB_MANIFEST || []);

// Take over as soon as the new SW is activated so push handlers kick in
// without requiring a full page reload.
self.addEventListener('install', () => {
  self.skipWaiting();
});
self.addEventListener('activate', (event: ExtendableEvent) => {
  event.waitUntil(self.clients.claim());
});

// ─── Push handler ────────────────────────────────────────────────────

interface PushPayload {
  id?: string;
  type?: 'recommendation' | 'alert' | 'info';
  title?: string;
  body?: string;
  icon?: string;
  badge?: string;
  tag?: string;
  url?: string;
  data?: Record<string, any>;
}

const DEFAULT_ICON =
  'https://cdn-icons-png.flaticon.com/512/2830/2830284.png';

self.addEventListener('push', (event: PushEvent) => {
  let payload: PushPayload = {};
  try {
    payload = event.data ? (event.data.json() as PushPayload) : {};
  } catch {
    payload = { title: 'Shinhan SOL', body: event.data?.text() ?? '' };
  }

  const title = payload.title ?? 'Shinhan SOL';
  const options: NotificationOptions = {
    body: payload.body,
    icon: payload.icon ?? DEFAULT_ICON,
    badge: payload.badge ?? DEFAULT_ICON,
    tag: payload.tag ?? payload.type ?? 'default',
    renotify: true,
    data: {
      url: payload.url,
      type: payload.type,
      payload: payload.data ?? {},
      receivedAt: Date.now(),
    },
  };

  event.waitUntil(
    (async () => {
      // 1) Always show the OS-level notification so the PWA works when
      //    the page is backgrounded or closed.
      await self.registration.showNotification(title, options);

      // 2) If any tab is currently open, also post the payload so the app
      //    can render its own in-app toast / refresh state without
      //    requiring the user to click the notification.
      const clientsList = await self.clients.matchAll({
        type: 'window',
        includeUncontrolled: true,
      });
      for (const client of clientsList) {
        client.postMessage({
          source: 'shinhan-push',
          type: payload.type ?? 'info',
          notification: {
            ...payload,
            title,
          },
        });
      }
    })(),
  );
});

// ─── Click handler ───────────────────────────────────────────────────

self.addEventListener('notificationclick', (event: NotificationEvent) => {
  event.notification.close();
  const targetUrl =
    (event.notification.data && event.notification.data.url) || '/';

  event.waitUntil(
    (async () => {
      const allClients = await self.clients.matchAll({
        type: 'window',
        includeUncontrolled: true,
      });
      // Prefer focusing an existing tab.
      for (const client of allClients) {
        if ('focus' in client) {
          await (client as WindowClient).focus();
          client.postMessage({
            source: 'shinhan-push',
            type: 'notificationclick',
            notification: {
              ...event.notification.data,
              title: event.notification.title,
            },
          });
          return;
        }
      }
      // No tab open → open a new one.
      if (self.clients.openWindow) {
        await self.clients.openWindow(targetUrl);
      }
    })(),
  );
});

// Clean subscription churn — if the browser rotates the subscription we
// simply drop it; the page will re-subscribe on next load.
self.addEventListener('pushsubscriptionchange', (event: any) => {
  event.waitUntil(Promise.resolve());
});
