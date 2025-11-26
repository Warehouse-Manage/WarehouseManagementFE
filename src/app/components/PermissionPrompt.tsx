"use client";

import { useState, useEffect } from 'react';
import { Bell, X, Smartphone, CheckCircle } from 'lucide-react';
import { pushNotificationService } from '@/lib/pushNotificationService';
import { getCookie } from '@/lib/ultis';
import { toast } from 'sonner';

interface PermissionPromptProps {
  onPermissionGranted?: () => void;
  onPermissionDenied?: () => void;
}

export default function PermissionPrompt({ 
  onPermissionGranted, 
  onPermissionDenied 
}: PermissionPromptProps) {
  const [showPrompt, setShowPrompt] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [userInteracted, setUserInteracted] = useState(false);
  const [platform, setPlatform] = useState<'ios' | 'android' | 'desktop'>('desktop');

  useEffect(() => {
    // Detect platform
    const userAgent = navigator.userAgent.toLowerCase();
    if (/iphone|ipad|ipod/.test(userAgent)) {
      setPlatform('ios');
    } else if (/android/.test(userAgent)) {
      setPlatform('android');
    }

    // Check if we should show the prompt
    const checkShouldShowPromptOnMount = async () => {
      // Don't show if already interacted
      if (userInteracted) return;

      // Check if push notifications are supported
      if (!pushNotificationService.isPushSupported()) {
        return;
      }

      // Check current permission status
      const permission = pushNotificationService.getPermissionStatus();
      if (permission === 'granted' || permission === 'denied') {
        return;
      }

      // Check if user has been on site for a while (delay prompt)
      const timeOnSite = Date.now() - (parseInt(sessionStorage.getItem('siteEntryTime') || '0'));
      const minTimeOnSite = 30000; // 30 seconds

      if (timeOnSite < minTimeOnSite) {
        // Set a timeout to show the prompt later
        setTimeout(() => {
          setShowPrompt(true);
        }, minTimeOnSite - timeOnSite);
        return;
      }

      setShowPrompt(true);
    };

    checkShouldShowPromptOnMount();
  }, [userInteracted]);

  const handleAllowNotifications = async () => {
    setIsLoading(true);
    setUserInteracted(true);

    try {
      // Request permission
      const granted = await pushNotificationService.requestPermission();
      
      if (granted) {
        // Register service worker
        await pushNotificationService.registerServiceWorker();
        
        // Subscribe to push notifications
        const userId = getCookie('userId');
        if (userId) {
          await pushNotificationService.subscribeToPush(userId);
        }

        // Send test notification
        await pushNotificationService.sendTestNotification();
        
        toast.success('Notifications enabled successfully!');
        onPermissionGranted?.();
      } else {
        toast.error('Permission denied. You can enable notifications later in your browser settings.');
        onPermissionDenied?.();
      }
    } catch (error) {
      console.error('Error enabling notifications:', error);
      toast.error('Failed to enable notifications');
      onPermissionDenied?.();
    } finally {
      setIsLoading(false);
      setShowPrompt(false);
    }
  };

  const handleDenyNotifications = () => {
    setUserInteracted(true);
    setShowPrompt(false);
    onPermissionDenied?.();
  };

  const handleLater = () => {
    setUserInteracted(true);
    setShowPrompt(false);
    // Show again after 24 hours
    localStorage.setItem('notificationPromptDismissed', Date.now().toString());
  };

  if (!showPrompt) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-md w-full">
        <div className="p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2">
              <Bell className="h-6 w-6 text-blue-600" />
              <h2 className="text-xl font-bold text-gray-900">Stay Updated!</h2>
            </div>
            <button
              onClick={handleDenyNotifications}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            >
              <X className="h-5 w-5 text-gray-500" />
            </button>
          </div>

          {/* Content */}
          <div className="space-y-4">
            <p className="text-gray-700">
              Get instant notifications about:
            </p>
            
            <ul className="space-y-2 text-sm text-gray-600">
              <li className="flex items-center">
                <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                New material requests
              </li>
              <li className="flex items-center">
                <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                Approval updates
              </li>
              <li className="flex items-center">
                <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                Important announcements
              </li>
            </ul>

            {/* Platform-specific instructions */}
            {platform === 'ios' && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <div className="flex items-start">
                  <Smartphone className="h-5 w-5 text-blue-600 mr-2 mt-0.5" />
                  <div className="text-sm text-blue-700">
                    <strong>iPhone users:</strong> For best experience, add this app to your Home Screen first.
                  </div>
                </div>
              </div>
            )}

            {platform === 'android' && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                <div className="flex items-start">
                  <CheckCircle className="h-5 w-5 text-green-600 mr-2 mt-0.5" />
                  <div className="text-sm text-green-700">
                    <strong>Android users:</strong> Notifications work great on Android! You can also install this as an app.
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Action buttons */}
          <div className="flex space-x-3 mt-6">
            <button
              onClick={handleLater}
              className="flex-1 bg-gray-100 text-gray-700 px-4 py-2 rounded-lg font-medium hover:bg-gray-200 transition-colors"
            >
              Maybe Later
            </button>
            <button
              onClick={handleAllowNotifications}
              disabled={isLoading}
              className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Enabling...' : 'Enable Notifications'}
            </button>
          </div>

          {/* Privacy note */}
          <p className="text-xs text-gray-500 mt-3 text-center">
            We respect your privacy. You can change this setting anytime in your browser.
          </p>
        </div>
      </div>
    </div>
  );
}
