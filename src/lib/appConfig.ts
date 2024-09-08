import db from "./db";
import type { AppConfig } from "../types/AppConfig";
import { cacheManager } from "./cacheManager";

export function getAppConfig(): AppConfig {
    const cacheKey = 'appConfig';
    const cache = cacheManager.getCache('appConfig', 180); 

    let configRow = cache.get<AppConfig>(cacheKey);

    if (configRow) {
    } else {
        
        configRow = db.prepare("SELECT * FROM app_config WHERE id = 1").get() as AppConfig;

        // Provide a fallback for base_domain if it is null
        if (configRow.base_domain === null) {
            configRow.base_domain = "example.com";
        }

        // Cache the result for future requests
        cache.set(cacheKey, configRow);
    }

    return configRow;
}
