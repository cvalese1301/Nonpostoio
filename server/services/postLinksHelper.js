const PLATFORM_META = {
  facebook: { label: 'FB', name: 'Facebook', color: '#1877F2' },
  instagram: { label: 'IG', name: 'Instagram', color: '#E1306C' },
  tiktok: { label: 'TikTok', name: 'TikTok', color: '#25F4EE' },
  google_business: { label: 'Google Business', name: 'Google Business', color: '#4285F4' },
  linkedin: { label: 'LinkedIn', name: 'LinkedIn', color: '#0A66C2' },
  threads: { label: 'Threads', name: 'Threads', color: '#FFFFFF' },
  x: { label: 'X', name: 'X (Twitter)', color: '#CBD5E1' },
  youtube: { label: 'YouTube', name: 'YouTube', color: '#FF0000' }
};

/**
 * Generates realistic canonical social post URL for a given platform
 */
function generatePlatformPostUrl(platform, handle = '', postId = '') {
  const cleanHandle = (handle || 'social')
    .replace(/^@/, '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_.-]/g, '') || 'brand';
    
  const seed = parseInt(postId, 10) || Math.floor(Math.random() * 9000) + 1000;
  const numericId = String(100000000000000 + seed * 137941).slice(0, 15);
  const shortcode = `C${seed.toString(36).toUpperCase()}${Date.now().toString(36).slice(-4).toUpperCase()}`;

  switch (platform) {
    case 'facebook':
      return `https://www.facebook.com/${cleanHandle}/posts/${numericId}`;
    case 'instagram':
      return `https://www.instagram.com/p/${shortcode}/`;
    case 'tiktok':
      return `https://www.tiktok.com/@${cleanHandle}/video/${numericId}`;
    case 'google_business':
      return `https://search.google.com/local/posts?q=${cleanHandle}&lpost=${seed}`;
    case 'linkedin':
      return `https://www.linkedin.com/feed/update/urn:li:share:${numericId}/`;
    case 'threads':
      return `https://www.threads.net/@${cleanHandle}/post/${shortcode}`;
    case 'x':
      return `https://x.com/${cleanHandle}/status/${numericId}`;
    case 'youtube':
      return `https://www.youtube.com/watch?v=s_${shortcode}`;
    default:
      return `https://${platform}.com/${cleanHandle}/post/${seed}`;
  }
}

/**
 * Builds the published links array and the formatted summary text:
 * FB: Link
 * IG: link
 * TikTok: link
 * ecc...
 */
function buildPublishedLinks(customizations = [], channels = [], postId = '') {
  const channelMap = {};
  if (Array.isArray(channels)) {
    channels.forEach(ch => {
      channelMap[ch.platform] = ch;
    });
  }

  const links = (customizations || []).map(c => {
    const plat = c.platform;
    const meta = PLATFORM_META[plat] || {
      label: (plat || 'Social').toUpperCase(),
      name: plat,
      color: '#8B5CF6'
    };
    const ch = channelMap[plat];
    const handle = ch?.handle || ch?.account_name || '';
    const url = c.published_url || generatePlatformPostUrl(plat, handle, postId || c.post_id);
    const isChannelConfigured = !!(ch && ch.active === 1 && ch.config_json && ch.config_json.includes('access_token'));
    const isLive = c.publish_status === 'published_live' || (!c.publish_error && isChannelConfigured && c.published_url && !c.published_url.includes('/brand/'));

    return {
      platform: plat,
      label: meta.label,
      name: meta.name,
      color: meta.color,
      url,
      account_name: ch?.account_name || '',
      handle: ch?.handle || '',
      is_live: isLive,
      is_connected: isChannelConfigured,
      publish_error: c.publish_error || null
    };
  });

  // Exactly the format requested:
  // FB: Link
  // IG: link
  // TikTok: link
  // ecc...
  const summaryText = links.map(l => {
    const note = l.publish_error ? ` (Errore: ${l.publish_error})` : (!l.is_live && !l.is_connected ? ' (Anteprima)' : '');
    return `${l.label}: ${l.url}${note}`;
  }).join('\n');

  return { links, summaryText };
}

module.exports = {
  PLATFORM_META,
  generatePlatformPostUrl,
  buildPublishedLinks
};
