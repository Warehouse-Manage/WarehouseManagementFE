import { api } from './api';
import { InventoryReceipt, InventoryReceiptFormData } from '@/types';

export const inventoryReceiptApi = {
    getInventoryReceipts: async (): Promise<InventoryReceipt[]> => {
        return api.get<InventoryReceipt[]>('/api/inventoryreceipts');
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
