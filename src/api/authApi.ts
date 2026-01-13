import { api } from './api';
import { LoginResponse, ForgotPasswordResponse } from '../types';

export const authApi = {
    login: async (credentials: Record<string, string>) => {
        return api.post<LoginResponse>('/api/auth/login', credentials);
    },

    forgotPassword: async (userName: string) => {
        return api.post<ForgotPasswordResponse>('/api/auth/forgot-password', { userName });
    },

    resetPassword: async (data: Record<string, string>) => {
        return api.post<{ success: boolean; message: string }>('/api/auth/reset-password', data);
    }
};
