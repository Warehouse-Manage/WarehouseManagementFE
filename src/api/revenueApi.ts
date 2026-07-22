import { api } from './api';

export interface RevenueChartPoint {
    label: string;
    key: string;
    totalPrice: number;
    amountCustomerPayment: number;
    orderCount: number;
}

export interface RevenueChartResponse {
    mode: 'hour' | 'day' | 'month' | 'year' | 'years';
    year: number;
    month: string | null;
    points: RevenueChartPoint[];
}

export interface RevenueChartParams {
    mode: 'hour' | 'day' | 'month' | 'year' | 'years';
    year?: number;
    month?: string; // yyyy-MM, dùng cho mode=month/year
    date?: string;  // yyyy-MM-dd, dùng cho mode=hour/day
}

export const revenueApi = {
    getChart: async (params: RevenueChartParams): Promise<RevenueChartResponse> => {
        const search: Record<string, string> = {};
        search.mode = params.mode;
        if (params.year !== undefined && params.year !== null) search.year = String(params.year);
        if (params.month) search.month = params.month;
        if (params.date) search.date = params.date;
        const query = new URLSearchParams(search).toString();
        return api.get<RevenueChartResponse>(`/api/revenue/chart?${query}`);
    },
};