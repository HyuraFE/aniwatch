import pLimit from 'p-limit';

const BASE_URL = 'https://api.mangadex.org';
const USER_AGENT = 'aniwatch/1.0 (https://github.com/aniwatch)';

// Enforce max 5 concurrent / per-second requests to respect MangaDex rate limit
const limit = pLimit(5);

let lastRequestTime = 0;
const MIN_REQUEST_INTERVAL_MS = 200; // 5 req / sec

async function throttledFetch(
  url: string,
  options: RequestInit = {}
): Promise<Response> {
  const now = Date.now();
  const timeSinceLast = now - lastRequestTime;
  if (timeSinceLast < MIN_REQUEST_INTERVAL_MS) {
    await new Promise((res) =>
      setTimeout(res, MIN_REQUEST_INTERVAL_MS - timeSinceLast)
    );
  }
  lastRequestTime = Date.now();

  const headers = new Headers(options.headers || {});
  headers.set('User-Agent', USER_AGENT);
  headers.set('Accept', 'application/json');

  return fetch(url, {
    ...options,
    headers,
  });
}

/**
 * MangaDex fetch client with rate limiting and exponential backoff retry on HTTP 429
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
        for (const item of value) {
          url.searchParams.append(`${key}[]`, String(item));
        }
      } else {
        url.searchParams.set(key, String(value));
      }
    }
  }

  return limit(async () => {
    let attempts = 0;
    const maxRetries = 3;

    while (attempts < maxRetries) {
      attempts++;
      const res = await throttledFetch(url.toString(), {
        next: { revalidate: 0 },
      });

      if (res.status === 429) {
        // Rate limited: backoff exponentially
        const retryAfter = res.headers.get('Retry-After');
        const delay = retryAfter
          ? parseInt(retryAfter, 10) * 1000
          : attempts * 1000;
        await new Promise((resolve) => setTimeout(resolve, delay));
        continue;
      }

      if (!res.ok) {
        const requestId = res.headers.get('X-Request-ID') || 'unknown';
        const errText = await res.text().catch(() => '');
        throw new Error(
          `MangaDex API error ${res.status}: ${errText} (Request ID: ${requestId})`
        );
      }

      return (await res.json()) as T;
    }

    throw new Error(`MangaDex API rate limit exceeded after ${maxRetries} retries`);
  });
}
