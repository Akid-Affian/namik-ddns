import type { APIRoute } from 'astro';
import db from '../../../lib/db';

export const GET: APIRoute = async ({ params }) => {
    const domainInput = params.name?.toLowerCase();

    // Check if the domain name is provided
    if (!domainInput) {
        return new Response(JSON.stringify({ result: {}, message: 'Domain name not provided' }), {
            status: 400,
            headers: {
                'Content-Type': 'application/json'
            }
        });
    }

    try {
        // Get the base_domain from app_config
        const configStmt = db.prepare(`SELECT base_domain FROM app_config WHERE id = 1`);
        const appConfig: { base_domain?: string } = configStmt.get() as { base_domain?: string };

        if (!appConfig || !appConfig.base_domain) {
            return new Response(JSON.stringify({ result: {}, message: 'Base domain not configured' }), {
                status: 500,
                headers: {
                    'Content-Type': 'application/json'
                }
            });
        }

        const baseDomain = appConfig.base_domain.toLowerCase();

        // Prepare the domain variable to check both base domain and subdomains
        const domain = domainInput.includes(baseDomain) ? domainInput : `${domainInput}.${baseDomain}`;

        // Query for both the exact base domain and any potential subdomains
        const domainStmt = db.prepare(`
            SELECT * FROM domains 
            WHERE domain_name = ? OR domain_name = ?
        `);

        const domainRecord = domainStmt.get(domain, baseDomain);

        // If no domain is found, return an empty result with PRESIGNED still present
        if (!domainRecord) {
            return new Response(JSON.stringify({ result: { PRESIGNED: ["0"] } }), {
                status: 404,
                headers: {
                    'Content-Type': 'application/json'
                }
            });
        }

        // Return the metadata with PRESIGNED in the expected format
        return new Response(JSON.stringify({ result: { PRESIGNED: ["0"] } }), {
            status: 200,
            headers: {
                'Content-Type': 'application/json'
            }
        });
    } catch (error) {
        console.error('Error fetching domain metadata:', error);
        return new Response(JSON.stringify({ result: false, message: 'Internal server error' }), {
            status: 500,
            headers: {
                'Content-Type': 'application/json'
            }
        });
    }
};
