import crypto from 'crypto';

// No email server configured on this self-hosted app -- a saved-once recovery
// code stands in for the usual "reset link sent to your email" flow.
export function generateRecoveryCode() {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  const bytes = crypto.randomBytes(12);
  let raw = '';
  for (let i = 0; i < 12; i++) raw += alphabet[bytes[i] % alphabet.length];
  return `${raw.slice(0, 4)}-${raw.slice(4, 8)}-${raw.slice(8, 12)}`;
}
