import db from "./db";
import { verifyPassword } from "./auth";
import crypto from 'crypto';
import type { User } from "../types/User";
import type { LoginResult } from "../types/LoginResult";
import { getAppConfig } from "./appConfig";  
import { cacheManager } from "./cacheManager"; 

export async function loginUser(formData: FormData): Promise<LoginResult> {
    const appConfig = getAppConfig();

    if (appConfig.first_time_setup === 1) {
        return { success: false, message: "First-time setup required. Please complete the setup before logging in." };
    }

    let username = formData.get("username") as string;
    const password = formData.get("password") as string;

    username = username.trim().toLowerCase();
    if (!/^[a-z0-9_-]{3,16}$/.test(username)) {
        await new Promise(resolve => setTimeout(resolve, 500));
        return { success: false, message: "Invalid username or password" };
    }

    try {
        const user: User | undefined = db.prepare("SELECT * FROM users WHERE username = ?").get(username) as User | undefined;

        if (!user) {
            await new Promise(resolve => setTimeout(resolve, 500)); 
            return { success: false, message: "Invalid username or password" };
        }

        const passwordValid = await verifyPassword(password, user.password);

        if (!passwordValid) {
            await new Promise(resolve => setTimeout(resolve, 500));
            return { success: false, message: "Invalid username or password" };
        }

        const authToken = crypto.randomUUID();

        // Get the current timestamp
        const createdAt = Math.floor(Date.now() / 1000);

        db.prepare(`
            UPDATE users
            SET auth_token = ?, auth_token_created_at = ?
            WHERE id = ?
        `).run(authToken, createdAt, user.id);

        // Invalidate all related caches
        cacheManager.invalidateAllCacheEntries('allUsers');
        cacheManager.invalidateAllCacheEntries('userRoles');

        return { 
            success: true, 
            message: "Login successful", 
            authToken, 
            role: user.role
        };
    } catch (error) {
        console.error(error);
        return { success: false, message: "An error occurred during login" };
    }
}
