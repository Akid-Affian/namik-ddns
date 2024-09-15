import type { APIRoute } from 'astro';
import { db } from '../../../lib/database/db';
import { verifySession } from '../../../lib/verifySession';
import { getCookieValue } from '../../../lib/utils/cookies';
import { cacheManager } from '../../../lib/utils/cacheManager';
import type { User } from '../../../types/User';

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

  // Parse the request body to get the user ID to be deleted
  const formData = await request.formData();
  const userIdToDelete = formData.get("userId");
  if (!userIdToDelete || isNaN(Number(userIdToDelete))) {
    console.error('Invalid User ID');
    return new Response(JSON.stringify({ error: 'Invalid User ID' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  // Get the current user's details from the database using the auth token
  const currentUserStmt = db.prepare("SELECT id, username, role FROM users WHERE auth_token = ?");
  const currentUser = currentUserStmt.get(authToken) as User | undefined;

  if (!currentUser) {
    console.error('Current user not found');
    return new Response(JSON.stringify({ error: 'User not found' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  // Prevent the user from deleting their own account
  if (currentUser.id === Number(userIdToDelete)) {
    console.error('User cannot delete their own account');
    return new Response(JSON.stringify({ error: 'User cannot delete their own account' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  // Get the user details of the user to be deleted
  const userToDeleteStmt = db.prepare("SELECT id, username, role FROM users WHERE id = ?");
  const userToDelete = userToDeleteStmt.get(userIdToDelete) as User | undefined;

  if (!userToDelete) {
    console.error(`User to delete not found. User ID: ${userIdToDelete}`);
    return new Response(JSON.stringify({ error: 'User not found' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  // Role-based restrictions
  if (currentUser.role === 'User') {
    console.error('Standard users cannot delete any users');
    return new Response(JSON.stringify({ error: 'Standard users cannot delete any users' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  if (currentUser.role === 'Admin' && userToDelete.role !== 'User') {
    console.error('Admin cannot delete another Admin or Super-Admin');
    return new Response(JSON.stringify({ error: 'Admin cannot delete another Admin or Super-Admin' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  if (currentUser.role === 'Super-Admin' && userToDelete.role === 'Super-Admin') {
    console.error('Super-Admin cannot delete another Super-Admin');
    return new Response(JSON.stringify({ error: 'Super-Admin cannot delete another Super-Admin' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  // Begin transaction
  const deleteTransaction = db.transaction(() => {
    // Delete DNS records associated with the user's domains
    const deleteDnsRecordsStmt = db.prepare(`
      DELETE FROM dns_records 
      WHERE domain_id IN (
        SELECT id FROM domains WHERE user_id = ?
      )
    `);
    deleteDnsRecordsStmt.run(userToDelete.id);

    // Delete domains owned by the user
    const deleteDomainsStmt = db.prepare("DELETE FROM domains WHERE user_id = ?");
    deleteDomainsStmt.run(userToDelete.id);

    // Delete the user
    const deleteUserStmt = db.prepare("DELETE FROM users WHERE id = ?");
    deleteUserStmt.run(userToDelete.id);

    // Insert log entry into admin_logs table
    const logStmt = db.prepare(`
      INSERT INTO admin_logs (admin_username, action, target_username, timestamp)
      VALUES (?, ?, ?, ?)
    `);

    logStmt.run(
      currentUser.username,
      'delete-user',
      userToDelete.username,
      Date.now()
    );
  });

  try {
    // Execute the transaction
    deleteTransaction();

    // Invalidate all caches related to the deleted user
    cacheManager.invalidateAllUserCaches(userIdToDelete.toString());

    // Invalidate the adminLogs cache
    cacheManager.invalidateAllCacheEntries('adminLogs');
    cacheManager.invalidateAllCacheEntries('allUsers');

    return new Response(JSON.stringify({ success: true, message: 'User and associated data deleted successfully' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Error deleting user and associated data:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
