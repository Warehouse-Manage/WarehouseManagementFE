import { ApiShortItem } from "./material";

export type RequestItem = {
    id: number;
    name: string;
    unit: string;
    quantity: number;
    note?: string;
    unitPrice?: number;
    discount?: number;
    discountAmount?: number;
    totalPrice?: number;
    finalTotal?: number;
};

export type Request = {
    id: number;
    requester: string;
    requesterId: number;
    partnerId?: number;
    partnerName?: string;
    department: string;
    date: string;
    status: 'pending' | 'approved' | 'rejected';
    items: RequestItem[];
    totalItems: number;
    totalPrice?: number;
    discountAmount?: number;
    finalTotal?: number;
    paid?: number;
    remain?: number;
    isDeleted?: boolean;
    createdAt: string;
};

export type ApiRequestItem = {
    id: number;
    materialRequestId: number;
    materialId: number;
    quantity: number;
    unitPrice?: number;
    totalPrice?: number;
    discountAmount?: number;
    finalTotal?: number;
    note?: string;
    material?: { id: number; name: string; type: string };
};

export type ApiRequest = {
    id: number;
    requesterId: number;
    requesterName?: string;
    partnerId?: number;
    partnerName?: string;
    department: string;
    requestDate: string;
    status: string;
    description?: string;
    createdDate: string;
    updatedDate?: string | null;
    totalPrice?: number;
    discountAmount?: number;
    finalTotal?: number;
    paid?: number;
    remain?: number;
    isDeleted?: boolean;
    requester?: { id: number; userName: string; name: string; role: string; email: string };
    requestItems?: ApiRequestItem[];
    items?: ApiShortItem[];
};

// MaterialPartner type
export type MaterialPartner = {
    id: number;
    name: string;
    phoneNumber: string;
    amountMoneyTotal: number;
    amountMoneyPaid: number;
    isEmployee: boolean;
    dateCreated: string;
};
