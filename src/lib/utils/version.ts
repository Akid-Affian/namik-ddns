import fs from 'fs';
import path from 'path';
import { db } from '@lib/database/db';
import { cacheManager } from './cacheManager';

let cachedVersion: string | null = null;

export function getAppVersion() {
  const cacheKey = 'appVersion';
  const cache = cacheManager.getCache('appVersion', 3600);

  cachedVersion = cache.get<string>(cacheKey) ?? null;

  if (!cachedVersion) {
    const packageJsonPath = path.join(process.cwd(), 'package.json');
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    const currentVersion = packageJson.version;

    let dbVersion: string | null = null;
    let columnExists = true;

    try {
      // Check if the app_version column exists
      db.prepare("SELECT app_version FROM app_config LIMIT 1").get();
    } catch (err) {
      if ((err as Error).message.includes("no such column: app_version")) {
        columnExists = false;
      } else {
        console.error("Error checking app_version column:", err);
      }
    }

    if (columnExists) {
      try {
        // Fetch the current app_version from the database
        const result = db.prepare("SELECT app_version FROM app_config WHERE id = 1").get() as { app_version?: string };
        
        if (result && result.app_version) {
          dbVersion = result.app_version;
        } else {
          dbVersion = null;
        }
      } catch (err) {
        console.error("Error fetching app_version from database:", err);
        dbVersion = null;
      }

      if (!dbVersion || dbVersion !== currentVersion) {
        try {
          db.prepare("UPDATE app_config SET app_version = ? WHERE id = 1").run(currentVersion);
        } catch (err) {
          console.error("Error updating app_version in the database:", err);
        }
      }
    } else {
      console.warn("The 'app_version' column does not exist in the database, skipping version check.");
    }

    cachedVersion = currentVersion;
    cache.set(cacheKey, cachedVersion);
  }

  return cachedVersion;
}
