import { api } from '../api/client.js';

export function isPushSupported() {
  return 'serviceWorker' in navigator && 'PushManager' in window;
}

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)));
}

export async function enablePush() {
  const permission = await Notification.requestPermission();
  if (permission !== 'granted') throw new Error('Permiso de notificaciones denegado.');

  const { publicKey } = await api('/push/vapid-public-key');
  if (!publicKey) throw new Error('Push no configurado en el servidor.');

  const registration = await navigator.serviceWorker.ready;
  const subscription = await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(publicKey),
  });

  await api('/push/subscribe', { method: 'POST', body: subscription.toJSON() });
}

export async function disablePush() {
  const registration = await navigator.serviceWorker.ready;
  const subscription = await registration.pushManager.getSubscription();
  if (subscription) {
    await api('/push/subscribe', { method: 'DELETE', body: { endpoint: subscription.endpoint } });
    await subscription.unsubscribe();
  } else {
    await api('/push/subscribe', { method: 'DELETE', body: {} });
  }
}
