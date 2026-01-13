import { User } from './user';

export type LoginResponse = {
    success: boolean;
    token: string;
    user: User;
    message?: string;
};

export type ForgotPasswordResponse = {
    success: boolean;
    message: string;
    resetToken?: string;
};
