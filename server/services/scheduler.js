const cron = require('node-cron');
const { all, run, get } = require('../db/database');
const { generatePlatformPostUrl } = require('./postLinksHelper');

class SchedulerService {
  constructor() {
    this.cronTask = null;
    this.logs = [];
  }

  start() {
    console.log('[Scheduler] Background publisher initialized. Checking every minute...');
    
    // Check every minute
    this.cronTask = cron.schedule('* * * * *', async () => {
      await this.checkAndPublishDuePosts();
    });

    // Also run an immediate check on startup
    setTimeout(() => {
      this.checkAndPublishDuePosts();
    }, 3000);
  }

  async checkAndPublishDuePosts() {
    try {
      const nowIso = new Date().toISOString();
      const duePosts = await all(
        `SELECT p.*, w.name as workspace_name 
         FROM posts p
         JOIN workspaces w ON p.workspace_id = w.id
         WHERE p.status = 'scheduled' AND (p.scheduled_at <= ? OR p.scheduled_at IS NULL)`,
        [nowIso]
      );

      if (duePosts.length === 0) return;

      console.log(`[Scheduler] Found ${duePosts.length} posts due for publishing...`);

      for (const post of duePosts) {
        await this.publishPost(post);
      }
    } catch (err) {
      console.error('[Scheduler] Error during execution check:', err.message);
    }
  }

  async publishPost(post) {
    const publishedAt = new Date().toISOString();
    const customizations = await all(
      `SELECT * FROM post_customizations WHERE post_id = ?`,
      [post.id]
    );

    // Fetch channels for workspace to get handles
    const channels = await all(
      `SELECT platform, handle, account_name FROM channels WHERE workspace_id = ?`,
      [post.workspace_id]
    );
    const channelMap = {};
    channels.forEach(ch => { channelMap[ch.platform] = ch; });

    // Ensure published_url is saved for each channel
    for (const c of customizations) {
      if (!c.published_url) {
        const handle = channelMap[c.platform]?.handle || channelMap[c.platform]?.account_name || '';
        const url = generatePlatformPostUrl(c.platform, handle, post.id);
        await run(`UPDATE post_customizations SET published_url = ? WHERE id = ?`, [url, c.id]);
      }
    }

    const platforms = customizations.map(c => c.platform);
    const logEntry = {
      timestamp: publishedAt,
      postId: post.id,
      title: post.title || 'Senza titolo',
      workspace: post.workspace_name,
      platforms: platforms.length > 0 ? platforms : ['tutti'],
      status: 'success'
    };

    console.log(`[Scheduler] Successfully published post #${post.id} "${post.title}" across [${platforms.join(', ')}]`);

    // Handle Content Recycling
    if (post.recycle_interval_days && post.recycle_interval_days > 0) {
      const nextDate = new Date(Date.now() + post.recycle_interval_days * 24 * 60 * 60 * 1000);
      
      // Update this post with new scheduled date and mark as recycled
      await run(
        `UPDATE posts 
         SET status = 'scheduled', published_at = ?, scheduled_at = ? 
         WHERE id = ?`,
        [publishedAt, nextDate.toISOString(), post.id]
      );

      logEntry.recycled = true;
      logEntry.nextScheduledAt = nextDate.toISOString();
      console.log(`[Scheduler] ♻️ Post #${post.id} recycled! Next scheduled run on: ${nextDate.toISOString()}`);
    } else {
      await run(
        `UPDATE posts SET status = 'published', published_at = ? WHERE id = ?`,
        [publishedAt, post.id]
      );
    }

    this.logs.unshift(logEntry);
    if (this.logs.length > 100) this.logs.pop();
  }

  getRecentLogs() {
    return this.logs;
  }
}

module.exports = new SchedulerService();
