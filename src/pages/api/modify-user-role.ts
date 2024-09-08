import type { APIRoute } from 'astro';
import db from '../../lib/db';
import { verifySession } from '../../lib/verifySession';
import { getCookieValue } from '../../lib/cookies';
import { cacheManager } from '../../lib/cacheManager';
import type { User } from '../../types/User';

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
  const userIdToModify = formData.get("userId");
  const newRole = formData.get("role");

  if (typeof userIdToModify !== 'string' || typeof newRole !== 'string') {
    console.error('Invalid form data');
    return new Response(JSON.stringify({ error: 'Invalid form data' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  if (isNaN(Number(userIdToModify))) {
    console.error('Invalid User ID');
    return new Response(JSON.stringify({ error: 'Invalid User ID' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  if (!['User', 'Admin', 'Super-Admin'].includes(newRole)) {
    console.error('Invalid Role');
    return new Response(JSON.stringify({ error: 'Invalid Role' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  const currentUserStmt = db.prepare("SELECT id, username, role FROM users WHERE auth_token = ?");
  const currentUser = currentUserStmt.get(authToken) as User | undefined;

  if (!currentUser) {
    console.error('Current user not found');
    return new Response(JSON.stringify({ error: 'User not found' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  const userToModifyStmt = db.prepare("SELECT id, username, role FROM users WHERE id = ?");
  const userToModify = userToModifyStmt.get(userIdToModify) as User | undefined;

  if (!userToModify) {
    console.error(`User to modify not found. User ID: ${userIdToModify}`);
    return new Response(JSON.stringify({ error: 'User not found' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  // Check if the new role is the same as the current role
  if (userToModify.role === newRole) {
    console.error('New role is the same as the current role');
    return new Response(JSON.stringify({ error: 'New role is the same as the current role' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  if (currentUser.id === Number(userIdToModify)) {
    console.error('You cannot modify your own role');
    return new Response(JSON.stringify({ error: 'You cannot modify your own role' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  if (currentUser.role === 'User') {
    console.error('Standard users cannot modify roles');
    return new Response(JSON.stringify({ error: 'Standard users cannot modify roles' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  if (currentUser.role === 'Admin') {
    console.error('Admins cannot promote or demote roles');
    return new Response(JSON.stringify({ error: 'Admins cannot promote or demote roles' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  if (currentUser.role === 'Super-Admin' && newRole === 'Super-Admin') {
    console.error('Super-Admin cannot create another Super-Admin');
    return new Response(JSON.stringify({ error: 'Super-Admin cannot create another Super-Admin' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  try {
    const oldRole = userToModify.role;

    db.transaction(() => {
      // Update the user's role
      const updateRoleStmt = db.prepare("UPDATE users SET role = ? WHERE id = ?");
      updateRoleStmt.run(newRole, userToModify.id);

      // Invalidate the cache for the modified user's role
      console.log(`Invalidating cache for user ID: ${userIdToModify}`); // Log cache invalidation
      cacheManager.invalidateCache('userRoles', userIdToModify.toString());
      cacheManager.invalidateCache('userDashboardInfo', userIdToModify.toString());

      // Log the action to the admin_logs table with details
      const logActionStmt = db.prepare(`
        INSERT INTO admin_logs (admin_username, action, target_username, details, timestamp) 
        VALUES (?, ?, ?, ?, ?)
      `);
      logActionStmt.run(
        currentUser.username,
        'modify-role',
        userToModify.username,
        `from ${oldRole} to ${newRole}`,
        Date.now()
      );
    })();

    // Invalidate the adminLogs cache
    cacheManager.invalidateAllCacheEntries('adminLogs');
    cacheManager.invalidateAllCacheEntries('allUsers');

    return new Response(JSON.stringify({ success: true, message: `User role updated from ${oldRole} to ${newRole}` }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Error updating user role:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
