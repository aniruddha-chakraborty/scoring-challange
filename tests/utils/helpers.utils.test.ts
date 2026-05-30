import {
  calculateRecencyScore,
  isIsoDate,
  toScore
} from '../../src/utils/helpers.utils';

describe('helpers utils', () => {
  it('validates ISO date strings', () => {
    expect(isIsoDate('2024-01-01')).toBe(true);
    expect(isIsoDate('2024-1-1')).toBe(false);
    expect(isIsoDate('not-a-date')).toBe(false);
  });

  it('calculates recency score with a one year decay', () => {
    expect(
      calculateRecencyScore(
        '2026-05-28T00:00:00Z',
        new Date('2026-05-28T00:00:00Z')
      )
    ).toBe(1);
    expect(
      calculateRecencyScore(
        '2025-05-28T00:00:00Z',
        new Date('2026-05-28T00:00:00Z')
      )
    ).toBe(0);
  });

  it('converts a normalized value to a whole-number score', () => {
    expect(toScore(0)).toBe(0);
    expect(toScore(0.555)).toBe(56);
    expect(toScore(1)).toBe(100);
  });
});
