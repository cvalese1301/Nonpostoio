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

## 📱 Gli 8 Canali Supportati & Istruzioni di Collegamento API

NonPosto.io supporta 8 piattaforme con collegamento API diretto. Ecco le istruzioni dettagliate passo-passo per ottenere le credenziali per ciascun canale:

---

### 1. 🟦 Facebook (Meta Graph API)
- **Portale Sviluppatori:** [Meta for Developers](https://developers.facebook.com/)
- **Permessi Richiesti:** `pages_show_list`, `pages_read_engagement`, `pages_manage_posts`
- **Istruzioni Passo-Passo:**
  1. Accedi a [Meta for Developers](https://developers.facebook.com/) con il tuo account Facebook.
  2. Clicca su **"Crea applicazione"**, seleziona il tipo **"Business"** o **"Altro"** e assegna un nome (es. *"NonPosto Social"*).
  3. Nella dashboard dell'app, aggiungi il prodotto **"Facebook Login for Business"** oppure usa lo strumento **Graph API Explorer**.
  4. Nel selettore "Utente o Pagina", seleziona la tua Pagina Facebook e aggiungi i permessi: `pages_show_list`, `pages_read_engagement`, `pages_manage_posts`.
  5. Clicca su **"Genera Access Token"**. Per ottenere un token permanente senza scadenza, scambia il token utente a lunga scadenza tramite l'endpoint `oauth/access_token`.
  6. Copia il tuo **Meta Page ID** (visibile nelle impostazioni della tua Pagina Facebook > Informazioni) e incollalo nel modulo di NonPosto insieme al Token.

---

### 2. 🟪 Instagram (Instagram Graph API)
- **Portale Sviluppatori:** [Instagram Platform (Meta)](https://developers.facebook.com/docs/instagram-platform)
- **Permessi Richiesti:** `instagram_basic`, `instagram_content_publish`, `pages_show_list`
- **Istruzioni Passo-Passo:**
  1. Assicurati che il tuo account Instagram sia convertito in **Account Professionale** (Aziendale o Creator) e sia collegato alla tua Pagina Facebook.
  2. Nella tua app su Meta for Developers, aggiungi il prodotto **"Instagram Graph API"**.
  3. Nel Graph API Explorer, seleziona la pagina Facebook collegata e richiedi i permessi `instagram_basic` e `instagram_content_publish`.
  4. Esegui una chiamata GET all'endpoint `me/accounts?fields=instagram_business_account` per ottenere il tuo **Instagram Business Account ID** (codice numerico di 17 cifre).
  5. Inserisci l'ID e il Token nel modulo di collegamento di NonPosto.

---

### 3. ⬛ TikTok (TikTok for Developers)
- **Portale Sviluppatori:** [TikTok for Developers](https://developers.tiktok.com/)
- **Permessi Richiesti:** `video.upload`, `video.publish`, `user.info.basic`
- **Istruzioni Passo-Passo:**
  1. Accedi a [developers.tiktok.com](https://developers.tiktok.com/) e registrati come sviluppatore TikTok.
  2. Clicca su **"Manage apps"** e seleziona **"Create an app"**.
  3. Nella sezione "Add products", attiva la **"Content Posting API"** e richiedi gli ambiti `video.upload` e `video.publish`.
  4. Copia la **Client Key** e il **Client Secret** dalla sezione *Basic Settings* dell'app.
  5. Genera l'Access Token utente (OpenID) tramite il flusso OAuth di TikTok e inseriscilo in NonPosto.

---

### 4. 🔵 Google My Business (Google Business Profile API)
- **Portale Sviluppatori:** [Google Cloud Console](https://console.cloud.google.com/)
- **Permessi Richiesti:** `https://www.googleapis.com/auth/business.manage`
- **Istruzioni Passo-Passo:**
  1. Accedi a [Google Cloud Console](https://console.cloud.google.com/) e crea o seleziona un progetto.
  2. Vai su **"API e Servizi" > "Libreria"** e abilita **"Google Business Profile API"** e **"My Business Business Information API"**.
  3. Crea una chiave API (API Key) oppure configura la schermata di consenso OAuth con credenziali **OAuth 2.0 Client ID**.
  4. Recupera il **Location ID** della tua scheda Google Maps (visibile in Google Business Profile > Impostazioni avanzate del profilo > ID profilo attività, es. `locations/123456...`).
  5. Inserisci il Location ID e la chiave API/Token in NonPosto.

---

### 5. 🔷 LinkedIn (LinkedIn Community Management API)
- **Portale Sviluppatori:** [LinkedIn Developer Portal](https://developer.linkedin.com/)
- **Permessi Richiesti:** `w_member_social` (profili personali), `w_organization_social` (pagine aziendali)
- **Istruzioni Passo-Passo:**
  1. Accedi a [developer.linkedin.com](https://developer.linkedin.com/) e clicca su **"Create App"**.
  2. Inserisci il nome dell'app e associa l'URL della tua Pagina Aziendale LinkedIn per ottenere la verifica.
  3. Nella scheda "Products", richiedi l'accesso a **"Share on LinkedIn"** e **"Sign In with LinkedIn using OpenID Connect"** (oppure *Community Management API*).
  4. Nella scheda "Auth", genera un OAuth 2.0 Access Token con lo scope `w_member_social` o `w_organization_social`.
  5. Copia l'URN dell'organizzazione (formato: `urn:li:organization:12345678`, visibile dall'ID numerico nella barra degli indirizzi della tua pagina LinkedIn Admin).

---

### 6. 🖤 Threads (Meta Threads API)
- **Portale Sviluppatori:** [Meta Threads API Docs](https://developers.facebook.com/docs/threads)
- **Permessi Richiesti:** `threads_basic`, `threads_content_publish`
- **Istruzioni Passo-Passo:**
  1. Accedi a [Meta for Developers](https://developers.facebook.com/) e crea una nuova app selezionando il caso d'uso **"Threads"**.
  2. Aggiungi le autorizzazioni `threads_basic` e `threads_content_publish`.
  3. Aggiungi il tuo account Threads come "Tester" nella sezione Ruoli dell'app ed effettua l'accesso per autorizzare.
  4. Genera l'Access Token utente a lunga scadenza tramite il tool di autorizzazione Threads OAuth.
  5. Inserisci il tuo **Threads User ID** numerico e l'Access Token in NonPosto.

---

### 7. 🐦 X / Twitter (X API v2)
- **Portale Sviluppatori:** [X Developer Portal](https://developer.x.com/en/portal/dashboard)
- **Permessi Richiesti:** `Read and Write`
- **Istruzioni Passo-Passo:**
  1. Accedi a [developer.x.com](https://developer.x.com/) con il tuo account X e attiva il piano Free (che include la creazione di tweet via API).
  2. Crea un Progetto e un'App all'interno del Developer Portal.
  3. In **"User authentication settings"**, attiva OAuth 1.0a e seleziona i permessi **"Read and Write"**.
  4. Nella scheda **"Keys and Tokens"**, rigenera e copia:
     - **API Key** & **API Key Secret** (Consumer Keys)
     - **Access Token** & **Access Token Secret** (con permessi Write)
  5. Incolla i 4 valori nel modulo di NonPosto.

---

### 8. 🔴 YouTube (YouTube Data API v3)
- **Portale Sviluppatori:** [Google Cloud Console - YouTube API](https://console.cloud.google.com/apis/library/youtube.googleapis.com)
- **Permessi Richiesti:** `https://www.googleapis.com/auth/youtube.upload`
- **Istruzioni Passo-Passo:**
  1. Accedi a [Google Cloud Console](https://console.cloud.google.com/) e seleziona o crea un progetto.
  2. Nella libreria API, cerca e abilita la **"YouTube Data API v3"**.
  3. Configura la schermata di consenso OAuth e crea credenziali **OAuth 2.0 Client ID**.
  4. Recupera il tuo **Channel ID** da YouTube Studio (Impostazioni > Canale > Impostazioni avanzate > ID canale, inizia con "UC...").
  5. Genera il Refresh / Access Token con ambito `youtube.upload` e incollalo nel modulo di NonPosto.

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
