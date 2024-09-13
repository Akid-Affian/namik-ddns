import type { APIRoute } from 'astro';
import db from '../../lib/db';
import { verifySession } from '../../lib/verifySession';
import { getCookieValue } from '../../lib/cookies';
import { cacheManager } from '../../lib/cacheManager';
import type { User } from '../../types/User';

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
    console.error('Only Super-Admin can access app config');
    return new Response(JSON.stringify({ error: 'Unauthorized access' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  const appConfigStmt = db.prepare("SELECT enable_web_registration, auth_token_max_age FROM app_config WHERE id = 1");
  const appConfig = appConfigStmt.get();

  return new Response(JSON.stringify({ success: true, config: appConfig }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  });
};

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

  const formData = await request.formData();
  const enableWebRegistration = formData.get("enable_web_registration");
  const authTokenMaxAge = formData.get("auth_token_max_age");

  if (enableWebRegistration !== '1' && enableWebRegistration !== '0') {
    console.error('Invalid enable_web_registration value');
    return new Response(JSON.stringify({ error: 'Invalid enable_web_registration value' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  if (isNaN(Number(authTokenMaxAge)) || Number(authTokenMaxAge) < 5 || Number(authTokenMaxAge) > 60) {
    console.error('Invalid auth_token_max_age value');
    return new Response(JSON.stringify({ error: 'Invalid auth_token_max_age value. Must be between 5 and 60 minutes.' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  const currentUserStmt = db.prepare("SELECT id, username, role FROM users WHERE auth_token = ?");
  const currentUser = currentUserStmt.get(authToken) as User | undefined;

  if (!currentUser || currentUser.role !== 'Super-Admin') {
    console.error('Only Super-Admin can modify app config');
    return new Response(JSON.stringify({ error: 'Unauthorized access' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  try {
    db.transaction(() => {
      const updateConfigStmt = db.prepare(`
        UPDATE app_config 
        SET enable_web_registration = ?, auth_token_max_age = ?, updated_at = ?
        WHERE id = 1
      `);
      updateConfigStmt.run(enableWebRegistration, authTokenMaxAge, Date.now());

      // Translate the values for logging
      const enableWebRegistrationText = enableWebRegistration === '1' ? 'Web registration enabled' : 'Web registration disabled';
      const authTokenMaxAgeText = `Auth token lifespan set to ${authTokenMaxAge} minutes`;

    // Log the action in the admin_logs table
    const logActionStmt = db.prepare(`
  INSERT INTO admin_logs (admin_username, action, target_username, details, timestamp) 
  VALUES (?, ?, ?, ?, ?)
`);
logActionStmt.run(
  currentUser.username,
  'modify-app-config',
  null,
  `${enableWebRegistrationText}, ${authTokenMaxAgeText}`,
  Date.now()
);



      cacheManager.invalidateAllCacheEntries('appConfig');
      cacheManager.invalidateAllCacheEntries('adminLogs');
    })();

    return new Response(JSON.stringify({ success: true, message: 'App config updated successfully' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Error updating app config:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
