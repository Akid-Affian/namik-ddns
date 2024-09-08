export interface User {
    id: number;
    username: string;
    password: string;
    auth_token?: string;
    auth_token_created_at?: number;
    api_key?: string;
    account_created_at?: number; 
    api_key_created_at?: number;
    role: string;
    domain_name: string | null;
}

export interface AggregatedUser extends User {
    domains: string[];
}
