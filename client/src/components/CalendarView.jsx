import React, { useState } from 'react';
import { 
  ChevronLeft, ChevronRight, Calendar as CalendarIcon, 
  Clock, Repeat, Trash2, Edit3, Plus, Eye, CheckCircle2,
  AlertCircle, Sparkles, Filter, Copy
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
  viewMode = 'month'
}) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedPlatform, setSelectedPlatform] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [draggedPost, setDraggedPost] = useState(null);
  const [dragOverDate, setDragOverDate] = useState(null);

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
    if (draggedPost.scheduled_at) {
      try {
        const d = parseISO(draggedPost.scheduled_at);
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

        {/* Status Filter */}
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
                  if (!p.scheduled_at) return false;
                  try {
                    return isSameDay(parseISO(p.scheduled_at), day);
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

                        let timeStr = '10:00';
                        if (post.scheduled_at) {
                          try {
                            timeStr = format(parseISO(post.scheduled_at), 'HH:mm');
                          } catch (e) {}
                        }

                        return (
                          <div
                            key={post.id}
                            className={`post-card ${draggedPost?.id === post.id ? 'dragging' : ''}`}
                            draggable={true}
                            onDragStart={(e) => handleDragStart(e, post)}
                            onClick={() => onEditPost(post)}
                            title="Clicca per modificare o trascina per riprogrammare"
                          >
                            <div className="post-card-top">
                              <span className="post-time">
                                <Clock size={11} style={{ display: 'inline', marginRight: 3 }} />
                                {timeStr}
                              </span>

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
                              <span className={`status-pill ${post.status}`}>
                                {post.status === 'scheduled' && 'Programmato'}
                                {post.status === 'published' && 'Pubblicato'}
                                {post.status === 'draft' && 'Bozza'}
                              </span>

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

                return (
                  <div 
                    key={post.id}
                    style={{
                      background: 'var(--bg-card)',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: 'var(--radius-lg)',
                      padding: '16px 20px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 18
                    }}
                  >
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
                        <span>Data: {post.scheduled_at ? format(parseISO(post.scheduled_at), 'dd/MM/yyyy HH:mm') : 'Bozza non pianificata'}</span>
                        <div style={{ display: 'flex', gap: 4 }}>
                          {platforms.map(plat => (
                            <span key={plat} className={`platform-badge-mini platform-${plat}`}>
                              {plat.slice(0, 2).toUpperCase()}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: 8 }}>
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
      </div>
    </div>
  );
}
