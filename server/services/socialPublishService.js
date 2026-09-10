const axios = require('axios');
const fs = require('fs');
const path = require('path');
const FormData = require('form-data');
const { run, all, get } = require('../db/database');
const logger = require('./logger');
const { generatePlatformPostUrl } = require('./postLinksHelper');

class SocialPublishService {
  /**
   * Publishes content to all selected channels for a given post
   */
  async publishPostToSocials({ postId, workspaceId, title, baseContent, customizations = {} }) {
    const results = {};

    // 1. Fetch channels for this workspace
    const channels = await all('SELECT * FROM channels WHERE workspace_id = ?', [workspaceId]);
    const channelMap = {};
    channels.forEach(ch => { channelMap[ch.platform] = ch; });

    // 2. Iterate through each platform selected in customizations
    for (const [platform, custData] of Object.entries(customizations)) {
      if (!custData) continue;

      const channel = channelMap[platform];
      const textToPublish = (custData.custom_content || baseContent || '').trim();
      const hashtags = (custData.hashtags || '').trim();
      const fullMessage = hashtags ? `${textToPublish}\n\n${hashtags}` : textToPublish;
      const mediaUrls = custData.media_urls || [];
      const firstComment = (custData.first_comment || '').trim();

      let publishedUrl = null;
      let publishError = null;
      let isLive = false;

      try {
        if (!channel || channel.active !== 1) {
          // Channel not connected via OAuth, keep simulated preview link
          publishedUrl = custData.published_url || generatePlatformPostUrl(platform, channel?.handle || channel?.account_name || 'brand', postId);
          results[platform] = { success: true, mode: 'simulated', url: publishedUrl, is_live: false };

          await run(
            `UPDATE post_customizations 
             SET published_url = ?, publish_status = 'simulated', publish_error = NULL 
             WHERE post_id = ? AND platform = ?`,
            [publishedUrl, postId, platform]
          ).catch(() => {});
          continue;
        }

        let config = {};
        try {
          config = JSON.parse(channel.config_json || '{}');
        } catch (e) {
          config = {};
        }

        const accessToken = config.access_token;
        const accountId = config.account_id;

        // ---------- FACEBOOK PAGE PUBLISHING ----------
        if (platform === 'facebook' && accessToken && accountId) {
          await logger.info('publish', `Pubblicazione reale su Pagina Facebook "${channel.account_name}" (#${accountId})`, { postId });

          let fbPostId = null;

          if (mediaUrls.length > 0) {
            const firstMedia = mediaUrls[0];
            if (firstMedia.startsWith('http://') || firstMedia.startsWith('https://')) {
              // Photo post via remote URL
              const photoRes = await axios.post(`https://graph.facebook.com/v20.0/${accountId}/photos`, null, {
                params: {
                  url: firstMedia,
                  caption: fullMessage,
                  access_token: accessToken
                }
              });
              fbPostId = photoRes.data.post_id || photoRes.data.id;
            } else {
              // Local file upload via FormData
              const localFilePath = path.join(__dirname, '../../uploads', path.basename(firstMedia));
              if (fs.existsSync(localFilePath)) {
                const form = new FormData();
                form.append('source', fs.createReadStream(localFilePath));
                if (fullMessage) form.append('caption', fullMessage);
                form.append('access_token', accessToken);

                const photoRes = await axios.post(`https://graph.facebook.com/v20.0/${accountId}/photos`, form, {
                  headers: form.getHeaders()
                });
                fbPostId = photoRes.data.post_id || photoRes.data.id;
              } else {
                // Fallback to text feed
                const feedRes = await axios.post(`https://graph.facebook.com/v20.0/${accountId}/feed`, null, {
                  params: {
                    message: fullMessage,
                    access_token: accessToken
                  }
                });
                fbPostId = feedRes.data.id;
              }
            }
          } else {
            // Text feed post
            const feedRes = await axios.post(`https://graph.facebook.com/v20.0/${accountId}/feed`, null, {
              params: {
                message: fullMessage,
                access_token: accessToken
              }
            });
            fbPostId = feedRes.data.id;
          }

          if (fbPostId) {
            const postKey = String(fbPostId).includes('_') ? String(fbPostId).split('_')[1] : fbPostId;
            publishedUrl = `https://www.facebook.com/${accountId}/posts/${postKey}`;
            isLive = true;
            await logger.info('publish', `Post pubblicato con successo su Facebook! ID: ${fbPostId}`, { postId, fbPostId, publishedUrl });

            // Optional First Comment
            if (firstComment) {
              try {
                await axios.post(`https://graph.facebook.com/v20.0/${fbPostId}/comments`, null, {
                  params: {
                    message: firstComment,
                    access_token: accessToken
                  }
                });
              } catch (commentErr) {
                console.warn('[Facebook Publish] Impossibile pubblicare il primo commento:', commentErr.message);
              }
            }
          }
        }

        // ---------- THREADS PUBLISHING ----------
        else if (platform === 'threads' && accessToken && accountId) {
          await logger.info('publish', `Pubblicazione reale su Threads @${channel.handle} (#${accountId})`, { postId });

          // Step 1: Create Container
          const containerParams = {
            access_token: accessToken
          };

          if (mediaUrls.length > 0 && (mediaUrls[0].startsWith('http://') || mediaUrls[0].startsWith('https://'))) {
            containerParams.media_type = 'IMAGE';
            containerParams.image_url = mediaUrls[0];
            if (fullMessage) containerParams.text = fullMessage;
          } else {
            containerParams.media_type = 'TEXT';
            containerParams.text = fullMessage;
          }

          const createRes = await axios.post(`https://graph.threads.net/v1.0/${accountId}/threads`, null, {
            params: containerParams
          });

          const creationId = createRes.data.id;

          // Step 2: Publish Container
          const pubRes = await axios.post(`https://graph.threads.net/v1.0/${accountId}/threads_publish`, null, {
            params: {
              creation_id: creationId,
              access_token: accessToken
            }
          });

          const threadsPostId = pubRes.data.id;
          if (threadsPostId) {
            const cleanHandle = (channel.handle || '').replace('@', '');
            publishedUrl = cleanHandle 
              ? `https://www.threads.net/@${cleanHandle}/post/${threadsPostId}`
              : `https://www.threads.net/post/${threadsPostId}`;
            isLive = true;
            await logger.info('publish', `Post pubblicato con successo su Threads! ID: ${threadsPostId}`, { postId, threadsPostId, publishedUrl });
          }
        }

        // ---------- INSTAGRAM PROFESSIONAL PUBLISHING ----------
        else if (platform === 'instagram' && accessToken && accountId) {
          if (mediaUrls.length === 0 || !mediaUrls[0].startsWith('http')) {
            throw new Error('Instagram richiede obbligatoriamente un\'immagine o video pubblico (URL) per poter pubblicare.');
          }

          await logger.info('publish', `Pubblicazione reale su Instagram Professionale @${channel.handle} (#${accountId})`, { postId });

          // Step 1: Create Media Container
          const isVideo = mediaUrls[0].match(/\.(mp4|mov|avi)(\?.*)?$/i);
          const containerParams = {
            access_token: accessToken,
            caption: fullMessage
          };

          if (isVideo) {
            containerParams.media_type = 'REELS';
            containerParams.video_url = mediaUrls[0];
          } else {
            containerParams.image_url = mediaUrls[0];
          }

          const createRes = await axios.post(`https://graph.facebook.com/v20.0/${accountId}/media`, null, {
            params: containerParams
          });

          const creationId = createRes.data.id;

          // Step 2: Wait briefly and Publish
          await new Promise(r => setTimeout(r, 2000));

          const pubRes = await axios.post(`https://graph.facebook.com/v20.0/${accountId}/media_publish`, null, {
            params: {
              creation_id: creationId,
              access_token: accessToken
            }
          });

          const igMediaId = pubRes.data.id;
          if (igMediaId) {
            publishedUrl = `https://www.instagram.com/p/${igMediaId}/`;
            isLive = true;
            await logger.info('publish', `Post pubblicato con successo su Instagram! ID: ${igMediaId}`, { postId, igMediaId, publishedUrl });
          }
        }

        // Fallback for unconnected channels or other platforms
        else {
          publishedUrl = custData.published_url || generatePlatformPostUrl(platform, channel?.handle || channel?.account_name || 'brand', postId);
        }

      } catch (err) {
        publishError = err.response?.data?.error?.message || err.message;
        console.error(`[Publish Error] [${platform}]`, publishError);
        await logger.error('publish', `Errore pubblicazione reale su ${platform}: ${publishError}`, {
          postId,
          platform,
          channel: channel?.account_name,
          details: err.response?.data
        });

        // Fallback to simulated link on error so user can still see post card
        publishedUrl = generatePlatformPostUrl(platform, channel?.handle || channel?.account_name || 'brand', postId);
      }

      // Update in database for this customization
      const publishStatus = publishError ? 'failed' : (isLive ? 'published_live' : 'simulated');
      try {
        await run(
          `UPDATE post_customizations 
           SET published_url = ?, publish_status = ?, publish_error = ? 
           WHERE post_id = ? AND platform = ?`,
          [publishedUrl, publishStatus, publishError, postId, platform]
        );
      } catch (dbErr) {
        try {
          await run(
            `UPDATE post_customizations SET published_url = ? WHERE post_id = ? AND platform = ?`,
            [publishedUrl, postId, platform]
          );
        } catch (e) {}
      }

      results[platform] = {
        success: !publishError,
        is_live: isLive,
        mode: isLive ? 'real' : (publishError ? 'failed' : 'simulated'),
        url: publishedUrl,
        error: publishError
      };
    }

    return results;
  }
}

module.exports = new SocialPublishService();
