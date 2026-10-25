import { describe, it, expect } from 'vitest';
import { getLanguageLabel } from '@/components/language-selector';

describe('Language selector logic', () => {
  it('maps 2-letter language codes to friendly names', () => {
    expect(getLanguageLabel('en')).toBe('English');
    expect(getLanguageLabel('id')).toBe('Indonesian');
    expect(getLanguageLabel('ja')).toBe('Japanese');
    expect(getLanguageLabel('es')).toBe('Spanish');
    expect(getLanguageLabel('fr')).toBe('French');
  });

  it('falls back to uppercase code for unknown languages', () => {
    expect(getLanguageLabel('xx')).toBe('XX');
  });
});
