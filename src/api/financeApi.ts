import { api, API_HOST } from './api';
import { getCookie } from '@/lib/ultis';
import {
    Customer,
    CustomerFormData,
    Deliver,
    DeliverFormData,
    DeliverPaymentFormData,
    MonthlyTotalResponse,
    Order,
    OrderFormData,
    PlaceOrderFormData,
    Fund,
    FundFormData,
    OrderReceiptPrintModel,
    OrderDeliveryNotePrintModel,
    InventoryForecastResponse
} from '@/types';

export const financeApi = {
    // Customers
    getCustomers: async (): Promise<Customer[]> => {
        return api.get<Customer[]>('/api/customers');
    },

    getCustomerDebtSummary: async (customerId: number): Promise<number> => {
        return api.get<number>(`/api/customers/debt/summary?customerId=${customerId}`); 
    },

    createCustomer: async (data: CustomerFormData): Promise<Customer> => {
        return api.post<Customer>('/api/customers', data);
    },

    getCustomerDebtTemplate: async (customerId: number, startDate?: string, endDate?: string): Promise<Blob> => {
        const token = getCookie('token');
        
        let url = `${API_HOST}/api/customers/debt/template?customerId=${customerId}`;
        if (startDate) {
            url += `&startDate=${startDate}`;
        }
        if (endDate) {
            url += `&endDate=${endDate}`;
        }
        
        const response = await fetch(url, {
            method: 'GET',
            headers: {
                ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
            },
        });
        
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(errorText || 'Không thể tải file công nợ');
        }
        
        return await response.blob();
    },

    // Delivers
    getDelivers: async (): Promise<Deliver[]> => {
        return api.get<Deliver[]>('/api/delivers');
    },

    createDeliver: async (data: DeliverFormData): Promise<Deliver> => {
        return api.post<Deliver>('/api/delivers', data);
    },

    updateDeliver: async (id: number, data: DeliverFormData): Promise<Deliver> => {
        return api.put<Deliver>(`/api/delivers/${id}`, data);
    },

    deleteDeliver: async (id: number): Promise<void> => {
        return api.delete<void>(`/api/delivers/${id}`);
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

    getOrdersFilter: async (page: number = 1, pageSize: number = 10, params?: Record<string, string | number>): Promise<{ data: Order[]; totalCount: number }> => {
        let url = `/api/orders/filter?pageNumber=${page}&pageSize=${pageSize}`;
        if (params) {
            const query = new URLSearchParams(params as Record<string, string>).toString();
            if (query) url += `&${query}`;
        }
        const response = await api.get<{ data: Order[]; totalCount: number }>(url);
        return {
            data: response.data || [],
            totalCount: response.totalCount || 0
        };
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

    deleteOrder: async (id: number): Promise<void> => {
        return api.delete<void>(`/api/orders/${id}`);
    },

    // PlaceOrders
    getPlaceOrders: async (): Promise<Order[]> => {
        return api.get<Order[]>('/api/place-orders');
    },

    getPlaceOrdersFilter: async (page: number = 1, pageSize: number = 10, params?: Record<string, string | number>): Promise<{ data: Order[]; totalCount: number }> => {
        let url = `/api/place-orders/filter?pageNumber=${page}&pageSize=${pageSize}`;
        if (params) {
            const query = new URLSearchParams(params as Record<string, string>).toString();
            if (query) url += `&${query}`;
        }
        const response = await api.get<{ data: Order[]; totalCount: number }>(url);
        return {
            data: response.data || [],
            totalCount: response.totalCount || 0
        };
    },

    createPlaceOrder: async (data: PlaceOrderFormData): Promise<Order> => {
        return api.post<Order>('/api/place-orders', data);
    },

    printPlaceOrderReceipt: async (id: number): Promise<string> => {
        return api.get<string>(`/api/place-orders/${id}/receipt`);
    },

    printPlaceOrderDeliveryNote: async (id: number): Promise<string> => {
        return api.get<string>(`/api/place-orders/${id}/delivery-note`);
    },

    printPlaceOrderReceiptModel: async (data: OrderReceiptPrintModel): Promise<string> => {
        return api.post<string>(`/api/place-orders/receipt`, data);
    },

    printPlaceOrderDeliveryNoteModel: async (data: OrderDeliveryNotePrintModel): Promise<string> => {
        return api.post<string>(`/api/place-orders/delivery-note`, data);
    },

    printPlaceOrderForm: async (id: number): Promise<string> => {
        return api.get<string>(`/api/place-orders/${id}/order-form`);
    },

    deletePlaceOrder: async (id: number): Promise<void> => {
        return api.delete<void>(`/api/place-orders/${id}`);
    },

    calculatePlaceOrderForecast: async (data: { deliveryDate: string; items: Array<{ productId?: number; packageProductId?: number; requiredQuantity: number }> }): Promise<InventoryForecastResponse> => {
        return api.post<InventoryForecastResponse>('/api/place-orders/forecast', data);
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

    getFundsFilter: async (page: number = 1, pageSize: number = 10, params?: Record<string, string | number>): Promise<{ data: Fund[]; totalCount: number }> => {
        let url = `/api/funds/filter?pageNumber=${page}&pageSize=${pageSize}`;
        if (params) {
            const query = new URLSearchParams(params as Record<string, string>).toString();
            if (query) url += `&${query}`;
        }
        const response = await api.get<{ data: Fund[]; totalCount: number }>(url);
        return {
            data: response.data || [],
            totalCount: response.totalCount || 0
        };
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
