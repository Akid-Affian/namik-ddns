import { db } from '@lib/database/db';

/**
 * Get a list of zones (base domains).
 * @returns {string[]} Array of zone names (base domains).
 */
export function getZones(): string[] {
    // Fetch the base domain from the app_config table
    const configStmt = db.prepare(`
        SELECT base_domain
        FROM app_config
        WHERE id = 1
    `);
    const config = configStmt.get() as { base_domain: string };

    if (!config) {
        throw new Error('Configuration not found.');
    }

    const { base_domain } = config;

    const additionalDomainsStmt = db.prepare(`
        SELECT domain_name
        FROM additional_domains
    `);
    const additionalDomains = additionalDomainsStmt.all() as Array<{ domain_name: string }>;

    const zones = [base_domain, ...additionalDomains.map(domain => domain.domain_name)];

    return zones;
}
