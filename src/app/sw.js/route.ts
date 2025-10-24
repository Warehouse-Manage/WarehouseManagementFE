import { NextResponse } from 'next/server';

const swContent = `
const CACHE_NAME = 'warehouse-management-v1';
const urlsToCache = [
  '/',
  '/manifest.json'
];

// Install event - cache resources with iOS 16.4+ compatibility
self.addEventListener('install', (event) => {
  console.log('Service Worker installing...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Service Worker caching files...');
        // Only cache essential resources to avoid iOS issues
        return cache.addAll(urlsToCache);
      })
      .then(() => {
        console.log('Service Worker installed successfully');
        return self.skipWaiting();
      })
      .catch((error) => {
        console.error('Service Worker installation failed:', error);
        // Don't fail the installation if caching fails
      })
  );
});

// Push event handler for iOS 16.4+ Safari
self.addEventListener('push', function(event) {
  console.log('Push event received:', event);
  
  if (event.data) {
    try {
      const data = event.data.json();
      console.log('Push data:', data);
      
      const options = {
        body: data.body || 'New notification',
        icon: data.icon || '/icon512_rounded.png',
        badge: data.badge || '/icon512_rounded.png',
        tag: 'warehouse-notification',
        requireInteraction: true, // Important for iOS
        data: data.data || {},
        actions: [
          {
            action: 'view',
            title: 'View',
            icon: '/icon512_rounded.png'
          },
          {
            action: 'close',
            title: 'Close',
            icon: '/icon512_rounded.png'
          }
        ]
      };
      
      event.waitUntil(
        self.registration.showNotification(data.title || 'Warehouse Management', options)
      );
    } catch (error) {
      console.error('Error processing push data:', error);
      // Fallback notification
      event.waitUntil(
        self.registration.showNotification('Warehouse Management', {
          body: 'You have a new notification',
          icon: '/icon512_rounded.png',
          badge: '/icon512_rounded.png',
          tag: 'warehouse-notification',
          requireInteraction: true
        })
      );
    }
  } else {
    // Fallback for push events without data
    event.waitUntil(
      self.registration.showNotification('Warehouse Management', {
        body: 'You have a new notification',
        icon: '/icon512_rounded.png',
        badge: '/icon512_rounded.png',
        tag: 'warehouse-notification',
        requireInteraction: true
      })
    );
  }
});

// Notification click handler
self.addEventListener('notificationclick', function(event) {
  console.log('Notification clicked:', event);
  
  event.notification.close();
  
  if (event.action === 'view') {
    event.waitUntil(
      clients.openWindow('/')
    );
  } else if (event.action === 'close') {
    // Just close the notification
    return;
  } else {
    // Default action - open the app
    event.waitUntil(
      clients.openWindow('/')
    );
  }
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('Service Worker activating...');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      console.log('Service Worker activated successfully');
      return self.clients.claim();
    })
  );
});

// Fetch event - serve from cache with iOS compatibility
self.addEventListener('fetch', (event) => {
  // Skip non-GET requests
  if (event.request.method !== 'GET') {
    return;
  }
  
  // Skip service worker requests to avoid infinite loops
  if (event.request.url.includes('/sw.js')) {
    return;
  }
  
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // Return cached version or fetch from network
        if (response) {
          console.log('Serving from cache:', event.request.url);
          return response;
        }
        
        console.log('Fetching from network:', event.request.url);
        return fetch(event.request).then((response) => {
          // Don't cache non-successful responses or non-basic responses
          if (!response || response.status !== 200 || response.type !== 'basic') {
            return response;
          }
          
          // Only cache essential resources to avoid iOS issues
          const url = new URL(event.request.url);
          const shouldCache = url.pathname === '/' || 
                            url.pathname === '/manifest.json' ||
                            url.pathname.startsWith('/_next/static/');
          
          if (shouldCache) {
            // Clone the response
            const responseToCache = response.clone();
            
            caches.open(CACHE_NAME)
              .then((cache) => {
                cache.put(event.request, responseToCache);
              })
              .catch((error) => {
                console.error('Failed to cache response:', error);
              });
          }
          
          return response;
        });
      })
      .catch((error) => {
        console.error('Service Worker fetch error:', error);
        // Return a fallback response if needed
        return new Response('Offline', { status: 503 });
      })
  );
});
`;

export async function GET() {
  return new NextResponse(swContent, {
    headers: {
      'Content-Type': 'application/javascript',
      'Cache-Control': 'public, max-age=31536000, immutable',
    },
  });
}
