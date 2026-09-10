import React, { useState } from 'react';
import { 
  ChevronLeft, ChevronRight, Calendar as CalendarIcon, 
  Clock, Repeat, Trash2, Edit3, Plus, Eye, CheckCircle2,
  AlertCircle, Sparkles, Filter, Copy, ExternalLink, Link2,
  CheckSquare, Check, AlertTriangle, X
} from 'lucide-react';
import { 
  format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, 
  eachDayOfInterval, isSameMonth, isSameDay, isToday, addMonths, subMonths, 
  addWeeks, subWeeks, setHours, setMinutes, parseISO 
} from 'date-fns';
import { it } from 'date-fns/locale';

const PLATFORM_LIST = [
  { key: 'all', label: 'Tutti i canali', color: '#8B5CF6' },
  { key: 'facebook', label: 'Facebook', color: '#1877F2' },
  { key: 'instagram', label: 'Instagram', color: '#E1306C' },
  { key: 'tiktok', label: 'TikTok', color: '#25F4EE' },
  { key: 'google_business', label: 'Google Business', color: '#4285F4' },
  { key: 'linkedin', label: 'LinkedIn', color: '#0A66C2' },
  { key: 'threads', label: 'Threads', color: '#FFFFFF' },
  { key: 'x', label: 'X (Twitter)', color: '#CBD5E1' },
  { key: 'youtube', label: 'YouTube', color: '#FF0000' }
];

