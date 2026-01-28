import { api } from './api';
import {
    PackageProduct,
    PackageProductFormData,
    Product,
    ProductFormData,
    RawMaterial,
    RawMaterialFormData,
    RawMaterialImport,
    RawMaterialImportFormData
} from '@/types';

export const inventoryApi = {
    // Products
    getProducts: async (): Promise<Product[]> => {
        return api.get<Product[]>('/api/products');
    },

    createProduct: async (data: ProductFormData): Promise<Product> => {
        return api.post<Product>('/api/products', data);
    },

    deleteProduct: async (id: number): Promise<void> => {
        return api.delete<void>(`/api/products/${id}`);
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

    deletePackageProduct: async (id: number): Promise<void> => {
        return api.delete<void>(`/api/products/package/${id}`);
    },

    // Raw Materials
    getRawMaterials: async (): Promise<RawMaterial[]> => {
        return api.get<RawMaterial[]>('/api/nguyenlieu');
    },

    createRawMaterial: async (data: RawMaterialFormData): Promise<RawMaterial> => {
        return api.post<RawMaterial>('/api/nguyenlieu', data);
    },

    // Nhập nguyên liệu với thông tin tài chính
    importRawMaterial: async (data: {
        rawMaterialId: number;
        quantity: number;
        unitPrice: number;
        discount: number;
        totalAmount: number;
        paidAmount: number;
        partnerId: number;
        createdUserId: number;
    }): Promise<{ rawMaterial: RawMaterial; partner: unknown; fund?: unknown }> => {
        return api.post('/api/nguyenlieu/import', data);
    },

    // Raw Material Import
    getRawMaterialImports: async (): Promise<RawMaterialImport[]> => {
        return api.get<RawMaterialImport[]>('/api/rawmaterialimport');
    },

    getRawMaterialImportsFilter: async (page: number = 1, pageSize: number = 10, params?: Record<string, string | number>): Promise<{ data: RawMaterialImport[]; totalCount: number }> => {
        let url = `/api/rawmaterialimport/filter?pageNumber=${page}&pageSize=${pageSize}`;
        if (params) {
            const query = new URLSearchParams(params as Record<string, string>).toString();
            if (query) url += `&${query}`;
        }
        const response = await api.get<{ data: RawMaterialImport[]; totalCount: number }>(url);
        return {
            data: response.data || [],
            totalCount: response.totalCount || 0
        };
    },

    getRawMaterialImportById: async (id: number): Promise<RawMaterialImport> => {
        return api.get<RawMaterialImport>(`/api/rawmaterialimport/${id}`);
    },

    updateRawMaterialImport: async (id: number, data: RawMaterialImportFormData): Promise<RawMaterialImport> => {
        return api.put<RawMaterialImport>(`/api/rawmaterialimport/${id}`, data);
    }
};
