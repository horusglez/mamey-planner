import { startRegistration, startAuthentication, browserSupportsWebAuthn } from '@simplewebauthn/browser';
import { api } from '../api/client.js';

export function isPasskeySupported() {
  return browserSupportsWebAuthn();
}

// iOS Safari requires document.hasFocus() === true at the exact moment
// startRegistration/startAuthentication is invoked, otherwise it throws
// "The document is not focused". A preceding window.prompt/alert/confirm,
// or the on-screen keyboard dismissing, can leave the document briefly
// unfocused even though we're still inside the user gesture.
function waitForDocumentFocus(timeoutMs = 2000) {
  if (document.hasFocus()) return Promise.resolve();
  return new Promise((resolve) => {
    function cleanup() {
      window.removeEventListener('focus', onFocus);
      clearTimeout(timer);
    }
    function onFocus() {
      cleanup();
      resolve();
    }
    const timer = setTimeout(() => {
      cleanup();
      resolve();
    }, timeoutMs);
    window.addEventListener('focus', onFocus);
    window.focus();
  });
}

export async function registerPasskey(deviceName) {
  const options = await api('/webauthn/register-options');
  await waitForDocumentFocus();
  const response = await startRegistration(options);
  await api('/webauthn/register-verify', { method: 'POST', body: { response, deviceName } });
}

export async function loginWithPasskey(email) {
  const options = await api('/webauthn/login-options', { method: 'POST', body: { email } });
  if (!options.allowCredentials || options.allowCredentials.length === 0) {
    throw new Error('No hay passkeys registrados para ese correo.');
  }
  await waitForDocumentFocus();
  const response = await startAuthentication(options);
  return api('/webauthn/login-verify', { method: 'POST', body: { email, response } });
}

// Creates a brand-new account secured only by a passkey -- no password set.
export async function registerAccountWithPasskey(profile) {
  const options = await api('/webauthn/register-new-options', { method: 'POST', body: profile });
  await waitForDocumentFocus();
  const response = await startRegistration(options);
  return api('/webauthn/register-new-verify', { method: 'POST', body: { username: profile.username, response } });
}
