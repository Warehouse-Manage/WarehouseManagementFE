import { api } from './api';
import { MaterialWorker, MaterialWorkerFormData, MaterialWorkerPayRequest } from '@/types';

export const materialWorkerApi = {
    getAll: async (): Promise<MaterialWorker[]> => {
        return api.get<MaterialWorker[]>('/api/materialworkers');
    },

    getById: async (id: number): Promise<MaterialWorker> => {
        return api.get<MaterialWorker>(`/api/materialworkers/${id}`);
    },

    create: async (data: MaterialWorkerFormData): Promise<MaterialWorker> => {
        return api.post<MaterialWorker>('/api/materialworkers', data);
    },

    update: async (
        id: number,
        data: Partial<MaterialWorkerFormData> & { clearUserId?: boolean }
    ): Promise<MaterialWorker> => {
        return api.put<MaterialWorker>(`/api/materialworkers/${id}`, data);
    },

    remove: async (id: number): Promise<void> => {
        return api.delete<void>(`/api/materialworkers/${id}`);
    },

    pay: async (
        id: number,
        data: MaterialWorkerPayRequest
    ): Promise<{ worker: MaterialWorker; fundId: number }> => {
        return api.post(`/api/materialworkers/${id}/pay`, data);
    },
};
