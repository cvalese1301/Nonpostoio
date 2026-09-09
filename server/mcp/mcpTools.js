const { all, run, get } = require('../db/database');
const aiOptimizer = require('../services/aiOptimizer');
const pcloudStorage = require('../services/pcloudStorage');

const MCP_TOOLS = [
  {
    name: 'list_workspaces',
    description: 'Elenca tutti i clienti/workspace configurati in NonPosto.io',
    inputSchema: {
      type: 'object',
      properties: {}
    }
  },
  {
    name: 'list_channels',
    description: 'Elenca gli 8 canali social collegati per un determinato cliente/workspace',
    inputSchema: {
      type: 'object',
      properties: {
        workspace_id: { type: 'number', description: 'ID del workspace del cliente' }
      },
      required: ['workspace_id']
    }
  },
  {
    name: 'get_calendar_posts',
    description: 'Recupera i post pianificati, pubblicati o in bozza per il calendario di un cliente',
    inputSchema: {
      type: 'object',
      properties: {
        workspace_id: { type: 'number', description: 'ID del workspace del cliente' },
        status: { type: 'string', description: 'Filtra per status: "scheduled", "draft", "published", oppure "all"' },
        from_date: { type: 'string', description: 'Data di inizio ISO string' },
        to_date: { type: 'string', description: 'Data di fine ISO string' }
      },
      required: ['workspace_id']
    }
  },
  {
    name: 'create_post',
    description: 'Crea e programma un post multi-canale con personalizzazioni specifiche per Facebook, Instagram, TikTok, GMB, LinkedIn, Threads, X, YouTube',
    inputSchema: {
      type: 'object',
      properties: {
        workspace_id: { type: 'number', description: 'ID del workspace' },
        title: { type: 'string', description: 'Titolo interno del post' },
        base_content: { type: 'string', description: 'Testo master del post' },
        scheduled_at: { type: 'string', description: 'Data e ora di pubblicazione (ISO format, es. 2026-09-15T15:00:00Z)' },
        status: { type: 'string', enum: ['draft', 'scheduled', 'published'], default: 'scheduled' },
        recycle_interval_days: { type: 'number', description: 'Giorni di intervallo per riciclo automatico (0 per disattivare)' },
        customizations: {
          type: 'object',
          description: 'Personalizzazione per singolo canale (chiavi: facebook, instagram, tiktok, google_business, linkedin, threads, x, youtube)',
          properties: {
            facebook: { type: 'object', properties: { custom_content: { type: 'string' }, hashtags: { type: 'string' } } },
            instagram: { type: 'object', properties: { custom_content: { type: 'string' }, hashtags: { type: 'string' }, first_comment: { type: 'string' } } },
            tiktok: { type: 'object', properties: { custom_content: { type: 'string' }, hashtags: { type: 'string' } } },
            google_business: { type: 'object', properties: { custom_content: { type: 'string' }, cta_action: { type: 'string' } } },
            linkedin: { type: 'object', properties: { custom_content: { type: 'string' }, hashtags: { type: 'string' } } },
            threads: { type: 'object', properties: { custom_content: { type: 'string' } } },
            x: { type: 'object', properties: { custom_content: { type: 'string' }, hashtags: { type: 'string' } } },
            youtube: { type: 'object', properties: { title: { type: 'string' }, custom_content: { type: 'string' } } }
          }
        },
        media_urls: {
          type: 'array',
          items: { type: 'string' },
          description: 'Lista di URL di immagini o video già archiviati su pCloud'
        }
      },
      required: ['workspace_id', 'base_content']
    }
  },
  {
    name: 'reschedule_post',
    description: 'Sposta o riprogramma la data e orario di un post esistente nel calendario',
    inputSchema: {
      type: 'object',
      properties: {
        post_id: { type: 'number', description: 'ID del post' },
        new_scheduled_at: { type: 'string', description: 'Nuova data e ora ISO' }
      },
      required: ['post_id', 'new_scheduled_at']
    }
  },
  {
    name: 'delete_post',
    description: 'Elimina un post e le sue personalizzazioni per i canali',
    inputSchema: {
      type: 'object',
      properties: {
        post_id: { type: 'number', description: 'ID del post da eliminare' }
      },
      required: ['post_id']
    }
  },
  {
    name: 'optimize_copy_for_channels',
    description: 'Ottimizza un testo o idea per gli 8 canali contemporaneamente con regole e hashtag specifici',
    inputSchema: {
      type: 'object',
      properties: {
        base_text: { type: 'string', description: 'Testo di base o idea' },
        platforms: {
          type: 'array',
          items: { type: 'string' },
          description: 'Lista canali (default tutti gli 8)'
        },
        tone: { type: 'string', description: 'Tono desiderato (es. engaging, professional, funny)' }
      },
      required: ['base_text']
    }
  }
];

