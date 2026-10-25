import { describe, it, expect } from 'vitest';
import { reconcileProgress } from '@/lib/progress';

describe('Progress reconciliation', () => {
  it('keeps guest progress if newer than server progress', () => {
    const serverRecords = [
      {
        chapterId: 'ch-1',
        mangaId: 'm-1',
        lastPage: 5,
        updatedAt: new Date('2026-01-01T10:00:00Z'),
      },
    ];
    const guestRecords = {
      'ch-1': {
        chapterId: 'ch-1',
        mangaId: 'm-1',
        lastPage: 12,
        updatedAt: '2026-01-01T12:00:00Z',
      },
    };
    const merged = reconcileProgress(serverRecords, guestRecords);
    expect(merged['ch-1'].lastPage).toBe(12);
  });

  it('keeps server progress if newer than guest progress', () => {
    const serverRecords = [
      {
        chapterId: 'ch-1',
        mangaId: 'm-1',
        lastPage: 25,
        updatedAt: new Date('2026-01-01T15:00:00Z'),
      },
    ];
    const guestRecords = {
      'ch-1': {
        chapterId: 'ch-1',
        mangaId: 'm-1',
        lastPage: 10,
        updatedAt: '2026-01-01T12:00:00Z',
      },
    };
    const merged = reconcileProgress(serverRecords, guestRecords);
    expect(merged['ch-1'].lastPage).toBe(25);
  });

  it('includes novel chapters present only in guest progress', () => {
    const serverRecords: any[] = [];
    const guestRecords = {
      'ch-2': {
        chapterId: 'ch-2',
        mangaId: 'm-1',
        lastPage: 1,
        updatedAt: '2026-01-01T12:00:00Z',
      },
    };
    const merged = reconcileProgress(serverRecords, guestRecords);
    expect(merged['ch-2'].lastPage).toBe(1);
  });

  it('includes novel chapters present only in server progress', () => {
    const serverRecords = [
      {
        chapterId: 'ch-9',
        mangaId: 'm-1',
        lastPage: 7,
        updatedAt: new Date('2026-01-01T12:00:00Z'),
      },
    ];
    const merged = reconcileProgress(serverRecords, {});
    expect(merged['ch-9'].lastPage).toBe(7);
  });

  it('treats identical timestamps as server-wins to avoid duplicate writes', () => {
    const serverRecords = [
      {
        chapterId: 'ch-1',
        mangaId: 'm-1',
        lastPage: 5,
        updatedAt: new Date('2026-01-01T12:00:00Z'),
      },
    ];
    const guestRecords = {
      'ch-1': {
        chapterId: 'ch-1',
        mangaId: 'm-1',
        lastPage: 12,
        updatedAt: '2026-01-01T12:00:00Z',
      },
    };
    const merged = reconcileProgress(serverRecords, guestRecords);
    expect(merged['ch-1'].lastPage).toBe(5);
  });
});
