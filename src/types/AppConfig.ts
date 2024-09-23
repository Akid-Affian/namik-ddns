export type AppConfig = {
    delete_base_domain_enabled: number;
    id: number;
    enable_web_registration: number;
    auth_token_max_age: number;
    base_domain: string | null;
    additional_domains: string | null;
    first_time_setup: number;
    updated_at: number;
};
