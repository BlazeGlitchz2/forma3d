/**
 * Additional studio operators. Passwords are stored as PBKDF2 hashes in the
 * same `salt:hash` format as lib/auth.ts (SHA-256, 100,000 iterations) so no
 * plaintext credential lives in source. A matching email is granted the admin
 * role on login and in isAdmin().
 */
export const studioOperatorCredentials: Record<string, string> = {
  'amsaber463@gmail.com': 'ae6b04daaf9a05496446a970a8737e9c:7db59163424f5d5d98036baf80c96337f61a8f9ffce98da587f1b5c00059943d',
};

export function studioOperatorHash(email: string): string | undefined {
  return studioOperatorCredentials[email.trim().toLowerCase()];
}
