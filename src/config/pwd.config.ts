export const pwdConfig = {
  apiBaseUrl: process.env.KERALA_PWD_API_BASE_URL || 'https://apipwdrmms.kerala.gov.in',
  tenantId: process.env.KERALA_PWD_TENANT_ID || 'kstp',
  sharedKey: process.env.KERALA_PWD_SHARED_KEY || '',
  referer: process.env.KERALA_PWD_REFERER || 'https://pwdrmms.kerala.gov.in/',
  timeout: Number(process.env.KERALA_PWD_API_TIMEOUT || 10000),
  cacheTTL: Number(process.env.KERALA_PWD_CACHE_TTL || 86400),
  retries: Number(process.env.KERALA_PWD_RETRIES || 3),
} as const;

export type PwdConfig = typeof pwdConfig;
