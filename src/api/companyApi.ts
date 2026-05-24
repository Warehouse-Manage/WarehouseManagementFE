import { api } from './api';

export type CompanyResponse = {
    id: number;
    name: string;
};

export const companyApi = {
    list: async () => {
        return api.get<CompanyResponse[]>('/api/companies');
    },

    lookup: async (name: string) => {
        return api.post<CompanyResponse>('/api/companies/lookup', { name });
    },

    create: async (name: string) => {
        return api.post<CompanyResponse>('/api/companies', { name });
    },
};
