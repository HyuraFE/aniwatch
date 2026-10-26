import { describe, it, expect, vi, afterEach } from 'vitest';
import https from 'node:https';
import { Readable } from 'node:stream';
import { mangadexFetch } from '@/lib/mangadex/client';

function mockHttpsResponse(
  status: number,
  body: string,
  headers: Record<string, string> = {}
) {
  return vi.spyOn(https, 'request').mockImplementation(((
    options: any,
    callback: any
  ) => {
    const resListeners: Record<string, Function[]> = {};
    const req: any = {
      on() {
        return req;
      },
      end() {
        const res: any = new Readable({ read() {} });
        res.statusCode = status;
        res.headers = headers;
        res.setEncoding = () => res;
        res.on = ((event: string, handler: Function) => {
          (resListeners[event] ||= []).push(handler);
          return res;
        }) as any;
        callback(res);
        setTimeout(() => {
          (resListeners['data'] || []).forEach((h) => h(body));
          (resListeners['end'] || []).forEach((h) => h());
        }, 0);
      },
      destroy() {},
    };
    return req;
  }) as any);
}

describe('MangaDex API Client', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('appends query params correctly and returns parsed JSON', async () => {
    const mockData = { result: 'ok', data: [] };
    const spy = mockHttpsResponse(200, JSON.stringify(mockData));

    const res = await mangadexFetch<{ result: string }>('/manga', {
      title: 'Dandadan',
      limit: 10,
      includes: ['cover_art'],
    });

    expect(res.result).toBe('ok');
    expect(spy).toHaveBeenCalled();

    const options = spy.mock.calls[0][0] as https.RequestOptions;
    const path = String(options.path);
    expect(path).toContain('title=Dandadan');
    expect(path).toContain('limit=10');
    expect(path).toContain('includes%5B%5D=cover_art');
    expect(options.headers).toMatchObject({
      'User-Agent': 'aniwatch/1.0 (https://github.com/aniwatch)',
      Accept: 'application/json',
    });
  });

  it('routes api.mangadex.org through a custom agent with DNS lookup override', async () => {
    const spy = mockHttpsResponse(200, JSON.stringify({ result: 'ok' }));

    await mangadexFetch('/manga', { limit: 1 });

    const options = spy.mock.calls[0][0] as any;
    expect(options.hostname).toBe('api.mangadex.org');
    // The agent carries the DNS lookup that bypasses ISP poisoning
    const agent = options.agent as any;
    expect(agent).toBeDefined();
    expect(typeof agent.options.lookup).toBe('function');
  });

  it('throws a descriptive error on non-2xx responses', async () => {
    mockHttpsResponse(404, 'not found', { 'x-request-id': 'req-123' });

    await expect(mangadexFetch('/manga/missing')).rejects.toThrow(
      /MangaDex API error 404/
    );
  });

  it('does not double-append [] to keys that already end in []', async () => {
    const spy = mockHttpsResponse(200, JSON.stringify({ result: 'ok' }));

    await mangadexFetch('/manga', { 'includes[]': ['cover_art', 'author'] });

    const path = String((spy.mock.calls[0][0] as https.RequestOptions).path);
    expect(path).toContain('includes%5B%5D=cover_art');
    expect(path).toContain('includes%5B%5D=author');
    expect(path).not.toContain('includes%5B%5D%5B%5D');
  });

  it('appends [] to plain array keys', async () => {
    const spy = mockHttpsResponse(200, JSON.stringify({ result: 'ok' }));

    await mangadexFetch('/manga', { tags: ['a', 'b'] });

    const path = String((spy.mock.calls[0][0] as https.RequestOptions).path);
    expect(path).toContain('tags%5B%5D=a');
    expect(path).toContain('tags%5B%5D=b');
  });
});
