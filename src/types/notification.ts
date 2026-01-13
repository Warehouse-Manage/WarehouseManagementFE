export interface UserSubscription {
    userId: string;
    endpoint: string;
    p256dh: string;
    auth: string;
    userAgent: string;
    platform: 'ios' | 'android' | 'desktop';
    subscribedAt: Date;
}

export interface UserNotificationStatus {
    notificationEnabled: boolean;
    hasSubscription: boolean;
}

export interface ToggleNotificationResponse {
    userId: string;
    enabled: boolean;
    message: string;
}

export interface UserWithNotification {
    id: number;
    userName: string;
    name: string;
    role: string;
    department: string;
    notificationEnabled: boolean;
    notificationEndpoint?: string;
    notificationP256dh?: string;
    notificationAuth?: string;
    notificationSubscriptionDate?: string;
}
