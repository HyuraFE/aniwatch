import pLimit from 'p-limit';
import https from 'node:https';
import { lookup as dnsLookup, type LookupAddress } from 'node:dns';

const BASE_URL = 'https://api.mangadex.org';
const USER_AGENT = 'aniwatch/1.0 (https://github.com/aniwatch)';

/**
 * Some ISPs (notably Indonesian providers such as Balifiber, Telkom,
 * FirstMedia) implement "Internet Positif" DNS blocking. They poison the
 * DNS answer for blocked domains to a government landing portal whose TLS
 * certificate is invalid, which breaks every TLS connection with a
 * certificate error before the request ever leaves the machine.
 *
 * The block is DNS-only: SNI is not inspected, so connecting directly to
 * the real upstream IPs works. These addresses are the MangaDex edge nodes
 * (dxlb.mangadex.org) as resolved through Cloudflare DNS-over-HTTPS.
 */
const MANGADEX_FALLBACK_IPS = ['45.129.229.1', '45.129.229.2'];

let cachedIp: string | null = null;
let cachedAt = 0;
const IP_CACHE_TTL_MS = 5 * 60 * 1000;

/**
 * Resolves the real MangaDex API address, preferring Cloudflare DoH and
 * falling back to the known edge IPs. Cached for 5 minutes.
 */
async function resolveRealIp(): Promise<string> {
  const now = Date.now();
  if (cachedIp && now - cachedAt < IP_CACHE_TTL_MS) return cachedIp;

  try {
    const res = await fetch(
      'https://cloudflare-dns.com/dns-query?name=api.mangadex.org&type=A',
      {
        headers: { accept: 'application/dns-json' },
        signal: AbortSignal.timeout(4000),
      }
    );
    if (res.ok) {
      const data: any = await res.json();
      const answer = data.Answer?.find((a: any) => a.type === 1);
      if (answer?.data) {
        cachedIp = answer.data;
        cachedAt = now;
        return answer.data;
      }
    }
  } catch {
    // DoH unavailable (offline, blocked, or behind another proxy) — use fallback.
  }

  cachedIp = MANGADEX_FALLBACK_IPS[0];
  cachedAt = now;
  return cachedIp;
}

/**
 * Custom DNS lookup used by the https agent: sends api.mangadex.org to the
 * real upstream IP, everything else through the system resolver.
 */
function mangadexLookup(
  hostname: string,
  options: any,
  callback: (
    err: NodeJS.ErrnoException | null,
    address: string | LookupAddress[],
    family?: number
  ) => void
): void {
  if (hostname === 'api.mangadex.org') {
    resolveRealIp()
      .then((ip) => {
        if (options?.all) {
          callback(null, [{ address: ip, family: 4 }]);
        } else {
          callback(null, ip, 4);
        }
      })
      .catch(() => callback(null, MANGADEX_FALLBACK_IPS[0], 4));
    return;
  }

  (dnsLookup as any)(hostname, options, callback);
}

const agent = new https.Agent({
  keepAlive: true,
  maxSockets: 5,
  lookup: mangadexLookup as any,
});

// Enforce max 5 concurrent requests, and at most 5 requests per second
const limit = pLimit(5);

let lastRequestTime = 0;
const MIN_REQUEST_INTERVAL_MS = 200;

interface RawResponse {
  status: number;
  headers: Record<string, string | string[] | undefined>;
  body: string;
}

function httpsRequest(
  url: URL,
  method: string,
  headers: Record<string, string>
): Promise<RawResponse> {
  return new Promise((resolve, reject) => {
    const req = https.request(
      {
        hostname: url.hostname,
        port: url.port || 443,
        path: `${url.pathname}${url.search}`,
        method,
        headers,
        agent,
        timeout: 15000,
      },
      (res) => {
        let body = '';
        res.setEncoding('utf8');
        res.on('data', (chunk) => (body += chunk));
        res.on('end', () =>
          resolve({
            status: res.statusCode || 0,
            headers: res.headers,
            body,
          })
        );
      }
    );

    req.on('error', (err) => reject(err));
    req.on('timeout', () => {
      req.destroy(new Error('MangaDex request timed out'));
    });
    req.end();
  });
}

/**
 * MangaDex fetch client with DNS-poisoning resistance, rate limiting and
 * exponential backoff on HTTP 429.
 */
export async function mangadexFetch<T>(
  endpoint: string,
  params?: Record<string, any>
): Promise<T> {
  const url = new URL(
    endpoint.startsWith('http') ? endpoint : `${BASE_URL}${endpoint}`
  );

  if (params) {
    for (const [key, value] of Object.entries(params)) {
      if (value === undefined || value === null) continue;
      if (Array.isArray(value)) {
        // Keys that already end in [] are array params (MangaDex convention);
        // appending another [] would produce "includes[][]" and a 400.
        const paramName = key.endsWith('[]') ? key : `${key}[]`;
        for (const item of value) {
          url.searchParams.append(paramName, String(item));
        }
      } else {
        url.searchParams.set(key, String(value));
      }
    }
  }

  return limit(async () => {
    const maxRetries = 3;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      const now = Date.now();
      const elapsed = now - lastRequestTime;
      if (elapsed < MIN_REQUEST_INTERVAL_MS) {
        await new Promise((r) =>
          setTimeout(r, MIN_REQUEST_INTERVAL_MS - elapsed)
        );
      }
      lastRequestTime = Date.now();

      let res: RawResponse;
      try {
        res = await httpsRequest(url, 'GET', {
          'User-Agent': USER_AGENT,
          Accept: 'application/json',
          Host: url.host,
        });
      } catch (err: any) {
        // Network-level failure: clear the cached IP so the next attempt
        // re-resolves through DoH, then retry.
        cachedIp = null;
        if (attempt === maxRetries) {
          throw new Error(
            `MangaDex request failed: ${err.message} (${err.code || 'no code'})`
          );
        }
        await new Promise((r) => setTimeout(r, attempt * 1000));
        continue;
      }

      if (res.status === 429) {
        const retryAfter = res.headers['retry-after'];
        const delay = retryAfter
          ? parseInt(String(retryAfter), 10) * 1000
          : attempt * 1000;
        await new Promise((r) => setTimeout(r, delay));
        continue;
      }

      if (res.status < 200 || res.status >= 300) {
        const requestId = res.headers['x-request-id'] || 'unknown';
        throw new Error(
          `MangaDex API error ${res.status}: ${res.body.slice(0, 300)} (Request ID: ${requestId})`
        );
      }

      return JSON.parse(res.body) as T;
    }

    throw new Error(
      `MangaDex API rate limit exceeded after ${maxRetries} retries`
    );
  });
}
