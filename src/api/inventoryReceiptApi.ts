import { api } from './api';
import { InventoryReceipt, InventoryReceiptFormData } from '@/types';

export const inventoryReceiptApi = {
    getInventoryReceipts: async (): Promise<InventoryReceipt[]> => {
        return api.get<InventoryReceipt[]>('/api/inventoryreceipts');
    },

    getInventoryReceiptsFilter: async (page: number = 1, pageSize: number = 10, params?: Record<string, string | number>): Promise<{ data: InventoryReceipt[]; totalCount: number }> => {
        let url = `/api/inventoryreceipts/filter?pageNumber=${page}&pageSize=${pageSize}`;
        if (params) {
            const query = new URLSearchParams(params as Record<string, string>).toString();
            if (query) url += `&${query}`;
        }
        const response = await api.get<{ data: InventoryReceipt[]; totalCount: number }>(url);
        return {
            data: response.data || [],
            totalCount: response.totalCount || 0
        };
    },

    getInventoryReceiptById: async (id: number): Promise<InventoryReceipt> => {
        return api.get<InventoryReceipt>(`/api/inventoryreceipts/${id}`);
    },

    createOrUpdateInventoryReceipt: async (data: InventoryReceiptFormData): Promise<InventoryReceipt> => {
        return api.post<InventoryReceipt>('/api/inventoryreceipts', data);
    },

    deleteInventoryReceipt: async (id: number): Promise<void> => {
        return api.delete<void>(`/api/inventoryreceipts/${id}`);
    }
};
