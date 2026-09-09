const express = require('express');
const cors = require('cors');
const path = require('path');
const { initDb } = require('./db/database');
const scheduler = require('./services/scheduler');
const apiRoutes = require('./routes/api');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Static uploads route (fallback/local storage)
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// REST API routes
app.use('/api', apiRoutes);

// Health check endpoint for Render.com
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString(), service: 'NonPosto.io' });
});

// Serve frontend in production or if client/dist exists
const clientDistPath = path.join(__dirname, '../client/dist');
app.use(express.static(clientDistPath));

app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api') || req.path.startsWith('/uploads')) {
    return next();
  }
  const indexPath = path.join(clientDistPath, 'index.html');
  res.sendFile(indexPath, (err) => {
    if (err) {
      res.send(`
        <!DOCTYPE html>
        <html>
        <head><title>NonPosto.io - Backend Ready</title></head>
        <body style="font-family: sans-serif; padding: 40px; background: #0F172A; color: #F8FAFC;">
          <h2>NonPosto.io Server Active 🚀</h2>
          <p>L'API backend è attiva e pronta su <code>http://localhost:${PORT}/api</code>.</p>
          <p>Per la UI di sviluppo esegui: <code>npm run dev:client</code> oppure compila con <code>npm run build</code>.</p>
        </body>
        </html>
      `);
    }
  });
});

async function startServer() {
  try {
    await initDb();
    scheduler.start();

    app.listen(PORT, () => {
      console.log(`=========================================`);
      console.log(`  NonPosto.io - Social Media Platform   `);
      console.log(`  Server running on http://localhost:${PORT}`);
      console.log(`  Health check: http://localhost:${PORT}/health`);
      console.log(`  API Base:     http://localhost:${PORT}/api`);
      console.log(`=========================================`);
    });
  } catch (err) {
    console.error('Failed to start NonPosto.io server:', err);
    process.exit(1);
  }
}

startServer();
