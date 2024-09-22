import type { APIRoute } from 'astro';
import { db } from '@lib/database/db';
import { verifySession } from '@lib/verifySession';
import { getCookieValue } from '@lib/utils/cookies';
import { cacheManager } from '@lib/utils/cacheManager';
import type { User } from '../../../../types/User';

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
    console.error('Only Super-Admin can delete additional base domains');
    return new Response(JSON.stringify({ error: 'Unauthorized access' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  const formData = await request.formData();
  const domainName = formData.get('domain_name')?.toString()?.toLowerCase();

  if (!domainName) {
    console.error('No domain name provided');
    return new Response(JSON.stringify({ error: 'No domain name provided' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  try {
    // Check if the delete base domain feature is enabled
    const configStmt = db.prepare('SELECT delete_base_domain_enabled FROM app_config WHERE id = 1');
    const config = configStmt.get() as { delete_base_domain_enabled: number };

    if (!config || config.delete_base_domain_enabled !== 1) {
      console.error('Delete base domain feature is disabled');
      return new Response(JSON.stringify({ error: 'Delete base domain feature is disabled' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const baseDomainStmt = db.prepare('SELECT id, domain_name FROM additional_domains WHERE domain_name = ?');
    const domainRow = baseDomainStmt.get(domainName) as { id: number, domain_name: string } | undefined;

    if (!domainRow) {
      console.error(`Domain ${domainName} not found`);
      return new Response(JSON.stringify({ error: `Domain ${domainName} not found` }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const additionalDomainId = domainRow.id;

    // Fetch DNS records related to this domain and subdomains
    const dnsRecordsStmt = db.prepare(`
      SELECT id, domain_id, record_type, content, additional_domain_id
      FROM dns_records
      WHERE additional_domain_id = ? OR content LIKE ?
    `);
    const dnsRecords = dnsRecordsStmt.all(additionalDomainId, `%.${domainName}`);

    // Fetch domains related to the base domain and its subdomains
    const subdomainsStmt = db.prepare(`
      SELECT id, domain_name FROM domains WHERE domain_name LIKE ?
    `);
    const subdomains = subdomainsStmt.all(`%.${domainName}`);

    // Begin transaction for deleting domain and logs
    db.transaction(() => {
      // Delete DNS records for the additional domain and subdomains
      const deleteDnsRecordsStmt = db.prepare(`
        DELETE FROM dns_records WHERE additional_domain_id = ? OR content LIKE ?
      `);
      deleteDnsRecordsStmt.run(additionalDomainId, `%.${domainName}`);

      // Delete the additional domain itself
      const deleteDomainStmt = db.prepare(`
        DELETE FROM additional_domains WHERE id = ?
      `);
      deleteDomainStmt.run(additionalDomainId);

      // Delete related domains from the "domains" table (e.g., aaa.newbase.com)
      const deleteSubdomainsStmt = db.prepare(`
        DELETE FROM domains WHERE domain_name LIKE ?
      `);
      deleteSubdomainsStmt.run(`%.${domainName}`);

      // Log the deletion
      const logActionStmt = db.prepare(`
        INSERT INTO admin_logs (admin_username, action, target_username, details, timestamp)
        VALUES (?, ?, ?, ?, ?)
      `);
      logActionStmt.run(
        currentUser.username,
        'delete-additional-base-domain',
        null,
        `Deleted additional domain: ${domainName}, associated DNS records, and related subdomains`,
        Date.now()
      );

      cacheManager.invalidateAllCacheEntries('allUsers');
      cacheManager.invalidateAllCacheEntries('dnsRecords');
      cacheManager.invalidateAllCacheEntries('adminLogs');
      cacheManager.invalidateAllCacheEntries('userDomains');
    })();

    return new Response(JSON.stringify({ success: true, message: 'Additional base domain, associated DNS records, and related subdomains deleted successfully' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Error deleting additional base domain:', error);

    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
