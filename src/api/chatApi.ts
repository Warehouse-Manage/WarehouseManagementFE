import { api } from './api';
import { getCookie } from '@/lib/ultis';

export interface ChatResponse {
    reply: string;
    isActionTaken: boolean;
    actionType?: string;
    data?: unknown;
}

export const chatApi = {
    chat: async (message: string): Promise<ChatResponse> => {
        const userId = getCookie('userId');
        return api.post<ChatResponse>('/api/aichat', {
            message,
            userId: userId ? Number(userId) : 0
        });
    }
};
