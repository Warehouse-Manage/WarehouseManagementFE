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
    errors?: Record<string, string>;
}

export interface User {
    id: number;
    userName: string;
    name: string;
    role: string;
    department: string;
    email?: string;
}
