import { NextResponse, type NextRequest } from 'next/server';
import https from 'node:https';
import { lookup as dnsLookup, type LookupAddress } from 'node:dns';

const ALLOWED_HOSTS = new Set([
  'uploads.mangadex.org',
  'api.mangadex.org',
]);

const MANGADEX_FALLBACK_IPS = ['45.129.229.1', '45.129.229.2'];

let cachedIp: string | null = null;
let cachedAt = 0;
const IP_CACHE_TTL_MS = 5 * 60 * 1000;

async function resolveRealIp(): Promise<string> {
  const now = Date.now();
  if (cachedIp && now - cachedAt < IP_CACHE_TTL_MS) return cachedIp;

  try {
    const res = await fetch(
      'https://cloudflare-dns.com/dns-query?name=uploads.mangadex.org&type=A',
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
    // DoH unavailable — fall through to hardcoded edge IPs
  }

  cachedIp = MANGADEX_FALLBACK_IPS[0];
  cachedAt = now;
  return cachedIp;
}

function mangadexLookup(
  hostname: string,
  options: any,
  callback: (
    err: NodeJS.ErrnoException | null,
    address: string | LookupAddress[],
    family?: number
  ) => void
): void {
  if (ALLOWED_HOSTS.has(hostname)) {
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
  maxSockets: 10,
  lookup: mangadexLookup as any,
});

export async function GET(request: NextRequest) {
  const raw = request.nextUrl.searchParams.get('url');

  if (!raw) {
    return NextResponse.json({ error: 'url is required' }, { status: 400 });
  }

  let target: URL;
  try {
    target = new URL(raw);
  } catch {
    return NextResponse.json({ error: 'Invalid url' }, { status: 400 });
  }

  // Only proxy MangaDex hosts — prevents this endpoint being used as an open proxy
  if (target.protocol !== 'https:' || !ALLOWED_HOSTS.has(target.hostname)) {
    return NextResponse.json(
      { error: 'Host not allowed' },
      { status: 403 }
    );
  }

  try {
    const upstream = await new Promise<{
      status: number;
      headers: Record<string, string | string[] | undefined>;
      stream: NodeJS.ReadableStream;
    }>((resolve, reject) => {
      const req = https.get(
        {
          hostname: target.hostname,
          port: 443,
          path: `${target.pathname}${target.search}`,
          headers: {
            Host: target.host,
            'User-Agent': 'aniwatch/1.0 (https://github.com/aniwatch)',
            Accept: 'image/*,*/*',
          },
          agent,
          timeout: 15000,
        },
        (res) => {
          if (!res.statusCode || res.statusCode >= 400) {
            res.destroy();
            reject(new Error(`Upstream responded ${res.statusCode}`));
            return;
          }
          resolve({
            status: res.statusCode,
            headers: res.headers,
            stream: res,
          });
        }
      );
      req.on('error', reject);
      req.on('timeout', () => req.destroy(new Error('Upstream timeout')));
    });

    const contentType =
      (upstream.headers['content-type'] as string) || 'application/octet-stream';

    return new NextResponse(upstream.stream as any, {
      status: upstream.status,
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=604800, immutable',
        'X-Content-Type-Options': 'nosniff',
      },
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'Upstream fetch failed' },
      { status: 502 }
    );
  }
}
