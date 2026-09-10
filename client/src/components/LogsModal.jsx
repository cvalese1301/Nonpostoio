import React, { useState, useEffect, useRef } from 'react';
import { 
  X, Activity, RefreshCw, Trash2, Download, Search, 
  AlertCircle, AlertTriangle, Info, Copy, Check, ChevronDown, ChevronRight, Filter
} from 'lucide-react';

export default function LogsModal({ isOpen, onClose }) {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [levelFilter, setLevelFilter] = useState('ALL');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedId, setExpandedId] = useState(null);
  const [copiedId, setCopiedId] = useState(null);
  const [autoRefresh, setAutoRefresh] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchLogs();
    }
  }, [isOpen, levelFilter, categoryFilter]);

  useEffect(() => {
    let interval = null;
    if (isOpen && autoRefresh) {
      interval = setInterval(() => {
        fetchLogs(true);
      }, 3000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isOpen, autoRefresh, levelFilter, categoryFilter, searchTerm]);

  const fetchLogs = async (isBackground = false) => {
    if (!isBackground) setLoading(true);
    try {
      const params = new URLSearchParams();
      if (levelFilter !== 'ALL') params.append('level', levelFilter);
      if (categoryFilter !== 'ALL') params.append('category', categoryFilter);
      if (searchTerm.trim()) params.append('search', searchTerm.trim());

      const res = await fetch(`/api/logs?${params.toString()}`);
      const data = await res.json();
      if (data.success && data.logs) {
        setLogs(data.logs);
      }
    } catch (err) {
      console.error('Failed to fetch logs:', err);
    } finally {
      if (!isBackground) setLoading(false);
    }
  };

  const handleClearLogs = async () => {
    if (!confirm('Sei sicuro di voler cancellare tutti i log registrati?')) return;
    try {
      const res = await fetch('/api/logs', { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        setLogs([]);
      }
    } catch (err) {
      alert('Errore durante la cancellazione dei log.');
    }
  };

  const handleDownload = () => {
    window.open('/api/logs/download', '_blank');
  };

  const handleCopyDetails = (id, details) => {
    try {
      navigator.clipboard.writeText(typeof details === 'string' ? details : JSON.stringify(details, null, 2));
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch (e) {
      alert('Impossibile copiare negli appunti.');
    }
  };

  if (!isOpen) return null;

  const errorCount = logs.filter(l => l.level === 'ERROR').length;
  const warnCount = logs.filter(l => l.level === 'WARN').length;

  const getLevelBadge = (level) => {
    switch (level) {
      case 'ERROR':
        return (
          <span style={{ 
            display: 'inline-flex', alignItems: 'center', gap: 4, 
            background: 'rgba(239, 68, 68, 0.15)', color: '#F87171', border: '1px solid rgba(239, 68, 68, 0.3)', 
            padding: '2px 8px', borderRadius: 6, fontSize: '0.72rem', fontWeight: 700 
          }}>
            <AlertCircle size={12} /> ERROR
          </span>
        );
      case 'WARN':
        return (
          <span style={{ 
            display: 'inline-flex', alignItems: 'center', gap: 4, 
            background: 'rgba(245, 158, 11, 0.15)', color: '#FBBF24', border: '1px solid rgba(245, 158, 11, 0.3)', 
            padding: '2px 8px', borderRadius: 6, fontSize: '0.72rem', fontWeight: 700 
          }}>
            <AlertTriangle size={12} /> WARN
          </span>
        );
      default:
        return (
          <span style={{ 
            display: 'inline-flex', alignItems: 'center', gap: 4, 
            background: 'rgba(59, 130, 246, 0.15)', color: '#60A5FA', border: '1px solid rgba(59, 130, 246, 0.3)', 
            padding: '2px 8px', borderRadius: 6, fontSize: '0.72rem', fontWeight: 700 
          }}>
            <Info size={12} /> INFO
          </span>
        );
    }
  };

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()} style={{ zIndex: 1100 }}>
      <div className="standard-modal" style={{ maxWidth: 840, width: '92vw', maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}>
        
        {/* Header */}
        <div className="modal-header" style={{ padding: '16px 22px', borderBottom: '1px solid #1E293B' }}>
          <div className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ background: 'rgba(139, 92, 246, 0.15)', padding: 6, borderRadius: 8, display: 'flex' }}>
              <Activity size={18} color="#A78BFA" />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: '1.05rem', fontWeight: 700, color: '#F1F5F9' }}>Diagnostica & Log Sistema</span>
                {errorCount > 0 && (
                  <span style={{ background: '#EF4444', color: 'white', fontSize: '0.68rem', fontWeight: 800, padding: '1px 7px', borderRadius: 999 }}>
                    {errorCount} {errorCount === 1 ? 'errore' : 'errori'}
                  </span>
                )}
              </div>
              <p style={{ fontSize: '0.74rem', color: '#94A3B8', margin: 0, marginTop: 2 }}>
                Traccia in tempo reale di OAuth, connessioni ai canali social, pubblicazioni ed errori API.
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button 
              className="btn-secondary" 
              onClick={() => fetchLogs()} 
              disabled={loading}
              title="Aggiorna i log"
              style={{ fontSize: '0.75rem', padding: '6px 10px', display: 'flex', alignItems: 'center', gap: 5 }}
            >
              <RefreshCw size={13} className={loading ? 'spinning' : ''} />
              <span>Aggiorna</span>
            </button>

            <button 
              className="btn-secondary" 
              onClick={handleDownload} 
              title="Scarica log in file di testo"
              style={{ fontSize: '0.75rem', padding: '6px 10px', display: 'flex', alignItems: 'center', gap: 5 }}
            >
              <Download size={13} />
              <span>Scarica</span>
            </button>

            <button 
              className="btn-secondary" 
              onClick={handleClearLogs} 
              title="Svuota registro"
              style={{ fontSize: '0.75rem', padding: '6px 10px', display: 'flex', alignItems: 'center', gap: 5, color: '#EF4444' }}
            >
              <Trash2 size={13} />
            </button>

            <button className="modal-close-btn" onClick={onClose} style={{ marginLeft: 4 }}>
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Toolbar: Filters & Search */}
        <div style={{ padding: '12px 22px', background: '#0B0F19', borderBottom: '1px solid #1E293B', display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 10 }}>
          {/* Search */}
          <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
            <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#64748B' }} />
            <input 
              type="text" 
              placeholder="Cerca messaggio o codice errore..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && fetchLogs()}
              style={{ 
                width: '100%', padding: '6px 10px 6px 32px', background: '#151D30', 
                border: '1px solid #23304E', borderRadius: 8, color: '#F1F5F9', fontSize: '0.78rem' 
              }}
            />
          </div>

          {/* Level Filter */}
          <select 
            value={levelFilter} 
            onChange={(e) => setLevelFilter(e.target.value)}
            style={{ 
              background: '#151D30', border: '1px solid #23304E', color: '#CBD5E1', 
              padding: '6px 10px', borderRadius: 8, fontSize: '0.78rem', cursor: 'pointer' 
            }}
          >
            <option value="ALL">Tutti i Livelli</option>
            <option value="ERROR">🔴 Solo Errori (ERROR)</option>
            <option value="WARN">🟡 Solo Avvisi (WARN)</option>
            <option value="INFO">🔵 Solo Info (INFO)</option>
          </select>

          {/* Category Filter */}
          <select 
            value={categoryFilter} 
            onChange={(e) => setCategoryFilter(e.target.value)}
            style={{ 
              background: '#151D30', border: '1px solid #23304E', color: '#CBD5E1', 
              padding: '6px 10px', borderRadius: 8, fontSize: '0.78rem', cursor: 'pointer' 
            }}
          >
            <option value="ALL">Tutte le Categorie</option>
            <option value="oauth_meta">Meta (Facebook / IG)</option>
            <option value="oauth_threads">Threads</option>
            <option value="channels">Canali</option>
            <option value="settings">Impostazioni</option>
            <option value="system">Sistema</option>
          </select>

          {/* Live Auto-Refresh Checkbox */}
          <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.74rem', color: '#94A3B8', cursor: 'pointer', userSelect: 'none' }}>
            <input 
              type="checkbox" 
              checked={autoRefresh} 
              onChange={(e) => setAutoRefresh(e.target.checked)} 
              style={{ cursor: 'pointer' }}
            />
            <span>Auto-aggiorna (3s)</span>
          </label>
        </div>

        {/* Logs List */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 22px', display: 'flex', flexDirection: 'column', gap: 10 }}>
          {loading && logs.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 20px', color: '#94A3B8' }}>
              <RefreshCw size={24} className="spinning" style={{ margin: '0 auto 12px' }} />
              <p style={{ fontSize: '0.85rem' }}>Caricamento registro diagnostica...</p>
            </div>
          ) : logs.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '48px 20px', background: '#0F172A', border: '1px dashed #1E293B', borderRadius: 12 }}>
              <Check size={28} color="#10B981" style={{ margin: '0 auto 10px' }} />
              <strong style={{ fontSize: '0.9rem', color: '#E2E8F0', display: 'block', marginBottom: 4 }}>Nessun evento o errore registrato</strong>
              <p style={{ fontSize: '0.78rem', color: '#64748B', maxWidth: 360, margin: '0 auto' }}>
                Il sistema non ha rilevato errori con i filtri selezionati. Le nuove operazioni compariranno qui automaticamente.
              </p>
            </div>
          ) : (
            logs.map((log) => {
              const isExpanded = expandedId === log.id;
              let parsedDetails = null;
              let hasDetails = false;
              try {
                if (log.details_json && log.details_json !== '{}') {
                  parsedDetails = JSON.parse(log.details_json);
                  hasDetails = Object.keys(parsedDetails || {}).length > 0;
                }
              } catch (e) {
                parsedDetails = log.details_json;
                hasDetails = !!log.details_json;
              }

              const formattedDate = new Date(log.created_at).toLocaleString('it-IT', {
                day: '2-digit', month: '2-digit', year: 'numeric',
                hour: '2-digit', minute: '2-digit', second: '2-digit'
              });

              return (
                <div 
                  key={log.id} 
                  style={{ 
                    background: log.level === 'ERROR' ? 'rgba(239, 68, 68, 0.04)' : '#0F172A', 
                    border: `1px solid ${log.level === 'ERROR' ? 'rgba(239, 68, 68, 0.25)' : '#1E293B'}`, 
                    borderRadius: 10, 
                    padding: '12px 16px',
                    transition: 'border-color 0.15s'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      {getLevelBadge(log.level)}
                      <span style={{ 
                        background: '#1E293B', color: '#CBD5E1', padding: '2px 8px', borderRadius: 6, 
                        fontSize: '0.7rem', fontWeight: 600, textTransform: 'uppercase' 
                      }}>
                        {log.category}
                      </span>
                    </div>
                    <span style={{ fontSize: '0.72rem', color: '#64748B', fontVariantNumeric: 'tabular-nums' }}>
                      {formattedDate}
                    </span>
                  </div>

                  <div style={{ fontSize: '0.84rem', color: '#F1F5F9', fontWeight: 500, lineHeight: 1.4, wordBreak: 'break-word' }}>
                    {log.message}
                  </div>

                  {hasDetails && (
                    <div style={{ marginTop: 8 }}>
                      <button 
                        onClick={() => setExpandedId(isExpanded ? null : log.id)}
                        style={{ 
                          background: 'none', border: 'none', color: '#94A3B8', fontSize: '0.74rem', 
                          cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, padding: 0 
                        }}
                      >
                        {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                        <span>{isExpanded ? 'Nascondi dettagli' : 'Mostra dettagli tecnici'}</span>
                      </button>

                      {isExpanded && (
                        <div style={{ 
                          marginTop: 8, background: '#080C14', border: '1px solid #1E293B', 
                          borderRadius: 8, padding: 12, position: 'relative' 
                        }}>
                          <button 
                            onClick={() => handleCopyDetails(log.id, parsedDetails)}
                            title="Copia dettagli negli appunti"
                            style={{ 
                              position: 'absolute', right: 8, top: 8, background: '#1E293B', 
                              border: '1px solid #334155', color: '#E2E8F0', padding: '4px 8px', 
                              borderRadius: 6, fontSize: '0.7rem', display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer' 
                            }}
                          >
                            {copiedId === log.id ? <Check size={12} color="#10B981" /> : <Copy size={12} />}
                            <span>{copiedId === log.id ? 'Copiato!' : 'Copia'}</span>
                          </button>
                          <pre style={{ 
                            fontSize: '0.72rem', color: log.level === 'ERROR' ? '#FCA5A5' : '#94A3B8', 
                            margin: 0, overflowX: 'auto', whiteSpace: 'pre-wrap', wordBreak: 'break-all', fontFamily: 'monospace' 
                          }}>
                            {typeof parsedDetails === 'string' ? parsedDetails : JSON.stringify(parsedDetails, null, 2)}
                          </pre>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="modal-footer" style={{ justifyContent: 'space-between', padding: '12px 22px', borderTop: '1px solid #1E293B' }}>
          <span style={{ fontSize: '0.74rem', color: '#64748B' }}>
            Visualizzati {logs.length} log {levelFilter !== 'ALL' ? `(filtro ${levelFilter})` : ''}
          </span>
          <button className="btn-secondary" onClick={onClose} style={{ padding: '6px 16px', fontSize: '0.8rem' }}>
            Chiudi
          </button>
        </div>

      </div>
    </div>
  );
}
