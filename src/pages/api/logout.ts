import type { APIRoute } from 'astro';
import db from '../../lib/db';
import { cacheManager } from '../../lib/cacheManager';

export const POST: APIRoute = async ({ request }) => {
  const cookies = request.headers.get('cookie');
  const authToken = cookies?.split(';').find(cookie => cookie.trim().startsWith('auth_token='))?.split('=')[1];

  if (authToken) {
    // Fetch the user ID before invalidating the token
    const userStmt = db.prepare(`SELECT id FROM users WHERE auth_token = ?`);
    const user = userStmt.get(authToken) as { id: number } | undefined;

    // Invalidate the auth token
    const stmt = db.prepare(`
      UPDATE users
      SET auth_token = NULL
      WHERE auth_token = ?
    `);
    const info = stmt.run(authToken);

    if (user) {
      // Invalidate all caches related to this user ID
      cacheManager.invalidateAllUserCaches(user.id.toString());
    }

    // Clear the cookies
    const headers = new Headers();
    headers.append('Set-Cookie', 'auth_token=; HttpOnly; Secure; Path=/; Max-Age=0; SameSite=Strict');
    headers.append('Set-Cookie', 'frontend_session=; Path=/; Secure; Max-Age=0; SameSite=Strict');

    if (info.changes > 0) {
      return new Response(null, {
        status: 200,
        headers
      });
    } else {
      return new Response(JSON.stringify({ message: 'Invalid session token' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...Object.fromEntries(headers) }
      });
    }
  } else {
    // Clear the cookies even if no auth token was provided
    const headers = new Headers();
    headers.append('Set-Cookie', 'auth_token=; HttpOnly; Secure; Path=/; Max-Age=0; SameSite=Strict');
    headers.append('Set-Cookie', 'frontend_session=; Path=/; Secure; Max-Age=0; SameSite=Strict');

    return new Response(JSON.stringify({ message: 'No session token provided' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json', ...Object.fromEntries(headers) }
    });
  }
};
