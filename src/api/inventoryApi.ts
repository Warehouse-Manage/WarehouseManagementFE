import { api } from './api';
import {
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

    // Raw Materials
    getRawMaterials: async (): Promise<RawMaterial[]> => {
        return api.get<RawMaterial[]>('/api/nguyenlieu');
    },

    createRawMaterial: async (data: RawMaterialFormData): Promise<RawMaterial> => {
        return api.post<RawMaterial>('/api/nguyenlieu', data);
    }
};
