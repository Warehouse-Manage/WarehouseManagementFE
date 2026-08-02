import { api } from './api';
import {
    UserSubscription,
    UserNotificationStatus,
    ToggleNotificationResponse,
    UserWithNotification,
    NotificationHistoryItem,
    NotificationHistoryCreateInput,
    NotificationUnreadCount,
    NotificationMarkReadResponse,
} from '../types';

export const notificationApi = {
    subscribe: async (subscription: UserSubscription): Promise<{ message: string }> => {
        return api.post<{ message: string }>('/api/notification/subscribe', subscription);
    },

    unsubscribe: async (data: { userId: string }): Promise<{ message: string }> => {
        return api.post<{ message: string }>('/api/notification/unsubscribe', data);
    },

    getUserStatus: async (userId: string): Promise<UserNotificationStatus> => {
        return api.get<UserNotificationStatus>(`/api/notification/user-status/${userId}`);
    },

    toggleNotifications: async (userId: string, enabled: boolean): Promise<ToggleNotificationResponse> => {
        return api.put<ToggleNotificationResponse>(`/api/notification/toggle/${userId}`, { enabled });
    },

    getUsersWithSubscriptions: async (): Promise<UserWithNotification[]> => {
        return api.get<UserWithNotification[]>('/api/notification/users-with-subscriptions');
    },

    saveHistory: async (notification: NotificationHistoryCreateInput): Promise<NotificationHistoryItem> => {
        return api.post<NotificationHistoryItem>('/api/notification/history', notification);
    },

    getHistory: async (userId: string, take = 50, skip = 0): Promise<NotificationHistoryItem[]> => {
        return api.get<NotificationHistoryItem[]>(
            `/api/notification/history/${userId}?take=${take}&skip=${skip}`,
        );
    },

    getUnreadCount: async (userId: string): Promise<NotificationUnreadCount> => {
        return api.get<NotificationUnreadCount>(`/api/notification/history/${userId}/unread-count`);
    },

    markRead: async (id: number, userId: string): Promise<NotificationMarkReadResponse> => {
        return api.put<NotificationMarkReadResponse>(
            `/api/notification/history/${id}/read?userId=${userId}`,
            {},
        );
    },

    markAllRead: async (userId: string): Promise<NotificationMarkReadResponse> => {
        return api.put<NotificationMarkReadResponse>(`/api/notification/history/${userId}/read-all`, {});
    },
};
