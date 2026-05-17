export interface UserFormData {
    userName: string;
    name: string;
    role: string;
    department: string;
    password: string;
}

export interface CreateUserResponse {
    success: boolean;
    message?: string;
    id?: number;
    companyId?: number;
    errors?: Record<string, string>;
}

export interface User {
    id: number;
    companyId?: number | null;
    userName: string;
    name: string;
    role: string;
    department: string;
    email?: string;
}
