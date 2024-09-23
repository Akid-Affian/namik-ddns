import { db } from '@lib/database/db';
import { getZones } from '@lib/utils/getZones';
import { cleanUpUnusedAdvancedDomains } from '@lib/utils/cleanUpUnusedAdvancedDomains';

interface DNSRecordWithDomain {
    id: number;
    domain_id: number | null;
    domain_name?: string;
    additional_domain_id: number | null;
    additional_domain_name?: string;
}

/**
 * Delete an advanced DNS record by ID for a given zone.
 * If no records remain for the domain, remove the domain as well.
 * @param {string} zone The base domain (zone).
 * @param {number} recordId The DNS record ID to delete.
 * @returns {boolean} Success status.
 */
export function deleteAdvancedDnsRecord(zone: string, recordId: number): boolean {
    try {
        // Verify if the zone is available
        const availableZones = getZones();
        if (!availableZones.includes(zone)) {
            throw new Error('Zone not available.');
        }

        const record = db.prepare(`
            SELECT dr.id, dr.domain_id, d.domain_name, dr.additional_domain_id, ad.domain_name as additional_domain_name
            FROM dns_records dr
            LEFT JOIN domains d ON dr.domain_id = d.id
            LEFT JOIN additional_domains ad ON dr.additional_domain_id = ad.id
            WHERE dr.id = ?
        `).get(recordId) as DNSRecordWithDomain | undefined;

        if (!record) {
            throw new Error('DNS record not found.');
        }

        const isRoot = record.additional_domain_name === zone;
        const isSubdomain = record.domain_name?.endsWith(`.${zone}`);

        // Ensure the record belongs to the zone
        if (!isRoot && !isSubdomain) {
            throw new Error('Record does not belong to the specified zone.');
        }

        // Start a transaction
        db.transaction(() => {
            // Delete the DNS record
            const deleteStmt = db.prepare('DELETE FROM dns_records WHERE id = ?');
            deleteStmt.run(recordId);

            // Check if there are any remaining DNS records for the domain
            if (record.domain_id) {
                const remainingRecords = db.prepare(`
                    SELECT COUNT(*) as count FROM dns_records WHERE domain_id = ?
                `).get(record.domain_id) as { count: number };

                if (remainingRecords.count === 0) {
                    // Delete the domain if no DNS records remain
                    const deleteDomainStmt = db.prepare('DELETE FROM domains WHERE id = ?');
                    deleteDomainStmt.run(record.domain_id);
                }
            }
            cleanUpUnusedAdvancedDomains();
        })();

        return true;
    } catch (error) {
        console.error('Error deleting DNS record:', error);
        return false;
    }
}
