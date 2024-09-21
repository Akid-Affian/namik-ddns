import type { APIRoute } from 'astro';
import { db } from '@lib/database/db';
import { verifySession } from '@lib/verifySession';
import { getCookieValue } from '@lib/utils/cookies';
import { cacheManager } from '@lib/utils/cacheManager';
import { addAdditionalDNSRecords } from '@lib/additionalBaseDomains/dnsrecord';
import type { User } from '../../../../types/User';
import type { AdditionalDomainRow } from '../../../../types/AdditionalDomainRow';

function isSubdomainOf(domain: string, baseDomain: string): boolean {
  return domain === baseDomain || domain.endsWith(`.${baseDomain}`);
}

// Domain validation regex
const domainRegex = /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,}$/i;

export const POST: APIRoute = async ({ request }) => {
  const cookies = request.headers.get('cookie') || '';
  const authToken = getCookieValue(cookies, 'auth_token');

  if (!authToken) {
    console.error('No auth token provided');
    return new Response(JSON.stringify({ error: 'No auth token provided' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  if (!verifySession(authToken)) {
    console.error('Invalid or expired session');
    return new Response(JSON.stringify({ error: 'Invalid or expired session' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  const currentUserStmt = db.prepare("SELECT id, username, role FROM users WHERE auth_token = ?");
  const currentUser = currentUserStmt.get(authToken) as User | undefined;

  if (!currentUser || currentUser.role !== 'Super-Admin') {
    console.error('Only Super-Admin can add additional base domains');
    return new Response(JSON.stringify({ error: 'Unauthorized access' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  const formData = await request.formData();
  const domainName = formData.get('domain_name')?.toString()?.toLowerCase();
  const nameservers = formData.getAll('nameservers[]').map(ns => ns.toString().toLowerCase());

  // Validate domain name using the regex
  if (!domainName || !domainRegex.test(domainName)) {
    console.error('Invalid domain name');
    return new Response(JSON.stringify({ error: 'Invalid domain name' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  // Validate nameservers (at least one and max 6)
  if (nameservers.length === 0 || nameservers.length > 6) {
    console.error('You must provide at least one nameserver and no more than six');
    return new Response(JSON.stringify({ error: 'You must provide at least one nameserver and no more than six' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  // Ensure nameservers are not the same as the domain being added
  if (nameservers.includes(domainName)) {
    console.error('Nameservers cannot be the same as the domain being added');
    return new Response(JSON.stringify({ error: 'Nameservers cannot be the same as the domain being added' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  try {
    const baseDomainStmt = db.prepare('SELECT base_domain FROM app_config WHERE id = 1');
    const baseDomainRow = baseDomainStmt.get();
    const baseDomain = (baseDomainRow as { base_domain: string })?.base_domain?.toLowerCase();

    // Fetch all additional domains
    const additionalDomainsStmt = db.prepare('SELECT domain_name FROM additional_domains');
    const additionalDomains = (additionalDomainsStmt.all() as AdditionalDomainRow[]).map((row: AdditionalDomainRow) => row.domain_name.toLowerCase());

    // Check against base domain
    if (baseDomain && isSubdomainOf(domainName, baseDomain)) {
      console.error(`Domain ${domainName} is a subdomain of base domain ${baseDomain}`);
      return new Response(JSON.stringify({ error: `Domain ${domainName} is a subdomain of the base domain ${baseDomain}` }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Check against existing additional domains
    for (const existingDomain of additionalDomains) {
      if (isSubdomainOf(domainName, existingDomain)) {
        console.error(`Domain ${domainName} is a subdomain of existing additional domain ${existingDomain}`);
        return new Response(JSON.stringify({ error: `Domain ${domainName} is a subdomain of the existing additional domain ${existingDomain}` }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }
    }

    const now = Date.now();

    // Begin transaction for adding domain and logs
    db.transaction(() => {
      const insertDomainStmt = db.prepare(`
        INSERT INTO additional_domains (domain_name, nameservers, created_at, updated_at)
        VALUES (?, ?, ?, ?)
      `);
      const info = insertDomainStmt.run(
        domainName,
        JSON.stringify(nameservers), // Store nameservers as a JSON array
        now,
        now
      );
      const additionalDomainId = info.lastInsertRowid; // Get the inserted domain's ID

      const logActionStmt = db.prepare(`
        INSERT INTO admin_logs (admin_username, action, target_username, details, timestamp)
        VALUES (?, ?, ?, ?, ?)
      `);
      logActionStmt.run(
        currentUser.username,
        'add-additional-base-domain',
        null,
        `Added additional domain: ${domainName} with nameservers: ${nameservers.join(', ')}`,
        now
      );

      cacheManager.invalidateAllCacheEntries('additionalDomains');
      cacheManager.invalidateAllCacheEntries('adminLogs');

      // After the domain is added, create DNS records using the reusable function
      addAdditionalDNSRecords({
        additionalBaseDomain: domainName,
        nameServers: nameservers,
        additionalDomainId: Number(additionalDomainId), // Pass the ID to the function
      });
    })();

    return new Response(JSON.stringify({ success: true, message: 'Additional base domain added successfully and DNS records created' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Error adding additional base domain:', error);

    // Check if the error is due to UNIQUE constraint violation
    if (error instanceof Error && (error as any).code === 'SQLITE_CONSTRAINT_UNIQUE') {
      return new Response(JSON.stringify({ error: 'This domain already exists' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
