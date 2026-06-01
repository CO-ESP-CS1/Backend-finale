/** Après MAX_LOGIN_ATTEMPTS échecs : blocage de tier × LOCKOUT_MINUTES_PER_TIER minutes. */
export const MAX_LOGIN_ATTEMPTS = 10;
export const LOCKOUT_MINUTES_PER_TIER = 10;

export function lockoutDurationMs(tier: number): number {
  return tier * LOCKOUT_MINUTES_PER_TIER * 60 * 1000;
}

export function formatLockoutMessage(): string {
  return "Compte temporairement inaccessible après trop de tentatives.";
}
