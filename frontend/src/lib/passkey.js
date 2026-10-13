import { startRegistration, startAuthentication, browserSupportsWebAuthn } from '@simplewebauthn/browser';
import { api } from '../api/client.js';

export function isPasskeySupported() {
  return browserSupportsWebAuthn();
}

export async function registerPasskey(deviceName) {
  const options = await api('/webauthn/register-options');
  const response = await startRegistration(options);
  await api('/webauthn/register-verify', { method: 'POST', body: { response, deviceName } });
}

export async function loginWithPasskey(email) {
  const options = await api('/webauthn/login-options', { method: 'POST', body: { email } });
  if (!options.allowCredentials || options.allowCredentials.length === 0) {
    throw new Error('No hay passkeys registrados para ese correo.');
  }
  const response = await startAuthentication(options);
  return api('/webauthn/login-verify', { method: 'POST', body: { email, response } });
}
