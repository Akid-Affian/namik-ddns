import type { APIRoute } from 'astro';
import { db } from '../../lib/database/db';
import { cacheManager } from "../../lib/utils/cacheManager";
import ipaddr from 'ipaddr.js';
import { getIP } from '../../lib/utils/fetch-ip'; 
import type { User } from '../../types/User';
import type { Domain } from '../../types/Domain';

export const GET: APIRoute = async ({ params, url, clientAddress }) => {
    const pathParts = params.params ? params.params.split('/') : [];

    // Expect the path to include at least the full domain and token
    if (pathParts.length < 2 || pathParts.length > 3) {
        return new Response('KO\nInvalid URL format', {
            status: 400,
            headers: { 'Content-Type': 'text/plain' }
        });
    }

    const fullDomain = pathParts[0];  // Full domain must now be provided by the user
    const token = pathParts[1];       // User's API key/token
    let ip = pathParts[2] || null;    // Optional IP address
    let ipv6: string | null = null;

    // If no IP is provided, detect the client's IP address
    if (!ip) {
        const detectedIP = getIP({ clientAddress });
        if (ipaddr.isValid(detectedIP)) {
            const parsedIP = ipaddr.parse(detectedIP);
            if (parsedIP.kind() === 'ipv6') {
                ipv6 = detectedIP;
            } else {
                ip = detectedIP;
            }
        } else {
            return new Response('KO\nInvalid detected IP address format', {
                status: 400,
                headers: { 'Content-Type': 'text/plain' }
            });
        }
    } else if (ip && ipaddr.isValid(ip)) {
        if (ipaddr.parse(ip).kind() === 'ipv6') {
            ipv6 = ip;
            ip = null;
        }
    } else {
        return new Response('KO\nInvalid IP address format', {
            status: 400,
            headers: { 'Content-Type': 'text/plain' }
        });
    }

    // Validate the API key/token
    const userStmt = db.prepare("SELECT id, api_key FROM users WHERE api_key = ?");
    const user = userStmt.get(token) as User | undefined;

    if (!user) {
        return new Response('KO\nInvalid API key', {
            status: 401,
            headers: { 'Content-Type': 'text/plain' }
        });
    }

    // Direct lookup of the full domain in the database (no subdomain/base domain logic)
    const domainStmt = db.prepare("SELECT id FROM domains WHERE domain_name = ? AND user_id = ?");
    const domainRecord = domainStmt.get(fullDomain, user.id) as Domain | undefined;

    if (!domainRecord) {
        return new Response(`KO\nDomain not found or not owned by user: ${fullDomain}`, {
            status: 404,
            headers: { 'Content-Type': 'text/plain' }
        });
    }

    let responseText = 'OK';
    const currentTime = Date.now();

    const checkCurrentRecord = (type: string, content: string) => {
        const currentRecordStmt = db.prepare("SELECT content FROM dns_records WHERE domain_id = ? AND record_type = ?");
        const currentRecord = currentRecordStmt.get(domainRecord.id, type) as { content: string } | undefined;
        return currentRecord?.content === content;
    };

    const deleteDnsRecords = (type: string) => {
        const deleteStmt = db.prepare("DELETE FROM dns_records WHERE domain_id = ? AND record_type = ?");
        deleteStmt.run(domainRecord.id, type);
    };

    let domainUpdateOccurred = false;
    let domainNoChangeOccurred = false;

    const clear = url.searchParams.get('clear') === 'true';
    const txt = url.searchParams.get('txt');

    if (clear) {
        deleteDnsRecords('A');
        deleteDnsRecords('AAAA');
        deleteDnsRecords('TXT');
    }

    if (txt) {
        if (!clear && !checkCurrentRecord('TXT', txt)) {
            deleteDnsRecords('TXT');
            const insertTXTRecordStmt = db.prepare(`
                INSERT INTO dns_records (domain_id, record_type, content, ttl, created_at, updated_at)
                VALUES (?, 'TXT', ?, 60, ?, ?)
            `);
            insertTXTRecordStmt.run(domainRecord.id, txt, currentTime, currentTime);
            responseText += `\nTXT=${txt}\nUPDATED`;
            domainUpdateOccurred = true;
        } else if (checkCurrentRecord('TXT', txt)) {
            responseText += `\nTXT=${txt}\nNOCHANGE`;
            domainNoChangeOccurred = true;
        }
    }

    if (ip) {
        if (!clear && !checkCurrentRecord('A', ip)) {
            deleteDnsRecords('A');
            const insertARecordStmt = db.prepare(`
                INSERT INTO dns_records (domain_id, record_type, content, ttl, created_at, updated_at)
                VALUES (?, 'A', ?, 60, ?, ?)
            `);
            insertARecordStmt.run(domainRecord.id, ip, currentTime, currentTime);
            responseText += `\n${ip}\nUPDATED`;
            domainUpdateOccurred = true;
        } else if (checkCurrentRecord('A', ip)) {
            responseText += `\n${ip}\nNOCHANGE`;
            domainNoChangeOccurred = true;
        }
    }

    if (ipv6) {
        if (!clear && !checkCurrentRecord('AAAA', ipv6)) {
            deleteDnsRecords('AAAA');
            const insertAAAARecordStmt = db.prepare(`
                INSERT INTO dns_records (domain_id, record_type, content, ttl, created_at, updated_at)
                VALUES (?, 'AAAA', ?, 60, ?, ?)
            `);
            insertAAAARecordStmt.run(domainRecord.id, ipv6, currentTime, currentTime);
            responseText += `\n${ipv6}\nUPDATED`;
            domainUpdateOccurred = true;
        } else if (checkCurrentRecord('AAAA', ipv6)) {
            responseText += `\n${ipv6}\nNOCHANGE`;
            domainNoChangeOccurred = true;
        }
    }

    if (!domainUpdateOccurred && !domainNoChangeOccurred) {
        responseText += `\nNo changes made for domain: ${fullDomain}`;
    }

    cacheManager.invalidateCache('userDomains', user.id.toString());

    return new Response(responseText.trim(), {
        status: 200,
        headers: { 'Content-Type': 'text/plain' }
    });
};
