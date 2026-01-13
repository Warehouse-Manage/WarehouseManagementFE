import { api } from './api';
import {
    UserSubscription,
    UserNotificationStatus,
    ToggleNotificationResponse,
    UserWithNotification
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
    }
};
