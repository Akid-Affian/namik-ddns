import type { APIRoute } from 'astro';
import { db } from '@lib/database/db';
import { verifySession } from '@lib/verifySession';
import { getCookieValue } from '@lib/utils/cookies';
import { cacheManager } from '@lib/utils/cacheManager';
import type { User } from '../../../../types/User';
import { addAdvancedDnsRecord } from '@lib/utils/addAdvancedDnsRecord';

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
    console.error('Only Super-Admin can add advanced DNS records');
    return new Response(JSON.stringify({ error: 'Unauthorized access' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const body = await request.json();
    const { zone, name, record_type, ttl, content } = body;

    if (!zone || !name || !record_type || !ttl || !content) {
      console.error('Missing required parameters');
      return new Response(JSON.stringify({ error: 'Missing required parameters' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const recordAdded = addAdvancedDnsRecord(zone, name, { record_type, ttl, content });

    if (!recordAdded) {
      console.error('Failed to add DNS record');
      return new Response(JSON.stringify({ error: 'Failed to add DNS record' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    cacheManager.invalidateAllCacheEntries('dnsRecords');
    cacheManager.invalidateAllCacheEntries('advancednsRecords');

    const logActionStmt = db.prepare(`
      INSERT INTO admin_logs (admin_username, action, target_username, details, timestamp)
      VALUES (?, ?, ?, ?, ?)
    `);
    logActionStmt.run(
      currentUser.username,
      'add-advance-dns-record',
      null,
      `Added advanced DNS record for zone: ${zone}, name: ${name}, type: ${record_type}, ttl: ${ttl}, content: ${content}`,
      Date.now()
    );

    return new Response(JSON.stringify({ success: true, message: 'DNS record added successfully' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error adding DNS record:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
