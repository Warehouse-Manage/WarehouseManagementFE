import { User } from './user';

export type LoginResponse = {
    success: boolean;
    token: string;
    user: User;
    message?: string;
    isSuperAdmin?: boolean;
};

export type ForgotPasswordResponse = {
    success: boolean;
    message: string;
    resetToken?: string;
};
