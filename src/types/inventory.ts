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
}

export interface RawMaterialFormData {
    name: string;
    unit: string;
    quantity: number;
    description: string;
    createdUserId: number;
}
