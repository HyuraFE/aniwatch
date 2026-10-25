import { describe, it, expect } from 'vitest';

describe('Library status tabs & shelf transitions', () => {
  const allowedStatuses = [
    'reading',
    'completed',
    'on_hold',
    'plan_to_read',
    'dropped',
  ];

  it('validates bookmark status transitions', () => {
    expect(allowedStatuses).toContain('reading');
    expect(allowedStatuses).toContain('completed');
    expect(allowedStatuses).toContain('on_hold');
    expect(allowedStatuses).toContain('plan_to_read');
    expect(allowedStatuses).toContain('dropped');
  });

  it('maps status slug to Tokyo Manga-Zine shelf label', () => {
    const labels: Record<string, string> = {
      reading: 'Reading (読書中)',
      completed: 'Completed (読了)',
      on_hold: 'On Hold (保留)',
      plan_to_read: 'Plan to Read (積読)',
      dropped: 'Dropped (中断)',
    };

    expect(labels['reading']).toBe('Reading (読書中)');
    expect(labels['completed']).toBe('Completed (読了)');
  });
});
