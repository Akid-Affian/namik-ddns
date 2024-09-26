import { db } from '@lib/database/db';
import { getZones } from '@lib/utils/getZones';
import ipaddr from 'ipaddr.js';

interface DNSRecord {
    id?: number;
    record_type: 'A' | 'AAAA' | 'ALIAS' | 'CNAME' | 'MX' | 'NS' | 'TXT';
    ttl: number;
    content: string;
}

const domainRegex = /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z0-9][a-z0-9-]{0,61}[a-z0-9]$/;

function validateRecordContent(content: string, type: string): boolean {
    switch (type) {
        case 'A':
            return ipaddr.IPv4.isValid(content);
        case 'AAAA':
            return ipaddr.IPv6.isValid(content);
        case 'CNAME':
        case 'ALIAS':
        case 'NS':
            return domainRegex.test(content);
        case 'MX':
            const [priority, domain] = content.split(/\s+/);
            return /^\d+$/.test(priority) && domainRegex.test(domain);
        case 'TXT':
            return true;
        default:
            return false;
    }
}

function getAdditionalDomainId(zone: string): number | null {
    const baseDomainStmt = db.prepare(`
        SELECT base_domain
        FROM app_config
        WHERE id = 1
    `);
    const baseDomainRow = baseDomainStmt.get() as { base_domain: string } | undefined;

    if (!baseDomainRow) {
        throw new Error('Base domain configuration not found.');
    }

    if (zone === baseDomainRow.base_domain) {
        return null;
    }

    const additionalDomainStmt = db.prepare(`
        SELECT id
        FROM additional_domains
        WHERE domain_name = ?
    `);
    const additionalDomainRow = additionalDomainStmt.get(zone) as { id: number } | undefined;

    if (!additionalDomainRow) {
        throw new Error(`Additional domain '${zone}' not found.`);
    }

    return additionalDomainRow.id;
}

export function addAdvancedDnsRecord(zone: string, name: string, record: DNSRecord): boolean {
    try {
        const availableZones = getZones();
        if (!availableZones.includes(zone)) {
            throw new Error('Zone not available.');
        }

        const additionalDomainId = getAdditionalDomainId(zone);

        const subdomainLevels = name === '@' ? [] : name.split('.');
        if (subdomainLevels.length > 10) {
            throw new Error('Subdomain cannot exceed 10 levels.');
        }

        if (name === '@' && record.record_type === 'NS') {
            throw new Error('NS records cannot be added to the root domain.');
        }

        const contents = record.record_type === 'TXT' 
    ? [record.content.trim()]
    : record.content.split(',').map(content => content.trim());

        if (['CNAME', 'ALIAS', 'TXT'].includes(record.record_type) && contents.length > 1) {
            throw new Error(`${record.record_type} record type does not support multiple values.`);
        }

        const timestamp = Date.now();

        // Determine the full domain name
        const fullDomainName = name === '@' ? zone : `${name}.${zone}`;

        // Fetch or insert the domain to get domainId
        let domainId: number | null = null;
        if (name !== '@') {
            const domainStmt = db.prepare('SELECT id FROM domains WHERE domain_name = ?');
            const domainRow = domainStmt.get(fullDomainName) as { id: number } | undefined;

            if (domainRow) {
                domainId = domainRow.id;
            } else {
                const insertDomainStmt = db.prepare(`
                    INSERT INTO domains (domain_name, is_advanced_record, created_at, updated_at) 
                    VALUES (?, 1, ?, ?)
                `);
                const result = insertDomainStmt.run(fullDomainName, timestamp, timestamp);
                domainId = result.lastInsertRowid as number;
            }
        }

        // Replace existing records of the same type for the domain
        const deleteStmt = db.prepare(`
            DELETE FROM dns_records
            WHERE domain_id ${name === '@' ? 'IS NULL' : '= ?'}
            AND record_type = ?
        `);
        if (name === '@') {
            deleteStmt.run(record.record_type);
        } else {
            deleteStmt.run(domainId, record.record_type);
        }

        for (const content of contents) {
            if (!validateRecordContent(content, record.record_type)) {
                throw new Error(`Invalid content '${content}' for record type ${record.record_type}.`);
            }

            const insertRecordStmt = db.prepare(`
                INSERT INTO dns_records (domain_id, additional_domain_id, record_type, ttl, content, is_advanced_record, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, 1, ?, ?)
            `);
            insertRecordStmt.run(
                domainId,
                additionalDomainId,
                record.record_type,
                record.ttl,
                content,
                timestamp,
                timestamp
            );
        }

        return true;
    } catch (error) {
        console.error('Error adding advanced DNS record:', error);
        return false;
    }
}
