import { api } from './api';
import { Worker, WorkerFormData } from '../types';

export const workerApi = {
    getWorkers: async (userId?: string, role?: string | null): Promise<Worker[]> => {
        const params = new URLSearchParams();
        if (userId) params.set('userId', userId);
        if (role) params.set('role', role);
        const queryString = params.toString();
        const url = queryString ? `/api/workers?${queryString}` : '/api/workers';
        return api.get<Worker[]>(url);
    },

    getWorker: async (id: number): Promise<Worker> => {
        return api.get<Worker>(`/api/workers/${id}`);
    },

    createWorker: async (data: WorkerFormData): Promise<Worker> => {
        return api.post<Worker>('/api/workers', data);
    },

    updateWorker: async (id: number, data: WorkerFormData): Promise<Worker> => {
        return api.put<Worker>(`/api/workers/${id}`, data);
    },

    deleteWorker: async (id: number): Promise<unknown> => {
        return api.delete(`/api/workers/${id}`);
    }
};
