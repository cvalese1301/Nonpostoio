import React, { useState } from 'react';
import { 
  X, Share2, Check, AlertCircle, RefreshCw, Power, 
  ExternalLink, ShieldCheck, Edit2
} from 'lucide-react';

const CHANNELS_INFO = {
  facebook: { name: 'Facebook', desc: 'Pagine aziendali e Gruppi Meta', color: '#1877F2' },
  instagram: { name: 'Instagram', desc: 'Feed, Reels e Storie Business/Creator', color: '#E1306C' },
  tiktok: { name: 'TikTok', desc: 'Video, Sound virali e Trend', color: '#25F4EE' },
  google_business: { name: 'Google My Business', desc: 'Scheda locale Google Maps e Call to Action', color: '#4285F4' },
  linkedin: { name: 'LinkedIn', desc: 'Profili e Pagine Aziendali B2B', color: '#0A66C2' },
  threads: { name: 'Threads', desc: 'Conversazioni rapide e community Meta', color: '#FFFFFF' },
  x: { name: 'X (Twitter)', desc: 'Post sintetici, thread e hashtag', color: '#CBD5E1' },
  youtube: { name: 'YouTube', desc: 'Shorts e Video per la community', color: '#FF0000' }
};

export default function ChannelsModal({ 
  isOpen, 
  onClose, 
  activeWorkspace, 
  channels = [], 
  onUpdateChannel 
}) {
  if (!isOpen) return null;

  const [editingChannel, setEditingChannel] = useState(null);
  const [editName, setEditName] = useState('');
  const [editHandle, setEditHandle] = useState('');

  const startEdit = (ch) => {
    setEditingChannel(ch);
    setEditName(ch.account_name);
    setEditHandle(ch.handle);
  };

  const saveEdit = () => {
    if (!editingChannel) return;
    onUpdateChannel(editingChannel.id, {
      account_name: editName,
      handle: editHandle
    });
    setEditingChannel(null);
  };

  return (
    <div className="modal-overlay">
      <div className="standard-modal" style={{ maxWidth: 800 }}>
        {/* Header */}
        <div className="modal-header">
          <div className="modal-title">
            <Share2 size={22} color="#8B5CF6" />
            <span>Gestione Canali Social (8) - {activeWorkspace?.name}</span>
          </div>
          <button className="modal-close-btn" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="modal-content-scroll">
          <div style={{ padding: '12px 16px', background: 'rgba(56, 189, 248, 0.08)', border: '1px solid rgba(56, 189, 248, 0.2)', borderRadius: 10, fontSize: '0.82rem', color: '#BAE6FD' }}>
            Ogni cliente dispone di tutti gli 8 canali pronti per la pubblicazione e l'anteprima realistica. Puoi personalizzare nome account, handle o disattivare i canali non utilizzati.
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {channels.map((ch) => {
              const meta = CHANNELS_INFO[ch.platform] || { name: ch.platform, desc: '', color: '#8B5CF6' };
              const isEditing = editingChannel?.id === ch.id;

              return (
                <div 
                  key={ch.id}
                  style={{
                    background: 'var(--bg-card)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: 12,
                    padding: '14px 18px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 16
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                    <div 
                      style={{ 
                        width: 42, 
                        height: 42, 
                        borderRadius: 10, 
                        backgroundColor: meta.color, 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'center',
                        color: 'white',
                        fontWeight: 'bold',
                        fontSize: '1rem',
                        boxShadow: `0 0 12px ${meta.color}40`
                      }}
                    >
                      {ch.platform.slice(0, 2).toUpperCase()}
                    </div>

                    <div>
                      {isEditing ? (
                        <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                          <input 
                            type="text" 
                            className="input-field" 
                            style={{ padding: '4px 8px', fontSize: '0.8rem' }}
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                            placeholder="Nome visualizzato"
                          />
                          <input 
                            type="text" 
                            className="input-field" 
                            style={{ padding: '4px 8px', fontSize: '0.8rem' }}
                            value={editHandle}
                            onChange={(e) => setEditHandle(e.target.value)}
                            placeholder="@handle"
                          />
                          <button className="btn-primary" style={{ padding: '4px 8px' }} onClick={saveEdit}>
                            <Check size={14} />
                          </button>
                        </div>
                      ) : (
                        <>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <h4 style={{ fontSize: '0.92rem', fontWeight: 600 }}>{ch.account_name}</h4>
                            <span style={{ fontSize: '0.78rem', color: '#94A3B8' }}>{ch.handle}</span>
                            <button 
                              style={{ background: 'transparent', border: 'none', color: '#64748B', cursor: 'pointer', padding: 2 }}
                              onClick={() => startEdit(ch)}
                              title="Modifica nome e handle"
                            >
                              <Edit2 size={13} />
                            </button>
                          </div>
                          <p style={{ fontSize: '0.72rem', color: '#64748B', marginTop: 2 }}>{meta.desc}</p>
                        </>
                      )}
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <span style={{ fontSize: '0.75rem', color: ch.active ? '#10B981' : '#64748B', display: 'flex', alignItems: 'center', gap: 4 }}>
                      <ShieldCheck size={14} />
                      {ch.active ? 'Connesso & Pronto' : 'Inattivo'}
                    </span>

                    <button
                      className="btn-secondary"
                      style={{ padding: '6px 12px', fontSize: '0.78rem', color: ch.active ? '#F87171' : '#34D399' }}
                      onClick={() => onUpdateChannel(ch.id, { active: ch.active ? 0 : 1 })}
                    >
                      <Power size={13} />
                      {ch.active ? 'Disattiva' : 'Attiva'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="modal-footer">
          <span style={{ fontSize: '0.75rem', color: '#94A3B8' }}>
            Supporta tutti gli 8 social network con personalizzazione per canale
          </span>
          <button className="btn-secondary" onClick={onClose}>
            Chiudi
          </button>
        </div>
      </div>
    </div>
  );
}