async function handleMcpToolCall(name, args) {
  switch (name) {
    case 'list_workspaces': {
      const workspaces = await all('SELECT * FROM workspaces ORDER BY name ASC');
      return { workspaces };
    }

    case 'list_channels': {
      const channels = await all(
        'SELECT id, workspace_id, platform, account_name, handle, avatar_url, active FROM channels WHERE workspace_id = ?',
        [args.workspace_id]
      );
      return { channels };
    }

    case 'get_calendar_posts': {
      let sql = 'SELECT * FROM posts WHERE workspace_id = ?';
      const params = [args.workspace_id];

      if (args.status && args.status !== 'all') {
        sql += ' AND status = ?';
        params.push(args.status);
      }
      if (args.from_date) {
        sql += ' AND scheduled_at >= ?';
        params.push(args.from_date);
      }
      if (args.to_date) {
        sql += ' AND scheduled_at <= ?';
        params.push(args.to_date);
      }

      sql += ' ORDER BY scheduled_at ASC';
      const posts = await all(sql, params);

      // Attach customizations
      for (const p of posts) {
        p.customizations = await all('SELECT * FROM post_customizations WHERE post_id = ?', [p.id]);
      }

      return { posts };
    }

    case 'create_post': {
      const {
        workspace_id,
        title = '',
        base_content,
        scheduled_at = null,
        status = scheduled_at ? 'scheduled' : 'draft',
        recycle_interval_days = 0,
        customizations = {},
        media_urls = []
      } = args;

      const res = await run(
        `INSERT INTO posts (workspace_id, title, base_content, status, scheduled_at, recycle_interval_days)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [workspace_id, title, base_content, status, scheduled_at, recycle_interval_days]
      );

      const postId = res.id;
      const mediaJson = JSON.stringify(media_urls);

      // If no custom channel overrides provided, auto-optimize for selected channels
      let finalCustomizations = customizations;
      if (Object.keys(finalCustomizations).length === 0) {
        finalCustomizations = await aiOptimizer.optimizeForChannels(base_content);
      }

      for (const [platform, opt] of Object.entries(finalCustomizations)) {
        await run(
          `INSERT INTO post_customizations (post_id, platform, custom_content, hashtags, first_comment, media_urls_json, extra_options_json)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [
            postId,
            platform,
            opt.custom_content || base_content,
            opt.hashtags || '',
            opt.first_comment || '',
            mediaJson,
            JSON.stringify(opt.extra_options || {})
          ]
        );
      }

      return {
        success: true,
        message: `Post #${postId} creato con successo e associato ai canali selezionati`,
        post_id: postId
      };
    }

    case 'reschedule_post': {
      const { post_id, new_scheduled_at } = args;
      await run(
        `UPDATE posts SET scheduled_at = ?, status = 'scheduled' WHERE id = ?`,
        [new_scheduled_at, post_id]
      );
      return {
        success: true,
        message: `Post #${post_id} riprogrammato per ${new_scheduled_at}`
      };
    }

    case 'delete_post': {
      const { post_id } = args;
      await run('DELETE FROM post_customizations WHERE post_id = ?', [post_id]);
      await run('DELETE FROM posts WHERE id = ?', [post_id]);
      return {
        success: true,
        message: `Post #${post_id} eliminato con successo`
      };
    }

    case 'optimize_copy_for_channels': {
      const { base_text, platforms = [], tone = 'engaging' } = args;
      const optimized = await aiOptimizer.optimizeForChannels(base_text, platforms, tone);
      return { optimized };
    }

    default:
      throw new Error(`Tool "${name}" non riconosciuto nel protocollo MCP`);
  }
}

module.exports = {
  MCP_TOOLS,
  handleMcpToolCall
};
