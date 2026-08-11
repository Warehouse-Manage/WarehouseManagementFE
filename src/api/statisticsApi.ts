import { api } from './api';
import {
    StatisticsSummary,
    MonthlySpendingResponse,
    TopMaterialResponse,
    DepartmentSpendingResponse
} from '../types';

export const statisticsApi = {
    getSummary: async (): Promise<StatisticsSummary> => {
        return api.get<StatisticsSummary>('/api/statistics/summary');
    },

    getMonthlySpending: async (): Promise<MonthlySpendingResponse[]> => {
        return api.get<MonthlySpendingResponse[]>('/api/statistics/monthly-spending');
    },

    getDepartmentSpending: async (): Promise<DepartmentSpendingResponse[]> => {
        return api.get<DepartmentSpendingResponse[]>('/api/statistics/department-spending');
    },

    getTopMaterials: async (limit: number = 10): Promise<TopMaterialResponse[]> => {
        return api.get<TopMaterialResponse[]>(`/api/statistics/top-materials?limit=${limit}`);
    }
};
