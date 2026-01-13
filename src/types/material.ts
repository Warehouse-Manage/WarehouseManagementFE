export type Material = {
    id: number;
    name: string;
    amount: number;
    imageUrl?: string;
    type: string;
    unit?: string;
};

export type ApiShortItem = {
    id: number;
    name: string;
    type: string;
    quantity: number;
    unitPrice?: number;
    totalPrice?: number;
};
