export interface Domain {
    id: number;
    user_id: number;
    domain_name: string;
    created_at: number; 
    updated_at: number;
    aRecords?: string;
    aaaaRecords?: string; 
}
