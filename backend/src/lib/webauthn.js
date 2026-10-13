// RP (Relying Party) config must match the exact domain serving the frontend.
// Override via env for each deployment -- localhost for local dev, the real
// domain (no protocol/port) for anything public.
export const RP_ID = process.env.WEBAUTHN_RP_ID || 'localhost';
export const RP_NAME = 'Mamey Planner';
export const ORIGIN = process.env.WEBAUTHN_ORIGIN || 'http://localhost:3100';
