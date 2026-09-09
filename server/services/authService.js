const crypto = require('crypto');

const JWT_SECRET = process.env.JWT_SECRET || 'nonposto-saas-secret-key-2026-secure-auth';

class AuthService {
  /**
   * Hash a password securely with a unique salt
   */
  hashPassword(password) {
    const salt = crypto.randomBytes(16).toString('hex');
    const hash = crypto.scryptSync(password, salt, 64).toString('hex');
    return `${salt}:${hash}`;
  }

  /**
   * Verify password against salt:hash
   */
  verifyPassword(password, storedHash) {
    try {
      const [salt, key] = storedHash.split(':');
      if (!salt || !key) return false;
      const keyBuffer = Buffer.from(key, 'hex');
      const derivedKey = crypto.scryptSync(password, salt, 64);
      return crypto.timingSafeEqual(keyBuffer, derivedKey);
    } catch (e) {
      return false;
    }
  }

  /**
   * Generate a secure signed JWT-like token (Header.Payload.Signature)
   */
  generateToken(user, expiresInDays = 30) {
    const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
    const exp = Math.floor(Date.now() / 1000) + (expiresInDays * 24 * 60 * 60);
    const payload = Buffer.from(JSON.stringify({
      id: user.id,
      email: user.email,
      name: user.name,
      company: user.company || '',
      exp
    })).toString('base64url');

    const signature = crypto
      .createHmac('sha256', JWT_SECRET)
      .update(`${header}.${payload}`)
      .digest('base64url');

    return `${header}.${payload}.${signature}`;
  }

  /**
   * Verify and decode a token
   */
  verifyToken(token) {
    try {
      if (!token) return null;
      const parts = token.split('.');
      if (parts.length !== 3) return null;

      const [header, payload, signature] = parts;
      const expectedSignature = crypto
        .createHmac('sha256', JWT_SECRET)
        .update(`${header}.${payload}`)
        .digest('base64url');

      if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature))) {
        return null;
      }

      const decoded = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
      if (decoded.exp && decoded.exp < Math.floor(Date.now() / 1000)) {
        return null; // Expired
      }

      return decoded;
    } catch (err) {
      return null;
    }
  }
}

module.exports = new AuthService();
