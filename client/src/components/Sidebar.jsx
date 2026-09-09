import React from 'react';
import { 
  Calendar, PlusCircle, Image, Share2, Cpu, 
  Settings, CheckCircle, HardDrive, RefreshCw, Cloud
} from 'lucide-react';

const PLATFORM_ICONS = {
  facebook: { label: 'Facebook', color: '#1877F2' },
  instagram: { label: 'Instagram', color: '#E1306C' },
  tiktok: { label: 'TikTok', color: '#25F4EE' },
  google_business: { label: 'Google Business', color: '#4285F4' },
  linkedin: { label: 'LinkedIn', color: '#0A66C2' },
  threads: { label: 'Threads', color: '#FFFFFF' },
  x: { label: 'X (Twitter)', color: '#CBD5E1' },
  youtube: { label: 'YouTube', color: '#FF0000' }
};

export default function Sidebar({ 
  currentTab = 'calendar', 
  onSelectTab, 
  channels = [], 
  onOpenPostComposer, 
  onOpenMediaLibrary,
  onOpenChannelsModal,
  onOpenMcpModal,
  onOpenSettings,
  pcloudStatus,
  postCount = 0
}) {
  return (
    <aside className="sidebar">
      {/* Brand Header */}
      <div className="sidebar-brand">
        <div className="sidebar-logo-icon">
          <Share2 size={20} />
        </div>
        <div>
          <div className="sidebar-brand-title">NonPosto.io</div>
          <div style={{ fontSize: '0.68rem', color: '#94A3B8' }}>Social Media Hub</div>
        </div>
      </div>

      {/* Main Navigation */}
      <nav className="sidebar-nav">
        <button 
          className={`nav-item ${currentTab === 'calendar' ? 'active' : ''}`}
          onClick={() => onSelectTab('calendar')}
        >
          <Calendar size={18} />
          <span>Calendario</span>
          {postCount > 0 && <span className="nav-badge">{postCount}</span>}
        </button>

        <button 
          className="nav-item"
          onClick={onOpenPostComposer}
        >
          <PlusCircle size={18} />
          <span>Compositore Post</span>
        </button>

        <button 
          className="nav-item"
          onClick={onOpenMediaLibrary}
        >
          <Image size={18} />
          <span>Media & pCloud</span>
        </button>

        <button 
          className="nav-item"
          onClick={onOpenChannelsModal}
        >
          <Share2 size={18} />
          <span>Canali Social (8)</span>
        </button>

        <button 
          className="nav-item"
          onClick={onOpenMcpModal}
        >
          <Cpu size={18} />
          <span>Integrazione MCP AI</span>
        </button>

        <button 
          className="nav-item"
          onClick={onOpenSettings}
        >
          <Settings size={18} />
          <span>Impostazioni & Cloud</span>
        </button>

        {/* Channels Status for Current Client */}
        <div className="sidebar-section-label">Canali del Cliente</div>
        <div className="channel-quick-list">
          {channels.slice(0, 8).map((ch) => {
            const meta = PLATFORM_ICONS[ch.platform] || { label: ch.platform, color: '#8B5CF6' };
            const isConnected = ch.active === 1 && ch.account_name;
            return (
              <div 
                key={ch.id} 
                className="channel-quick-item" 
                style={{ cursor: 'pointer' }}
                onClick={onOpenChannelsModal}
                title={isConnected ? `${meta.label}: ${ch.account_name} (${ch.handle})` : `Clicca per accedere e collegare ${meta.label}`}
              >
                <div 
                  className="channel-dot" 
                  style={{ backgroundColor: isConnected ? meta.color : '#475569' }} 
                />
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
                  {meta.label}
                </span>
                {isConnected ? (
                  <span style={{ fontSize: '0.65rem', color: '#10B981', fontWeight: 600 }}>collegato</span>
                ) : (
                  <span style={{ fontSize: '0.65rem', color: '#94A3B8' }}>+ collega</span>
                )}
              </div>
            );
          })}
        </div>
      </nav>

      {/* Sidebar Footer with pCloud & Host info */}
      <div className="sidebar-footer">
        <div className={`pcloud-status-badge ${pcloudStatus?.connected ? '' : 'disconnected'}`}>
          <Cloud size={16} />
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontWeight: 600 }}>
              {pcloudStatus?.connected ? 'pCloud Collegato' : 'Storage Locale'}
            </span>
            <span style={{ fontSize: '0.68rem', color: 'inherit', opacity: 0.85 }}>
              {pcloudStatus?.connected ? `${pcloudStatus.quotaFreeMB || 10000} MB liberi` : 'Zero-cost ready'}
            </span>
          </div>
        </div>

        <div style={{ fontSize: '0.68rem', color: '#64748B', textAlign: 'center' }}>
          Pronto per Render.com 🚀
        </div>
      </div>
    </aside>
  );
}
