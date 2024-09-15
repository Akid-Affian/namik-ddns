import type { APIRoute } from 'astro';
import { db } from '../../lib/db';
import { verifySession } from '../../lib/verifySession';
import { getCookieValue } from '../../lib/cookies';
import { cacheManager } from "../../lib/cacheManager";
import type { User } from '../../types/User';
import type { Domain } from '../../types/Domain';
import ipaddr from 'ipaddr.js';

export const POST: APIRoute = async ({ request }) => {
    // Get cookies from the request
    const cookies = request.headers.get('cookie') || '';
    const authToken = getCookieValue(cookies, 'auth_token');

    // Check if authToken is provided
    if (!authToken) {
        return new Response(JSON.stringify({ error: 'No auth token provided' }), {
            status: 401,
            headers: { 'Content-Type': 'application/json' }
        });
    }

    // Verify session using the authToken
    if (!verifySession(authToken)) {
        return new Response(JSON.stringify({ error: 'Invalid or expired session' }), {
            status: 401,
            headers: { 'Content-Type': 'application/json' }
        });
    }

    // Parse the request body
    const formData = await request.formData();
    const domainName = formData.get("domainName") as string;
    const aRecords = (formData.get("aRecords") as string || '').split(',').map(ip => ip.trim()).filter(ip => ip);
    const aaaaRecords = (formData.get("aaaaRecords") as string || '').split(',').map(ipv6 => ipv6.trim()).filter(ipv6 => ipv6);

    // Validate inputs
    if (!domainName) {
        return new Response(JSON.stringify({ error: 'Domain name is required' }), {
            status: 400,
            headers: { 'Content-Type': 'application/json' }
        });
    }

    // Validate IP addresses using ipaddr.js
    for (const ip of aRecords) {
        if (!ipaddr.isValid(ip) || ipaddr.parse(ip).kind() !== 'ipv4') {
            return new Response(JSON.stringify({ error: `Invalid IPv4 address: ${ip}` }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            });
        }
    }

    for (const ipv6 of aaaaRecords) {
        if (!ipaddr.isValid(ipv6) || ipaddr.parse(ipv6).kind() !== 'ipv6') {
            return new Response(JSON.stringify({ error: `Invalid IPv6 address: ${ipv6}` }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            });
        }
    }

    // Get user ID from the database using the auth token
    const userStmt = db.prepare("SELECT id FROM users WHERE auth_token = ?");
    const user = userStmt.get(authToken) as User | undefined;

    if (!user) {
        return new Response(JSON.stringify({ error: 'User not found' }), {
            status: 404,
            headers: { 'Content-Type': 'application/json' }
        });
    }

    // Check if the domain exists and belongs to the user
    const domainStmt = db.prepare("SELECT id FROM domains WHERE domain_name = ? AND user_id = ?");
    const domain = domainStmt.get(domainName, user.id) as Domain | undefined;

    if (!domain) {
        return new Response(JSON.stringify({ error: 'Domain not found or not owned by the user' }), {
            status: 404,
            headers: { 'Content-Type': 'application/json' }
        });
    }

    const currentTime = Date.now();

    // Function to delete existing DNS records of a certain type for the domain
    const deleteDnsRecords = (type: string) => {
        const deleteStmt = db.prepare(`
            DELETE FROM dns_records WHERE domain_id = ? AND record_type = ?
        `);
        deleteStmt.run(domain.id, type);
    };

    // Delete existing A records before inserting new ones
    if (aRecords.length > 0) {
        deleteDnsRecords('A');
        for (const ip of aRecords) {
            const recordStmt = db.prepare(`
                INSERT INTO dns_records (domain_id, record_type, content, ttl, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?)
            `);
            recordStmt.run(domain.id, 'A', ip, 60, currentTime, currentTime);
        }
    }

    // Delete existing AAAA records before inserting new ones
    if (aaaaRecords.length > 0) {
        deleteDnsRecords('AAAA');
        for (const ipv6 of aaaaRecords) {
            const recordStmt = db.prepare(`
                INSERT INTO dns_records (domain_id, record_type, content, ttl, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?)
            `);
            recordStmt.run(domain.id, 'AAAA', ipv6, 60, currentTime, currentTime);
        }
    }

    // Invalidate the cache for the user's domains
    console.log(`from update-dns-records invalidate: ${user.id}`); // Log cache invalidation
    cacheManager.invalidateCache('userDomains', user.id.toString());

    return new Response(JSON.stringify({ success: true, message: 'DNS records updated successfully' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
    });
};
