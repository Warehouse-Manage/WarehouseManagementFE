import { api } from './api';

export interface TaxInfo {
    id: number;
    companyId: number;
    isTaxMode: boolean;
    taxIncluded: boolean;
}

/**
 * Tax API service.
 *
 * Backend:
 *   GET  /api/taxes/by-company/{companyId}   → lấy record Tax (null nếu chưa có)
 *   POST /api/taxes/toggle                  → toggle IsTaxMode
 */
export const taxApi = {
    /**
     * Lấy trạng thái thuế hiện tại của công ty.
     * Trả về null nếu công ty chưa có record Tax.
     */
    getByCompany: async (companyId: number): Promise<TaxInfo | null> => {
        return api.get<TaxInfo | null>(`/api/taxes/by-company/${companyId}`);
    },

    /**
     * Toggle tax mode. Trả về record Tax mới sau khi toggle.
     */
    toggle: async (companyId: number): Promise<TaxInfo> => {
        return api.post<TaxInfo>(`/api/taxes/toggle`, { companyId });
    },
};
