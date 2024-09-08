export type DNSRecord = {
    id: number;
    domain_id: number;
    record_type: 'A' | 'AAAA' | 'TXT';
    content: string;
    ttl: number;
    created_at: number;
    updated_at: number;
};
