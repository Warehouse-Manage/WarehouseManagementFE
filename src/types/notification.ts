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
    companyId?: number | null;
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

export interface NotificationHistoryCreateInput {
    userId: number;
    title: string;
    body: string;
    entityType?: string | null;
    entityId?: number | null;
    url?: string | null;
    icon?: string | null;
}

export interface NotificationHistoryItem {
    id: number;
    userId: number;
    title: string;
    body: string;
    entityType?: string | null;
    entityId?: number | null;
    url?: string | null;
    icon?: string | null;
    isRead: boolean;
    createdDate: string;
    readDate?: string | null;
}

export interface NotificationUnreadCount {
    userId: number;
    unreadCount: number;
}

export interface NotificationMarkReadResponse {
    success: boolean;
    updatedCount: number;
}
