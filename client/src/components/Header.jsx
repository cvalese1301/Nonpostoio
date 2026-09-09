import React, { useState, useRef, useEffect } from 'react';
import { 
  ChevronDown, Plus, Sparkles, Calendar, List, 
  Layers, HardDrive, Cpu, Building2, Check, Cloud
} from 'lucide-react';

export default function Header({ 
  workspaces = [], 
  activeWorkspace, 
  onSelectWorkspace, 
  onOpenNewClientModal,
  onOpenPostComposer,
  onOpenMcpModal,
  onOpenMediaLibrary,
  onOpenSettings,
  viewMode,
  onChangeViewMode,
  pcloudStatus
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <header className="header">
      <div className="header-left">
        {/* Workspace / Client Multi-Account Selector */}
        <div className="workspace-selector" ref={dropdownRef}>
          <button 
            className="workspace-btn" 
            onClick={() => setMenuOpen(!menuOpen)}
            title="Cambia Cliente o Account"
          >
            <div 
              className="workspace-avatar"
              style={{ backgroundColor: activeWorkspace?.color || '#8B5CF6' }}
            >
              {activeWorkspace?.logo_url ? (
                <img 
                  src={activeWorkspace.logo_url} 
                  alt="" 
                  style={{ width: '100%', height: '100%', borderRadius: 6, objectFit: 'cover' }} 
                />
              ) : (
                activeWorkspace?.name?.charAt(0) || 'C'
              )}
            </div>
            <span>{activeWorkspace?.name || 'Seleziona Cliente'}</span>
            <ChevronDown size={16} color="#94A3B8" />
          </button>

          {menuOpen && (
            <div className="workspace-menu">
              <div style={{ padding: '6px 12px', fontSize: '0.72rem', fontWeight: 600, color: '#64748B', textTransform: 'uppercase' }}>
                Account Clienti Attivi
              </div>
              {workspaces.map((ws) => (
                <div 
                  key={ws.id}
                  className={`workspace-menu-item ${activeWorkspace?.id === ws.id ? 'active' : ''}`}
                  onClick={() => {
                    onSelectWorkspace(ws);
                    setMenuOpen(false);
                  }}
                >
                  <div 
                    className="workspace-avatar"
                    style={{ backgroundColor: ws.color || '#8B5CF6', width: 22, height: 22, fontSize: '0.7rem' }}
                  >
                    {ws.logo_url ? (
                      <img src={ws.logo_url} alt="" style={{ width: '100%', height: '100%', borderRadius: 6, objectFit: 'cover' }} />
                    ) : (
                      ws.name.charAt(0)
                    )}
                  </div>
                  <span style={{ flex: 1 }}>{ws.name}</span>
                  {activeWorkspace?.id === ws.id && <Check size={16} color="#8B5CF6" />}
                </div>
              ))}

              <div className="workspace-menu-divider" />

              <div 
                className="workspace-menu-item"
                style={{ color: '#A78BFA', fontWeight: 600 }}
                onClick={() => {
                  setMenuOpen(false);
                  onOpenNewClientModal();
                }}
              >
                <Plus size={16} />
                <span>+ Aggiungi Nuovo Cliente</span>
              </div>
            </div>
          )}
        </div>

        {/* View Mode Switcher */}
        <div className="view-toggle-group">
          <button 
            className={`view-toggle-btn ${viewMode === 'month' ? 'active' : ''}`}
            onClick={() => onChangeViewMode('month')}
          >
            Mese
          </button>
          <button 
            className={`view-toggle-btn ${viewMode === 'week' ? 'active' : ''}`}
            onClick={() => onChangeViewMode('week')}
          >
            Settimana
          </button>
          <button 
            className={`view-toggle-btn ${viewMode === 'list' ? 'active' : ''}`}
            onClick={() => onChangeViewMode('list')}
          >
            Elenco
          </button>
        </div>
      </div>

      <div className="header-right">
        {/* pCloud Cloud Storage Status Button */}
        <button 
          className="btn-secondary" 
          onClick={onOpenMediaLibrary}
          title={pcloudStatus?.connected ? 'pCloud Connesso (10GB Cloud)' : 'Storage Locale / Configura pCloud'}
        >
          <Cloud size={16} color={pcloudStatus?.connected ? '#10B981' : '#94A3B8'} />
          <span style={{ fontSize: '0.82rem' }}>
            {pcloudStatus?.connected ? 'pCloud Attivo' : 'pCloud Storage'}
          </span>
        </button>

        {/* MCP AI Assistant Button */}
        <button 
          className="btn-ai-glow" 
          onClick={onOpenMcpModal}
          title="Gestione e Automazione tramite AI & Server MCP"
        >
          <Sparkles size={16} />
          <span>Assistente MCP AI</span>
        </button>

        {/* New Post Primary Button */}
        <button 
          className="btn-primary" 
          onClick={() => onOpenPostComposer()}
          id="btn-new-post"
        >
          <Plus size={18} />
          <span>Nuovo Post</span>
        </button>
      </div>
    </header>
  );
}
