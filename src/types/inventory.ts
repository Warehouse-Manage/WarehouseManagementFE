export interface Product {
    id: number;
    name: string;
    price: number;
    quantity: number;
    quantityProduct?: number; // gạch lẻ
    quantityPackage?: number; // gạch kiện
}

export interface PackageProduct {
    id: number;
    name: string;
    productId: number;
    quantity: number;
    quantityProduct: number;
}

export interface ProductFormData {
    name: string;
    price: number;
    quantity: number;
    createdUserId: number;
}

export interface PackageProductFormData {
    id?: number;
    name: string;
    productId: number;
    quantity: number;
    quantityProduct: number;
}

export interface RawMaterial {
    id: number;
    name: string;
    unit: string;
    quantity: number;
    description?: string;
    partnerId?: number;
}

export interface RawMaterialFormData {
    name: string;
    unit: string;
    quantity: number;
    description: string;
    createdUserId: number;
    partnerId?: number;
}

export interface InventoryReceipt {
    id: number;
    productId?: number;
    packageProductId?: number;
    quantity: number;
    createdByUser: {
        id: number;
        userName: string;
    };
    createdDate: string;
}

export interface InventoryReceiptFormData {
    id?: number; // Nếu có id thì là update, không có thì là create
    productId?: number;
    packageProductId?: number;
    quantity: number;
    createdBy: number;
}

export interface RawMaterialImport {
    id: number;
    rawMaterialId: number;
    quantity: number;
    unitPrice: number;
    discount: number;
    totalAmount: number;
    paidAmount: number;
    partnerId: number;
    createdUserId: number;
    dateCreated: string;
    rawMaterial?: RawMaterial;
    partner?: {
        id: number;
        name: string;
    };
    createdUser?: {
        id: number;
        userName: string;
    };
}

export interface RawMaterialImportFormData {
    id?: number; // Nếu có id thì là update, không có thì là create
    rawMaterialId: number;
    quantity: number;
    unitPrice: number;
    discount: number;
    totalAmount: number;
    paidAmount: number;
    partnerId: number;
}