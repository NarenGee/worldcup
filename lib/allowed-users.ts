/** Pre-invited players: email (lowercase) → display name */
export const ALLOWED_USERS: Record<string, string> = {
  "nareng125@gmail.com": "Naren",
  "etiennedaury@gmail.com": "Etienne",
  "ranga.mapatuna@gmail.com": "Ranga",
  "guil.m@outlook.com": "Gui",
  "hannes.galll@gmail.com": "Hannes",
};

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function isAllowedEmail(email: string): boolean {
  return normalizeEmail(email) in ALLOWED_USERS;
}

export function getDisplayNameForEmail(email: string): string | undefined {
  return ALLOWED_USERS[normalizeEmail(email)];
}
