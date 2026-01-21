import { api } from './api';
import {
    Customer,
    CustomerFormData,
    Deliver,
    DeliverFormData,
    DeliverPaymentFormData,
    MonthlyTotalResponse,
    Order,
    OrderFormData,
    Fund,
    FundFormData,
    OrderReceiptPrintModel,
    OrderDeliveryNotePrintModel
} from '@/types';

export const financeApi = {
    // Customers
    getCustomers: async (): Promise<Customer[]> => {
        return api.get<Customer[]>('/api/customers');
    },

    createCustomer: async (data: CustomerFormData): Promise<Customer> => {
        return api.post<Customer>('/api/customers', data);
    },

    // Delivers
    getDelivers: async (): Promise<Deliver[]> => {
        return api.get<Deliver[]>('/api/delivers');
    },

    createDeliver: async (data: DeliverFormData): Promise<Deliver> => {
        return api.post<Deliver>('/api/delivers', data);
    },

    payDeliver: async (id: number, data: DeliverPaymentFormData): Promise<void> => {
        return api.post<void>(`/api/delivers/${id}/pay`, data);
    },

    getDeliverMonthlyTotal: async (id: number, month: string): Promise<MonthlyTotalResponse> => {
        return api.get<MonthlyTotalResponse>(`/api/delivers/${id}/monthly-total?month=${month}`);
    },

    // Orders
    getOrders: async (): Promise<Order[]> => {
        return api.get<Order[]>('/api/orders');
    },

    createOrder: async (data: OrderFormData): Promise<Order> => {
        return api.post<Order>('/api/orders', data);
    },

    printOrderReceipt: async (id: number): Promise<string> => {
        return api.get<string>(`/api/orders/${id}/receipt`);
    },

    printOrderDeliveryNote: async (id: number): Promise<string> => {
        return api.get<string>(`/api/orders/${id}/delivery-note`);
    },

    printOrderReceiptModel: async (data: OrderReceiptPrintModel): Promise<string> => {
        return api.post<string>(`/api/orders/receipt`, data);
    },

    printOrderDeliveryNoteModel: async (data: OrderDeliveryNotePrintModel): Promise<string> => {
        return api.post<string>(`/api/orders/delivery-note`, data);
    },

    // Funds
    getFunds: async (params?: Record<string, string | number>): Promise<Fund[]> => {
        let url = '/api/funds';
        if (params) {
            const query = new URLSearchParams(params as Record<string, string>).toString();
            if (query) url += `?${query}`;
        }
        return api.get<Fund[]>(url);
    },

    createFund: async (data: FundFormData): Promise<Fund> => {
        return api.post<Fund>('/api/funds', data);
    },

    printFund: async (id: number): Promise<string> => {
        return api.get<string>(`/api/funds/${id}/print`);
    },

    updateFund: async (id: number, data: Partial<FundFormData>): Promise<Fund> => {
        return api.put<Fund>(`/api/funds/${id}`, data);
    },

    deleteFund: async (id: number): Promise<void> => {
        return api.delete<void>(`/api/funds/${id}`);
    }
};
