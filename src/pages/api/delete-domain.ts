import type { APIRoute } from 'astro';
import db from '../../lib/db';
import { verifySession } from '../../lib/verifySession';
import { getCookieValue } from '../../lib/cookies';
import { cacheManager } from "../../lib/cacheManager";
import type { User } from '../../types/User';
import type { Domain } from '../../types/Domain';

export const POST: APIRoute = async ({ request }) => {
  // Get cookies from the request
  const cookies = request.headers.get('cookie') || '';
  const authToken = getCookieValue(cookies, 'auth_token');

  // Check if authToken is provided
  if (!authToken) {
    console.error('No auth token provided');
    return new Response(JSON.stringify({ error: 'No auth token provided' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  // Verify session using the authToken
  if (!verifySession(authToken)) {
    console.error('Invalid or expired session');
    return new Response(JSON.stringify({ error: 'Invalid or expired session' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  // Parse the request body to get the domain ID to be deleted
  const formData = await request.formData();
  const domainId = formData.get("domainId");
  if (!domainId || isNaN(Number(domainId))) {
    console.error('Invalid Domain ID');
    return new Response(JSON.stringify({ error: 'Invalid Domain ID' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  // Get user ID from the database using the auth token
  const userStmt = db.prepare("SELECT id FROM users WHERE auth_token = ?");
  const user = userStmt.get(authToken) as User | undefined;

  if (!user) {
    console.error('User not found');
    return new Response(JSON.stringify({ error: 'User not found' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  // Check if the domain exists and belongs to the user
  const domainStmt = db.prepare("SELECT id FROM domains WHERE id = ? AND user_id = ?");
  const domain = domainStmt.get(domainId, user.id) as Domain | undefined;

  if (!domain) {
    console.error(`Domain not found or not owned by the user. Domain ID: ${domainId}, User ID: ${user.id}`);
    return new Response(JSON.stringify({ error: 'Domain not found or not owned by the user' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  // Begin transaction
  const deleteTransaction = db.transaction(() => {
    // Delete the associated DNS records
    const deleteDnsRecordsStmt = db.prepare("DELETE FROM dns_records WHERE domain_id = ?");
    deleteDnsRecordsStmt.run(domain.id);

    // Delete the domain itself
    const deleteDomainStmt = db.prepare("DELETE FROM domains WHERE id = ?");
    deleteDomainStmt.run(domain.id);
  });

  try {
    // Execute the transaction
    deleteTransaction();

    // Invalidate the cache for the user's domains
    console.log(`from delete-domain invalidate: ${user.id}`); // Log cache invalidation
    cacheManager.invalidateCache('userDomains', user.id.toString());

    return new Response(JSON.stringify({ success: true, message: 'Domain deleted successfully' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Error deleting domain and associated DNS records:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
