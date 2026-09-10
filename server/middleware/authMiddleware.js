const authService = require('../services/authService');
const { get } = require('../db/database');

async function authMiddleware(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    let token = null;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.split(' ')[1];
    } else if (req.query && req.query.token) {
      token = req.query.token;
    }

    if (!token) {
      return res.status(401).json({ error: 'Accesso non autorizzato. Effettua il login.' });
    }
    const decoded = authService.verifyToken(token);

    if (!decoded || !decoded.id) {
      return res.status(401).json({ error: 'Sessione scaduta o non valida. Effettua nuovamente il login.' });
    }

    const user = await get('SELECT id, name, email, company, is_admin, created_at FROM users WHERE id = ?', [decoded.id]);
    if (!user) {
      return res.status(401).json({ error: 'Utente non trovato.' });
    }

    req.user = user;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Errore autenticazione: ' + err.message });
  }
}

module.exports = authMiddleware;
