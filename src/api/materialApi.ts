import { api } from './api';
import { Material, ApiRequest } from '../types';

export interface RequestQueryParams {
    status?: string;
    year?: number;
    month?: string;
    userName?: string;
}

export const materialApi = {
    getMaterials: async (): Promise<Material[]> => {
        return api.get<Material[]>('/api/materials');
    },

    searchMaterials: async (term: string): Promise<Material[]> => {
        return api.get<Material[]>(`/api/materials/search?term=${encodeURIComponent(term)}`);
    },

    createMaterial: async (data: unknown): Promise<Material> => {
        return api.post<Material>('/api/materials', data);
    },

    createMaterialRequest: async (data: {
        requesterId: number;
        department: string;
        requestDate: string;
        description: string;
        items: {
            materialId: number;
            requestedQuantity: number;
            note: string;
        }[];
    }): Promise<unknown> => {
        return api.post('/api/materialrequests', data);
    },

    getMaterialRequests: async (params: RequestQueryParams = {}): Promise<ApiRequest[]> => {
        const query = new URLSearchParams();
        if (params.status) query.append('status', params.status);
        if (params.year) query.append('year', params.year.toString());
        if (params.month) query.append('month', params.month);
        if (params.userName) query.append('userName', params.userName);

        const queryString = query.toString();
        const url = `/api/materialrequests${queryString ? `?${queryString}` : ''}`;

        return api.get<ApiRequest[]>(url);
    },

    approveRequest: async (requestId: number, data: unknown): Promise<unknown> => {
        return api.put(`/api/materialrequests/${requestId}/approve`, data);
    },

    rejectRequest: async (requestId: number, data: unknown): Promise<unknown> => {
        return api.put(`/api/materialrequests/${requestId}/reject`, data);
    }
};
