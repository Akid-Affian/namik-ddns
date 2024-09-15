import { db, backupDatabase } from "../../lib/database/db";
import { hashPassword } from "../../lib/auth";
import crypto from 'crypto';
import type { APIRoute } from 'astro';
import type { AppConfig } from "../../types/AppConfig";
import { cacheManager } from "../../lib/utils/cacheManager";

export const POST: APIRoute = async ({ request }) => {
    try {
        const formData = await request.json();

        // Directly query the database to get the app configuration and assert the type
        const config = db.prepare('SELECT first_time_setup FROM app_config WHERE id = 1').get() as AppConfig;

        // Allow registration only if first-time setup is required
        if (config.first_time_setup === 0) {
            return new Response(
                JSON.stringify({ success: false, message: "Setup already completed. Super-Admin creation is disabled." }),
                { status: 403 }
            );
        }

        // Check if a Super-Admin already exists
        const superAdminExists = db.prepare('SELECT 1 FROM users WHERE role = ? LIMIT 1').get('Super-Admin');
        if (superAdminExists) {
            return new Response(
                JSON.stringify({ success: false, message: "Super-Admin already exists. You cannot create another." }),
                { status: 403 }
            );
        }

        let username = formData.username.trim().toLowerCase();
        const password = formData.password;
        const confirmPassword = formData.confirmPassword;

        // Sanitize and validate username
        if (/\s/.test(username)) {
            return new Response(
                JSON.stringify({ success: false, message: "Invalid username. Spaces are not allowed." }),
                { status: 400 }
            );
        }

        // Validate username format
        if (!/^[a-z0-9_-]{3,16}$/.test(username)) {
            return new Response(
                JSON.stringify({ success: false, message: "Invalid username. Use 3-16 characters, lowercase letters, numbers, hyphens, or underscores. No spaces allowed." }),
                { status: 400 }
            );
        }

        // Check password length
        if (password.length < 6) {
            return new Response(
                JSON.stringify({ success: false, message: "Password must be at least 6 characters long." }),
                { status: 400 }
            );
        }

        // Ensure passwords match
        if (password !== confirmPassword) {
            return new Response(
                JSON.stringify({ success: false, message: "Passwords do not match." }),
                { status: 400 }
            );
        }

        // Hash the password
        const hashedPassword = await hashPassword(password);

        // Generate API key
        const apiKey = crypto.randomUUID();
        const currentTimestamp = Date.now();  // Current timestamp in milliseconds

        // Insert the new user as Super-Admin into the database
        const stmt = db.prepare(
            "INSERT INTO users (username, password, api_key, auth_token, auth_token_created_at, account_created_at, api_key_created_at, role) VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
        );
        stmt.run(username, hashedPassword, apiKey, null, null, currentTimestamp, currentTimestamp, 'Super-Admin');

        // After successful registration, disable the first-time setup
        db.prepare('UPDATE app_config SET first_time_setup = 0, updated_at = ? WHERE id = 1').run(currentTimestamp);

        cacheManager.invalidateAllCacheEntries('appConfig');
        cacheManager.invalidateAllCacheEntries('userRoles');
        cacheManager.invalidateAllCacheEntries('allUsers');
        cacheManager.invalidateAllCacheEntries('userDashboardInfo');

        // Call the backupDatabase function after successful registration
        backupDatabase();

        return new Response(
            JSON.stringify({ success: true, message: "Super-Admin registered successfully and first-time setup is now complete." }),
            { status: 200 }
        );

    } catch (error: unknown) {
        console.error('Error during setup-2 POST:', error);
        return new Response(
            JSON.stringify({ success: false, message: "An error occurred during registration." }),
            { status: 500 }
        );
    }
};

export const OPTIONS: APIRoute = async () => {
    const headers = new Headers();
    headers.set('Access-Control-Allow-Origin', '*');
    headers.set('Access-Control-Allow-Methods', 'GET, OPTIONS');
    headers.set('Access-Control-Allow-Headers', 'Content-Type');
    return new Response(null, {
        status: 204,
        headers: headers,
    });
};
