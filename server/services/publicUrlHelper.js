const { get } = require('../db/database');

/**
 * Determine the public base URL of the tool (e.g. https://nonpostoio.onrender.com)
 * Uses database configuration, environment variables, or request headers with HTTPS enforcement.
 */
async function getPublicBaseUrl(req = null) {
  // 1. Explicit setting in DB (if configured by admin)
  try {
    const customPublicUrlRow = await get("SELECT value FROM settings WHERE key = 'app_public_url'");
    if (customPublicUrlRow?.value?.trim()) {
      return customPublicUrlRow.value.trim().replace(/\/+$/, '');
    }

    // Check if OAuth redirect URI is defined, extract origin
    const redirectRow = await get("SELECT value FROM settings WHERE key = 'oauth_meta_redirect_uri'");
    if (redirectRow?.value?.trim()) {
      try {
        const parsed = new URL(redirectRow.value.trim());
        return parsed.origin;
      } catch (e) {}
    }
  } catch (e) {}

  // 2. Render cloud or host environment variables
  if (process.env.RENDER_EXTERNAL_URL) {
    return process.env.RENDER_EXTERNAL_URL.replace(/\/+$/, '');
  }
  if (process.env.APP_URL) {
    return process.env.APP_URL.replace(/\/+$/, '');
  }
  if (process.env.BASE_URL) {
    return process.env.BASE_URL.replace(/\/+$/, '');
  }

  // 3. Extract from incoming HTTP request if available
  if (req) {
    const host = req.get ? req.get('host') : req.headers?.host;
    if (host) {
      const isLocal = host.includes('localhost') || host.includes('127.0.0.1');
      const proto = isLocal 
        ? (req.headers?.['x-forwarded-proto'] || req.protocol || 'http')
        : 'https'; // Meta & public crawlers require HTTPS
      return `${proto}://${host}`.replace(/\/+$/, '');
    }
  }

  // 4. Default production domain fallback
  return 'https://nonpostoio.onrender.com';
}

/**
 * Normalizes any relative media path (e.g. /uploads/123.jpg) into an absolute public URL
 */
function toAbsoluteMediaUrl(url, baseUrl) {
  if (!url || typeof url !== 'string') return '';
  const trimmed = url.trim();
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    return trimmed;
  }
  const cleanBase = (baseUrl || 'https://nonpostoio.onrender.com').replace(/\/+$/, '');
  const cleanPath = trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
  return `${cleanBase}${cleanPath}`;
}

module.exports = {
  getPublicBaseUrl,
  toAbsoluteMediaUrl
};
