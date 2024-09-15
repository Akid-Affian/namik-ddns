import { db } from "./database/db";
import type { UserSession } from "../types/UserSession";
import { getAppConfig } from "./appConfig";

export function verifySession(authToken: string): boolean {
    const currentTime = Math.floor(Date.now() / 1000);

    const appConfig = getAppConfig();

    // Convert auth_token_max_age from minutes to seconds
    const maxAgeInSeconds = appConfig.auth_token_max_age * 60;

    const session = db.prepare(`
        SELECT id, auth_token, auth_token_created_at FROM users WHERE auth_token = ?
    `).get(authToken) as UserSession | undefined;

    if (session) {
        const sessionAge = currentTime - session.auth_token_created_at;

        if (sessionAge < maxAgeInSeconds) {
            return true; 
        } else {
            return false;
        }
    } else {
        return false;
    }
}