export default function CalendarView({ 
  posts = [], 
  onReschedulePost, 
  onDeletePost, 
  onDuplicatePost, 
  onEditPost,
  onOpenComposerForDate,
  onViewPostLinks,
  onBulkDeletePosts,
  viewMode = 'month'
}) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedPlatform, setSelectedPlatform] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [draggedPost, setDraggedPost] = useState(null);
  const [dragOverDate, setDragOverDate] = useState(null);

  // Multiple selection & bulk delete state
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedPostIds, setSelectedPostIds] = useState([]);
  const [isConfirmingBulkDelete, setIsConfirmingBulkDelete] = useState(false);

  // Month navigation
  const nextPeriod = () => {
    if (viewMode === 'month') setCurrentDate(addMonths(currentDate, 1));
    else setCurrentDate(addWeeks(currentDate, 1));
  };

  const prevPeriod = () => {
    if (viewMode === 'month') setCurrentDate(subMonths(currentDate, 1));
    else setCurrentDate(subWeeks(currentDate, 1));
  };

  const goToToday = () => setCurrentDate(new Date());

  // Filter posts
  const filteredPosts = posts.filter(post => {
    if (selectedStatus !== 'all' && post.status !== selectedStatus) return false;
    if (selectedPlatform !== 'all') {
      const postPlatforms = post.platforms || post.customizations?.map(c => c.platform) || [];
      if (!postPlatforms.includes(selectedPlatform)) return false;
    }
    return true;
  });

  // Eligible for deletion: only drafts and scheduled
  const eligiblePosts = filteredPosts.filter(p => p.status === 'draft' || p.status === 'scheduled');
  const draftCount = filteredPosts.filter(p => p.status === 'draft').length;
  const scheduledCount = filteredPosts.filter(p => p.status === 'scheduled').length;

  // Bulk selection helpers
  const toggleSelectPost = (postId, e) => {
    if (e) e.stopPropagation();
    setSelectedPostIds(prev => 
      prev.includes(postId) ? prev.filter(id => id !== postId) : [...prev, postId]
    );
  };

  const selectAllDrafts = () => {
    const draftIds = filteredPosts.filter(p => p.status === 'draft').map(p => p.id);
    setSelectedPostIds(prev => Array.from(new Set([...prev, ...draftIds])));
    setIsSelectionMode(true);
  };

  const selectAllScheduled = () => {
    const scheduledIds = filteredPosts.filter(p => p.status === 'scheduled').map(p => p.id);
    setSelectedPostIds(prev => Array.from(new Set([...prev, ...scheduledIds])));
    setIsSelectionMode(true);
  };

  const selectAllEligible = () => {
    const allIds = eligiblePosts.map(p => p.id);
    setSelectedPostIds(allIds);
    setIsSelectionMode(true);
  };

  const clearSelection = () => {
    setSelectedPostIds([]);
  };

  const handleConfirmBulkDelete = () => {
    if (selectedPostIds.length === 0) return;
    if (onBulkDeletePosts) {
      onBulkDeletePosts(selectedPostIds);
    }
    setSelectedPostIds([]);
    setIsSelectionMode(false);
    setIsConfirmingBulkDelete(false);
  };

  // Calculate calendar days
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(monthStart);
  const startDate = startOfWeek(monthStart, { weekStartsOn: 1 }); // Monday start
  const endDate = endOfWeek(monthEnd, { weekStartsOn: 1 });
  const calendarDays = eachDayOfInterval({ start: startDate, end: endDate });

  // Drag and drop handlers
  const handleDragStart = (e, post) => {
    setDraggedPost(post);
    e.dataTransfer.setData('text/plain', post.id.toString());
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e, day) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverDate(day);
  };

  const handleDragLeave = () => {
    setDragOverDate(null);
  };

  const handleDrop = (e, targetDay) => {
    e.preventDefault();
    setDragOverDate(null);
    if (!draggedPost) return;

    // Calculate new scheduled date keeping the original time or default 10:00
    let originalHours = 10;
    let originalMinutes = 0;
    const refDate = draggedPost.scheduled_at || draggedPost.published_at || draggedPost.created_at;
    if (refDate) {
      try {
        const d = parseISO(refDate);
        originalHours = d.getHours();
        originalMinutes = d.getMinutes();
      } catch (err) {}
    }

    const newDate = new Date(
      targetDay.getFullYear(),
      targetDay.getMonth(),
      targetDay.getDate(),
      originalHours,
      originalMinutes
    );

    onReschedulePost(draggedPost.id, newDate.toISOString());
    setDraggedPost(null);
  };

  return (
    <div className="content-viewport">
      {/* FILTER BAR */}
      <div className="filter-bar">
        <div className="channel-filter-pills">
          {PLATFORM_LIST.map(p => {
            const count = p.key === 'all'
              ? posts.length
              : posts.filter(post => (post.platforms || []).includes(p.key)).length;

            return (
              <button
                key={p.key}
                className={`channel-pill ${selectedPlatform === p.key ? 'active' : ''}`}
                onClick={() => setSelectedPlatform(p.key)}
                id={`filter-${p.key}`}
              >
                <div 
                  className="channel-dot" 
                  style={{ backgroundColor: p.color, width: 8, height: 8 }} 
                />
                <span>{p.label}</span>
                <span style={{ fontSize: '0.7rem', opacity: 0.7 }}>({count})</span>
              </button>
            );
          })}
        </div>

        {/* Status Filter & Selection Mode Toggle */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: '0.8rem', color: '#94A3B8' }}>Stato:</span>
          <select 
            className="input-field" 
            style={{ width: 'auto', padding: '5px 10px', fontSize: '0.82rem' }}
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
          >
            <option value="all">Tutti gli stati</option>
            <option value="scheduled">Solo Programmati</option>
            <option value="published">Pubblicati</option>
            <option value="draft">Bozze</option>
          </select>

          <button
            type="button"
            className={`btn-secondary ${isSelectionMode ? 'selection-mode-btn-active' : ''}`}
            onClick={() => {
              if (isSelectionMode) {
                setIsSelectionMode(false);
                setSelectedPostIds([]);
              } else {
                setIsSelectionMode(true);
              }
            }}
            id="btn-toggle-selection-mode"
            title="Attiva la selezione multipla per eliminare bozze o post programmati"
            style={{
              padding: '5px 12px',
              fontSize: '0.82rem',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              color: isSelectionMode ? '#8B5CF6' : undefined,
              borderColor: isSelectionMode ? '#8B5CF6' : undefined,
              background: isSelectionMode ? 'rgba(139, 92, 246, 0.15)' : undefined
            }}
          >
            <CheckSquare size={14} />
            <span>{isSelectionMode ? 'Chiudi Selezione' : 'Selezione Multipla'}</span>
            {selectedPostIds.length > 0 && (
              <span className="selection-count-pill">{selectedPostIds.length}</span>
            )}
          </button>
        </div>
      </div>

      {/* CALENDAR BODY */}
      <div className="calendar-container">
        {/* Navigation row */}
        <div className="calendar-header-nav">
          <div className="calendar-month-title">
            <CalendarIcon size={24} color="#8B5CF6" />
            <span>
              {format(currentDate, 'MMMM yyyy', { locale: it }).replace(/^\w/, c => c.toUpperCase())}
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button className="btn-secondary" onClick={goToToday} style={{ padding: '6px 12px' }}>
              Oggi
            </button>
            <button className="btn-secondary" onClick={prevPeriod} style={{ padding: '6px 10px' }}>
              <ChevronLeft size={18} />
            </button>
            <button className="btn-secondary" onClick={nextPeriod} style={{ padding: '6px 10px' }}>
              <ChevronRight size={18} />
            </button>
          </div>
        </div>

        {/* MONTH VIEW */}
        {viewMode === 'month' && (
          <>
            {/* Weekdays Row */}
            <div className="calendar-weekdays-row">
              {['Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì', 'Sabato', 'Domenica'].map(day => (
                <div key={day} className="weekday-header">{day}</div>
              ))}
            </div>

            {/* Grid of Days */}
            <div className="calendar-grid">
              {calendarDays.map((day, idx) => {
                const dayPosts = filteredPosts.filter(p => {
                  const targetDate = p.scheduled_at || p.published_at || p.created_at;
                  if (!targetDate) return false;
                  try {
                    return isSameDay(parseISO(targetDate), day);
                  } catch (e) {
                    return false;
                  }
                });

                const isCurrentMonth = isSameMonth(day, monthStart);
                const isCurrentDay = isToday(day);
                const isOver = dragOverDate && isSameDay(dragOverDate, day);

                return (
                  <div
                    key={day.toISOString()}
                    className={`calendar-cell ${isCurrentDay ? 'today' : ''} ${isOver ? 'drag-over' : ''}`}
                    style={{ opacity: isCurrentMonth ? 1 : 0.38 }}
                    onDragOver={(e) => handleDragOver(e, day)}
                    onDragLeave={handleDragLeave}
                    onDrop={(e) => handleDrop(e, day)}
                  >
                    <div className="cell-header">
                      <span className={`cell-day-number ${isCurrentDay ? 'today-badge' : ''}`}>
                        {format(day, 'd')}
                      </span>
                      <button
                        className="cell-add-btn"
                        title="Programma post in questa data"
                        onClick={() => onOpenComposerForDate(day)}
                      >
                        <Plus size={14} />
                      </button>
                    </div>

                    {/* Posts List in Cell */}
                    <div className="cell-posts-list">
                      {dayPosts.map((post) => {
                        const platforms = post.platforms || post.customizations?.map(c => c.platform) || [];
                        const firstMedia = post.customizations?.[0]?.media_urls?.[0];
                        const isEligible = post.status === 'draft' || post.status === 'scheduled';
                        const isSelected = selectedPostIds.includes(post.id);

                        let timeStr = '10:00';
                        const targetDate = post.scheduled_at || post.published_at || post.created_at;
                        if (targetDate) {
                          try {
                            timeStr = format(parseISO(targetDate), 'HH:mm');
                          } catch (e) {}
                        }

                        return (
                          <div
                            key={post.id}
                            className={`post-card ${draggedPost?.id === post.id ? 'dragging' : ''} ${isSelectionMode ? 'in-selection-mode' : ''} ${isSelected ? 'selected-for-delete' : ''} ${isSelectionMode && !isEligible ? 'dimmed-not-eligible' : ''}`}
                            draggable={!isSelectionMode && post.status !== 'published'}
                            onDragStart={(e) => !isSelectionMode && handleDragStart(e, post)}
                            onClick={(e) => {
                              if (isSelectionMode) {
                                if (isEligible) toggleSelectPost(post.id, e);
                              } else {
                                onEditPost(post);
                              }
                            }}
                            title={
                              isSelectionMode
                                ? (isEligible ? (isSelected ? 'Deseleziona post' : 'Seleziona per eliminazione') : 'I post pubblicati non possono essere eliminati in blocco')
                                : 'Clicca per modificare o trascina per riprogrammare'
                            }
                          >
                            <div className="post-card-top">
                              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                {isSelectionMode && isEligible && (
                                  <div 
                                    className={`card-select-checkbox ${isSelected ? 'checked' : ''}`}
                                    onClick={(e) => toggleSelectPost(post.id, e)}
                                    title={isSelected ? 'Deseleziona' : 'Seleziona per eliminazione'}
                                  >
                                    {isSelected && <Check size={10} color="#FFFFFF" strokeWidth={3} />}
                                  </div>
                                )}
                                <span className="post-time">
                                  <Clock size={11} style={{ display: 'inline', marginRight: 3 }} />
                                  {timeStr}
                                </span>
                              </div>

                              {/* Platform badges */}
                              <div className="post-platforms-row">
                                {platforms.slice(0, 4).map(plat => (
                                  <span
                                    key={plat}
                                    className={`platform-badge-mini platform-${plat}`}
                                    title={plat}
                                  >
                                    {plat.charAt(0).toUpperCase()}
                                  </span>
                                ))}
                                {platforms.length > 4 && (
                                  <span style={{ fontSize: '0.6rem', color: '#94A3B8' }}>
                                    +{platforms.length - 4}
                                  </span>
                                )}
                              </div>
                            </div>

                            <div className="post-card-body">
                              {firstMedia && (
                                <img src={firstMedia} alt="" className="post-thumb" />
                              )}
                              <div className="post-snippet">
                                {post.title || post.base_content}
                              </div>
                            </div>

                            <div className="post-card-footer">
                              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                <span className={`status-pill ${post.status}`}>
                                  {post.status === 'scheduled' && 'Programmato'}
                                  {post.status === 'published' && 'Pubblicato'}
                                  {post.status === 'draft' && 'Bozza'}
                                </span>

                                {post.status === 'published' && (
                                  <button
                                    type="button"
                                    className="post-links-btn"
                                    title="Visualizza e copia i link dei post creati (FB, IG, TikTok...)"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      if (onViewPostLinks) onViewPostLinks(post);
                                    }}
                                  >
                                    <ExternalLink size={10} />
                                    <span>Link</span>
                                  </button>
                                )}
                              </div>

                              {post.recycle_interval_days > 0 && (
                                <span className="recycle-badge" title={`Riciclo ogni ${post.recycle_interval_days} giorni`}>
                                  <Repeat size={11} /> {post.recycle_interval_days}g
                                </span>
                              )}

                              <div style={{ display: 'flex', gap: 4 }}>
                                <button
                                  style={{ background: 'transparent', border: 'none', color: '#94A3B8', cursor: 'pointer', padding: 2 }}
                                  title="Duplica / Ricicla"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onDuplicatePost(post.id);
                                  }}
                                >
                                  <Copy size={12} />
                                </button>
                                <button
                                  style={{ background: 'transparent', border: 'none', color: '#EF4444', cursor: 'pointer', padding: 2 }}
                                  title="Elimina"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onDeletePost(post.id);
                                  }}
                                >
                                  <Trash2 size={12} />
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}

        {/* LIST VIEW */}
        {viewMode === 'list' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 12 }}>
            {filteredPosts.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 40, color: '#94A3B8' }}>
                Nessun post trovato con i filtri selezionati.
              </div>
            ) : (
              filteredPosts.map(post => {
                const platforms = post.platforms || post.customizations?.map(c => c.platform) || [];
                const firstMedia = post.customizations?.[0]?.media_urls?.[0];
                const isEligible = post.status === 'draft' || post.status === 'scheduled';
                const isSelected = selectedPostIds.includes(post.id);

                return (
                  <div 
                    key={post.id}
                    className={`list-post-row ${isSelected ? 'selected-row' : ''} ${isSelectionMode && !isEligible ? 'dimmed-row' : ''}`}
                    style={{
                      background: isSelected ? 'rgba(239, 68, 68, 0.08)' : 'var(--bg-card)',
                      border: isSelected ? '1px solid rgba(239, 68, 68, 0.4)' : '1px solid var(--border-subtle)',
                      borderRadius: 'var(--radius-lg)',
                      padding: '16px 20px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 18,
                      transition: 'all 0.15s ease'
                    }}
                  >
                    {/* Checkbox for selection */}
                    {(isSelectionMode || isEligible) && (
                      <div 
                        className={`list-select-checkbox ${isSelected ? 'checked' : ''} ${!isEligible ? 'disabled' : ''}`}
                        onClick={(e) => isEligible && toggleSelectPost(post.id, e)}
                        title={
                          !isEligible
                            ? 'I post già pubblicati non possono essere eliminati in blocco'
                            : (isSelected ? 'Deseleziona' : 'Seleziona per eliminazione multipla')
                        }
                      >
                        {isSelected && <Check size={12} color="#FFFFFF" strokeWidth={3} />}
                      </div>
                    )}

                    {firstMedia ? (
                      <img src={firstMedia} alt="" style={{ width: 60, height: 60, borderRadius: 8, objectFit: 'cover' }} />
                    ) : (
                      <div style={{ width: 60, height: 60, borderRadius: 8, background: '#334155', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <CalendarIcon size={24} color="#94A3B8" />
                      </div>
                    )}

                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                        <h4 style={{ fontSize: '1rem', fontWeight: 600 }}>{post.title || 'Post Senza Titolo'}</h4>
                        <span className={`status-pill ${post.status}`}>
                          {post.status}
                        </span>
                        {post.recycle_interval_days > 0 && (
                          <span className="recycle-badge">
                            <Repeat size={12} /> Riciclo attivo ({post.recycle_interval_days} gg)
                          </span>
                        )}
                      </div>
                      <p style={{ color: '#94A3B8', fontSize: '0.85rem', marginBottom: 8 }}>{post.base_content}</p>
                      
                      <div style={{ display: 'flex', alignItems: 'center', gap: 14, fontSize: '0.78rem', color: '#64748B' }}>
                        <span>Data: {post.scheduled_at 
                          ? format(parseISO(post.scheduled_at), 'dd/MM/yyyy HH:mm') 
                          : (post.published_at 
                              ? `Pubblicato il ${format(parseISO(post.published_at), 'dd/MM/yyyy HH:mm')}` 
                              : (post.created_at ? `Creato il ${format(parseISO(post.created_at), 'dd/MM/yyyy HH:mm')}` : 'Bozza non pianificata'))}</span>
                        <div style={{ display: 'flex', gap: 4 }}>
                          {platforms.map(plat => (
                            <span key={plat} className={`platform-badge-mini platform-${plat}`}>
                              {plat.slice(0, 2).toUpperCase()}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                      {post.status === 'published' && (
                        <button 
                          type="button"
                          className="btn-secondary btn-view-links" 
                          onClick={() => onViewPostLinks && onViewPostLinks(post)} 
                          style={{ padding: '6px 12px', color: '#10B981', borderColor: 'rgba(16, 185, 129, 0.3)', display: 'flex', alignItems: 'center', gap: 6 }}
                          title="Visualizza e copia tutti i link dei post creati (FB, IG, TikTok...)"
                        >
                          <ExternalLink size={14} />
                          <span>Link Post ({post.published_links?.length || platforms.length})</span>
                        </button>
                      )}
                      <button className="btn-secondary" onClick={() => onEditPost(post)} style={{ padding: '6px 12px' }}>
                        <Edit3 size={15} /> Modifica
                      </button>
                      <button className="btn-secondary" onClick={() => onDuplicatePost(post.id)} style={{ padding: '6px 12px' }}>
                        <Copy size={15} /> Duplica
                      </button>
                      <button className="btn-secondary" onClick={() => onDeletePost(post.id)} style={{ padding: '6px 12px', color: '#EF4444' }}>
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* Floating Bulk Action Bar */}
        {(isSelectionMode || selectedPostIds.length > 0) && (
          <div className="floating-bulk-action-bar">
            <div className="bulk-bar-left">
              <span className="bulk-badge-count">
                {selectedPostIds.length} selezionati
              </span>
              <span style={{ fontSize: '0.8rem', color: '#94A3B8' }}>
                (Bozze e Programmati)
              </span>
            </div>

            <div className="bulk-bar-center">
              <button 
                type="button" 
                className="btn-bulk-quick" 
                onClick={selectAllDrafts}
                disabled={draftCount === 0}
                title="Seleziona tutte le bozze presenti"
              >
                Tutte le Bozze ({draftCount})
              </button>
              <button 
                type="button" 
                className="btn-bulk-quick" 
                onClick={selectAllScheduled}
                disabled={scheduledCount === 0}
                title="Seleziona tutti i post programmati"
              >
                Tutti i Programmati ({scheduledCount})
              </button>
              <button 
                type="button" 
                className="btn-bulk-quick" 
                onClick={selectAllEligible}
                disabled={eligiblePosts.length === 0}
                title="Seleziona tutte le bozze e i post programmati"
              >
                Tutti ({eligiblePosts.length})
              </button>
              {selectedPostIds.length > 0 && (
                <button 
                  type="button" 
                  className="btn-bulk-quick" 
                  onClick={clearSelection}
                  style={{ color: '#94A3B8' }}
                >
                  Deseleziona
                </button>
              )}
            </div>

            <div className="bulk-bar-right">
              <button
                type="button"
                className="btn-bulk-delete"
                disabled={selectedPostIds.length === 0}
                onClick={() => setIsConfirmingBulkDelete(true)}
                id="btn-trigger-bulk-delete"
              >
                <Trash2 size={15} />
                <span>Elimina {selectedPostIds.length} post</span>
              </button>
              <button
                type="button"
                className="btn-bulk-close"
                onClick={() => {
                  setIsSelectionMode(false);
                  setSelectedPostIds([]);
                }}
                title="Chiudi modalità selezione"
              >
                <X size={18} />
              </button>
            </div>
          </div>
        )}

        {/* Bulk Delete Confirmation Dialog */}
        {isConfirmingBulkDelete && (
          <div className="modal-overlay" onClick={() => setIsConfirmingBulkDelete(false)} style={{ zIndex: 1100 }}>
            <div className="bulk-confirm-modal" onClick={(e) => e.stopPropagation()}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                <div style={{ width: 44, height: 44, borderRadius: 12, background: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <AlertTriangle size={24} color="#EF4444" />
                </div>
                <div>
                  <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#F8FAFC' }}>
                    Conferma Eliminazione Multipla
                  </h3>
                  <p style={{ fontSize: '0.8rem', color: '#94A3B8' }}>
                    Azione irreversibile per i post selezionati
                  </p>
                </div>
              </div>

              <div style={{ background: 'rgba(255, 255, 255, 0.03)', border: '1px solid var(--border-subtle)', borderRadius: 10, padding: '14px 16px', marginBottom: 20 }}>
                <p style={{ fontSize: '0.88rem', color: '#CBD5E1', marginBottom: 8 }}>
                  Stai per eliminare definitivamente <strong style={{ color: '#F8FAFC' }}>{selectedPostIds.length}</strong> post:
                </p>
                <div style={{ display: 'flex', gap: 16, fontSize: '0.82rem' }}>
                  <span style={{ color: '#94A3B8' }}>
                    • Bozze: <strong style={{ color: '#F8FAFC' }}>{selectedPostIds.filter(id => posts.find(p => p.id === id)?.status === 'draft').length}</strong>
                  </span>
                  <span style={{ color: '#38BDF8' }}>
                    • Programmati: <strong style={{ color: '#F8FAFC' }}>{selectedPostIds.filter(id => posts.find(p => p.id === id)?.status === 'scheduled').length}</strong>
                  </span>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                <button 
                  type="button" 
                  className="btn-secondary" 
                  onClick={() => setIsConfirmingBulkDelete(false)}
                >
                  Annulla
                </button>
                <button 
                  type="button" 
                  className="btn-danger-confirm" 
                  onClick={handleConfirmBulkDelete}
                  id="btn-confirm-execute-bulk-delete"
                >
                  <Trash2 size={16} />
                  <span>Elimina {selectedPostIds.length} post</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
