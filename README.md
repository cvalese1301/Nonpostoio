# NonPosto.io 🚀
### Piattaforma di Social Media Management & Content Scheduling multi-canale (stile Publer.io)

NonPosto.io è una piattaforma completa per la pianificazione, ottimizzazione e pubblicazione di contenuti social su **8 canali contemporaneamente**, dotata di:
- **Calendario visivo con Drag & Drop** nativo per riprogrammare e spostare i post al volo.
- **Supporto multi-account**: gestione di più clienti/brand con canali, post e media isolati.
- **Compositore avanzato** con tab di personalizzazione per ogni canale e **anteprima grafica realistica per smartphone** (Instagram, Facebook, TikTok, GMB, LinkedIn, Threads, X, YouTube).
- **Riciclo automatico dei contenuti (Evergreen)** per ripubblicare post ricorrenti ogni N giorni.
- **Archiviazione Cloud a costo zero tramite pCloud API** (10GB gratuiti per immagini e video) con backup automatico del database.
- **Server MCP (Model Context Protocol)** integrato per consentire il controllo e la pianificazione autonoma tramite agenti AI (Claude Desktop, Cursor, Antigravity, ecc.).
- **Deploy nativo a costo zero su Render.com** tramite `render.yaml`.

---

## 📱 Gli 8 Canali Supportati

1. **Facebook** (Pagine aziendali e Gruppi)
2. **Instagram** (Feed, Reels, Storie, primo commento automatico e hashtag)
3. **TikTok** (Didascalie brevi, sound virali, hook e hashtag di tendenza)
4. **Google My Business** (Aggiornamenti attività locale con pulsanti CTA: *Scopri di più, Chiama, Prenota, Ordina*)
5. **LinkedIn** (Post B2B, storytelling professionale, connessioni di 1° grado)
6. **Threads** (Conversazioni spontanee della community Meta)
7. **X (Twitter)** (Controllo rigoroso limite 280 caratteri, hashtag e contatori)
8. **YouTube** (Shorts verticali e post community con titolo SEO e tag)

---

## ⚡ Avvio Rapido in Locale

### Prerequisiti
- Node.js >= 18 installato

### Avvio
```bash
# 1. Installa le dipendenze
npm install
cd client && npm install && cd ..

# 2. Compila il client frontend
npm run build:client

# 3. Avvia il server
npm start
```

Apri il browser su: **`http://localhost:3000`**

---

## ☁️ Configurazione Archiviazione pCloud (Zero-Cost)

NonPosto.io include un'integrazione diretta con **pCloud** che offre **10GB di archiviazione cloud gratuita**:
1. Registrati gratis su [pCloud.com](https://www.pcloud.com).
2. Vai su [pCloud Developer Portal](https://docs.pcloud.com) e ottieni un **OAuth2 Access Token**.
3. Apri **NonPosto.io > Impostazioni & Cloud** e incolla il token nel campo `pCloud Access Token`.
4. Salva: tutti i file caricati verranno archiviati nella cartella `/NonPosto/{NomeCliente}/` e serviti via streaming link ad alta velocità!
5. *Nota:* Se non inserisci il token, l'applicazione funziona comunque al 100% salvando i file in locale a costo zero.

---

## 🤖 Integrazione MCP (Model Context Protocol) per AI

NonPosto.io espone un server MCP completo sia via **HTTP/SSE** (`/api/mcp/call`) sia da riga di comando via **stdio** (`bin/mcp-server.js`).

### Configurazione per Claude Desktop (`claude_desktop_config.json`)
Aggiungi al tuo file di configurazione di Claude Desktop:
```json
{
  "mcpServers": {
    "nonposto-social": {
      "command": "node",
      "args": [
        "c:\\Users\\ADMiN\\Desktop\\NonPosto.io\\bin\\mcp-server.js"
      ],
      "env": {
        "DATABASE_PATH": "c:\\Users\\ADMiN\\Desktop\\NonPosto.io\\server\\db\\nonposto.sqlite"
      }
    }
  }
}
```

### Strumenti MCP Disponibili per l'AI
- `list_workspaces`: Elenca i clienti configurati.
- `list_channels`: Elenca gli 8 canali per il cliente attivo.
- `create_post`: Crea e programma post con personalizzazione per tutti gli 8 canali.
- `reschedule_post`: Sposta la data/ora di un post sul calendario.
- `delete_post`: Elimina un post.
- `optimize_copy_for_channels`: Adatta un testo master ai requisiti specifici degli 8 social.
- `get_calendar_posts`: Recupera la programmazione settimanale o mensile.

---

## 🌐 Deploy su Render.com a Costo Zero

Il progetto include già il file `render.yaml` e la configurazione `package.json` pronta:
1. Crea un account su [Render.com](https://render.com).
2. Crea un nuovo **Web Service** collegando il repository GitHub/Git di questo progetto.
3. Render rileverà automaticamente `render.yaml` oppure imposta:
   - **Environment:** Node
   - **Build Command:** `npm run build`
   - **Start Command:** `npm start`
   - **Plan:** Free
4. Aggiungi nelle variabili d'ambiente di Render (opzionale):
   - `PCLOUD_ACCESS_TOKEN`: il tuo token pCloud
   - `PCLOUD_REGION`: `eu` (o `us`)
   - `OPENAI_API_KEY`: per LLM personalizzati (opzionale, c'è già il motore integrato)
5. Clicca su **Deploy**: il tuo servizio sarà online in pochi minuti con certificato SSL HTTPS gratuito!

---

## 📁 Struttura del Progetto
```
NonPosto.io/
├── bin/
│   └── mcp-server.js           # Server MCP stdio per Claude & Cursor
├── client/                     # Frontend SPA Vite + React
│   ├── src/
│   │   ├── components/         # Calendario, Compositore, Anteprime Social
│   │   ├── styles/index.css    # Design System Luxury Publer-style
│   │   ├── App.jsx             # Orchestratore multi-account
│   │   └── main.jsx
│   └── vite.config.js
├── server/                     # Backend Node.js / Express
│   ├── db/database.js          # SQLite e seed 8 canali
│   ├── mcp/                    # Tool MCP e protocollo AI
│   ├── routes/api.js           # REST API
│   ├── services/
│   │   ├── aiOptimizer.js      # Ottimizzatore copy 8 social
│   │   ├── pcloudStorage.js    # Servizio Cloud Storage pCloud
│   │   └── scheduler.js        # Background publisher & Riciclo
│   └── index.js                # Entry point server
├── render.yaml                 # Blueprint Render.com
├── Dockerfile                  # Container Docker
└── package.json                # Script e dipendenze
```
