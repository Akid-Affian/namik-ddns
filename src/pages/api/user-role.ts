import type { APIRoute } from 'astro';
import db from '../../lib/db';
import { verifySession } from '../../lib/verifySession';
import { getCookieValue } from '../../lib/cookies';
import type { User } from '../../types/User';
import { cacheManager } from '../../lib/cacheManager';

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
    console.error('Invalid or expired session for auth token:', authToken);
    return new Response(JSON.stringify({ error: 'Invalid or expired session' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' }
    });
  }
  
  // Example of using a cache with a custom TTL of 5 minutes
  const userRoleCache = cacheManager.getCache('userRoles', 180); // TTL of 3 minutes

  // Check if the user role is cached
  const cachedRole = userRoleCache.get<string>(authToken);
  if (cachedRole) {
    return new Response(JSON.stringify({ role: cachedRole }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  const queryStmt = db.prepare(`
    SELECT id, role FROM users WHERE auth_token = ?
  `);

  const user = queryStmt.get(authToken) as User | undefined;

  if (!user) {
    console.error('User not found for auth token:', authToken);
    return new Response(JSON.stringify({ error: 'User not found' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  // Cache the user role for future requests
  userRoleCache.set(user.id.toString(), user.role);

  return new Response(JSON.stringify({ role: user.role }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  });
};
