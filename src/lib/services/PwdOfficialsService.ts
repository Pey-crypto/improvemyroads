import axios, { AxiosInstance } from 'axios';
import { pwdConfig } from '@/src/config/pwd.config';
import { PwdOfficialsCache } from './PwdOfficialsCache';
import { logger } from '@/src/lib/tiles/utils/logger';

export interface KeralaPwdApiResponse {
  roadStartsAt?: string;
  roadEndsAt?: string;
  division?: string;
  subDivision?: string;
  section?: string;
  mobileEE?: string;
  mobileAEE?: string;
  mobileAE?: string;
  emailEE?: string;
  emailAEE?: string;
  emailAE?: string;
  measuredLength?: number;
  defectLiabilityPeriodDetails?: unknown[];
}

export interface OfficialsNormalized {
  roadStartsAt?: string;
  roadEndsAt?: string;
  division?: string;
  subDivision?: string;
  section?: string;
  officials?: {
    ee: { title: string; mobile: string; email: string };
    aee: { title: string; mobile: string; email: string };
    ae: { title: string; mobile: string; email: string };
  };
  measuredLength?: number;
}

export class PwdOfficialsService {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: pwdConfig.apiBaseUrl,
      timeout: pwdConfig.timeout,
      validateStatus: (s) => s >= 200 && s < 500,
    });
  }

  private headers() {
    return {
      TenantId: pwdConfig.tenantId,
      'shared-public-key': pwdConfig.sharedKey,
      Referer: pwdConfig.referer,
    } as const;
  }

  private normalize(resp: KeralaPwdApiResponse): OfficialsNormalized {
    const officials = {
      ee: { title: 'Executive Engineer', mobile: resp.mobileEE || '', email: resp.emailEE || '' },
      aee: { title: 'Assistant Executive Engineer', mobile: resp.mobileAEE || '', email: resp.emailAEE || '' },
      ae: { title: 'Assistant Engineer', mobile: resp.mobileAE || '', email: resp.emailAE || '' },
    };
    return {
      roadStartsAt: resp.roadStartsAt || undefined,
      roadEndsAt: resp.roadEndsAt || undefined,
      division: resp.division || undefined,
      subDivision: resp.subDivision || undefined,
      section: resp.section || undefined,
      officials,
      measuredLength: typeof resp.measuredLength === 'number' ? resp.measuredLength : undefined,
    };
  }

  async fetchOfficials(sectionId: number): Promise<{ data: OfficialsNormalized; cached: boolean; timestamp: Date }> {
    if (!Number.isFinite(sectionId)) throw new Error('Invalid section_id');
    const key = `section:${sectionId}`;

    const t0 = Date.now();
    const fromCache = await PwdOfficialsCache.get<OfficialsNormalized>(key);
    if (fromCache) {
      logger.info('PWD officials cache hit', { sectionId, ageMs: Date.now() - fromCache.ts });
      return { data: fromCache.value, cached: true, timestamp: new Date(fromCache.ts) };
    }

    const url = `/identity/api/v1/shared-data/network-sections/${sectionId}/defect-liability-period-details`;
    const params = { unit: 'KM' } as const;

    let attempt = 0;
    let lastErr: unknown = null;
    while (attempt < pwdConfig.retries) {
      attempt++;
      try {
        const res = await this.client.get(url, { params, headers: this.headers() });
        if (res.status === 200 && res.data) {
          const normalized = this.normalize(res.data as KeralaPwdApiResponse);
          await PwdOfficialsCache.set(key, normalized);
          logger.info('PWD officials fetched', { sectionId, durationMs: Date.now() - t0 });
          return { data: normalized, cached: false, timestamp: new Date() };
        }
        if (res.status === 404) throw new Error('Section not found');
        lastErr = new Error(`Unexpected status ${res.status}`);
      } catch (e) {
        lastErr = e;
      }
      const backoff = Math.min(1000 * 2 ** (attempt - 1), 4000);
      await new Promise((r) => setTimeout(r, backoff));
    }

    throw lastErr instanceof Error ? lastErr : new Error('Failed to fetch officials');
  }
}

export const pwdOfficialsService = new PwdOfficialsService();
