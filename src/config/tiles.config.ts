export const tilesConfig = {
  keralaPWD: {
    baseUrl: process.env.KERALA_PWD_BASE_URL || 'https://pwdrmms.kerala.gov.in/citizen/kstp-network-sections',
    headers: {
      Referer: 'https://pwdrmms.kerala.gov.in/citizen/portal/',
      'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36'
    },
    timeout: Number(process.env.KERALA_PWD_TIMEOUT || 10000),
    retries: Number(process.env.KERALA_PWD_RETRIES || 3),
    minZoom: 9,
    maxZoom: 15
  },
  cache: {
    enabled: (process.env.TILE_CACHE_ENABLED || 'true').toLowerCase() !== 'false',
    ttl: Number(process.env.TILE_CACHE_TTL || 86400),
    maxSize: 1000,
    checkPeriod: 600
  },
  rateLimit: {
    enabled: (process.env.RATE_LIMIT_ENABLED || 'true').toLowerCase() !== 'false',
    windowMs: 15 * 60 * 1000,
    maxRequests: 1000
  },
  redis: {
    url: process.env.REDIS_URL || ''
  },
  logging: {
    level: (process.env.LOG_LEVEL || 'info') as 'debug' | 'info' | 'warn' | 'error'
  }
} as const;

export type TilesConfig = typeof tilesConfig;
