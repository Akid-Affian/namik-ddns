
import type { APIRoute } from 'astro';
import { getAdvancedDnsRecordsByZone } from '@lib/utils/advanceDnsRecords';
import { getCookieValue } from '@lib/utils/cookies';
import { verifySession } from '@lib/verifySession';
import { db } from '@lib/database/db';
import { cacheManager } from '@lib/utils/cacheManager';
import type { User } from '../../../../types/User';

export const GET: APIRoute = async ({ request }) => {
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
    console.error('Only Super-Admin can access advanced DNS records');
    return new Response(JSON.stringify({ error: 'Unauthorized access' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  try {
    const url = new URL(request.url);
    const zone = url.searchParams.get('zone')?.toLowerCase();

    if (!zone) {
      return new Response(JSON.stringify({ success: false, error: 'No zone provided' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const cache = cacheManager.getCache('advancednsRecords', 120);

    let dnsRecordsWithNames: Array<{ name: string; record: any }> | undefined = cache.get(zone);

    if (!dnsRecordsWithNames) {
      dnsRecordsWithNames = getAdvancedDnsRecordsByZone(zone);
      cache.set(zone, dnsRecordsWithNames);
    }

    const groupedDnsRecords = Object.values(
      dnsRecordsWithNames.reduce((acc: any, curr: any) => {
        const key = `${curr.name}-${curr.record.record_type}`;
        if (!acc[key]) {
          acc[key] = {
            name: curr.name,
            record_type: curr.record.record_type,
            contents: [curr.record.content],
            ttl: curr.record.ttl,
            ids: [curr.record.id],
          };
        } else {
          acc[key].contents.push(curr.record.content);
          acc[key].ids.push(curr.record.id);
        }
        return acc;
      }, {})
    );

    return new Response(
      JSON.stringify({ success: true, dnsRecords: groupedDnsRecords }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error fetching or processing DNS records:', error);
    return new Response(
      JSON.stringify({ success: false, error: 'Internal Server Error' }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
};
