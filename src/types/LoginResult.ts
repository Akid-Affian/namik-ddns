export interface LoginResult {
    success: boolean;
    message: string;
    authToken?: string;
    role?: string;
}