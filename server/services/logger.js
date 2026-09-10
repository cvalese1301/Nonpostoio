const { run, all } = require('../db/database');

class Logger {
  /**
   * Sanitizes objects by masking sensitive keys
   */
  sanitize(data) {
    if (!data || typeof data !== 'object') return data;
    try {
      const sensitiveKeys = ['password', 'secret', 'token', 'code', 'access_token', 'appsecret', 'client_secret'];
      const copy = Array.isArray(data) ? [...data] : { ...data };
      for (const [k, v] of Object.entries(copy)) {
        const lowerK = k.toLowerCase();
        if (sensitiveKeys.some(sk => lowerK.includes(sk))) {
          copy[k] = typeof v === 'string' && v.length > 8 ? `${v.substring(0, 4)}...***` : '***MASKED***';
        } else if (typeof v === 'object' && v !== null) {
          copy[k] = this.sanitize(v);
        }
      }
      return copy;
    } catch (e) {
      return { sanitize_error: e.message };
    }
  }

  /**
   * Write log entry to console and database
   */
  async writeLog(level, category, message, details = {}) {
    const timestamp = new Date().toISOString();
    const sanitizedDetails = this.sanitize(details);
    const detailsJson = JSON.stringify(sanitizedDetails);

    // 1. Output to console for Render & local terminal
    const tag = `[${timestamp}] [${level}] [${category.toUpperCase()}]`;
    if (level === 'ERROR') {
      console.error(`${tag} ${message}`, Object.keys(sanitizedDetails || {}).length > 0 ? sanitizedDetails : '');
    } else if (level === 'WARN') {
      console.warn(`${tag} ${message}`, Object.keys(sanitizedDetails || {}).length > 0 ? sanitizedDetails : '');
    } else {
      console.log(`${tag} ${message}`, Object.keys(sanitizedDetails || {}).length > 0 ? sanitizedDetails : '');
    }

    // 2. Persist to SQLite system_logs table
    try {
      await run(
        `INSERT INTO system_logs (level, category, message, details_json) VALUES (?, ?, ?, ?)`,
        [level, category, message, detailsJson]
      );

      // Auto-prune logs to keep last 500 entries
      await run(
        `DELETE FROM system_logs WHERE id NOT IN (SELECT id FROM system_logs ORDER BY id DESC LIMIT 500)`
      );
    } catch (dbErr) {
      // Don't throw to avoid breaking main application flow
    }
  }

  async info(category, message, details = {}) {
    return this.writeLog('INFO', category, message, details);
  }

  async warn(category, message, details = {}) {
    return this.writeLog('WARN', category, message, details);
  }

  async error(category, message, details = {}) {
    return this.writeLog('ERROR', category, message, details);
  }

  /**
   * Retrieve filtered logs
   */
  async getLogs({ limit = 100, level, category, search } = {}) {
    let sql = 'SELECT * FROM system_logs WHERE 1=1';
    const params = [];

    if (level && level !== 'ALL') {
      sql += ' AND level = ?';
      params.push(level);
    }
    if (category && category !== 'ALL') {
      sql += ' AND category = ?';
      params.push(category);
    }
    if (search && search.trim()) {
      sql += ' AND (message LIKE ? OR category LIKE ? OR details_json LIKE ?)';
      const term = `%${search.trim()}%`;
      params.push(term, term, term);
    }

    sql += ' ORDER BY id DESC LIMIT ?';
    params.push(Number(limit) || 100);

    return await all(sql, params);
  }

  /**
   * Clear all logs
   */
  async clearLogs() {
    return await run('DELETE FROM system_logs');
  }
}

module.exports = new Logger();
