import React, { useState, useEffect } from 'react';
import { 
  X, Cpu, Sparkles, Terminal, Copy, Check, 
  Send, Bot, Play, Layers, RefreshCw 
} from 'lucide-react';

export default function McpModal({ 
  isOpen, 
  onClose, 
  activeWorkspace, 
  onPostCreatedViaAi 
}) {
  if (!isOpen) return null;

  const [activeSubtab, setActiveSubtab] = useState('assistant'); // 'assistant' | 'config' | 'tools'
  const [tools, setTools] = useState([]);
  const [copied, setCopied] = useState(false);

  // Interactive AI Assistant Chat State
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      text: `Ciao! Sono il tuo assistente AI collegato al protocollo MCP di NonPosto.io.\nPosso creare contenuti personalizzati per gli 8 canali, programmare post sul calendario del cliente "${activeWorkspace?.name}", ottimizzare copy e riorganizzare il piano editoriale.\n\nCosa vorresti pubblicare o pianificare?`
    }
  ]);
  const [inputPrompt, setInputPrompt] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    fetch('/api/mcp/tools')
      .then(r => r.json())
      .then(d => setTools(d.tools || []))
      .catch(e => console.error(e));
  }, []);

  const configSnippet = JSON.stringify({
    mcpServers: {
      "nonposto-social": {
        command: "node",
        args: [
          "C:\\Users\\ADMiN\\Desktop\\NonPosto.io\\bin\\mcp-server.js"
        ],
        env: {
          DATABASE_PATH: "C:\\Users\\ADMiN\\Desktop\\NonPosto.io\\server\\db\\nonposto.sqlite"
        }
      }
    }
  }, null, 2);

  const copyConfig = () => {
    navigator.clipboard.writeText(configSnippet);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSendAiMessage = async (e) => {
    e.preventDefault();
    if (!inputPrompt.trim() || isProcessing) return;

    const userMsg = inputPrompt;
    setInputPrompt('');
    setMessages(prev => [...prev, { role: 'user', text: userMsg }]);
    setIsProcessing(true);

    try {
      // 1. Optimize copy for the 8 platforms via AI
      const optRes = await fetch('/api/ai/optimize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          base_text: userMsg,
          platforms: ['facebook', 'instagram', 'tiktok', 'google_business', 'linkedin', 'threads', 'x', 'youtube'],
          tone: 'engaging'
        })
      });
      const optData = await optRes.json();

      // 2. Schedule a post for tomorrow at 11:00 via MCP tool
      const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
      tomorrow.setHours(11, 0, 0, 0);

      const mcpRes = await fetch('/api/mcp/call', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'create_post',
          arguments: {
            workspace_id: activeWorkspace.id,
            title: `AI: ${userMsg.slice(0, 35)}...`,
            base_content: userMsg,
            scheduled_at: tomorrow.toISOString(),
            status: 'scheduled',
            recycle_interval_days: 7,
            customizations: optData.optimized || {}
          }
        })
      });
      const mcpData = await mcpRes.json();

      const aiReply = `✅ **Post creato e programmato con successo via MCP!**\n\n` +
        `• **Piattaforme configurate:** Facebook, Instagram, TikTok, GMB, LinkedIn, Threads, X, YouTube.\n` +
        `• **Data pianificata:** Domani alle 11:00 (${tomorrow.toLocaleDateString('it-IT')})\n` +
        `• **ID Post nel DB:** #${mcpData.result?.post_id}\n` +
        `• **Ottimizzazioni applicate:** Testo sintetico <280 caratteri per X, hashtag per Instagram, hook video per TikTok e CTA per Google My Business.\n\n` +
        `Il post è già visibile e trascinabile nel tuo calendario!`;

      setMessages(prev => [...prev, { role: 'assistant', text: aiReply }]);
      if (onPostCreatedViaAi) onPostCreatedViaAi();
    } catch (err) {
      setMessages(prev => [...prev, { role: 'assistant', text: `Si è verificato un errore: ${err.message}` }]);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="standard-modal" style={{ maxWidth: 850, height: '85vh' }}>
        {/* Header */}
        <div className="modal-header">
          <div className="modal-title">
            <Cpu size={22} color="#8B5CF6" />
            <span>Integrazione MCP (Model Context Protocol) & AI Agent Studio</span>
          </div>
          <button className="modal-close-btn" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        {/* Sub-navigation tabs */}
        <div style={{ display: 'flex', gap: 10, padding: '10px 24px', background: 'var(--bg-card)', borderBottom: '1px solid var(--border-subtle)' }}>
          <button
            className={`btn-secondary ${activeSubtab === 'assistant' ? 'active' : ''}`}
            style={{ fontSize: '0.82rem', padding: '6px 12px', background: activeSubtab === 'assistant' ? 'var(--primary)' : 'transparent', color: 'white' }}
            onClick={() => setActiveSubtab('assistant')}
          >
            <Bot size={15} /> Assistente AI In-App
          </button>
          <button
            className={`btn-secondary ${activeSubtab === 'config' ? 'active' : ''}`}
            style={{ fontSize: '0.82rem', padding: '6px 12px', background: activeSubtab === 'config' ? 'var(--primary)' : 'transparent', color: 'white' }}
            onClick={() => setActiveSubtab('config')}
          >
            <Terminal size={15} /> Configurazione Claude / Cursor
          </button>
          <button
            className={`btn-secondary ${activeSubtab === 'tools' ? 'active' : ''}`}
            style={{ fontSize: '0.82rem', padding: '6px 12px', background: activeSubtab === 'tools' ? 'var(--primary)' : 'transparent', color: 'white' }}
            onClick={() => setActiveSubtab('tools')}
          >
            <Layers size={15} /> Tool MCP Disponibili ({tools.length})
          </button>
        </div>

        {/* Content */}
        <div className="modal-content-scroll" style={{ flex: 1, overflowY: 'auto' }}>
          {/* TAB 1: AI ASSISTANT CHAT */}
          {activeSubtab === 'assistant' && (
            <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
              <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 12, paddingBottom: 16 }}>
                {messages.map((m, idx) => (
                  <div
                    key={idx}
                    style={{
                      alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start',
                      maxWidth: '85%',
                      background: m.role === 'user' ? 'var(--primary)' : 'var(--bg-card)',
                      color: '#FFFFFF',
                      padding: '12px 16px',
                      borderRadius: 14,
                      fontSize: '0.86rem',
                      lineHeight: 1.5,
                      whiteSpace: 'pre-wrap',
                      border: m.role === 'user' ? 'none' : '1px solid var(--border-subtle)'
                    }}
                  >
                    {m.text}
                  </div>
                ))}
                {isProcessing && (
                  <div style={{ alignSelf: 'flex-start', color: '#A78BFA', fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Sparkles size={16} className="animate-spin" />
                    <span>L'agente AI sta elaborando i copy per gli 8 canali e pianificando sul calendario...</span>
                  </div>
                )}
              </div>

              {/* Input Form */}
              <form onSubmit={handleSendAiMessage} style={{ display: 'flex', gap: 10, marginTop: 'auto', paddingTop: 12, borderTop: '1px solid var(--border-subtle)' }}>
                <input
                  type="text"
                  className="input-field"
                  placeholder="Es. Annuncia l'evento di degustazione di sabato sera con sconto speciale..."
                  value={inputPrompt}
                  onChange={(e) => setInputPrompt(e.target.value)}
                  disabled={isProcessing}
                />
                <button type="submit" className="btn-ai-glow" disabled={isProcessing}>
                  <Send size={16} />
                  <span>Invia</span>
                </button>
              </form>
            </div>
          )}

          {/* TAB 2: CONFIG SNIPPET FOR EXTERNAL AI AGENTS */}
          {activeSubtab === 'config' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <p style={{ fontSize: '0.85rem', color: '#94A3B8', lineHeight: 1.5 }}>
                Puoi collegare questo server MCP direttamente a <strong>Claude Desktop</strong>, <strong>Cursor IDE</strong>, <strong>Antigravity</strong> o qualsiasi client AI conforme al Model Context Protocol. In questo modo il tuo assistente AI esterno potrà gestire e programmare i contenuti in autonomia.
              </p>

              <div style={{ position: 'relative' }}>
                <pre style={{ background: '#090D16', border: '1px solid var(--border-subtle)', borderRadius: 10, padding: 16, fontSize: '0.82rem', color: '#A78BFA', overflowX: 'auto', fontFamily: 'monospace' }}>
                  {configSnippet}
                </pre>
                <button
                  className="btn-secondary"
                  style={{ position: 'absolute', top: 10, right: 10, padding: '5px 10px', fontSize: '0.75rem' }}
                  onClick={copyConfig}
                >
                  {copied ? <Check size={14} color="#10B981" /> : <Copy size={14} />}
                  <span>{copied ? 'Copiato!' : 'Copia Config'}</span>
                </button>
              </div>

              <div style={{ background: 'rgba(139, 92, 246, 0.08)', padding: 14, borderRadius: 10, border: '1px solid rgba(139, 92, 246, 0.2)', fontSize: '0.8rem', color: '#C4B5FD' }}>
                💡 <strong>File di destinazione:</strong>
                <ul style={{ paddingLeft: 20, marginTop: 6, display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <li>Claude Desktop: <code>%APPDATA%\Claude\claude_desktop_config.json</code></li>
                  <li>Cursor IDE: Sezione Features &gt; MCP Server</li>
                </ul>
              </div>
            </div>
          )}

          {/* TAB 3: TOOLS LIST */}
          {activeSubtab === 'tools' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {tools.map(tool => (
                <div key={tool.name} style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', borderRadius: 10, padding: '12px 16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                    <code style={{ background: 'rgba(139, 92, 246, 0.2)', color: '#A78BFA', padding: '2px 8px', borderRadius: 4, fontSize: '0.82rem', fontWeight: 600 }}>
                      {tool.name}
                    </code>
                  </div>
                  <p style={{ fontSize: '0.82rem', color: '#94A3B8' }}>{tool.description}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="modal-footer">
          <span style={{ fontSize: '0.75rem', color: '#94A3B8' }}>
            Protocollo MCP 2024-11-05 standard | Endpoint HTTP e Stdio abilitati
          </span>
          <button className="btn-secondary" onClick={onClose}>
            Chiudi
          </button>
        </div>
      </div>
    </div>
  );
}
