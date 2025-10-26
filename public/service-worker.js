// Minimal service worker
console.log('Service Worker loaded');

self.addEventListener('install', (event) => {
  console.log('Service Worker installing...');
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  console.log('Service Worker activating...');
  self.clients.claim();
});

self.addEventListener('push', (event) => {
  console.log('Push event received:', event);
  
  const options = {
    body: 'You have a new notification',
    icon: '/icon512_rounded.png',
    badge: '/icon512_rounded.png',
    tag: 'warehouse-notification'
  };
  
  event.waitUntil(
    self.registration.showNotification('Warehouse Management', options)
  );
});

self.addEventListener('notificationclick', (event) => {
  console.log('Notification clicked:', event);
  event.notification.close();
  
  event.waitUntil(
    clients.openWindow('/')
  );
});