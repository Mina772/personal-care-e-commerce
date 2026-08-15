import { describe, expect, it } from 'vitest';
import { apiMessage, money } from './format';
describe('commerce formatting', () => {
  it('formats integer cents without floating point leakage', () => { expect(money(1099)).toContain('EGP'); expect(money(1099)).toContain('10.99'); });
  it('extracts safe API messages', () => expect(apiMessage({ data: { error: { message: 'Out of stock' } } })).toBe('Out of stock'));
});