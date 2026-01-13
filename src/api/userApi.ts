import { api } from './api';
import { UserFormData, CreateUserResponse, User } from '../types';

export const userApi = {
    createUser: async (data: UserFormData): Promise<CreateUserResponse> => {
        return api.post<CreateUserResponse>('/api/User', data);
    },

    getUsers: async (params?: Record<string, string>): Promise<User[]> => {
        let url = '/api/User';
        if (params) {
            const query = new URLSearchParams(params).toString();
            if (query) url += `?${query}`;
        }
        return api.get<User[]>(url);
    }
};
