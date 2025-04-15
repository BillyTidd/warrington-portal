/**
 * Simple in-memory cache for API responses
 * This helps reduce database load for frequently accessed data
 */

interface CacheItem {
  data: any;
  timestamp: number;
  expiresAt: number;
}

// Cache storage
const cache: Record<string, CacheItem> = {};

// Default TTL in milliseconds (5 minutes)
const DEFAULT_TTL = 5 * 60 * 1000;

/**
 * Get item from cache
 * @param key Cache key
 * @returns Cached data or null if not found or expired
 */
export function getCachedData(key: string): any | null {
  const item = cache[key];

  // Return null if item doesn't exist or is expired
  if (!item || Date.now() > item.expiresAt) {
    if (item) {
      // Clean up expired item
      delete cache[key];
    }
    return null;
  }

  return item.data;
}

/**
 * Store data in cache
 * @param key Cache key
 * @param data Data to cache
 * @param ttl Time to live in milliseconds (default: 5 minutes)
 */
export function setCachedData(
  key: string,
  data: any,
  ttl: number = DEFAULT_TTL
): void {
  const now = Date.now();

  cache[key] = {
    data,
    timestamp: now,
    expiresAt: now + ttl,
  };
}

/**
 * Clear all cached data or specific key
 * @param key Optional specific key to clear
 */
export function clearCache(key?: string): void {
  if (key) {
    delete cache[key];
  } else {
    Object.keys(cache).forEach((k) => delete cache[k]);
  }
}

/**
 * Get cache stats
 * @returns Object with cache statistics
 */
export function getCacheStats() {
  const now = Date.now();
  const keys = Object.keys(cache);

  return {
    size: keys.length,
    keys: keys,
    activeItems: keys.filter((key) => cache[key].expiresAt > now).length,
    expiredItems: keys.filter((key) => cache[key].expiresAt <= now).length,
  };
}
