import type { APIRoute } from 'astro';
import { db } from '../../../lib/database/db';
import { verifySession } from '../../../lib/verifySession';
import { getCookieValue } from '../../../lib/utils/cookies';
import { getAppConfig } from '../../../lib/appConfig';
import { cacheManager } from "../../../lib/utils/cacheManager";
import type { User } from '../../../types/User';

const subdomainRegex = /^(?!-)[a-z0-9-]{1,63}(?<!-)$/;

export const POST: APIRoute = async ({ request }) => {
  
  const appConfig = getAppConfig();
  const defaultBaseDomain = appConfig.base_domain || '';

  // Get cookies from the request
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

  const formData = await request.formData();
  let subdomain = formData.get("subdomain") as string;
  let zone = formData.get("zone") as string | null; // Optional zone

  subdomain = subdomain.toLowerCase();

  if (!subdomain || !subdomainRegex.test(subdomain)) {
    return new Response(JSON.stringify({ error: 'Invalid subdomain format' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  let baseDomain = defaultBaseDomain;

  if (zone) {
    zone = zone.toLowerCase();
    const additionalDomainCheckStmt = db.prepare("SELECT domain_name FROM additional_domains WHERE domain_name = ?");
    const additionalDomain = additionalDomainCheckStmt.get(zone) as { domain_name: string } | undefined;

    if (!additionalDomain) {
      return new Response(JSON.stringify({ error: 'Invalid zone specified' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    baseDomain = additionalDomain.domain_name;
  }

  const fullDomain = `${subdomain}.${baseDomain}`.toLowerCase();

  const globalDomainCheckStmt = db.prepare("SELECT id FROM domains WHERE domain_name = ?");
  const existingGlobalDomain = globalDomainCheckStmt.get(fullDomain);

  if (existingGlobalDomain) {
    return new Response(JSON.stringify({ error: 'Domain already exists' }), {
      status: 409,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  // Retrieve the user by auth token
  const userStmt = db.prepare("SELECT id FROM users WHERE auth_token = ?");
  const user = userStmt.get(authToken) as User | undefined;

  if (!user) {
    return new Response(JSON.stringify({ error: 'User not found' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  const currentTime = Date.now();
  const insertDomainStmt = db.prepare(`
    INSERT INTO domains (user_id, domain_name, created_at, updated_at)
    VALUES (?, ?, ?, ?)
  `);

  try {
    insertDomainStmt.run(user.id, fullDomain, currentTime, currentTime);

    // Invalidate the cache for the user's domains
    cacheManager.invalidateCache('userDomains', user.id.toString());
    cacheManager.invalidateCache('allUsers', user.id.toString());

    return new Response(JSON.stringify({ success: true, message: 'Domain added successfully', domain: fullDomain }), {
      status: 201,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Error adding domain:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
