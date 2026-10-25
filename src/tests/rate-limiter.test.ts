import { describe, it, expect, vi } from 'vitest';
import { mangadexFetch } from '@/lib/mangadex/client';

describe('MangaDex API Client', () => {
  it('appends query params correctly and calls fetch', async () => {
    const mockData = { result: 'ok', data: [] };
    const fetchSpy = vi.spyOn(global, 'fetch').mockResolvedValueOnce(
      new Response(JSON.stringify(mockData), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    );

    const res = await mangadexFetch<{ result: string }>('/manga', {
      title: 'Dandadan',
      limit: 10,
      includes: ['cover_art'],
    });

    expect(res.result).toBe('ok');
    expect(fetchSpy).toHaveBeenCalled();
    const calledUrl = fetchSpy.mock.calls[0][0] as string;
    expect(calledUrl).toContain('title=Dandadan');
    expect(calledUrl).toContain('limit=10');
    expect(calledUrl).toContain('includes%5B%5D=cover_art');

    fetchSpy.mockRestore();
  });
});
