import { db } from "./db";
import { hashPassword } from "./auth";
import crypto from 'crypto';
import type { RegistrationResult } from "../types/RegistrationResult";
import { getAppConfig } from "./appConfig";

export async function registerUser(formData: FormData): Promise<RegistrationResult> {
    const config = getAppConfig();

    if (config.first_time_setup === 1) {
        return { success: false, message: "First-time setup required. Please complete the setup before registering new users." };
    }

    if (config.enable_web_registration === 0) {
        return { success: false, message: "Registration is currently disabled." };
    }

    let username = formData.get("username") as string;
    const password = formData.get("password") as string;
    const confirmPassword = formData.get("confirmPassword") as string;

    // Sanitize and validate username
    username = username.trim().toLowerCase();
    
    if (/\s/.test(username)) {
        return { success: false, message: "Invalid username. Spaces are not allowed." };
    }

    // Validate username format
    if (!/^[a-z0-9_-]{3,16}$/.test(username)) {
        return { success: false, message: "Invalid username. Use 3-16 characters, lowercase letters, numbers, hyphens, or underscores. No spaces allowed." };
    }

    if (password.length < 6) {
        return { success: false, message: "Password must be at least 6 characters long." };
    }

    if (password !== confirmPassword) {
        return { success: false, message: "Passwords do not match." };
    }

    try {
        const hashedPassword = await hashPassword(password);

        // Generate API key
        const apiKey = crypto.randomUUID();
        const currentTimestamp = Date.now();  // Current timestamp in milliseconds

        const role = 'User';

        const stmt = db.prepare(
            "INSERT INTO users (username, password, api_key, auth_token, auth_token_created_at, account_created_at, api_key_created_at, role) VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
        );
        stmt.run(username, hashedPassword, apiKey, null, null, currentTimestamp, currentTimestamp, role);

        return { success: true, message: "User registered successfully." };
    } catch (error: unknown) {
        if (error instanceof Error) {
            if ((error as any).code === "SQLITE_CONSTRAINT_UNIQUE") {
                return { success: false, message: "Username already exists." };
            } else {
                console.error(error);
                return { success: false, message: "An error occurred during registration." };
            }
        } else {
            console.error("An unknown error occurred", error);
            return { success: false, message: "An unknown error occurred during registration." };
        }
    }
}
