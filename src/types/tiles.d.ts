/* Global type definitions for tile proxy */

declare namespace NodeJS {
  interface ProcessEnv {
    REDIS_URL?: string;
    TILE_CACHE_ENABLED?: string;
    TILE_CACHE_TTL?: string;
    RATE_LIMIT_ENABLED?: string;
    LOG_LEVEL?: 'debug' | 'info' | 'warn' | 'error';

    KERALA_PWD_BASE_URL?: string;
    KERALA_PWD_TIMEOUT?: string;
    KERALA_PWD_RETRIES?: string;
  }
}
