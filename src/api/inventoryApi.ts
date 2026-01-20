import { api } from './api';
import {
    PackageProduct,
    PackageProductFormData,
    Product,
    ProductFormData,
    RawMaterial,
    RawMaterialFormData
} from '@/types';

export const inventoryApi = {
    // Products
    getProducts: async (): Promise<Product[]> => {
        return api.get<Product[]>('/api/products');
    },

    createProduct: async (data: ProductFormData): Promise<Product> => {
        return api.post<Product>('/api/products', data);
    },

    // Package Products
    getPackageProducts: async (): Promise<PackageProduct[]> => {
        return api.get<PackageProduct[]>('/api/products/package');
    },

    getPackageProduct: async (id: number): Promise<PackageProduct> => {
        return api.get<PackageProduct>(`/api/products/package/${id}`);
    },

    createOrUpdatePackageProduct: async (data: PackageProductFormData): Promise<PackageProduct> => {
        return api.post<PackageProduct>('/api/products/package', data);
    },

    // Raw Materials
    getRawMaterials: async (): Promise<RawMaterial[]> => {
        return api.get<RawMaterial[]>('/api/nguyenlieu');
    },

    createRawMaterial: async (data: RawMaterialFormData): Promise<RawMaterial> => {
        return api.post<RawMaterial>('/api/nguyenlieu', data);
    }
};
