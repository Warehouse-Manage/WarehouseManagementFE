import { api } from './api';
import { Material, ApiRequest, MaterialPartner } from '../types';

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

    createMaterialRequest: async (data: unknown): Promise<unknown> => {
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
    },

    updateMaterialRequest: async (
        requestId: number,
        data: {
            partnerId?: number | null;
            department?: string;
            requestDate?: string;
            description?: string;
            paidAmount?: number;
            EditorUserId: number;
            items: {
                materialId: number;
                requestedQuantity: number;
                unitPrice?: number;
                discountAmount?: number;
                note?: string;
            }[];
        }
    ): Promise<unknown> => {
        return api.put(`/api/materialrequests/${requestId}`, data);
    },

    deleteMaterialRequest: async (requestId: number, userId: number): Promise<unknown> => {
        return api.delete(`/api/materialrequests/${requestId}?userId=${userId}`);
    },

    // MaterialPartner APIs
    getMaterialPartners: async (params?: { search?: string; isEmployee?: boolean }): Promise<MaterialPartner[]> => {
        const query = new URLSearchParams();
        if (params?.search) query.append('search', params.search);
        if (params?.isEmployee !== undefined) query.append('isEmployee', params.isEmployee.toString());
        const queryString = query.toString();
        const url = `/api/materialpartners${queryString ? `?${queryString}` : ''}`;
        return api.get<MaterialPartner[]>(url);
    },

    createMaterialPartner: async (data: { name: string; phoneNumber: string; isEmployee: boolean }): Promise<MaterialPartner> => {
        return api.post<MaterialPartner>('/api/materialpartners', data);
    },

    updateMaterialPartner: async (id: number, data: { name?: string; phoneNumber?: string; isEmployee?: boolean }): Promise<MaterialPartner> => {
        return api.put<MaterialPartner>(`/api/materialpartners/${id}`, data);
    },

    deleteMaterialPartner: async (id: number): Promise<void> => {
        return api.delete(`/api/materialpartners/${id}`);
    }
};
