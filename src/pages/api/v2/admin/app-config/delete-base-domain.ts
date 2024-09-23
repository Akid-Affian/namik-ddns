import type { APIRoute } from 'astro';
import { db } from '@lib/database/db';
import { verifySession } from '@lib/verifySession';
import { getCookieValue } from '@lib/utils/cookies';
import { verifyPassword } from '@lib/auth';
import type { User } from '../../../../../types/User';
import type { AppConfig } from '../../../../../types/AppConfig';
import { cacheManager } from '@lib/utils/cacheManager';

const CACHE_NAME = 'deleteBaseDomainConfig';
const CACHE_TTL = 3600; // 60 minutes

export const GET: APIRoute = async ({ request }) => {
  const cookies = request.headers.get('cookie') || '';
  const authToken = getCookieValue(cookies, 'auth_token');

  if (!authToken) {
    return new Response(JSON.stringify({ error: 'No auth token provided' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  if (!verifySession(authToken)) {
    return new Response(JSON.stringify({ error: 'Invalid or expired session' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const currentUserStmt = db.prepare("SELECT id, role FROM users WHERE auth_token = ?");
  const currentUser = currentUserStmt.get(authToken) as User | undefined;

  if (!currentUser) {
    return new Response(JSON.stringify({ error: 'User not found' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  if (currentUser.role !== 'Super-Admin') {
    return new Response(JSON.stringify({ error: 'Permission denied' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Check if the value is in cache
  const cachedValue = cacheManager.getCache(CACHE_NAME).get('enabled');
  if (cachedValue !== undefined) {
    return new Response(JSON.stringify({ enabled: cachedValue }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // If not cached, fetch from the database
  const configStmt = db.prepare(`SELECT delete_base_domain_enabled FROM app_config WHERE id = 1`);
  const config = configStmt.get() as AppConfig | undefined;

  if (!config) {
    return new Response(JSON.stringify({ error: 'Configuration not found' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Cache the value
  cacheManager.getCache(CACHE_NAME, CACHE_TTL).set('enabled', config.delete_base_domain_enabled === 1);

  return new Response(JSON.stringify({ enabled: config.delete_base_domain_enabled === 1 }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
};

export const POST: APIRoute = async ({ request }) => {
  const cookies = request.headers.get('cookie') || '';
  const authToken = getCookieValue(cookies, 'auth_token');

  if (!authToken) {
    return new Response(JSON.stringify({ error: 'No auth token provided' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  if (!verifySession(authToken)) {
    return new Response(JSON.stringify({ error: 'Invalid or expired session' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const currentUserStmt = db.prepare("SELECT id, role, password FROM users WHERE auth_token = ?");
  const currentUser = currentUserStmt.get(authToken) as User | undefined;

  if (!currentUser) {
    return new Response(JSON.stringify({ error: 'User not found' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  if (currentUser.role !== 'Super-Admin') {
    return new Response(JSON.stringify({ error: 'Permission denied' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const { password, enable } = await request.json();

  // Verify the provided password
  const passwordValid = await verifyPassword(password, currentUser.password);
  if (!passwordValid) {
    return new Response(JSON.stringify({ error: 'Invalid password' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Update the delete_base_domain_enabled status
  const newStatus = enable ? 1 : 0;
  db.prepare(`UPDATE app_config SET delete_base_domain_enabled = ? WHERE id = 1`).run(newStatus);

  // Invalidate the cache since the value has changed
  cacheManager.invalidateAllCacheEntries(CACHE_NAME);

  return new Response(JSON.stringify({ success: true, message: `Delete base domain feature ${enable ? 'enabled' : 'disabled'}` }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
};
