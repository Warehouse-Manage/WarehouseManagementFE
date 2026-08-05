export interface MaterialWorker {
    id: number;
    name: string;
    phoneNumber: string;
    note?: string;
    userId?: number;
    amountMoneyTotal: number;
    amountMoneyPaid: number;
    dateCreated: string;
    createdUserId?: number;
}

export interface MaterialWorkerFormData {
    name: string;
    phoneNumber: string;
    note?: string;
    userId?: number;
    createdUserId?: number;
}

export interface MaterialWorkerPayRequest {
    amount: number;
    approverUsername?: string;
    createdUserId: number;
}
