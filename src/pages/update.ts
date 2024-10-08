// This file is placed here to mimic the DuckDNS API structure.

import type { APIRoute } from 'astro';
import { db } from '@lib/database/db';
import { cacheManager } from "@lib/utils/cacheManager";
import type { User } from '../types/User';
import type { Domain } from '../types/Domain';
import ipaddr from 'ipaddr.js';
import { getIP } from '@lib/utils/fetch-ip';  

export const GET: APIRoute = async ({ request, clientAddress }) => {

    const url = new URL(request.url);
    const pathParts = url.pathname.split('/').filter(part => part);

    let domains = pathParts[1] || url.searchParams.get('domains') || '';
    let token = pathParts[2] || url.searchParams.get('token') || '';
    let ip = url.searchParams.get('ip');
    let ipv6: string | null = url.searchParams.get('ipv6');
    let txt = url.searchParams.get('txt');  

    if (!domains || !token) {
        return new Response('KO\nMissing required parameters: domains and token', {
            status: 400,
            headers: { 'Content-Type': 'text/plain' }
        });
    }

    const verbose = url.searchParams.get('verbose') === 'true';
    const clear = url.searchParams.get('clear') === 'true';

    const userStmt = db.prepare("SELECT id, api_key FROM users WHERE api_key = ?");
    const user: User | undefined = userStmt.get(token) as User | undefined;

    if (!user) {
        return new Response('KO\nInvalid API key', {
            status: 401,
            headers: { 'Content-Type': 'text/plain' }
        });
    }

    const domainList = domains.split(',').map(domain => domain.trim());  

    let responseText = 'OK\n';  
    let currentTime = Date.now();

    const checkCurrentRecord = (domainId: number, type: string, content: string) => {
        const currentRecordStmt = db.prepare("SELECT content FROM dns_records WHERE domain_id = ? AND record_type = ?");
        const currentRecord: { content: string } | undefined = currentRecordStmt.get(domainId, type) as { content: string } | undefined;
        return currentRecord?.content === content;
    };

    const deleteDnsRecords = (domainId: number, type: string) => {
        const deleteStmt = db.prepare("DELETE FROM dns_records WHERE domain_id = ? AND record_type = ?");
        deleteStmt.run(domainId, type);
    };

    let domainUpdateOccurred = false;
    let domainNoChangeOccurred = false;
    let ipShown = false;

    if (!ip && !ipv6 && !txt) {  
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
    }

    for (const domain of domainList) {

        const domainStmt = db.prepare("SELECT id FROM domains WHERE domain_name = ? AND user_id = ?");
        const domainRecord: Domain | undefined = domainStmt.get(domain, user.id) as Domain | undefined;

        if (!domainRecord) {
            responseText += `KO\nDomain not found or not owned by user: ${domain}\n`;
            continue;
        }

        if (clear) {
            deleteDnsRecords(domainRecord.id, 'A');
            deleteDnsRecords(domainRecord.id, 'AAAA');
            deleteDnsRecords(domainRecord.id, 'TXT');
        }

        if (txt) {

            if (!checkCurrentRecord(domainRecord.id, 'TXT', txt)) {
                deleteDnsRecords(domainRecord.id, 'TXT');
                const insertTXTRecordStmt = db.prepare(`
                    INSERT INTO dns_records (domain_id, record_type, content, ttl, created_at, updated_at)
                    VALUES (?, 'TXT', ?, 60, ?, ?)
                `);
                insertTXTRecordStmt.run(domainRecord.id, txt, currentTime, currentTime);
                domainUpdateOccurred = true;
            } else {
                domainNoChangeOccurred = true;
            }
        }

        if (!txt) {
            if (ip) {

                if (!checkCurrentRecord(domainRecord.id, 'A', ip)) {
                    deleteDnsRecords(domainRecord.id, 'A');
                    const insertARecordStmt = db.prepare(`
                        INSERT INTO dns_records (domain_id, record_type, content, ttl, created_at, updated_at)
                        VALUES (?, 'A', ?, 60, ?, ?)
                    `);
                    insertARecordStmt.run(domainRecord.id, ip, currentTime, currentTime);
                    domainUpdateOccurred = true;
                } else {
                    domainNoChangeOccurred = true;
                }
            }

            if (ipv6) {

                if (!checkCurrentRecord(domainRecord.id, 'AAAA', ipv6)) {
                    deleteDnsRecords(domainRecord.id, 'AAAA');
                    const insertAAAARecordStmt = db.prepare(`
                        INSERT INTO dns_records (domain_id, record_type, content, ttl, created_at, updated_at)
                        VALUES (?, 'AAAA', ?, 60, ?, ?)
                    `);
                    insertAAAARecordStmt.run(domainRecord.id, ipv6, currentTime, currentTime);
                    domainUpdateOccurred = true;
                } else {
                    domainNoChangeOccurred = true;
                }
            }
        }

        cacheManager.invalidateCache('userDomains', user.id.toString());
    }

    if (verbose) {
        if (ip) {
            responseText += `${ip}\n\n`;  
        }
        if (txt) {
            responseText += `TXT=${txt}\n\n`;  
        }
        if (domainUpdateOccurred) {
            responseText += `UPDATED\n`;
        } else if (domainNoChangeOccurred) {
            responseText += `NOCHANGE\n`;
        }
    }

    return new Response(responseText.trim(), {
        status: 200,
        headers: { 'Content-Type': 'text/plain' }
    });
};