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
    productId?: number;
    packageProductId?: number;
    amount: number;
    price: number;
    sale: number;
}

export interface Order {
    id: number;
    customerId: number;
    deliverId: number;
    totalPrice: number;
    sale: number;
    remainingAmount: number;
    amountCustomerPayment: number;
    shipCost?: number;
    productOrders: ProductOrderDetail[];
    dateCreated: string;
    customer?: Customer;
    deliver?: Deliver;
    customerName?: string;
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

export interface OrderReceiptPrintModel {
    Tieu_De: string;
    Nhan_Doi_Tac: string;
    Ngay_Thang_Nam: string;
    Doi_Tac: string;
    Dia_Chi: string;
    Ly_Do: string;
    Gia_Tri_Phieu: string;
    Ngay: string;
    Thang: string;
    Nam: string;
    Nhan_Ky_Ten: string;
}

export interface OrderDeliveryNoteItemModel {
    STT: number;
    Ten_Hang_Hoa: string;
    So_Luong: number;
    ProductId?: number | null;
    PackageProductId?: number | null;
    QuantityProduct?: number | null;
    Ten_San_Pham_Goc?: string;
}

export interface OrderDeliveryNotePrintModel {
    Ngay_Thang_Nam: string;
    Khach_Hang: string;
    Bien_So_Xe: string;
    Doi_Tac_Giao_Hang: string;
    SDT_Giao_Hang: string;
    Tong_So_Luong: string;
    Items: OrderDeliveryNoteItemModel[];
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
