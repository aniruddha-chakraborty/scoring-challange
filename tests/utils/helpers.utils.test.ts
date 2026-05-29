import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  calculateRecencyScore,
  isIsoDate,
  toScore
} from '../../src/utils/helpers.utils';

describe('helpers utils', () => {
  it('validates ISO date strings', () => {
    assert.equal(isIsoDate('2024-01-01'), true);
    assert.equal(isIsoDate('2024-1-1'), false);
    assert.equal(isIsoDate('not-a-date'), false);
  });

  it('calculates recency score with a one year decay', () => {
    assert.equal(
      calculateRecencyScore(
        '2026-05-28T00:00:00Z',
        new Date('2026-05-28T00:00:00Z')
      ),
      1
    );
    assert.equal(
      calculateRecencyScore(
        '2025-05-28T00:00:00Z',
        new Date('2026-05-28T00:00:00Z')
      ),
      0
    );
  });

  it('converts a normalized value to a whole-number score', () => {
    assert.equal(toScore(0), 0);
    assert.equal(toScore(0.555), 56);
    assert.equal(toScore(1), 100);
  });
});
