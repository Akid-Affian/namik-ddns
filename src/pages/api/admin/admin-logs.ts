import type { APIRoute } from 'astro';
import { db } from '../../../lib/database/db';
import { verifySession } from '../../../lib/verifySession';
import { getCookieValue } from '../../../lib/utils/cookies';
import { cacheManager } from '../../../lib/utils/cacheManager';
import type { User } from '../../../types/User';

export const POST: APIRoute = async ({ request }) => {
  const cookies = request.headers.get('cookie') || '';
  const authToken = getCookieValue(cookies, 'auth_token');

  // Parse JSON body instead of FormData
  let body: { page?: number };
  try {
    body = await request.json();
  } catch (error) {
    console.error('Failed to parse JSON body:', error);
    return new Response(JSON.stringify({ error: 'Invalid JSON' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  const page = body.page || 1;
  const logsPerPage = 10;

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

  if (!['Admin', 'Super-Admin'].includes(currentUser.role)) {
    return new Response(JSON.stringify({ error: 'Permission denied' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  // Use the cache manager to get the cache for admin logs with a TTL of 180 seconds
  const cache = cacheManager.getCache('adminLogs', 180);

  // Generate a cache key based on the page number
  const cacheKey = `page-${page}`;

  // Check if the logs for this page are already in the cache
  const cachedData = cache.get(cacheKey);
  if (cachedData) {
    console.log(`Cache hit for admin logs, page: ${page}`);
    return new Response(JSON.stringify(cachedData), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  console.log(`Cache miss for admin logs, page: ${page}`);

  const offset = (page - 1) * logsPerPage;

  const logsStmt = db.prepare(`
    SELECT admin_username, action, target_username, details, timestamp
    FROM admin_logs
    ORDER BY timestamp DESC
    LIMIT ? OFFSET ?
  `);

  const logs = logsStmt.all(logsPerPage, offset);

  const totalLogsStmt = db.prepare("SELECT COUNT(*) AS count FROM admin_logs");
  const totalLogs = (totalLogsStmt.get() as { count: number }).count;

  const responseData = {
    logs,
    pagination: {
      currentPage: page,
      logsPerPage,
      totalLogs,
      totalPages: Math.ceil(totalLogs / logsPerPage)
    }
  };

  // Cache the result for this page with the specified TTL
  cache.set(cacheKey, responseData);

  return new Response(JSON.stringify(responseData), {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  });
};
