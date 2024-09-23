import { db } from '@lib/database/db';
import { cacheManager } from 'src/lib/utils/cacheManager';

export function cleanUpUnusedAdvancedDomains(): void {
    const cacheName = 'unusedAdvancedDomains';
    const ttl = 120; 

    try {

        db.transaction(() => {

            let domains = cacheManager.getCache(cacheName, ttl).get('domains') as Array<{ id: number; domain_name: string }> | undefined;

            if (!domains) {

                domains = db.prepare(`
                    SELECT id, domain_name
                    FROM domains
                    WHERE user_id IS NULL AND is_advanced_record = 1
                `).all() as Array<{ id: number; domain_name: string }>;

                cacheManager.getCache(cacheName, ttl).set('domains', domains);
            }

            for (const domain of domains) {

                const dnsCacheKey = `dnsRecordCount_${domain.id}`;
                let dnsRecordCount = cacheManager.getCache(cacheName, ttl).get(dnsCacheKey) as { count: number } | undefined;

                if (!dnsRecordCount) {

                    dnsRecordCount = db.prepare(`
                        SELECT COUNT(*) as count
                        FROM dns_records
                        WHERE domain_id = ?
                    `).get(domain.id) as { count: number };

                    cacheManager.getCache(cacheName, ttl).set(dnsCacheKey, dnsRecordCount);
                }

                if (dnsRecordCount.count === 0) {

                    db.prepare(`
                        DELETE FROM domains
                        WHERE id = ?
                    `).run(domain.id);

                    console.log(`Deleted unused advanced domain: ${domain.domain_name} (id: ${domain.id})`);

                    cacheManager.getCache(cacheName, ttl).del('domains');
                    cacheManager.getCache(cacheName, ttl).del(dnsCacheKey);
                }
            }
        })();
    } catch (error) {
        console.error('Error cleaning up unused advanced domains:', error);
    }
}