import { api } from './api';
import {
    TeamPayment,
    TeamPaymentFormData,
    UpdateTeamPaymentFormData,
    TeamPaymentSettings,
    TeamPaymentSettingsFormData,
    TeamPaymentPaginatedResponse,
    TeamPaymentFilterParams
} from '@/types';

export const teamPaymentApi = {
    // Team Payments
    getTeamPayments: async (params?: Record<string, string>): Promise<TeamPayment[]> => {
        const query = params ? `?${new URLSearchParams(params).toString()}` : '';
        return api.get<TeamPayment[]>(`/api/teampayments${query}`);
    },

    getTeamPaymentsWithFilter: async (
        params: TeamPaymentFilterParams
    ): Promise<TeamPaymentPaginatedResponse> => {
        const search: Record<string, string> = {};
        if (params.pageNumber !== undefined) search.pageNumber = String(params.pageNumber);
        if (params.pageSize !== undefined) search.pageSize = String(params.pageSize);
        if (params.startDate) search.startDate = params.startDate;
        if (params.endDate) search.endDate = params.endDate;
        if (params.searchTerm) search.searchTerm = params.searchTerm;
        if (params.year !== undefined && params.year !== null) search.year = String(params.year);

        const query = new URLSearchParams(search).toString();
        return api.get<TeamPaymentPaginatedResponse>(`/api/teampayments/filter?${query}`);
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
