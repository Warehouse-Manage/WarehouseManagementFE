import { ApiShortItem } from "./material";

export type RequestItem = {
    id: number;
    name: string;
    unit: string;
    quantity: number;
    note?: string;
    unitPrice?: number;
    discount?: number;
};

export type Request = {
    id: number;
    requester: string;
    department: string;
    date: string;
    status: 'pending' | 'approved' | 'rejected';
    items: RequestItem[];
    totalItems: number;
    totalPrice?: number;
    createdAt: string;
};

export type ApiRequestItem = {
    id: number;
    materialRequestId: number;
    materialId: number;
    quantity: number;
    unitPrice?: number;
    totalPrice?: number;
    note?: string;
    material?: { id: number; name: string; type: string };
};

export type ApiRequest = {
    id: number;
    requesterId: number;
    requesterName?: string;
    department: string;
    requestDate: string;
    status: string;
    description?: string;
    createdDate: string;
    updatedDate?: string | null;
    totalPrice?: number;
    requester?: { id: number; userName: string; name: string; role: string; email: string };
    requestItems?: ApiRequestItem[];
    items?: ApiShortItem[];
};
