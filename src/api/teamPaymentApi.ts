import { api } from './api';
import {
    TeamPayment,
    TeamPaymentFormData,
    UpdateTeamPaymentFormData,
    TeamPaymentSettings,
    TeamPaymentSettingsFormData
} from '@/types';

export const teamPaymentApi = {
    // Team Payments
    getTeamPayments: async (params?: Record<string, string>): Promise<TeamPayment[]> => {
        const query = params ? `?${new URLSearchParams(params).toString()}` : '';
        return api.get<TeamPayment[]>(`/api/teampayments${query}`);
    },

    createTeamPayment: async (data: TeamPaymentFormData): Promise<TeamPayment> => {
        return api.post<TeamPayment>('/api/teampayments', data);
    },

    updateTeamPayment: async (id: number, data: UpdateTeamPaymentFormData): Promise<TeamPayment> => {
        return api.put<TeamPayment>(`/api/teampayments/${id}`, data);
    },

    deleteTeamPayment: async (id: number): Promise<void> => {
        return api.delete(`/api/teampayments/${id}`);
    },

    // Team Payment Settings
    getTeamPaymentSettings: async (): Promise<TeamPaymentSettings> => {
        return api.get<TeamPaymentSettings>('/api/teampayments/settings');
    },

    updateTeamPaymentSettings: async (data: TeamPaymentSettingsFormData): Promise<TeamPaymentSettings> => {
        return api.put<TeamPaymentSettings>('/api/teampayments/settings', data);
    }
};
