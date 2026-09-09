// SaaS Authentication Service & Automatic Fetch Interceptor
const TOKEN_KEY = 'nonposto_auth_token';

// Automatically intercept window.fetch to attach Bearer token to all /api requests
const originalFetch = window.fetch;
window.fetch = async function(input, init = {}) {
  const token = localStorage.getItem(TOKEN_KEY);
  
  const url = typeof input === 'string' ? input : (input?.url || '');
  const isApiCall = url.startsWith('/api') || url.includes('/api/');
  const isAuthRoute = url.includes('/api/auth/login') || url.includes('/api/auth/register');

  if (token && isApiCall && !isAuthRoute) {
    init = init || {};
    init.headers = {
      ...(init.headers || {}),
      'Authorization': `Bearer ${token}`
    };
  }

  const response = await originalFetch(input, init);

  // If unauthorized on a protected endpoint, notify the app to show login
  if (response.status === 401 && isApiCall && !isAuthRoute) {
    localStorage.removeItem(TOKEN_KEY);
    window.dispatchEvent(new CustomEvent('auth:unauthorized'));
  }

  return response;
};

export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token) {
  if (token) {
    localStorage.setItem(TOKEN_KEY, token);
  } else {
    localStorage.removeItem(TOKEN_KEY);
  }
}

export function removeToken() {
  localStorage.removeItem(TOKEN_KEY);
}

export async function login(email, password) {
  const res = await originalFetch('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Errore durante il login');
  }
  setToken(data.token);
  return data;
}

export async function register(name, email, password, company = '') {
  const res = await originalFetch('/api/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, email, password, company })
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Errore durante la registrazione');
  }
  setToken(data.token);
  return data;
}

export async function getCurrentUser() {
  const token = getToken();
  if (!token) return null;

  try {
    const res = await originalFetch('/api/auth/me', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    if (!res.ok) {
      removeToken();
      return null;
    }
    const data = await res.json();
    return data.user;
  } catch (e) {
    removeToken();
    return null;
  }
}

export function logout() {
  removeToken();
  window.dispatchEvent(new CustomEvent('auth:logout'));
}
