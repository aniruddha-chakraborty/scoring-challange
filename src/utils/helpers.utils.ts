// Checks whether a value looks like an ISO calendar date.
export function isIsoDate(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(value));
}

// Calculates a zero-to-one score based on how recently a repository was updated.
export function calculateRecencyScore(updatedAt: string, scoredAt: Date): number {
  const updatedDate = new Date(updatedAt);
  const ageInDays =
    (scoredAt.getTime() - updatedDate.getTime()) / (1000 * 60 * 60 * 24);

  if (Number.isNaN(ageInDays) || ageInDays < 0) {
    return 1;
  }

  return Math.max(0, 1 - ageInDays / 365);
}

// Converts a normalized zero-to-one value into a rounded zero-to-one-hundred score.
export function toScore(value: number): number {
  return Math.round(value * 100);
}
