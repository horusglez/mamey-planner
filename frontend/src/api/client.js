const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:4100/api';

function getToken() {
  return localStorage.getItem('mamey_token');
}

export function setToken(token) {
  if (token) localStorage.setItem('mamey_token', token);
  else localStorage.removeItem('mamey_token');
}

export async function api(path, { method = 'GET', body } = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(getToken() ? { Authorization: `Bearer ${getToken()}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (res.status === 204) return null;
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new Error(data?.error || `request failed (${res.status})`);
  return data;
}

export async function downloadFile(path, filename) {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: getToken() ? { Authorization: `Bearer ${getToken()}` } : {},
  });
  if (!res.ok) throw new Error(`request failed (${res.status})`);
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
