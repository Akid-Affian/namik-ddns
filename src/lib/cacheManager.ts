import NodeCache from 'node-cache';

class CacheManager {
  private caches: Map<string, NodeCache>;
  private defaultTTL: number;

  constructor(defaultTTL: number = 60) { // Set the default TTL to 60 sec
    this.caches = new Map();
    this.defaultTTL = defaultTTL;
  }

  /**
   * Get or create a cache with a specific name and TTL.
   * If no TTL is provided, use the default TTL.
   * @param name - The name of the cache.
   * @param ttl - The time-to-live (TTL) for cache items in seconds.
   */
  public getCache(name: string, ttl?: number): NodeCache {
    if (!this.caches.has(name)) {
      const cache = new NodeCache({ stdTTL: ttl ?? this.defaultTTL });
      this.caches.set(name, cache);
    }
    return this.caches.get(name)!;
  }

  /**
   * Invalidate a cache item by key from a specific cache.
   * @param cacheName - The name of the cache.
   * @param key - The key of the item to invalidate.
   */
  public invalidateCache(cacheName: string, key: string): void {
    const cache = this.caches.get(cacheName);
    if (cache) {
      cache.del(key);
      console.log(`Cache invalidated for key: ${key} in cache: ${cacheName}`);
    }
  }

  /**
   * Invalidate all caches related to a specific user ID.
   * This method dynamically iterates over all caches and invalidates the user-specific entries.
   * @param userId - The ID of the user whose caches should be invalidated.
   */
  public invalidateAllUserCaches(userId: string): void {
    this.caches.forEach((cache, cacheName) => {
      if (cache.has(userId)) {
        cache.del(userId);
        console.log(`Cache invalidated for user ID: ${userId} in cache: ${cacheName}`);
      }
    });
    console.log(`All caches invalidated for user ID: ${userId}`);
  }

  /**
   * Invalidate all entries in a specific cache.
   * @param cacheName - The name of the cache to invalidate.
   */
  public invalidateAllCacheEntries(cacheName: string): void {
    const cache = this.caches.get(cacheName);
    if (cache) {
      cache.flushAll(); // This will remove all keys in the cache
      console.log(`All cache entries invalidated for cache: ${cacheName}`);
    }
  }
}

export const cacheManager = new CacheManager();
