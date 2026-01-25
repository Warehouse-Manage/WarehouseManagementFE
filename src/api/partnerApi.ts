import { api } from './api';
import {
    Partner,
    PartnerFormData,
    PartnerPaymentFormData,
    PartnerPaymentResponse
} from '@/types';

export const partnerApi = {
    // Lấy danh sách đối tác (có search)
    getPartners: async (params?: { search?: string }): Promise<Partner[]> => {
        let url = '/api/partners';
        if (params?.search) {
            url += `?search=${encodeURIComponent(params.search)}`;
        }
        return api.get<Partner[]>(url);
    },

    // Lấy chi tiết đối tác
    getPartner: async (id: number): Promise<Partner> => {
        return api.get<Partner>(`/api/partners/${id}`);
    },

    // Tạo mới đối tác
    createPartner: async (data: PartnerFormData): Promise<Partner> => {
        return api.post<Partner>('/api/partners', data);
    },

    // Cập nhật đối tác (cần phê duyệt nếu update công nợ)
    updatePartner: async (id: number, data: Partial<PartnerFormData & { amountMoneyTotal?: number }>): Promise<Partner> => {
        return api.put<Partner>(`/api/partners/${id}`, data);
    },

    // Xóa đối tác
    deletePartner: async (id: number): Promise<void> => {
        return api.delete<void>(`/api/partners/${id}`);
    },

    // Thanh toán đối tác
    // Tạo phiếu chi trong sổ quỹ, tăng AmountMoneyPaid, trả về Partner và Fund
    payPartner: async (id: number, data: PartnerPaymentFormData): Promise<PartnerPaymentResponse> => {
        return api.post<PartnerPaymentResponse>(`/api/partners/${id}/pay`, data);
    },

    // Xuất phiếu chi dạng HTML để in
    getPartnerReceipt: async (id: number, fundId: number): Promise<string> => {
        return api.get<string>(`/api/partners/${id}/receipt/${fundId}`);
    }
};
