import type { APIRoute } from 'astro';
import { db } from '../../lib/database/db';
import { verifySession } from '../../lib/verifySession';
import { getCookieValue } from '../../lib/utils/cookies';
import { cacheManager } from '../../lib/utils/cacheManager';
import type { UserIdResult } from '../../types/UserIdResult';
import crypto from 'crypto';

export const POST: APIRoute = async ({ request }) => {
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

  // Generate new API key using randomUUID
  const newApiKey = crypto.randomUUID();
  const currentTime = Date.now();

  // Update the database with the new API key
  const updateStmt = db.prepare(`
    UPDATE users
    SET api_key = ?, api_key_created_at = ?
    WHERE auth_token = ?
  `);

  try {
    const result = updateStmt.run(newApiKey, currentTime, authToken);

    if (result.changes > 0) {
      // Retrieve the user ID based on the auth token
      const user = db.prepare("SELECT id FROM users WHERE auth_token = ?").get(authToken) as UserIdResult | undefined;

      if (user && user.id) {
        // Invalidate all caches for this user
        cacheManager.invalidateAllUserCaches(user.id.toString());
        console.log(`Cache invalidated for user ID: ${user.id}`);
      }

      return new Response(JSON.stringify({ apiKey: newApiKey }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    } else {
      return new Response(JSON.stringify({ error: 'Failed to update API key' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  } catch (error) {
    console.error('Error updating API key:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
