export function isIsoDate(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(value));
}

export function calculateRecencyScore(updatedAt: string, scoredAt: Date): number {
  const updatedDate = new Date(updatedAt);
  const ageInDays =
    (scoredAt.getTime() - updatedDate.getTime()) / (1000 * 60 * 60 * 24);

  if (Number.isNaN(ageInDays) || ageInDays < 0) {
    return 1;
  }

  return Math.max(0, 1 - ageInDays / 365);
}

export function toScore(value: number): number {
  return Math.round(value * 100);
}
