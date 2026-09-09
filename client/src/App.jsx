import React, { useState, useEffect } from 'react';
import Header from './components/Header.jsx';
import Sidebar from './components/Sidebar.jsx';
import CalendarView from './components/CalendarView.jsx';
import PostComposerModal from './components/PostComposerModal.jsx';
import MediaLibraryModal from './components/MediaLibraryModal.jsx';
import ChannelsModal from './components/ChannelsModal.jsx';
import McpModal from './components/McpModal.jsx';
import SettingsModal from './components/SettingsModal.jsx';
import NewClientModal from './components/NewClientModal.jsx';

export default function App() {
  const [workspaces, setWorkspaces] = useState([]);
  const [activeWorkspace, setActiveWorkspace] = useState(null);
  const [channels, setChannels] = useState([]);
  const [posts, setPosts] = useState([]);
  const [pcloudStatus, setPcloudStatus] = useState(null);

  // Navigation & View Mode
  const [currentTab, setCurrentTab] = useState('calendar'); // 'calendar' | 'media' | etc.
  const [viewMode, setViewMode] = useState('month'); // 'month' | 'week' | 'list'

  // Modals state
  const [composerOpen, setComposerOpen] = useState(false);
  const [editingPost, setEditingPost] = useState(null);
  const [composerInitialDate, setComposerInitialDate] = useState(null);

  const [mediaLibraryOpen, setMediaLibraryOpen] = useState(false);
  const [channelsModalOpen, setChannelsModalOpen] = useState(false);
  const [mcpModalOpen, setMcpModalOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [newClientOpen, setNewClientOpen] = useState(false);

  // 1. Initial Load Workspaces
  useEffect(() => {
    fetchWorkspaces();
    checkPcloudStatus();
  }, []);

  const fetchWorkspaces = async () => {
    try {
      const res = await fetch('/api/workspaces');
      const data = await res.json();
      setWorkspaces(data);
      if (data.length > 0) {
        if (!activeWorkspace || !data.some(w => w.id === activeWorkspace.id)) {
          setActiveWorkspace(data[0]);
        }
      } else {
        setActiveWorkspace(null);
        setChannels([]);
        setPosts([]);
        setNewClientOpen(true);
      }
    } catch (err) {
      console.error('Failed to load workspaces:', err);
    }
  };

  const checkPcloudStatus = async () => {
    try {
      const res = await fetch('/api/storage/status');
      const data = await res.json();
      setPcloudStatus(data);
    } catch (err) {
      console.error('Failed to check pCloud:', err);
    }
  };

  // 2. Load Channels & Posts when Active Workspace changes
  useEffect(() => {
    if (!activeWorkspace) return;
    fetchChannels(activeWorkspace.id);
    fetchPosts(activeWorkspace.id);
  }, [activeWorkspace?.id]);

  const fetchChannels = async (wsId) => {
    try {
      const res = await fetch(`/api/channels?workspace_id=${wsId}`);
      const data = await res.json();
      setChannels(data);
    } catch (err) {
      console.error('Failed to load channels:', err);
    }
  };

  const fetchPosts = async (wsId) => {
    try {
      const res = await fetch(`/api/posts?workspace_id=${wsId}`);
      const data = await res.json();
      setPosts(data);
    } catch (err) {
      console.error('Failed to load posts:', err);
    }
  };

  // Reschedule Post (Drag & Drop)
  const handleReschedulePost = async (postId, newScheduledAt) => {
    // Optimistic UI update
    setPosts(prev => prev.map(p => p.id === postId ? { ...p, scheduled_at: newScheduledAt, status: 'scheduled' } : p));

    try {
      await fetch(`/api/posts/${postId}/reschedule`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scheduled_at: newScheduledAt })
      });
      fetchPosts(activeWorkspace.id);
    } catch (err) {
      console.error('Reschedule failed:', err);
      fetchPosts(activeWorkspace.id);
    }
  };

  // Duplicate / Recycle Post
  const handleDuplicatePost = async (postId) => {
    try {
      await fetch(`/api/posts/${postId}/duplicate`, { method: 'POST' });
      fetchPosts(activeWorkspace.id);
    } catch (err) {
      console.error('Duplicate failed:', err);
    }
  };

  // Delete Post
  const handleDeletePost = async (postId) => {
    if (!confirm('Sei sicuro di voler eliminare questo post?')) return;
    try {
      await fetch(`/api/posts/${postId}`, { method: 'DELETE' });
      setPosts(prev => prev.filter(p => p.id !== postId));
    } catch (err) {
      console.error('Delete failed:', err);
    }
  };

  // Save or Update Post from Composer
  const handleSavePost = async (postPayload) => {
    try {
      if (postPayload.id) {
        // Update
        await fetch(`/api/posts/${postPayload.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(postPayload)
        });
      } else {
        // Create
        await fetch('/api/posts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(postPayload)
        });
      }
      fetchPosts(activeWorkspace.id);
    } catch (err) {
      console.error('Save post error:', err);
    }
  };

  // Create New Client / Workspace
  const handleCreateClient = async (clientData) => {
    const res = await fetch('/api/workspaces', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(clientData)
    });
    const newWs = await res.json();
    setWorkspaces(prev => [...prev, newWs]);
    setActiveWorkspace(newWs);
  };

  // Update Channel status or handle
  const handleUpdateChannel = async (channelId, updateData) => {
    try {
      const res = await fetch(`/api/channels/${channelId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData)
      });
      const updated = await res.json();
      setChannels(prev => prev.map(c => c.id === channelId ? updated : c));
    } catch (err) {
      console.error('Update channel failed:', err);
    }
  };

  // Open Composer helpers
  const openComposerNew = () => {
    if (!activeWorkspace) {
      setNewClientOpen(true);
      return;
    }
    setEditingPost(null);
    setComposerInitialDate(null);
    setComposerOpen(true);
  };

  const openComposerForDate = (day) => {
    if (!activeWorkspace) {
      setNewClientOpen(true);
      return;
    }
    setEditingPost(null);
    setComposerInitialDate(day);
    setComposerOpen(true);
  };

  const openComposerForEdit = (post) => {
    setEditingPost(post);
    setComposerInitialDate(null);
    setComposerOpen(true);
  };

  return (
    <div className="app-container">
      {/* Sidebar */}
      <Sidebar
        currentTab={currentTab}
        onSelectTab={(tab) => {
          if (tab === 'calendar') setCurrentTab('calendar');
        }}
        channels={channels}
        onOpenPostComposer={openComposerNew}
        onOpenMediaLibrary={() => setMediaLibraryOpen(true)}
        onOpenChannelsModal={() => setChannelsModalOpen(true)}
        onOpenMcpModal={() => setMcpModalOpen(true)}
        onOpenSettings={() => setSettingsOpen(true)}
        pcloudStatus={pcloudStatus}
        postCount={posts.length}
      />

      {/* Main Layout Area */}
      <div className="main-layout">
        <Header
          workspaces={workspaces}
          activeWorkspace={activeWorkspace}
          onSelectWorkspace={(ws) => setActiveWorkspace(ws)}
          onOpenNewClientModal={() => setNewClientOpen(true)}
          onOpenPostComposer={openComposerNew}
          onOpenMcpModal={() => setMcpModalOpen(true)}
          onOpenMediaLibrary={() => setMediaLibraryOpen(true)}
          onOpenSettings={() => setSettingsOpen(true)}
          viewMode={viewMode}
          onChangeViewMode={setViewMode}
          pcloudStatus={pcloudStatus}
        />

        {/* View Port: Interactive Drag-and-Drop Calendar or Welcome State */}
        {activeWorkspace ? (
          <CalendarView
            posts={posts}
            onReschedulePost={handleReschedulePost}
            onDeletePost={handleDeletePost}
            onDuplicatePost={handleDuplicatePost}
            onEditPost={openComposerForEdit}
            onOpenComposerForDate={openComposerForDate}
            viewMode={viewMode}
          />
        ) : (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 40, textAlign: 'center' }}>
            <div style={{ width: 64, height: 64, borderRadius: 18, background: 'linear-gradient(135deg, #8B5CF6, #EC4899)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 20, boxShadow: '0 0 25px rgba(139, 92, 246, 0.4)' }}>
              <span style={{ fontSize: '2rem' }}>✨</span>
            </div>
            <h2 style={{ fontSize: '1.6rem', fontWeight: 700, marginBottom: 8, color: '#F8FAFC' }}>Benvenuto su NonPosto.io</h2>
            <p style={{ color: '#94A3B8', maxWidth: 450, marginBottom: 24, fontSize: '0.92rem', lineHeight: 1.5 }}>
              Nessun cliente o brand presente. Crea il tuo primo brand per iniziare a gestire e pianificare i tuoi 8 canali social in maniera ottimizzata.
            </p>
            <button className="btn-primary" style={{ padding: '12px 24px', fontSize: '0.95rem' }} onClick={() => setNewClientOpen(true)}>
              + Crea il tuo primo Cliente/Brand
            </button>
          </div>
        )}
      </div>

      {/* Post Composer Modal */}
      <PostComposerModal
        isOpen={composerOpen}
        onClose={() => setComposerOpen(false)}
        activeWorkspace={activeWorkspace}
        channels={channels}
        editingPost={editingPost}
        initialDate={composerInitialDate}
        onSavePost={handleSavePost}
      />

      {/* Media & pCloud Library Modal */}
      <MediaLibraryModal
        isOpen={mediaLibraryOpen}
        onClose={() => setMediaLibraryOpen(false)}
        activeWorkspace={activeWorkspace}
        pcloudStatus={pcloudStatus}
        onSelectMediaForPost={(url) => {
          // Open composer with this image pre-selected
          openComposerNew();
        }}
      />

      {/* Channels Configuration Modal */}
      <ChannelsModal
        isOpen={channelsModalOpen}
        onClose={() => setChannelsModalOpen(false)}
        activeWorkspace={activeWorkspace}
        channels={channels}
        onUpdateChannel={handleUpdateChannel}
        onRefreshChannels={() => activeWorkspace && fetchChannels(activeWorkspace.id)}
      />

      {/* MCP AI Integration Modal */}
      <McpModal
        isOpen={mcpModalOpen}
        onClose={() => setMcpModalOpen(false)}
        activeWorkspace={activeWorkspace}
        onPostCreatedViaAi={() => {
          if (activeWorkspace) fetchPosts(activeWorkspace.id);
        }}
      />

      {/* Settings Modal */}
      <SettingsModal
        isOpen={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        pcloudStatus={pcloudStatus}
        onRefreshPcloudStatus={checkPcloudStatus}
      />

      {/* New Client Workspace Modal */}
      <NewClientModal
        isOpen={newClientOpen}
        onClose={() => setNewClientOpen(false)}
        onCreateClient={handleCreateClient}
      />
    </div>
  );
}
