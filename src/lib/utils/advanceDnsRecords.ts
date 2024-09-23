import { db } from '@lib/database/db';
import { getZones } from '@lib/utils/getZones';
import type { DNSRecord } from '../../types/DNSRecord';

/**
 * Extracts the relative name for a DNS record based on the zone.
 * @param {string} fullDomainName The full domain name of the record.
 * @param {string} zone The base domain (zone).
 * @returns {string} The relative name (e.g., '@' or 'www').
 */
function extractRelativeName(fullDomainName: string, zone: string): string {
    if (fullDomainName.toLowerCase() === zone.toLowerCase()) {
        return '@';
    } else {
        return fullDomainName.replace(`.${zone}`, '');
    }
}

/**
 * Fetch advanced DNS records for a given domain (zone).
 * @param {string} zone The domain (zone) to search for.
 * @returns {Array<{ name: string, record: DNSRecord }>} Array of DNS records matching the domain.
 */
export function getAdvancedDnsRecordsByZone(zone: string): Array<{ name: string, record: DNSRecord }> {
    const zones = getZones().map(z => z.toLowerCase());

    if (!zones.includes(zone.toLowerCase())) {
        console.error(`Zone '${zone}' not found in configured zones.`);
        return [];
    }

    let advancedDnsRecords: Array<{ name: string, record: DNSRecord }> = [];

    const configStmt = db.prepare(`
        SELECT base_domain
        FROM app_config
        WHERE id = 1
    `);
    const config = configStmt.get() as { base_domain: string };

    if (!config) {
        throw new Error('Configuration not found.');
    }

    const baseDomain = config.base_domain.toLowerCase();

    if (zone.toLowerCase() === baseDomain) {
        const baseDomainRecords = db.prepare(`
            SELECT dr.*, dom.domain_name AS full_domain_name
            FROM dns_records dr
            LEFT JOIN domains dom ON dr.domain_id = dom.id
            WHERE dr.additional_domain_id IS NULL
            AND dr.is_advanced_record = 1
        `).all() as Array<DNSRecord & { full_domain_name: string | null }>;

        const baseDomainWithNames = baseDomainRecords.map(record => ({
            name: extractRelativeName(record.full_domain_name || baseDomain, zone),
            record
        }));

        advancedDnsRecords = baseDomainWithNames;
    } else {
        // Fetch the additional domain ID for the given zone
        const additionalDomainStmt = db.prepare(`
            SELECT id, domain_name
            FROM additional_domains
            WHERE domain_name = ?
        `);
        const additionalDomain = additionalDomainStmt.get(zone) as { id: number; domain_name: string } | undefined;

        if (!additionalDomain) {
            console.error(`Additional domain '${zone}' not found.`);
            return [];
        }

        const additionalDomainId = additionalDomain.id;

        const additionalDomainRecords = db.prepare(`
            SELECT dr.*, dom.domain_name AS full_domain_name, ad.domain_name AS zone_name
            FROM dns_records dr
            LEFT JOIN domains dom ON dr.domain_id = dom.id
            LEFT JOIN additional_domains ad ON dr.additional_domain_id = ad.id
            WHERE dr.additional_domain_id = ?
            AND dr.is_advanced_record = 1
        `).all(additionalDomainId) as Array<DNSRecord & { full_domain_name: string | null, zone_name: string }>;

        const additionalDomainWithNames = additionalDomainRecords.map(record => {
            const fullDomainName = record.full_domain_name || record.zone_name;
            const zoneName = record.zone_name;
            return {
                name: extractRelativeName(fullDomainName, zoneName),
                record
            };
        });

        advancedDnsRecords = additionalDomainWithNames;
    }

    return advancedDnsRecords;
}
