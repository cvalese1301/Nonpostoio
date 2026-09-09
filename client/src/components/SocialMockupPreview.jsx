import React from 'react';
import { 
  Heart, MessageCircle, Send, Bookmark, MoreHorizontal, 
  ThumbsUp, Share2, MessageSquare, Repeat2, MapPin, ExternalLink,
  Eye, Music, CheckCircle2
} from 'lucide-react';

export default function SocialMockupPreview({ 
  platform = 'instagram', 
  accountName = 'NonPosto Account', 
  handle = '@nonposto', 
  avatar = '', 
  content = '', 
  hashtags = '', 
  firstComment = '', 
  mediaUrls = [], 
  extraOptions = {} 
}) {
  const displayImage = mediaUrls && mediaUrls.length > 0 ? mediaUrls[0] : null;
  const defaultAvatar = avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100';

  // 1. INSTAGRAM
  if (platform === 'instagram') {
    return (
      <div style={{ background: '#000000', color: '#FFFFFF', minHeight: '100%', display: 'flex', flexDirection: 'column' }}>
        {/* IG Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ width: 32, height: 32, borderRadius: '50%', padding: 2, background: 'linear-gradient(45deg, #F58529, #DD2A7B, #8134AF)' }}>
              <img src={defaultAvatar} alt="" style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
            </div>
            <div>
              <div style={{ fontSize: '0.8rem', fontWeight: 600 }}>{handle.replace('@', '')}</div>
              <div style={{ fontSize: '0.65rem', color: '#A8A8A8' }}>Audio originale</div>
            </div>
          </div>
          <MoreHorizontal size={18} color="#A8A8A8" />
        </div>

        {/* IG Media */}
        {displayImage ? (
          <div style={{ width: '100%', height: 260, background: '#121212', overflow: 'hidden' }}>
            <img src={displayImage} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          </div>
        ) : (
          <div style={{ height: 160, background: 'linear-gradient(135deg, #1E1B4B, #311042)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#93C5FD', padding: 20, textAlign: 'center', fontSize: '0.85rem' }}>
            {content || 'Il tuo contenuto visivo apparirà qui'}
          </div>
        )}

        {/* IG Actions */}
        <div style={{ padding: '8px 12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <Heart size={20} color="#FFFFFF" />
              <MessageCircle size={20} color="#FFFFFF" />
              <Send size={20} color="#FFFFFF" />
            </div>
            <Bookmark size={20} color="#FFFFFF" />
          </div>

          <div style={{ fontSize: '0.78rem', fontWeight: 600, marginBottom: 4 }}>1.284 piace</div>

          {/* IG Caption */}
          <div style={{ fontSize: '0.78rem', lineHeight: 1.4 }}>
            <span style={{ fontWeight: 600, marginRight: 6 }}>{handle.replace('@', '')}</span>
            <span>{content || 'Scrivi la tua caption per Instagram...'}</span>
            {hashtags && (
              <div style={{ color: '#0095F6', marginTop: 4 }}>{hashtags}</div>
            )}
          </div>

          {/* First comment preview */}
          {firstComment && (
            <div style={{ marginTop: 8, padding: '6px 8px', background: 'rgba(255,255,255,0.06)', borderRadius: 6, fontSize: '0.72rem' }}>
              <span style={{ fontWeight: 600, color: '#38BDF8', marginRight: 4 }}>Primo Commento:</span>
              <span style={{ color: '#D1D5DB' }}>{firstComment}</span>
            </div>
          )}

          <div style={{ fontSize: '0.65rem', color: '#737373', marginTop: 6, textTransform: 'uppercase' }}>2 ORE FA</div>
        </div>
      </div>
    );
  }

  // 2. FACEBOOK
  if (platform === 'facebook') {
    return (
      <div style={{ background: '#FFFFFF', color: '#050505', minHeight: '100%' }}>
        <div style={{ padding: '12px 14px 8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <img src={defaultAvatar} alt="" style={{ width: 38, height: 38, borderRadius: '50%', objectFit: 'cover' }} />
            <div>
              <div style={{ fontSize: '0.85rem', fontWeight: 700 }}>{accountName}</div>
              <div style={{ fontSize: '0.7rem', color: '#65676B', display: 'flex', alignItems: 'center', gap: 4 }}>
                Adesso · 🌐
              </div>
            </div>
          </div>
          <div style={{ marginTop: 10, fontSize: '0.85rem', lineHeight: 1.4, color: '#050505' }}>
            {content || 'Crea il tuo post per la pagina Facebook...'}
            {hashtags && <div style={{ color: '#1877F2', marginTop: 4 }}>{hashtags}</div>}
          </div>
        </div>

        {displayImage && (
          <div style={{ width: '100%', height: 220, overflow: 'hidden' }}>
            <img src={displayImage} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          </div>
        )}

        <div style={{ padding: '8px 14px', borderTop: '1px solid #CED0D4', borderBottom: '1px solid #CED0D4', display: 'flex', justifyContent: 'space-around', color: '#65676B', fontSize: '0.75rem', fontWeight: 600 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}><ThumbsUp size={16} /> Mi piace</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}><MessageCircle size={16} /> Commenta</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Share2 size={16} /> Condividi</div>
        </div>
      </div>
    );
  }

  // 3. X (TWITTER)
  if (platform === 'x') {
    const charCount = (content + (hashtags ? `\n\n${hashtags}` : '')).length;
    return (
      <div style={{ background: '#000000', color: '#E7E9EA', padding: '14px', minHeight: '100%' }}>
        <div style={{ display: 'flex', gap: 10 }}>
          <img src={defaultAvatar} alt="" style={{ width: 38, height: 38, borderRadius: '50%', objectFit: 'cover' }} />
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontWeight: 700, fontSize: '0.85rem' }}>{accountName}</span>
              <CheckCircle2 size={14} color="#1D9BF0" />
              <span style={{ color: '#71767B', fontSize: '0.78rem' }}>{handle}</span>
            </div>

            <div style={{ marginTop: 6, fontSize: '0.88rem', lineHeight: 1.45, whiteSpace: 'pre-wrap' }}>
              {content || 'Cosa sta succedendo? Scrivi il tuo post per X...'}
            </div>

            {hashtags && (
              <div style={{ color: '#1D9BF0', marginTop: 6, fontSize: '0.82rem' }}>
                {hashtags}
              </div>
            )}

            {displayImage && (
              <div style={{ marginTop: 10, borderRadius: 14, overflow: 'hidden', border: '1px solid #2F3336', maxHeight: 200 }}>
                <img src={displayImage} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              </div>
            )}

            <div style={{ marginTop: 10, fontSize: '0.72rem', color: '#71767B' }}>
              10:30 · 09 set 2026 · <span style={{ color: '#E7E9EA', fontWeight: 600 }}>24.8K</span> visualizzazioni
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 12, paddingTop: 10, borderTop: '1px solid #2F3336', color: '#71767B' }}>
              <MessageCircle size={16} />
              <Repeat2 size={16} />
              <Heart size={16} />
              <Bookmark size={16} />
              <Share2 size={16} />
            </div>

            <div style={{ marginTop: 12, padding: '4px 8px', borderRadius: 4, background: charCount > 280 ? 'rgba(239, 68, 68, 0.2)' : 'rgba(255,255,255,0.05)', fontSize: '0.7rem', color: charCount > 280 ? '#EF4444' : '#94A3B8', display: 'flex', justifyContent: 'space-between' }}>
              <span>Conteggio caratteri X:</span>
              <span style={{ fontWeight: 700 }}>{charCount}/280</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 4. LINKEDIN
  if (platform === 'linkedin') {
    return (
      <div style={{ background: '#FFFFFF', color: '#000000DE', minHeight: '100%' }}>
        <div style={{ padding: '12px 14px' }}>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <img src={defaultAvatar} alt="" style={{ width: 44, height: 44, borderRadius: '50%', objectFit: 'cover' }} />
            <div>
              <div style={{ fontSize: '0.85rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 4 }}>
                {accountName} <span style={{ color: '#00000099', fontWeight: 400, fontSize: '0.75rem' }}>• 1°</span>
              </div>
              <div style={{ fontSize: '0.72rem', color: '#00000099' }}>Official Enterprise & Community</div>
              <div style={{ fontSize: '0.68rem', color: '#00000099' }}>Adesso • 🌐</div>
            </div>
          </div>

          <div style={{ marginTop: 10, fontSize: '0.82rem', lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>
            {content || 'Condividi aggiornamenti professionali con la tua rete...'}
          </div>

          {hashtags && (
            <div style={{ color: '#0A66C2', marginTop: 8, fontSize: '0.8rem', fontWeight: 600 }}>
              {hashtags}
            </div>
          )}
        </div>

        {displayImage && (
          <div style={{ width: '100%', height: 210, overflow: 'hidden' }}>
            <img src={displayImage} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          </div>
        )}

        <div style={{ padding: '8px 14px', borderTop: '1px solid #E0E0E0', display: 'flex', justifyContent: 'space-around', color: '#00000099', fontSize: '0.75rem', fontWeight: 600 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}><ThumbsUp size={16} /> Consiglia</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}><MessageSquare size={16} /> Commenta</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Repeat2 size={16} /> Diffondi</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Send size={16} /> Invia</div>
        </div>
      </div>
    );
  }

  // 5. TIKTOK
  if (platform === 'tiktok') {
    return (
      <div style={{ background: '#121212', color: '#FFFFFF', minHeight: '100%', position: 'relative', display: 'flex', flexDirection: 'column' }}>
        {/* Video background */}
        <div style={{ position: 'absolute', inset: 0, zIndex: 1, overflow: 'hidden' }}>
          {displayImage ? (
            <img src={displayImage} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          ) : (
            <div style={{ width: '100%', height: '100%', background: 'linear-gradient(180deg, #111827 0%, #000000 100%)' }} />
          )}
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(0,0,0,0.2) 0%, rgba(0,0,0,0.85) 100%)' }} />
        </div>

        {/* TikTok Overlay Controls */}
        <div style={{ position: 'relative', zIndex: 10, display: 'flex', flexDirection: 'column', height: '100%', padding: '16px 12px', justifyContent: 'flex-end' }}>
          {/* Side Action Buttons */}
          <div style={{ position: 'absolute', right: 12, bottom: 90, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14 }}>
            <div style={{ width: 38, height: 38, borderRadius: '50%', border: '2px solid #FE2C55', overflow: 'hidden' }}>
              <img src={defaultAvatar} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
              <Heart size={24} fill="#FFFFFF" color="#FFFFFF" />
              <span style={{ fontSize: '0.65rem', fontWeight: 600 }}>84.2K</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
              <MessageCircle size={24} fill="#FFFFFF" color="#FFFFFF" />
              <span style={{ fontSize: '0.65rem', fontWeight: 600 }}>1.450</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
              <Bookmark size={24} fill="#FFFFFF" color="#FFFFFF" />
              <span style={{ fontSize: '0.65rem', fontWeight: 600 }}>9.2K</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
              <Share2 size={24} fill="#FFFFFF" color="#FFFFFF" />
              <span style={{ fontSize: '0.65rem', fontWeight: 600 }}>Condividi</span>
            </div>
          </div>

          {/* Bottom Info */}
          <div style={{ maxWidth: '80%' }}>
            <div style={{ fontSize: '0.88rem', fontWeight: 700, marginBottom: 4 }}>{handle}</div>
            <div style={{ fontSize: '0.78rem', lineHeight: 1.35, textShadow: '0 1px 3px rgba(0,0,0,0.8)' }}>
              {content || 'Didascalia video TikTok e hook virale...'}
            </div>
            {hashtags && (
              <div style={{ color: '#25F4EE', fontSize: '0.75rem', fontWeight: 600, marginTop: 4 }}>
                {hashtags}
              </div>
            )}
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 8, fontSize: '0.72rem', color: '#E5E7EB' }}>
              <Music size={14} />
              <span>Suono originale - {accountName}</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 6. GOOGLE MY BUSINESS
  if (platform === 'google_business') {
    const ctaAction = extraOptions.cta_action || 'LEARN_MORE';
    const ctaLabels = {
      LEARN_MORE: 'Scopri di più',
      CALL: 'Chiama ora',
      BOOK: 'Prenota online',
      ORDER: 'Ordina ora'
    };
    return (
      <div style={{ background: '#FFFFFF', color: '#202124', padding: '16px', minHeight: '100%' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
          <div style={{ width: 40, height: 40, borderRadius: 8, background: '#4285F4', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 'bold' }}>
            <MapPin size={22} />
          </div>
          <div>
            <div style={{ fontSize: '0.88rem', fontWeight: 700 }}>{accountName}</div>
            <div style={{ fontSize: '0.72rem', color: '#5F6368' }}>Aggiornamento aziendale Google</div>
          </div>
        </div>

        {displayImage && (
          <div style={{ borderRadius: 12, overflow: 'hidden', height: 180, marginBottom: 12 }}>
            <img src={displayImage} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          </div>
        )}

        <div style={{ fontSize: '0.82rem', lineHeight: 1.5, color: '#3C4043' }}>
          {content || 'Aggiorna i tuoi clienti locali su Google con offerte ed eventi...'}
        </div>

        <div style={{ marginTop: 16 }}>
          <button style={{ background: '#1A73E8', color: 'white', border: 'none', padding: '8px 16px', borderRadius: 999, fontSize: '0.8rem', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
            {ctaLabels[ctaAction] || 'Scopri di più'}
            <ExternalLink size={14} />
          </button>
        </div>
      </div>
    );
  }

  // 7. THREADS
  if (platform === 'threads') {
    return (
      <div style={{ background: '#101010', color: '#F3F5F7', padding: '16px', minHeight: '100%' }}>
        <div style={{ display: 'flex', gap: 12 }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <img src={defaultAvatar} alt="" style={{ width: 36, height: 36, borderRadius: '50%', objectFit: 'cover' }} />
            <div style={{ width: 2, flex: 1, background: '#2D2D2D', margin: '8px 0' }} />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '0.85rem', fontWeight: 700 }}>{handle.replace('@', '')}</span>
              <span style={{ color: '#777777', fontSize: '0.75rem' }}>1m</span>
            </div>

            <div style={{ marginTop: 6, fontSize: '0.85rem', lineHeight: 1.45, whiteSpace: 'pre-wrap' }}>
              {content || 'Inizia una conversazione aperta su Threads...'}
            </div>

            {displayImage && (
              <div style={{ marginTop: 10, borderRadius: 12, overflow: 'hidden', border: '1px solid #262626' }}>
                <img src={displayImage} alt="" style={{ width: '100%', height: '100%', maxHeight: 220, objectFit: 'cover' }} />
              </div>
            )}

            <div style={{ display: 'flex', gap: 16, marginTop: 12, color: '#F3F5F7' }}>
              <Heart size={18} />
              <MessageCircle size={18} />
              <Repeat2 size={18} />
              <Send size={18} />
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 8. YOUTUBE (SHORTS)
  if (platform === 'youtube') {
    return (
      <div style={{ background: '#0F0F0F', color: '#F1F1F1', minHeight: '100%', position: 'relative', display: 'flex', flexDirection: 'column' }}>
        <div style={{ position: 'absolute', inset: 0, zIndex: 1, overflow: 'hidden' }}>
          {displayImage ? (
            <img src={displayImage} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          ) : (
            <div style={{ width: '100%', height: '100%', background: '#181818' }} />
          )}
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(0,0,0,0.1) 0%, rgba(0,0,0,0.85) 100%)' }} />
        </div>

        <div style={{ position: 'relative', zIndex: 10, display: 'flex', flexDirection: 'column', height: '100%', padding: '16px 12px', justifyContent: 'flex-end' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <img src={defaultAvatar} alt="" style={{ width: 32, height: 32, borderRadius: '50%', objectFit: 'cover' }} />
            <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>{handle}</span>
            <button style={{ background: '#CC0000', color: 'white', border: 'none', padding: '4px 10px', borderRadius: 999, fontSize: '0.72rem', fontWeight: 700 }}>
              ISCRIVITI
            </button>
          </div>

          <div style={{ fontSize: '0.82rem', fontWeight: 600, lineHeight: 1.4 }}>
            {content || 'Titolo e didascalia YouTube Shorts...'}
          </div>

          {hashtags && (
            <div style={{ color: '#3EA6FF', fontSize: '0.75rem', marginTop: 4 }}>
              {hashtags}
            </div>
          )}
        </div>
      </div>
    );
  }

  return <div>Anteprima non disponibile</div>;
}
