"use client";

import { useState } from 'react';
import { Bell, Loader2 } from 'lucide-react';
import { pushNotificationService } from '@/lib/pushNotificationService';
import { toast } from 'sonner';

export default function TestNotification() {
  const [isLoading, setIsLoading] = useState(false);

  const sendTestNotification = async () => {
    setIsLoading(true);
    
    try {
      await pushNotificationService.sendTestNotification();
      toast.success('Test notification sent!');
    } catch (error) {
      console.error('Error sending test notification:', error);
      toast.error('Failed to send test notification');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <button
      onClick={sendTestNotification}
      disabled={isLoading}
      className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {isLoading ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <Bell className="h-4 w-4" />
      )}
      <span>{isLoading ? 'Sending...' : 'Test Notification'}</span>
    </button>
  );
}
