import { NextRequest, NextResponse } from 'next/server';
import webpush from 'web-push';

const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_KEY;
const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;

if (vapidPublicKey && vapidPrivateKey) {
  webpush.setVapidDetails('mailto:your-email@example.com', vapidPublicKey, vapidPrivateKey);
} else {
  console.warn('VAPID keys are not configured. Push notifications will be disabled.');
}

export async function POST(request: NextRequest) {
  try {
    const { userId, title, body, icon, data } = await request.json();

    if (!userId || !title || !body) {
      return NextResponse.json(
        { error: 'Missing required fields: userId, title, body' },
        { status: 400 }
      );
    }

    if (!vapidPublicKey || !vapidPrivateKey) {
      return NextResponse.json(
        { error: 'VAPID keys are not configured on the server.' },
        { status: 500 }
      );
    }

    // Get user subscription from your database
    // This is a placeholder - you'll need to implement this based on your database
    const subscription = await getUserSubscription(userId);
    
    if (!subscription) {
      return NextResponse.json(
        { error: 'User subscription not found' },
        { status: 404 }
      );
    }

    // Prepare notification payload
    const payload = JSON.stringify({
      title,
      body,
      icon: icon || '/icon512_rounded.png',
      badge: '/icon512_rounded.png',
      data: data || {},
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
    });

    // Send notification
    await webpush.sendNotification(subscription, payload);

    return NextResponse.json({ 
      success: true, 
      message: 'Notification sent successfully' 
    });

  } catch (error) {
    console.error('Error sending notification:', error);
    return NextResponse.json(
      { error: 'Failed to send notification' },
      { status: 500 }
    );
  }
}

// Placeholder function - implement based on your database
async function getUserSubscription(userId: string) {
  void userId;
  // This should query your database for the user's subscription
  // For now, returning null to indicate not found
  return null;
}
