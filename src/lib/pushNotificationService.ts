"use client";

import { toast } from "sonner";

export interface PushNotificationData {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  data?: Record<string, unknown>;
  actions?: Array<{
    action: string;
    title: string;
    icon?: string;
  }>;
}

export interface UserSubscription {
  userId: string;
  endpoint: string;
  p256dh: string;
  auth: string;
  userAgent: string;
  platform: 'ios' | 'android' | 'desktop';
  subscribedAt: Date;
}

class PushNotificationService {
  private vapidPublicKey: string;
  private apiBaseUrl: string;
  private isSupported: boolean = false;
  private registration: ServiceWorkerRegistration | null = null;

  constructor() {
    this.vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_KEY || '';
    this.apiBaseUrl = process.env.NEXT_PUBLIC_API_HOST || '';
    this.checkSupport();
  }

  private checkSupport(): void {
    this.isSupported = 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
  }

  // Check if push notifications are supported
  public isPushSupported(): boolean {
    return this.isSupported;
  }

  // Get current permission status
  public getPermissionStatus(): NotificationPermission {
    if (!this.isSupported) return 'denied';
    return Notification.permission;
  }

  // Request permission with custom prompt
  public async requestPermission(): Promise<boolean> {
    if (!this.isSupported) {
      toast.error('Push notifications are not supported in this browser');
      return false;
    }

    if (Notification.permission === 'granted') {
      return true;
    }

    if (Notification.permission === 'denied') {
      toast.error('Push notifications are blocked. Please enable them in your browser settings.');
      return false;
    }

    try {
      const permission = await Notification.requestPermission();
      return permission === 'granted';
    } catch (error) {
      console.error('Error requesting notification permission:', error);
      toast.error('Failed to request notification permission');
      return false;
    }
  }

  // Register service worker
  public async registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
    if (!this.isSupported) {
      console.warn('Service Worker not supported');
      return null;
    }

    try {
      this.registration = await navigator.serviceWorker.register('/sw.js');
      console.log('Service Worker registered successfully');
      return this.registration;
    } catch (error) {
      console.error('Service Worker registration failed:', error);
      toast.error('Failed to register service worker');
      return null;
    }
  }

  // Subscribe to push notifications
  public async subscribeToPush(userId: string): Promise<UserSubscription | null> {
    if (!this.registration) {
      await this.registerServiceWorker();
    }

    if (!this.registration) {
      return null;
    }

    try {
      const applicationServerKey = this.urlB64ToUint8Array(this.vapidPublicKey);
      const subscription = await this.registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: applicationServerKey.buffer as ArrayBuffer
      });

      const subscriptionData: UserSubscription = {
        userId,
        endpoint: subscription.endpoint,
        p256dh: this.arrayBufferToBase64(subscription.getKey('p256dh')!),
        auth: this.arrayBufferToBase64(subscription.getKey('auth')!),
        userAgent: navigator.userAgent,
        platform: this.detectPlatform(),
        subscribedAt: new Date()
      };

      // Send subscription to backend
      await this.sendSubscriptionToBackend(subscriptionData);
      
      return subscriptionData;
    } catch (error) {
      console.error('Error subscribing to push notifications:', error);
      toast.error('Failed to subscribe to push notifications');
      return null;
    }
  }

  // Unsubscribe from push notifications
  public async unsubscribeFromPush(): Promise<boolean> {
    if (!this.registration) {
      return false;
    }

    try {
      const subscription = await this.registration.pushManager.getSubscription();
      if (subscription) {
        await subscription.unsubscribe();
        console.log('Successfully unsubscribed from push notifications');
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error unsubscribing from push notifications:', error);
      return false;
    }
  }

  // Send test notification
  public async sendTestNotification(): Promise<void> {
    if (Notification.permission === 'granted') {
      new Notification('Test Notification', {
        body: 'This is a test notification from your PWA',
        icon: '/icon512_rounded.png',
        badge: '/icon512_rounded.png',
        tag: 'test-notification'
      });
    }
  }

  // Send subscription data to backend
  private async sendSubscriptionToBackend(subscription: UserSubscription): Promise<void> {
    try {
      const response = await fetch(`${this.apiBaseUrl}/api/notification/subscribe`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(subscription)
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      console.log('Subscription sent to backend successfully');
    } catch (error) {
      console.error('Error sending subscription to backend:', error);
      throw error;
    }
  }

  // Detect platform
  private detectPlatform(): 'ios' | 'android' | 'desktop' {
    const userAgent = navigator.userAgent.toLowerCase();
    
    if (/iphone|ipad|ipod/.test(userAgent)) {
      return 'ios';
    } else if (/android/.test(userAgent)) {
      return 'android';
    } else {
      return 'desktop';
    }
  }

  // Utility functions
  private urlB64ToUint8Array(base64String: string): Uint8Array {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding)
      .replace(/-/g, '+')
      .replace(/_/g, '/');

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  }

  private arrayBufferToBase64(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return window.btoa(binary);
  }

  // Get subscription status
  public async getSubscriptionStatus(): Promise<boolean> {
    if (!this.registration) {
      return false;
    }

    try {
      const subscription = await this.registration.pushManager.getSubscription();
      return !!subscription;
    } catch (error) {
      console.error('Error checking subscription status:', error);
      return false;
    }
  }
}

// Export singleton instance
export const pushNotificationService = new PushNotificationService();
