console.log('Service Worker loaded');

const OPEN_EDIT_MESSAGE = 'WAREHOUSE_OPEN_ORDER_EDIT';

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('push', (event) => {
  let notificationData = {
    title: 'Warehouse Management',
    body: 'Click vào để xem thêm',
    icon: '/icon512_rounded.png',
    badge: '/icon512_rounded.png',
    tag: 'warehouse-notification',
    data: {},
  };

  if (event.data) {
    try {
      const payload = event.data.json();
      notificationData = {
        title: payload.title || notificationData.title,
        body: payload.body || notificationData.body,
        icon: payload.icon || notificationData.icon,
        badge: payload.badge || notificationData.badge,
        tag: payload.tag || notificationData.tag,
        data: payload.data || {},
      };
    } catch (error) {
      console.error('Error parsing push payload:', error);
    }
  }

  event.waitUntil(
    self.registration.showNotification(notificationData.title, {
      body: notificationData.body,
      icon: notificationData.icon,
      badge: notificationData.badge,
      tag: notificationData.tag,
      data: notificationData.data,
      renotify: true,
    }),
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const data = event.notification.data || {};
  const orderId = data.orderId;
  const orderType = data.orderType || 'order';
  const url =
    data.url ||
    (orderType === 'place-order' ? `/place-order?edit=${orderId}` : `/orders?edit=${orderId}`);

  event.waitUntil(
    (async () => {
      const clientList = await clients.matchAll({ type: 'window', includeUncontrolled: true });
      const pathMatch = orderType === 'place-order' ? '/place-order' : '/orders';
      const message = { type: OPEN_EDIT_MESSAGE, orderId, orderType };

      for (const client of clientList) {
        if (!client.url.includes(pathMatch)) continue;
        client.postMessage(message);
        if ('focus' in client) {
          await client.focus();
          return;
        }
      }

      if (clients.openWindow && url) {
        await clients.openWindow(url);
      }
    })(),
  );
});
