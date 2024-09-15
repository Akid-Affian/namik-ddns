import type { APIRoute } from 'astro';
import { db } from '../../../../lib/database/db';
import type { DNSRecord } from '../../../../types/DNSRecord';

export const GET: APIRoute = async ({ params }) => {
    const pathParts = params.params ? params.params.split('/') : [];
    if (pathParts.length !== 2) {
        return new Response(JSON.stringify({ result: [], message: 'Invalid URL format' }), {
            status: 400,
            headers: { 'Content-Type': 'application/json' }
        });
    }

    let qname = pathParts[0]?.toLowerCase().replace(/\.$/, '');
    const qtype = pathParts[1]?.toUpperCase();

    if (!qname || !qtype) {
        return new Response(JSON.stringify({ result: [] }), {
            status: 400,
            headers: { 'Content-Type': 'application/json' }
        });
    }

    try {
        const baseDomainStmt = db.prepare(`SELECT base_domain FROM app_config`);
        const baseDomainRow = baseDomainStmt.get() as { base_domain?: string };
        const baseDomain = baseDomainRow?.base_domain;

        const isWildcard = qname.startsWith('*.');
        const actualDomain = isWildcard ? qname.slice(2) : qname;

        let query = '';
        const queryParams: any[] = [];

        if (isWildcard) {
            // For wildcard queries, only proceed if qtype is 'TXT' or 'ANY'
            if (qtype === 'ANY' || qtype === 'TXT') {
                query = `
                    SELECT record_type, content, ttl, domain_name
                    FROM dns_records 
                    JOIN domains ON dns_records.domain_id = domains.id
                    WHERE record_type = 'TXT' AND (
                        domain_name = ? OR
                        domain_name = ? OR
                        domain_name = ? OR
                        domain_name = ?
                    )
                `;
                queryParams.push(actualDomain, `*.${actualDomain}`, `*.${actualDomain.split('.').slice(1).join('.')}`, '*');
            } else {
                // For non-TXT wildcard queries, return an empty result
                return new Response(JSON.stringify({ result: [] }), {
                    status: 200,
                    headers: { 'Content-Type': 'application/json' }
                });
            }
        } else {
            // For non-wildcard queries, look for exact matches of all types
            query = `
                SELECT record_type, content, ttl, domain_name
                FROM dns_records 
                JOIN domains ON dns_records.domain_id = domains.id
                WHERE domain_name = ?
            `;
            queryParams.push(actualDomain);

            if (qtype !== 'ANY') {
                query += ` AND record_type = ?`;
                queryParams.push(qtype);
            }

            if (actualDomain === baseDomain) {
                query += `
                    UNION ALL 
                    SELECT record_type, content, ttl, ? as domain_name
                    FROM dns_records 
                    WHERE domain_id IS NULL
                `;
                queryParams.push(baseDomain);
                if (qtype !== 'ANY') {
                    query += ` AND record_type = ?`;
                    queryParams.push(qtype);
                }
            }
        }

        const recordsStmt = db.prepare(query);
        const records = recordsStmt.all(...queryParams) as (DNSRecord & { domain_name: string })[];

        const result = records.map((record) => ({
            qtype: record.record_type,
            qname: record.domain_name,
            content: record.content,
            ttl: record.ttl
        }));

        return new Response(JSON.stringify({ result }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });
    } catch (error) {
        console.error('Error during DNS lookup:', error);
        return new Response(JSON.stringify({ result: [], message: 'An error occurred during lookup' }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
};

export const OPTIONS: APIRoute = async () => {
    const headers = new Headers();
    headers.set('Access-Control-Allow-Origin', '*');
    headers.set('Access-Control-Allow-Methods', 'GET, OPTIONS');
    headers.set('Access-Control-Allow-Headers', 'Content-Type');
    return new Response(null, {
        status: 204,
        headers: headers,
    });
};