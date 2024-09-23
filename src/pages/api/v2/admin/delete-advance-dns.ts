import type { APIRoute } from 'astro';
import { db } from '@lib/database/db';
import { verifySession } from '@lib/verifySession';
import { getCookieValue } from '@lib/utils/cookies';
import { cacheManager } from '@lib/utils/cacheManager';
import type { User } from '../../../../types/User';
import { cleanUpUnusedAdvancedDomains } from '@lib/utils/cleanUpUnusedAdvancedDomains';

export const POST: APIRoute = async ({ request }) => {
  const cookies = request.headers.get('cookie') || '';
  const authToken = getCookieValue(cookies, 'auth_token');

  if (!authToken) {
    console.error('No auth token provided');
    return new Response(JSON.stringify({ error: 'No auth token provided' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  if (!verifySession(authToken)) {
    console.error('Invalid or expired session');
    return new Response(JSON.stringify({ error: 'Invalid or expired session' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const currentUserStmt = db.prepare(
    'SELECT id, username, role FROM users WHERE auth_token = ?'
  );
  const currentUser = currentUserStmt.get(authToken) as User | undefined;

  if (!currentUser || currentUser.role !== 'Super-Admin') {
    console.error('Only Super-Admin can delete advanced DNS records');
    return new Response(JSON.stringify({ error: 'Unauthorized access' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const body = await request.json();
    const { zone, name, type, ttl } = body;

    if (!zone || !name || !type || !ttl) {
      console.error('Missing required parameters');
      return new Response(JSON.stringify({ error: 'Missing required parameters' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    let domainId: number | null = null;
    let additionalDomainId: number | null = null;

    if (name === '@') {
      // Handle root domain records
      // Fetch the base domain from app_config
      const baseDomainStmt = db.prepare('SELECT base_domain FROM app_config WHERE id = 1');
      const baseDomainRow = baseDomainStmt.get();

      if (baseDomainRow && (baseDomainRow as { base_domain: string }).base_domain === zone) {
        // It's the base domain
        additionalDomainId = null; // For base domain, additional_domain_id is NULL
      } else {
        // Check additional domains
        const additionalDomainStmt = db.prepare('SELECT id FROM additional_domains WHERE domain_name = ?');
        const additionalDomainRow = additionalDomainStmt.get(zone) as { id: number } | undefined;

        if (additionalDomainRow) {
          additionalDomainId = additionalDomainRow.id;
        } else {
          console.error('Zone not found');
          return new Response(JSON.stringify({ error: 'Zone not found' }), {
            status: 404,
            headers: { 'Content-Type': 'application/json' },
          });
        }
      }
    } else {
      // Handle subdomain records
      const fullDomainName = `${name}.${zone}`;
      const domainStmt = db.prepare('SELECT id FROM domains WHERE domain_name = ? AND is_advanced_record = 1');
      const domainRow = domainStmt.get(fullDomainName) as { id: number } | undefined;

      if (domainRow) {
        domainId = domainRow.id;
      } else {
        console.error('Subdomain not found');
        return new Response(JSON.stringify({ error: 'Subdomain not found' }), {
          status: 404,
          headers: { 'Content-Type': 'application/json' },
        });
      }
    }

    // Build the DELETE query
    let deleteQuery = `
      DELETE FROM dns_records
      WHERE is_advanced_record = 1
        AND record_type = ?
        AND ttl = ?
    `;

    const params = [type, ttl];

    if (domainId) {
      deleteQuery += ' AND domain_id = ?';
      params.push(domainId);
    } else if (additionalDomainId !== null) {
      deleteQuery += ' AND additional_domain_id = ?';
      params.push(additionalDomainId);
    } else {
      deleteQuery += ' AND additional_domain_id IS NULL';
    }

    const deleteStmt = db.prepare(deleteQuery);
    const result = deleteStmt.run(...params);

    if (result.changes > 0) {
      // Invalidate cache
      cacheManager.invalidateAllCacheEntries('dnsRecords');
      cacheManager.invalidateAllCacheEntries('advancednsRecords');
      cacheManager.invalidateAllCacheEntries('unusedAdvancedDomains');

      // Log the deletion
      const logActionStmt = db.prepare(`
        INSERT INTO admin_logs (admin_username, action, target_username, details, timestamp)
        VALUES (?, ?, ?, ?, ?)
      `);
      logActionStmt.run(
        currentUser.username,
        'delete-advance-dns-record',
        null,
        `Deleted advanced DNS records for zone: ${zone}, name: ${name}, type: ${type}, ttl: ${ttl}`,
        Date.now()
      );

      // Call the cleaner function
      cleanUpUnusedAdvancedDomains();

      return new Response(
        JSON.stringify({ success: true, message: 'DNS record(s) deleted successfully' }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    } else {
      return new Response(JSON.stringify({ error: 'No matching DNS records found to delete' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }
  } catch (error) {
    console.error('Error deleting advanced DNS records:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
