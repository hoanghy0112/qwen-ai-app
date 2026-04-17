/**
 * Web-Push client. Handles permission, PushSubscription creation, and
 * sync with the CRM API (`/api/push/*`). Replaces the old polling-based
 * simulation + notifications/check flow.
 */

import { api } from './api';

export interface PushNotificationMessage {
  id?: string;
  type: 'recommendation' | 'alert' | 'info' | 'notificationclick';
  title: string;
  body?: string;
  url?: string;
  data?: Record<string, any>;
  tag?: string;
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(base64);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; ++i) out[i] = raw.charCodeAt(i);
  return out;
}

export function isPushSupported(): boolean {
  return (
    typeof window !== 'undefined' &&
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window
  );
}

/**
 * Request permission if needed, create a PushSubscription using the
 * backend's VAPID public key, and POST it to `/api/push/subscribe`.
 *
 * Safe to call repeatedly — the same subscription is re-registered
 * idempotently so a device stays reachable after refresh/login/logout.
 */
export async function registerPush(accountId: string | null): Promise<PushSubscription | null> {
  if (!isPushSupported()) {
    console.warn('[push] Web-Push not supported in this browser.');
    return null;
  }

  // Wait for the service worker to be ready (vite-plugin-pwa registers it
  // automatically from main.tsx). `navigator.serviceWorker.ready` resolves
  // with the active registration.
  const reg = await navigator.serviceWorker.ready;

  // Ask for permission only if we don't have a decision yet.
  if (Notification.permission === 'default') {
    const perm = await Notification.requestPermission();
    if (perm !== 'granted') {
      console.warn('[push] Permission not granted:', perm);
      return null;
    }
  }
  if (Notification.permission !== 'granted') return null;

  // Check if we have an existing subscription.
  let sub = await reg.pushManager.getSubscription();

  // Fetch the current public key from the backend.
  const res = await api.get('/api/push/public-key');
  if (!res.ok) {
    console.warn('[push] Failed to fetch VAPID public key:', res.status);
    return null;
  }
  const { publicKey } = await res.json();
  if (!publicKey) {
    console.warn('[push] Backend returned empty VAPID public key.');
    return null;
  }

  // If we have a subscription, check if it matches the current backend key.
  // If the backend restarted and regenerated keys, the old subscription
  // is useless and we must re-subscribe.
  if (sub) {
    const currentKey = sub.options.applicationServerKey;
    const newKey = urlBase64ToUint8Array(publicKey);
    
    // Compare byte-by-byte
    let match = currentKey && currentKey.byteLength === newKey.byteLength;
    if (match && currentKey) {
      const currentArr = new Uint8Array(currentKey);
      for (let i = 0; i < currentArr.length; i++) {
        if (currentArr[i] !== newKey[i]) {
          match = false;
          break;
        }
      }
    }

    if (!match) {
      console.info('[push] VAPID key mismatch (server probably restarted). Re-subscribing...');
      await sub.unsubscribe();
      sub = null;
    }
  }

  if (!sub) {
    try {
      sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey),
      });
    } catch (err) {
      console.error('[push] Failed to subscribe:', err);
      return null;
    }
  }

  const body = {
    accountId,
    subscription: sub.toJSON(),
  };
  await api.post('/api/push/subscribe', body);
  return sub;
}

/** Deactivate the current subscription. Called on logout. */
export async function unregisterPush(): Promise<void> {
  if (!isPushSupported()) return;
  const reg = await navigator.serviceWorker.ready;
  const sub = await reg.pushManager.getSubscription();
  if (!sub) return;

  try {
    await api.post('/api/push/unsubscribe', { endpoint: sub.endpoint });
  } catch {
    /* ignore — we still want to drop the local subscription. */
  }
  try {
    await sub.unsubscribe();
  } catch {
    /* noop */
  }
}

type Listener = (msg: PushNotificationMessage) => void;

/**
 * Subscribe to in-app messages posted by the service worker whenever a
 * push arrives (or a notification is clicked).
 *
 * Returns an unsubscribe function.
 */
export function onPushMessage(listener: Listener): () => void {
  if (typeof navigator === 'undefined' || !navigator.serviceWorker) {
    return () => {};
  }
  const handler = (event: MessageEvent) => {
    const data = event.data;
    if (!data || data.source !== 'shinhan-push') return;
    const n = data.notification || {};
    listener({
      id: n.id,
      type: data.type,
      title: n.title ?? 'Shinhan SOL',
      body: n.body,
      url: n.url,
      data: n.data ?? n.payload,
      tag: n.tag,
    });
  };
  navigator.serviceWorker.addEventListener('message', handler);
  return () => navigator.serviceWorker.removeEventListener('message', handler);
}
