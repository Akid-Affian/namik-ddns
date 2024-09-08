import type { APIRoute } from 'astro';
import db from '../../lib/db';
import { verifySession } from '../../lib/verifySession';
import { getCookieValue } from '../../lib/cookies';
import { hashPassword } from '../../lib/auth';
import { cacheManager } from '../../lib/cacheManager';
import type { User } from '../../types/User';

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

  // Parse the request body to get the user details
  const formData = await request.formData();
  const username = (formData.get("username") as string)?.trim().toLowerCase();
  const password = formData.get("password") as string;
  const role = formData.get("role") as string;

  // Validate username and password
  if (!username || !/^[a-z0-9_-]{3,16}$/.test(username)) {
    console.error('Invalid username format');
    return new Response(JSON.stringify({ error: 'Invalid username format' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  if (!password || password.length < 6) {
    console.error('Password too short');
    return new Response(JSON.stringify({ error: 'Password must be at least 6 characters long' }), {
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

  // Role-based restrictions
  if (currentUser.role === 'User') {
    console.error('Standard users cannot create new users');
    return new Response(JSON.stringify({ error: 'Standard users cannot create new users' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  if (currentUser.role === 'Admin' && role !== 'User') {
    console.error('Admin cannot assign roles other than User');
    return new Response(JSON.stringify({ error: 'Admin cannot assign roles other than User' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  if (currentUser.role === 'Super-Admin' && !['User', 'Admin'].includes(role)) {
    console.error('Super-Admin cannot assign the provided role');
    return new Response(JSON.stringify({ error: 'Super-Admin can only assign roles User or Admin' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  try {
    // Hash the password
    const hashedPassword = await hashPassword(password);
    const currentTimestamp = Date.now(); // Current timestamp in milliseconds

    // Begin transaction to add user and log the action
    const addUserTransaction = db.transaction(() => {
      // Insert the new user into the database
      const stmt = db.prepare(
        "INSERT INTO users (username, password, api_key, auth_token, auth_token_created_at, account_created_at, api_key_created_at, role) VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
      );
      stmt.run(username, hashedPassword, null, null, null, currentTimestamp, currentTimestamp, role);

      // Insert log entry into admin_logs table
      const logStmt = db.prepare(`
        INSERT INTO admin_logs (admin_username, action, target_username, details, timestamp)
        VALUES (?, ?, ?, ?, ?)
      `);
      logStmt.run(
        currentUser.username,
        'add-user',
        username,
        `Added user with role: ${role}`,
        currentTimestamp
      );
    });

    // Execute the transaction
    addUserTransaction();

    // Invalidate the adminLogs cache
    cacheManager.invalidateAllCacheEntries('adminLogs');
    cacheManager.invalidateAllCacheEntries('allUsers');

    return new Response(JSON.stringify({ success: true, message: 'User created successfully' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error: unknown) {
    if (error instanceof Error) {
      if ((error as any).code === "SQLITE_CONSTRAINT_UNIQUE") {
        return new Response(JSON.stringify({ error: 'Username already exists' }), {
          status: 409,
          headers: { 'Content-Type': 'application/json' }
        });
      } else {
        console.error('Error creating user:', error);
        return new Response(JSON.stringify({ error: 'An error occurred during user creation' }), {
          status: 500,
          headers: { 'Content-Type': 'application/json' }
        });
      }
    } else {
      console.error('An unknown error occurred', error);
      return new Response(JSON.stringify({ error: 'An unknown error occurred during user creation' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  }
};
