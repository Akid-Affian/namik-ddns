import { db } from '@lib/database/db';

type AddAdditionalDNSRecordsOptions = {
  additionalBaseDomain: string;
  nameServers: string[];
  additionalDomainId: number;
};

export async function addAdditionalDNSRecords({
  additionalBaseDomain,
  nameServers,
  additionalDomainId,
}: AddAdditionalDNSRecordsOptions): Promise<void> {
  const now = Date.now();

  const insertDnsRecordStmt = db.prepare(`
    INSERT INTO dns_records (domain_id, record_type, content, ttl, created_at, updated_at, is_additional_domain, additional_domain_id)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const systemOwnedDomains: string[] = [];

  for (const ns of nameServers) {
    if (ns.endsWith(`.${additionalBaseDomain}`)) {
      systemOwnedDomains.push(ns); // Mark as system-owned if it's a subdomain
    }

    // Inserting NS record with `is_additional_domain = 1`
    insertDnsRecordStmt.run(null, 'NS', ns, 60, now, now, 1, additionalDomainId);
  }

  // Inserting ALIAS record with `is_additional_domain = 1`
  insertDnsRecordStmt.run(null, 'ALIAS', nameServers[0], 60, now, now, 1, additionalDomainId);

  const soaContent = `${additionalBaseDomain} hostmaster.${additionalBaseDomain} 1 3600 1800 1209600 3600`;
  
  // Inserting SOA record with `is_additional_domain = 1`
  insertDnsRecordStmt.run(null, 'SOA', soaContent, 3600, now, now, 1, additionalDomainId);

  const insertDomainStmt = db.prepare(`
    INSERT INTO domains (user_id, domain_name, created_at, updated_at)
    VALUES (?, ?, ?, ?)
  `);
  
  for (const systemDomain of systemOwnedDomains) {
    insertDomainStmt.run(null, systemDomain, now, now);
  }
}
