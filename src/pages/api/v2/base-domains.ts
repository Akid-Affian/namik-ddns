import type { APIRoute } from 'astro';
import { db } from '@lib/database/db';
import { verifySession } from '@lib/verifySession';
import { getCookieValue } from '@lib/utils/cookies';
import type { User } from '../../../types/User';
import type { AppConfig } from '../../../types/AppConfig';
import type { DNSRecord } from '../../../types/DNSRecord';

export const GET: APIRoute = async ({ request }) => {
  const cookies = request.headers.get('cookie') || '';
  const authToken = getCookieValue(cookies, 'auth_token');

  if (!authToken) {
    return new Response(JSON.stringify({ error: 'No auth token provided' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  if (!verifySession(authToken)) {
    return new Response(JSON.stringify({ error: 'Invalid or expired session' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  const currentUserStmt = db.prepare("SELECT id, role FROM users WHERE auth_token = ?");
  const currentUser = currentUserStmt.get(authToken) as User | undefined;

  if (!currentUser) {
    return new Response(JSON.stringify({ error: 'User not found' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  if (currentUser.role !== 'Super-Admin') {
    return new Response(JSON.stringify({ error: 'Permission denied' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  // Query the base domain from the app_config table
  const configStmt = db.prepare(`
    SELECT base_domain
    FROM app_config
    WHERE id = 1
  `);
  const config = configStmt.get() as AppConfig | undefined;

  if (!config) {
    return new Response(JSON.stringify({ error: 'Configuration not found' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  const { base_domain } = config;

  // Query nameservers for the base domain from the dns_records table 
  // (where domain_id is NULL, record_type is NS, and is_additional_domain = 0)
  const baseDomainNameserversStmt = db.prepare(`
    SELECT content
    FROM dns_records
    WHERE domain_id IS NULL AND record_type = 'NS' AND is_additional_domain = 0
  `);
  const baseDomainNameservers = baseDomainNameserversStmt.all() as DNSRecord[];

  // Extract the content (nameservers) from the DNS records
  const baseNameservers = baseDomainNameservers.map(record => record.content);

  // Query all additional base domains from the additional_domains table, including created_at and registration_count
  const additionalDomainsStmt = db.prepare(`
    SELECT domain_name, nameservers, created_at, registration_count
    FROM additional_domains
  `);
  const additionalDomains = additionalDomainsStmt.all() as Array<{ domain_name: string, nameservers: string, created_at: number, registration_count: number }> | undefined;

  // Parse the nameservers from the JSON stored in the additional_domains table
  const additionalBaseDomains = additionalDomains?.map(domain => ({
    domain: domain.domain_name,
    nameservers: JSON.parse(domain.nameservers),
    createdAt: domain.created_at, // Return raw UNIX timestamp from database
    registrationCount: domain.registration_count
  })) || [];

  // Construct response data with unique nameservers
  const responseData = {
    baseDomain: {
      domain: base_domain,
      nameservers: Array.from(new Set(baseNameservers)), // Ensure nameservers are unique
      createdAt: 'N/A', // No created_at for the base domain
      registrationCount: 'N/A' // Registration count is not tracked for base domain
    },
    additionalBaseDomains
  };

  return new Response(JSON.stringify(responseData), {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  });
};
