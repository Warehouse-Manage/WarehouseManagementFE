import { api } from './api';
import { ImportProductChart, SyncImportProductChartRequest } from '@/types';

export const importProductChartApi = {
    getImportProductCharts: async (): Promise<ImportProductChart[]> => {
        return api.get<ImportProductChart[]>('/api/ImportProductChart');
    },

    createOrUpdateImportProductCharts: async (data: SyncImportProductChartRequest): Promise<{ success: boolean; message: string }> => {
        return api.post<{ success: boolean; message: string }>('/api/ImportProductChart/CreateOrUpdate', data);
    }
};
