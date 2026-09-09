const authService = require('../services/authService');
const { get } = require('../db/database');

async function authMiddleware(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Accesso non autorizzato. Effettua il login.' });
    }

    const token = authHeader.split(' ')[1];
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
