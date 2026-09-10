import React, { useState } from 'react';
import { 
  X, ExternalLink, Copy, Check, CheckCircle2, Share2, 
  Sparkles, Calendar, ArrowUpRight, Send, AlertTriangle, Info
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { it } from 'date-fns/locale';

const PLATFORM_BADGE_STYLE = {
  facebook: { label: 'FB', name: 'Facebook', bg: '#1877F2', text: '#FFFFFF' },
  instagram: { label: 'IG', name: 'Instagram', bg: '#E1306C', text: '#FFFFFF' },
  tiktok: { label: 'TikTok', name: 'TikTok', bg: '#00F2FE', text: '#0B0F19' },
  google_business: { label: 'Google Business', name: 'Google Business', bg: '#4285F4', text: '#FFFFFF' },
  linkedin: { label: 'LinkedIn', name: 'LinkedIn', bg: '#0A66C2', text: '#FFFFFF' },
  threads: { label: 'Threads', name: 'Threads', bg: '#FFFFFF', text: '#000000' },
  x: { label: 'X', name: 'X (Twitter)', bg: '#CBD5E1', text: '#0B0F19' },
  youtube: { label: 'YouTube', name: 'YouTube', bg: '#FF0000', text: '#FFFFFF' }
};

export default function PublishedLinksModal({ 
  isOpen, 
  onClose, 
  post, 
  isNewlyPublished = false 
}) {
  if (!isOpen || !post) return null;

  const [copiedAll, setCopiedAll] = useState(false);
  const [copiedIndex, setCopiedIndex] = useState(null);

  // Extract published links from post or fallback
  const publishedLinks = post.published_links || [];
  const hasErrors = publishedLinks.some(l => l.publish_error);
  const hasLive = publishedLinks.some(l => l.is_live);
  
  // Format the exact text as requested:
  // FB: Link
  // IG: link
  // TikTok: link
  // ecc...
  const summaryText = post.summary_text || publishedLinks.map(l => `${l.label}: ${l.url}`).join('\n');

  const handleCopyAll = async () => {
    try {
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(summaryText);
      } else {
        const textarea = document.createElement('textarea');
        textarea.value = summaryText;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
      }
      setCopiedAll(true);
      setTimeout(() => setCopiedAll(false), 2500);
    } catch (err) {
      console.error('Failed to copy summary:', err);
    }
  };

  const handleCopySingle = async (url, idx) => {
    try {
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(url);
      } else {
        const textarea = document.createElement('textarea');
        textarea.value = url;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
      }
      setCopiedIndex(idx);
      setTimeout(() => setCopiedIndex(null), 2000);
    } catch (err) {
      console.error('Failed to copy URL:', err);
    }
  };

  let formattedDate = '';
  if (post.published_at || post.scheduled_at) {
    try {
      formattedDate = format(parseISO(post.published_at || post.scheduled_at), "d MMMM yyyy 'alle' HH:mm", { locale: it });
    } catch (e) {
      formattedDate = '';
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div 
        className="published-links-modal" 
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="modal-header">
          <div className="modal-title" style={{ gap: 10 }}>
            <div className="links-modal-header-icon">
              {isNewlyPublished ? (
                <Sparkles size={20} color="#10B981" />
              ) : (
                <Share2 size={20} color="#8B5CF6" />
              )}
            </div>
            <div>
              <div style={{ fontSize: '1.15rem', fontWeight: 700, color: '#F8FAFC' }}>
                {isNewlyPublished ? 'Post Pubblicato con Successo!' : 'Riepilogo Link Post Creati'}
              </div>
              <div style={{ fontSize: '0.78rem', color: '#94A3B8' }}>
                Tutti i collegamenti diretti ai contenuti generati sui tuoi canali social
              </div>
            </div>
          </div>
          <button className="modal-close-btn" onClick={onClose} title="Chiudi">
            <X size={20} />
          </button>
        </div>

        {/* Banner if just published or has error/live info */}
        {isNewlyPublished && (
          <div 
            className="links-success-banner"
            style={{
              background: hasErrors && !hasLive 
                ? 'rgba(239, 68, 68, 0.12)' 
                : (hasErrors ? 'rgba(245, 158, 11, 0.12)' : (hasLive ? 'rgba(16, 185, 129, 0.12)' : 'rgba(139, 92, 246, 0.12)')),
              borderColor: hasErrors && !hasLive
                ? 'rgba(239, 68, 68, 0.3)'
                : (hasErrors ? 'rgba(245, 158, 11, 0.3)' : (hasLive ? 'rgba(16, 185, 129, 0.3)' : 'rgba(139, 92, 246, 0.3)'))
            }}
          >
            {hasErrors && !hasLive ? (
              <AlertTriangle size={22} color="#EF4444" style={{ flexShrink: 0 }} />
            ) : hasLive ? (
              <CheckCircle2 size={22} color="#10B981" style={{ flexShrink: 0 }} />
            ) : (
              <Info size={22} color="#8B5CF6" style={{ flexShrink: 0 }} />
            )}
            <div>
              <div style={{ fontWeight: 600, color: hasErrors && !hasLive ? '#EF4444' : (hasLive ? '#10B981' : '#A78BFA'), fontSize: '0.9rem' }}>
                {hasLive 
                  ? `Pubblicato online con successo su ${publishedLinks.filter(l => l.is_live).length} ${publishedLinks.filter(l => l.is_live).length === 1 ? 'canale reale' : 'canali reali'}!`
                  : (hasErrors 
                      ? 'Attenzione: si sono verificati errori durante la pubblicazione online' 
                      : 'Post salvato e generato con successo (anteprima)')}
              </div>
              <div style={{ color: '#CBD5E1', fontSize: '0.78rem' }}>
                {hasLive 
                  ? 'I contenuti sono ora visibili dal vivo sui tuoi profili social collegati.' 
                  : (hasErrors 
                      ? 'Controlla gli errori segnalati di seguito o la sezione "Log di Sistema".' 
                      : 'Per pubblicare direttamente sui tuoi profili/pagine, collegali tramite OAuth in "Canali Social".')}
              </div>
            </div>
          </div>
        )}

        {/* Post Summary Card */}
        <div className="links-post-summary-card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#8B5CF6' }}>
              Contenuto Post
            </span>
            {formattedDate && (
              <span style={{ fontSize: '0.72rem', color: '#94A3B8', display: 'flex', alignItems: 'center', gap: 4 }}>
                <Calendar size={12} /> {formattedDate}
              </span>
            )}
          </div>
          <div style={{ fontWeight: 600, fontSize: '0.92rem', color: '#F1F5F9', marginBottom: 4 }}>
            {post.title || 'Post Pubblicato'}
          </div>
          <p style={{ fontSize: '0.82rem', color: '#94A3B8', maxHeight: 60, overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
            {post.base_content}
          </p>
        </div>

        {/* Copy All Action Bar */}
        <div className="links-copy-all-bar">
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#F8FAFC' }}>
              Elenco Link Social ({publishedLinks.length})
            </span>
            <span style={{ fontSize: '0.72rem', color: '#94A3B8' }}>
              Copia l'intero riepilogo formattato in un solo clic
            </span>
          </div>

          <button 
            type="button"
            className={`btn-copy-all ${copiedAll ? 'copied' : ''}`}
            onClick={handleCopyAll}
            id="btn-copy-all-links"
          >
            {copiedAll ? (
              <>
                <Check size={16} />
                <span>Tutti i link copiati!</span>
              </>
            ) : (
              <>
                <Copy size={16} />
                <span>Copia tutti i link</span>
              </>
            )}
          </button>
        </div>

        {/* Links List */}
        <div className="published-links-list">
          {publishedLinks.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '30px 20px', color: '#94A3B8', fontSize: '0.85rem' }}>
              Nessun canale collegato trovato per questo post.
            </div>
          ) : (
            publishedLinks.map((item, idx) => {
              const meta = PLATFORM_BADGE_STYLE[item.platform] || {
                label: item.label || item.platform?.toUpperCase(),
                name: item.name || item.platform,
                bg: item.color || '#8B5CF6',
                text: '#FFFFFF'
              };

              const isCopied = copiedIndex === idx;

              return (
                <div key={item.platform + idx} className="published-link-row">
                  {/* Platform Tag Badge */}
                  <div 
                    className="platform-label-badge"
                    style={{ backgroundColor: meta.bg, color: meta.text }}
                    title={meta.name}
                  >
                    {meta.label}
                  </div>

                  {/* Channel Info & Link */}
                  <div className="published-link-info">
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4, flexWrap: 'wrap' }}>
                      <span style={{ fontSize: '0.82rem', fontWeight: 600, color: '#F8FAFC' }}>
                        {meta.name}
                      </span>
                      {item.handle && (
                        <span style={{ fontSize: '0.72rem', color: '#64748B' }}>
                          {item.handle}
                        </span>
                      )}

                      {/* Status Badges */}
                      {item.is_live && (
                        <span style={{ 
                          fontSize: '0.68rem', 
                          fontWeight: 600, 
                          background: 'rgba(16, 185, 129, 0.15)', 
                          color: '#10B981', 
                          border: '1px solid rgba(16, 185, 129, 0.4)', 
                          borderRadius: 4, 
                          padding: '1px 6px' 
                        }}>
                          ONLINE (Reale)
                        </span>
                      )}
                      {item.publish_error && (
                        <span style={{ 
                          fontSize: '0.68rem', 
                          fontWeight: 600, 
                          background: 'rgba(239, 68, 68, 0.15)', 
                          color: '#EF4444', 
                          border: '1px solid rgba(239, 68, 68, 0.4)', 
                          borderRadius: 4, 
                          padding: '1px 6px' 
                        }}>
                          ERRORE API
                        </span>
                      )}
                      {!item.is_live && !item.publish_error && !item.is_connected && (
                        <span style={{ 
                          fontSize: '0.68rem', 
                          fontWeight: 500, 
                          background: 'rgba(148, 163, 184, 0.12)', 
                          color: '#94A3B8', 
                          border: '1px solid rgba(148, 163, 184, 0.25)', 
                          borderRadius: 4, 
                          padding: '1px 6px' 
                        }}>
                          Anteprima (Canale non collegato)
                        </span>
                      )}
                    </div>

                    <a 
                      href={item.url} 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      className="published-link-url"
                      title={item.url}
                    >
                      <span>{item.url}</span>
                      <ExternalLink size={12} style={{ flexShrink: 0 }} />
                    </a>

                    {item.publish_error && (
                      <div style={{ fontSize: '0.74rem', color: '#F87171', marginTop: 4, display: 'flex', alignItems: 'center', gap: 5 }}>
                        <AlertTriangle size={12} style={{ flexShrink: 0 }} />
                        <span>{item.publish_error}</span>
                      </div>
                    )}

                    {!item.is_live && !item.publish_error && !item.is_connected && (
                      <div style={{ fontSize: '0.70rem', color: '#64748B', marginTop: 3 }}>
                        Per pubblicare su questo canale, collegalo tramite OAuth nella sezione <em>Canali Social</em>.
                      </div>
                    )}
                  </div>

                  {/* Action Buttons */}
                  <div className="published-link-actions">
                    <button
                      type="button"
                      className={`btn-icon-action ${isCopied ? 'copied' : ''}`}
                      onClick={() => handleCopySingle(item.url, idx)}
                      title="Copia link negli appunti"
                    >
                      {isCopied ? <Check size={15} color="#10B981" /> : <Copy size={15} />}
                      <span>{isCopied ? 'Copiato' : 'Copia'}</span>
                    </button>

                    <a
                      href={item.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn-icon-action btn-open-link"
                      title="Apri post in una nuova scheda"
                    >
                      <ArrowUpRight size={15} />
                      <span>Apri</span>
                    </a>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Modal Footer */}
        <div className="modal-footer" style={{ justifyContent: 'space-between' }}>
          <div style={{ fontSize: '0.75rem', color: '#64748B', display: 'flex', alignItems: 'center', gap: 6 }}>
            <span>Formato rapido: <code>FB: Link | IG: link | TikTok: link</code></span>
          </div>

          <button 
            type="button" 
            className="btn-secondary" 
            onClick={onClose}
            style={{ padding: '8px 20px' }}
          >
            Chiudi
          </button>
        </div>
      </div>
    </div>
  );
}
