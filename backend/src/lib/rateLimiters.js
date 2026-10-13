import rateLimit from 'express-rate-limit';

// Guards password/passkey login attempts and password resets against brute
// force -- generous enough that a real person retyping a password a few
// times never notices it.
export const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'demasiados intentos, espera unos minutos e intenta de nuevo' },
});

// Guards account creation against scripted signup spam.
export const signupLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'demasiadas cuentas creadas desde esta red, espera un rato' },
});
