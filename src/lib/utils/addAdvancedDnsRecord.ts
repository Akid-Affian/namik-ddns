import { db } from '@lib/database/db';
import { getZones } from '@lib/utils/getZones';

interface DomainRecord {
    id: number;
}

interface AdditionalDomain {
    id: number;
}

/**
 * Add a new advanced DNS record for a given zone.
 * @param {string} zone The base domain (zone).
 * @param {string} name The name of the record (either "@" for root or subdomain part).
 * @param {string} recordType The DNS record type (A, MX, CNAME, etc.).
 * @param {string} content The content of the DNS record.
 * @param {number} ttl The TTL value for the DNS record.
 * @returns {boolean} Success status.
 */
export function addAdvancedDnsRecord(zone: string, name: string, recordType: string, content: string, ttl: number): boolean {
    try {
        // Verify if the zone is available
        const availableZones = getZones();
        if (!availableZones.includes(zone)) {
            throw new Error('Zone not available.');
        }

        let domainId: number | null = null;
        let additionalDomainId: number | null = null;
        const isSubdomain = name !== '@';

        // Determine if it's root or subdomain
        if (isSubdomain) {
            // Fetch the domain_id for the subdomain
            const fullDomain = `${name}.${zone}`;
            const domainRecord = db.prepare('SELECT id FROM domains WHERE domain_name = ?').get(fullDomain) as DomainRecord | undefined;

            if (!domainRecord) {
                throw new Error('Subdomain not found.');
            }

            domainId = domainRecord.id;
        } else {
            // Fetch additional domain id for root zone
            const additionalDomain = db.prepare('SELECT id FROM additional_domains WHERE domain_name = ?').get(zone) as AdditionalDomain | undefined;

            if (!additionalDomain) {
                throw new Error('Root domain not found.');
            }

            additionalDomainId = additionalDomain.id;
        }

        // Insert the new DNS record
        const insertStmt = db.prepare(`
            INSERT INTO dns_records (domain_id, record_type, content, ttl, created_at, updated_at, is_advanced_record, additional_domain_id)
            VALUES (?, ?, ?, ?, ?, ?, 1, ?)
        `);
        const timestamp = Date.now();
        insertStmt.run(domainId, recordType, content, ttl, timestamp, timestamp, additionalDomainId);

        return true;
    } catch (error) {
        if (error instanceof Error) {
            console.error('Error adding DNS record:', error.message);
        } else {
            console.error('Unknown error adding DNS record:', error);
        }
        return false;
    }
}
