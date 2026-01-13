export interface Customer {
    id: number;
    name: string;
    address: string;
    phoneNumber: string;
}

export interface CustomerFormData {
    name: string;
    address: string;
    phoneNumber: string;
    createdUserId: number;
}

export interface Deliver {
    id: number;
    name: string;
    phoneNumber: string;
    plateNumber: string;
    amountMoneyTotal: number;
    amountMoneyPaid: number;
}

export interface DeliverFormData {
    name: string;
    phoneNumber: string;
    plateNumber: string;
    createdUserId: number;
}

export interface DeliverPaymentFormData {
    amount: number;
    createdUserId: number;
}

export interface MonthlyTotalResponse {
    totalCost: number;
}

export interface ProductOrderDetail {
    productId: number;
    amount: number;
    price: number;
    sale: number;
}

export interface Order {
    id: number;
    customerId: number;
    deliverId: number;
    sale: number;
    amountCustomerPayment: number;
    shipCost?: number;
    productOrders: ProductOrderDetail[];
    dateCreated: string;
    customer?: Customer;
    deliver?: Deliver;
}

export interface OrderFormData {
    customerId: number;
    deliverId: number;
    sale: number;
    amountCustomerPayment: number;
    shipCost: number;
    productOrders: ProductOrderDetail[];
    createdUserId: number;
}

export interface Fund {
    id: number;
    date: string;
    type: string;
    description: string;
    amount: number;
    category: string;
    objectId: number | null;
    objectType: string;
    objectName: string;
    dateCreated: string;
}

export interface FundFormData {
    type: string;
    description: string;
    amount: number;
    category: string;
    objectId: number | null;
    objectType: string;
    objectName: string;
    createdUserId: number;
}
