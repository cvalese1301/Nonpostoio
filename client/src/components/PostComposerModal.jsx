import React, { useState, useEffect } from 'react';
import { 
  X, Sparkles, Image as ImageIcon, Calendar, Clock, Repeat, 
  Send, Save, AlertCircle, Check, HelpCircle, UploadCloud, ExternalLink
} from 'lucide-react';
import SocialMockupPreview from './SocialMockupPreview.jsx';

const ALL_PLATFORMS = [
  { key: 'facebook', label: 'Facebook', color: '#1877F2' },
  { key: 'instagram', label: 'Instagram', color: '#E1306C' },
  { key: 'tiktok', label: 'TikTok', color: '#25F4EE' },
  { key: 'google_business', label: 'Google Business', color: '#4285F4' },
  { key: 'linkedin', label: 'LinkedIn', color: '#0A66C2' },
  { key: 'threads', label: 'Threads', color: '#FFFFFF' },
  { key: 'x', label: 'X (Twitter)', color: '#CBD5E1' },
  { key: 'youtube', label: 'YouTube', color: '#FF0000' }
];

export default function PostComposerModal({ 
  isOpen, 
  onClose, 
  activeWorkspace, 
  channels = [], 
  editingPost = null, 
  initialDate = null,
  onSavePost,
  onViewPostLinks 
}) {
  if (!isOpen) return null;

  // Selected platforms to publish to
  const [selectedPlatforms, setSelectedPlatforms] = useState(['facebook', 'instagram', 'x', 'linkedin']);
  const [activeTab, setActiveTab] = useState('general'); // 'general' or platform key
  const [activePreviewPlatform, setActivePreviewPlatform] = useState('instagram');

  // Form State
  const [title, setTitle] = useState('');
  const [baseContent, setBaseContent] = useState('');
  const [scheduledAt, setScheduledAt] = useState('');
  const [status, setStatus] = useState('scheduled');
  const [recycleDays, setRecycleDays] = useState(0);
  const [mediaUrls, setMediaUrls] = useState([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isAiOptimizing, setIsAiOptimizing] = useState(false);

  // Platform specific overrides
  const [customizations, setCustomizations] = useState({
    facebook: { custom_content: '', hashtags: '', first_comment: '', extra_options: {} },
    instagram: { custom_content: '', hashtags: '', first_comment: '', extra_options: { is_reel: false } },
    tiktok: { custom_content: '', hashtags: '', extra_options: { sound: '' } },
    google_business: { custom_content: '', extra_options: { cta_action: 'LEARN_MORE', cta_url: '' } },
    linkedin: { custom_content: '', hashtags: '', extra_options: {} },
    threads: { custom_content: '', extra_options: {} },
    x: { custom_content: '', hashtags: '', extra_options: {} },
    youtube: { title: '', custom_content: '', hashtags: '', extra_options: { is_short: true } }
  });

  // Prepopulate if editing
  useEffect(() => {
    if (editingPost) {
      setTitle(editingPost.title || '');
      setBaseContent(editingPost.base_content || '');
      setStatus(editingPost.status || 'scheduled');
      setRecycleDays(editingPost.recycle_interval_days || 0);

      if (editingPost.scheduled_at) {
        // Convert to datetime-local format: YYYY-MM-DDTHH:MM
        const d = new Date(editingPost.scheduled_at);
        const pad = (n) => String(n).padStart(2, '0');
        const localIso = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
        setScheduledAt(localIso);
      }

      if (editingPost.customizations && editingPost.customizations.length > 0) {
        const plats = editingPost.customizations.map(c => c.platform);
        setSelectedPlatforms(plats);
        setActivePreviewPlatform(plats[0] || 'instagram');

        const newCust = { ...customizations };
        let extractedMedia = [];
        editingPost.customizations.forEach(c => {
          newCust[c.platform] = {
            custom_content: c.custom_content || '',
            hashtags: c.hashtags || '',
            first_comment: c.first_comment || '',
            extra_options: c.extra_options || {}
          };
          if (c.media_urls && c.media_urls.length > 0) {
            extractedMedia = c.media_urls;
          }
        });
        setCustomizations(newCust);
        setMediaUrls(extractedMedia);
      }
    } else {
      // Default new post setup
      const defaultDate = initialDate ? new Date(initialDate) : new Date(Date.now() + 2 * 60 * 60 * 1000);
      defaultDate.setMinutes(0);
      const pad = (n) => String(n).padStart(2, '0');
      const localIso = `${defaultDate.getFullYear()}-${pad(defaultDate.getMonth() + 1)}-${pad(defaultDate.getDate())}T${pad(defaultDate.getHours())}:${pad(defaultDate.getMinutes())}`;
      setScheduledAt(localIso);
    }
  }, [editingPost, initialDate]);

  // Toggle channel selection
  const togglePlatform = (platKey) => {
    if (selectedPlatforms.includes(platKey)) {
      if (selectedPlatforms.length === 1) return; // Keep at least one
      const updated = selectedPlatforms.filter(p => p !== platKey);
      setSelectedPlatforms(updated);
      if (activePreviewPlatform === platKey) {
        setActivePreviewPlatform(updated[0]);
      }
    } else {
      const updated = [...selectedPlatforms, platKey];
      setSelectedPlatforms(updated);
      setActivePreviewPlatform(platKey);
    }
  };

  // AI Optimizer Trigger
  const handleAiOptimize = async () => {
    if (!baseContent.trim()) {
      alert('Inserisci prima un testo o una bozza nel campo principale per consentire all\'AI di ottimizzarlo.');
      return;
    }

    setIsAiOptimizing(true);
    try {
      const res = await fetch('/api/ai/optimize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          base_text: baseContent,
          platforms: selectedPlatforms,
          tone: 'engaging'
        })
      });
      const data = await res.json();
      if (data.success && data.optimized) {
        setCustomizations(prev => {
          const next = { ...prev };
          for (const [p, opt] of Object.entries(data.optimized)) {
            next[p] = {
              ...next[p],
              custom_content: opt.custom_content || next[p].custom_content,
              hashtags: opt.hashtags !== undefined ? opt.hashtags : next[p].hashtags,
              first_comment: opt.first_comment || next[p].first_comment,
              extra_options: {
                ...next[p].extra_options,
                cta_action: opt.cta_action || next[p].extra_options?.cta_action
              }
            };
          }
          return next;
        });
      }
    } catch (err) {
      console.error('AI optimization failed:', err);
    } finally {
      setIsAiOptimizing(false);
    }
  };

  // File Upload to pCloud / Storage
  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    const formData = new FormData();
    formData.append('file', file);
    formData.append('workspace_id', activeWorkspace.id);

    try {
      const res = await fetch('/api/media/upload', {
        method: 'POST',
        body: formData
      });
      const data = await res.json();
      if (data.pcloud_url || data.local_path) {
        const fileUrl = data.pcloud_url || `/uploads/${data.pcloud_fileid}`;
        setMediaUrls(prev => [...prev, fileUrl]);
      }
    } catch (err) {
      console.error('Upload failed:', err);
      alert('Errore caricamento media.');
    } finally {
      setIsUploading(false);
    }
  };

  const removeMedia = (index) => {
    setMediaUrls(prev => prev.filter((_, i) => i !== index));
  };

  // Submit Post
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!baseContent.trim()) {
      alert('Inserisci il testo base del post.');
      return;
    }

    // Prepare channel customizations
    const finalCust = {};
    selectedPlatforms.forEach(p => {
      finalCust[p] = {
        custom_content: customizations[p]?.custom_content || baseContent,
        hashtags: customizations[p]?.hashtags || '',
        first_comment: customizations[p]?.first_comment || '',
        media_urls: mediaUrls,
        extra_options: customizations[p]?.extra_options || {}
      };
    });

    const payload = {
      workspace_id: activeWorkspace.id,
      title: title || baseContent.slice(0, 40),
      base_content: baseContent,
      status: status,
      scheduled_at: status === 'scheduled' ? new Date(scheduledAt).toISOString() : null,
      recycle_interval_days: parseInt(recycleDays, 10) || 0,
      customizations: finalCust,
      id: editingPost?.id
    };

    const saved = await onSavePost(payload);
    onClose();

    if (status === 'published' && saved && onViewPostLinks) {
      onViewPostLinks(saved, true);
    }
  };

  // Current preview values
  const currentCust = customizations[activePreviewPlatform] || {};
  const currentPreviewContent = currentCust.custom_content || baseContent;
  const currentPreviewHashtags = currentCust.hashtags || '';
  const currentChannelMeta = channels.find(c => c.platform === activePreviewPlatform) || {
    account_name: activeWorkspace?.name || 'Brand Account',
    handle: `@${activeWorkspace?.slug || 'brand'}`
  };

  return (
    <div className="modal-overlay">
      <div className="composer-modal">
        {/* Header */}
        <div className="modal-header">
          <div className="modal-title">
            <Sparkles size={22} color="#8B5CF6" />
            <span>{editingPost ? 'Modifica Programmazione Post' : 'Compositore Post Multi-Canale'}</span>
            <span style={{ fontSize: '0.8rem', color: '#94A3B8', fontWeight: 400 }}>
              (Cliente: <strong style={{ color: '#FFFFFF' }}>{activeWorkspace?.name}</strong>)
            </span>
          </div>
          <button className="modal-close-btn" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        {/* Banner if post is already published */}
        {editingPost?.status === 'published' && (
          <div style={{
            margin: '10px 24px 0',
            padding: '10px 16px',
            background: 'rgba(16, 185, 129, 0.1)',
            border: '1px solid rgba(16, 185, 129, 0.25)',
            borderRadius: 10,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.85rem', color: '#10B981' }}>
              <Check size={16} />
              <span>Questo post è stato pubblicato sui tuoi canali social.</span>
            </div>
            <button
              type="button"
              className="btn-secondary"
              onClick={() => onViewPostLinks && onViewPostLinks(editingPost)}
              style={{ padding: '5px 12px', fontSize: '0.78rem', color: '#10B981', borderColor: 'rgba(16, 185, 129, 0.3)', display: 'flex', alignItems: 'center', gap: 6 }}
            >
              <ExternalLink size={13} />
              Vedi Link Creati ({editingPost.published_links?.length || editingPost.customizations?.length || selectedPlatforms.length})
            </button>
          </div>
        )}

        {/* Body */}
        <div className="composer-body">
          {/* Left: Configuration Form */}
          <form className="composer-form-pane" onSubmit={handleSubmit}>
            {/* 1. Channel Selector */}
            <div className="channel-multi-select">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span className="label-hint">Seleziona Canali Destinatari ({selectedPlatforms.length}/8):</span>
                <span style={{ fontSize: '0.72rem', color: '#94A3B8' }}>
                  {channels.filter(c => c.active === 1).length}/8 canali collegati via API
                </span>
              </div>

              {channels.filter(c => c.active === 1).length === 0 && (
                <div style={{ padding: '8px 12px', background: 'rgba(245, 158, 11, 0.1)', border: '1px solid rgba(245, 158, 11, 0.25)', borderRadius: 8, fontSize: '0.78rem', color: '#FCD34D' }}>
                  ⚠️ Nessun canale social è ancora collegato tramite API. Puoi scrivere e salvare le bozze, ma per pubblicare collega prima i tuoi account dalla sezione "Canali Social".
                </div>
              )}

              <div className="channel-selector-row">
                {ALL_PLATFORMS.map(p => {
                  const isSelected = selectedPlatforms.includes(p.key);
                  const isConnected = channels.some(c => c.platform === p.key && c.active === 1);

                  return (
                    <button
                      key={p.key}
                      type="button"
                      className={`channel-toggle-btn ${isSelected ? 'selected' : ''}`}
                      onClick={() => togglePlatform(p.key)}
                      id={`composer-channel-${p.key}`}
                      title={isConnected ? `${p.label} (Collegato)` : `${p.label} (Non ancora collegato via API)`}
                    >
                      <div 
                        className="channel-dot" 
                        style={{ backgroundColor: isConnected ? p.color : '#64748B', width: 9, height: 9 }} 
                      />
                      <span>{p.label}</span>
                      {isConnected ? (
                        <span style={{ fontSize: '0.65rem', color: '#10B981' }}>✓</span>
                      ) : (
                        <span style={{ fontSize: '0.62rem', color: '#94A3B8' }}>(off)</span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* AI Assistant Banner */}
            <div className="ai-optimizer-banner">
              <div className="ai-banner-text">
                <h4>Ottimizzazione AI Multi-Canale</h4>
                <p>Adatta automaticamente testo, hashtag, CTA e limiti caratteri per tutti gli 8 canali con 1 click.</p>
              </div>
              <button
                type="button"
                className="btn-ai-glow"
                onClick={handleAiOptimize}
                disabled={isAiOptimizing}
                id="btn-ai-optimize"
              >
                <Sparkles size={16} />
                <span>{isAiOptimizing ? 'Ottimizzazione in corso...' : 'Ottimizza con AI'}</span>
              </button>
            </div>

            {/* Title & Post Content Tabs */}
            <div className="form-group">
              <label>Titolo Interno (Opzionale per organizzazione):</label>
              <input
                type="text"
                className="input-field"
                placeholder="Es. Lancio nuova collezione primaverile"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>

            {/* Customization Tabs */}
            <div>
              <div className="platform-tabs-nav">
                <button
                  type="button"
                  className={`tab-btn ${activeTab === 'general' ? 'active' : ''}`}
                  onClick={() => { setActiveTab('general'); }}
                >
                  📝 Testo Master (Generale)
                </button>
                {selectedPlatforms.map(plat => {
                  const pMeta = ALL_PLATFORMS.find(p => p.key === plat);
                  return (
                    <button
                      key={plat}
                      type="button"
                      className={`tab-btn ${activeTab === plat ? 'active' : ''}`}
                      onClick={() => { 
                        setActiveTab(plat); 
                        setActivePreviewPlatform(plat); 
                      }}
                    >
                      <span style={{ color: pMeta?.color }}>●</span>
                      {pMeta?.label}
                    </button>
                  );
                })}
              </div>

              {/* Tab Content */}
              <div style={{ marginTop: 12 }}>
                {activeTab === 'general' ? (
                  <div className="form-group">
                    <label>Testo Base del Post (verrà applicato a tutti i canali salvo personalizzazioni):</label>
                    <textarea
                      className="textarea-composer"
                      placeholder="Scrivi qui il copy principale del tuo post..."
                      value={baseContent}
                      onChange={(e) => setBaseContent(e.target.value)}
                      rows={5}
                      required
                    />
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    <div className="form-group">
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <label>Copy Personalizzato per {ALL_PLATFORMS.find(p => p.key === activeTab)?.label}:</label>
                        {activeTab === 'x' && (
                          <span style={{ fontSize: '0.75rem', color: (customizations.x?.custom_content || baseContent).length > 280 ? '#EF4444' : '#94A3B8' }}>
                            {(customizations.x?.custom_content || baseContent).length}/280 caratteri
                          </span>
                        )}
                      </div>
                      <textarea
                        className="textarea-composer"
                        placeholder={`Personalizza il testo specificamente per ${activeTab}...`}
                        value={customizations[activeTab]?.custom_content || ''}
                        onChange={(e) => {
                          const val = e.target.value;
                          setCustomizations(prev => ({
                            ...prev,
                            [activeTab]: { ...prev[activeTab], custom_content: val }
                          }));
                        }}
                        rows={4}
                      />
                    </div>

                    {/* Hashtags input for channels that use it */}
                    {['instagram', 'facebook', 'linkedin', 'tiktok', 'x', 'youtube'].includes(activeTab) && (
                      <div className="form-group">
                        <label>Hashtag dedicati ({activeTab}):</label>
                        <input
                          type="text"
                          className="input-field"
                          placeholder="#brand #marketing #novita"
                          value={customizations[activeTab]?.hashtags || ''}
                          onChange={(e) => {
                            const val = e.target.value;
                            setCustomizations(prev => ({
                              ...prev,
                              [activeTab]: { ...prev[activeTab], hashtags: val }
                            }));
                          }}
                        />
                      </div>
                    )}

                    {/* Instagram First Comment */}
                    {activeTab === 'instagram' && (
                      <div className="form-group">
                        <label>Primo Commento Automatico (Instagram):</label>
                        <input
                          type="text"
                          className="input-field"
                          placeholder="Es. Link in bio per acquistare! Oppure hashtag extra..."
                          value={customizations.instagram?.first_comment || ''}
                          onChange={(e) => {
                            const val = e.target.value;
                            setCustomizations(prev => ({
                              ...prev,
                              instagram: { ...prev.instagram, first_comment: val }
                            }));
                          }}
                        />
                      </div>
                    )}

                    {/* Google My Business CTA */}
                    {activeTab === 'google_business' && (
                      <div className="form-group">
                        <label>Pulsante di Azione Google My Business:</label>
                        <select
                          className="input-field"
                          value={customizations.google_business?.extra_options?.cta_action || 'LEARN_MORE'}
                          onChange={(e) => {
                            const val = e.target.value;
                            setCustomizations(prev => ({
                              ...prev,
                              google_business: {
                                ...prev.google_business,
                                extra_options: { ...prev.google_business?.extra_options, cta_action: val }
                              }
                            }));
                          }}
                        >
                          <option value="LEARN_MORE">Scopri di più</option>
                          <option value="CALL">Chiama ora</option>
                          <option value="BOOK">Prenota online</option>
                          <option value="ORDER">Ordina subito</option>
                        </select>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Media Upload Section with pCloud */}
            <div className="form-group">
              <label>Media & Creatività (Archiviazione su Cloud pCloud a costo zero):</label>
              <label className="media-upload-dropzone">
                <UploadCloud size={24} color="#8B5CF6" style={{ margin: '0 auto 8px', display: 'block' }} />
                <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#F8FAFC' }}>
                  {isUploading ? 'Caricamento su pCloud in corso...' : 'Trascina foto/video o clicca per caricare'}
                </span>
                <span style={{ display: 'block', fontSize: '0.72rem', color: '#94A3B8', marginTop: 4 }}>
                  I file vengono salvati automaticamente nella cartella pCloud del cliente
                </span>
                <input
                  type="file"
                  accept="image/*,video/*"
                  style={{ display: 'none' }}
                  onChange={handleFileUpload}
                  disabled={isUploading}
                />
              </label>

              {/* Uploaded media previews */}
              {mediaUrls.length > 0 && (
                <div className="media-preview-list">
                  {mediaUrls.map((url, idx) => (
                    <div key={idx} className="media-preview-item">
                      <img src={url} alt="" />
                      <button
                        type="button"
                        className="media-remove-btn"
                        onClick={() => removeMedia(idx)}
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Scheduling & Recycling Options */}
            <div className="schedule-options-row">
              <div className="form-group">
                <label>Modalità di Pubblicazione:</label>
                <select
                  className="input-field"
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                >
                  <option value="scheduled">Programma per data/ora</option>
                  <option value="published">Pubblica Immediatamente</option>
                  <option value="draft">Salva come Bozza</option>
                </select>
              </div>

              {status === 'scheduled' && (
                <div className="form-group">
                  <label>Data & Ora di Pianificazione:</label>
                  <input
                    type="datetime-local"
                    className="input-field"
                    value={scheduledAt}
                    onChange={(e) => setScheduledAt(e.target.value)}
                    required
                  />
                </div>
              )}
            </div>

            {/* Content Recycling Option */}
            <div className="form-group" style={{ background: 'rgba(245, 158, 11, 0.08)', padding: 12, borderRadius: 10, border: '1px solid rgba(245, 158, 11, 0.2)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                <Repeat size={16} color="#F59E0B" />
                <label style={{ color: '#F59E0B', fontWeight: 700, margin: 0 }}>
                  Riciclo Automatico del Contenuto (Publer Evergreen):
                </label>
              </div>
              <select
                className="input-field"
                value={recycleDays}
                onChange={(e) => setRecycleDays(e.target.value)}
              >
                <option value="0">Non riciclare (Pubblicazione singola)</option>
                <option value="7">Ricicla ogni 7 giorni (Settimanale)</option>
                <option value="14">Ricicla ogni 14 giorni (Bi-settimanale)</option>
                <option value="30">Ricicla ogni 30 giorni (Mensile)</option>
                <option value="60">Ricicla ogni 60 giorni (Bimestrale)</option>
              </select>
            </div>
          </form>

          {/* Right: Realistic Device Preview */}
          <div className="composer-preview-pane">
            <div style={{ fontSize: '0.78rem', color: '#94A3B8', fontWeight: 600, marginBottom: 8 }}>
              Anteprima Reale Dispositivo:
            </div>

            {/* Preview Platform Switcher */}
            <div className="preview-platform-selector">
              {selectedPlatforms.map(plat => {
                const meta = ALL_PLATFORMS.find(p => p.key === plat);
                return (
                  <button
                    key={plat}
                    type="button"
                    className={`preview-pill ${activePreviewPlatform === plat ? 'active' : ''}`}
                    onClick={() => setActivePreviewPlatform(plat)}
                  >
                    {meta?.label}
                  </button>
                );
              })}
            </div>

            {/* Realistic Smartphone Frame */}
            <div className="smartphone-frame">
              <div className="phone-notch" />
              <div className={`phone-screen ${['instagram', 'tiktok', 'threads', 'x', 'youtube'].includes(activePreviewPlatform) ? 'dark-theme' : ''}`}>
                <SocialMockupPreview
                  platform={activePreviewPlatform}
                  accountName={currentChannelMeta.account_name}
                  handle={currentChannelMeta.handle}
                  avatar={currentChannelMeta.avatar_url}
                  content={currentPreviewContent}
                  hashtags={currentPreviewHashtags}
                  firstComment={currentCust.first_comment}
                  mediaUrls={mediaUrls}
                  extraOptions={currentCust.extra_options}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="modal-footer">
          <button type="button" className="btn-secondary" onClick={onClose}>
            Annulla
          </button>
          <div style={{ display: 'flex', gap: 10 }}>
            <button
              type="button"
              className="btn-secondary"
              onClick={() => {
                setStatus('draft');
                setTimeout(() => document.querySelector('.composer-form-pane')?.requestSubmit(), 50);
              }}
            >
              <Save size={16} /> Salva Bozza
            </button>
            <button
              type="button"
              className="btn-primary"
              onClick={() => document.querySelector('.composer-form-pane')?.requestSubmit()}
              id="btn-confirm-post"
            >
              <Send size={16} />
              <span>{status === 'published' ? 'Pubblica Adesso' : 'Programma Post'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
