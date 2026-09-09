const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');
const { get, run } = require('../db/database');

const LOCAL_UPLOAD_DIR = path.join(__dirname, '../../uploads');
if (!fs.existsSync(LOCAL_UPLOAD_DIR)) {
  fs.mkdirSync(LOCAL_UPLOAD_DIR, { recursive: true });
}

class PCloudStorageService {
  constructor() {
    this.fallbackLocal = true;
  }

  async getCredentials() {
    const tokenSetting = await get("SELECT value FROM settings WHERE key = 'pcloud_token'");
    const regionSetting = await get("SELECT value FROM settings WHERE key = 'pcloud_region'");

    const token = process.env.PCLOUD_ACCESS_TOKEN || (tokenSetting ? tokenSetting.value : null);
    const region = process.env.PCLOUD_REGION || (regionSetting ? regionSetting.value : 'eu');

    const apiHost = region === 'eu' ? 'https://eapi.pcloud.com' : 'https://api.pcloud.com';

    return {
      token: token && token.trim() !== '' ? token.trim() : null,
      apiHost
    };
  }

  async testConnection(customToken = null, customRegion = null) {
    try {
      const creds = await this.getCredentials();
      const token = customToken || creds.token;
      const apiHost = customRegion
        ? (customRegion === 'eu' ? 'https://eapi.pcloud.com' : 'https://api.pcloud.com')
        : creds.apiHost;

      if (!token) {
        return {
          success: false,
          connected: false,
          message: 'Nessun token pCloud configurato. Utilizzo storage locale zero-cost.'
        };
      }

      const res = await axios.get(`${apiHost}/userinfo?access_token=${token}`, { timeout: 8000 });
      if (res.data && res.data.result === 0) {
        const quota = res.data.quota || 0;
        const used = res.data.usedquota || 0;
        return {
          success: true,
          connected: true,
          email: res.data.email,
          quotaTotalMB: Math.round(quota / (1024 * 1024)),
          quotaUsedMB: Math.round(used / (1024 * 1024)),
          quotaFreeMB: Math.round((quota - used) / (1024 * 1024)),
          message: `Connesso con successo a pCloud (${res.data.email})`
        };
      } else {
        return {
          success: false,
          connected: false,
          message: res.data.error || 'Token non valido o scaduto'
        };
      }
    } catch (err) {
      return {
        success: false,
        connected: false,
        message: err.response?.data?.error || err.message
      };
    }
  }

  async ensureFolder(folderPath) {
    const { token, apiHost } = await this.getCredentials();
    if (!token) return null;

    try {
      const res = await axios.get(
        `${apiHost}/createfolderifnotexists?access_token=${token}&path=${encodeURIComponent(folderPath)}`
      );
      if (res.data && res.data.result === 0) {
        return res.data.metadata?.folderid;
      }
    } catch (err) {
      console.warn('[pCloud] Failed to create folder:', folderPath, err.message);
    }
    return null;
  }

  async uploadFile({ workspaceName = 'Generale', fileBuffer, fileName, mimeType }) {
    const { token, apiHost } = await this.getCredentials();

    // 1. If pCloud token is available, upload directly to pCloud
    if (token) {
      try {
        const sanitizedWorkspace = workspaceName.replace(/[^a-zA-Z0-9_-]/g, '_');
        const remoteFolderPath = `/NonPosto/${sanitizedWorkspace}`;
        await this.ensureFolder(remoteFolderPath);

        const form = new FormData();
        form.append('file', fileBuffer, { filename: fileName, contentType: mimeType });

        const uploadRes = await axios.post(
          `${apiHost}/uploadfile?access_token=${token}&path=${encodeURIComponent(remoteFolderPath)}`,
          form,
          {
            headers: form.getHeaders(),
            timeout: 30000
          }
        );

        if (uploadRes.data && uploadRes.data.result === 0 && uploadRes.data.metadata?.[0]) {
          const fileMeta = uploadRes.data.metadata[0];
          const fileId = fileMeta.fileid;

          // Obtain direct streaming / public link
          let publicUrl = '';
          try {
            const linkRes = await axios.get(
              `${apiHost}/getfilepublink?access_token=${token}&fileid=${fileId}`
            );
            if (linkRes.data && linkRes.data.link) {
              publicUrl = linkRes.data.link;
            }
          } catch (e) {
            console.warn('[pCloud] Could not create publink, falling back to direct stream link');
          }

          if (!publicUrl) {
            try {
              const streamRes = await axios.get(
                `${apiHost}/getfilelink?access_token=${token}&fileid=${fileId}`
              );
              if (streamRes.data && streamRes.data.hosts?.[0] && streamRes.data.path) {
                publicUrl = `https://${streamRes.data.hosts[0]}${streamRes.data.path}`;
              }
            } catch (e) {}
          }

          console.log(`[pCloud] Uploaded ${fileName} to pCloud successfully (FileID: ${fileId})`);
          return {
            success: true,
            storageType: 'pcloud',
            fileId,
            url: publicUrl || `https://my.pcloud.com/#page=file&id=${fileId}`,
            fileName,
            fileSize: fileMeta.size || fileBuffer.length,
            mimeType
          };
        }
      } catch (err) {
        console.error('[pCloud] Upload error, falling back to local storage:', err.message);
      }
    }

    // 2. Zero-cost Local / Fallback Storage
    const safeName = `${Date.now()}_${fileName.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
    const targetFilePath = path.join(LOCAL_UPLOAD_DIR, safeName);
    fs.writeFileSync(targetFilePath, fileBuffer);

    const publicLocalUrl = `/uploads/${safeName}`;
    console.log(`[Storage] Saved ${fileName} to local zero-cost storage: ${publicLocalUrl}`);

    return {
      success: true,
      storageType: 'local',
      fileId: safeName,
      url: publicLocalUrl,
      fileName,
      fileSize: fileBuffer.length,
      mimeType,
      localPath: targetFilePath
    };
  }

  async backupDatabaseToCloud(jsonData) {
    const { token, apiHost } = await this.getCredentials();
    const backupFileName = `nonposto_backup_${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
    const buffer = Buffer.from(JSON.stringify(jsonData, null, 2), 'utf-8');

    if (token) {
      try {
        const backupFolder = `/NonPosto/Backups`;
        await this.ensureFolder(backupFolder);

        const form = new FormData();
        form.append('file', buffer, { filename: backupFileName, contentType: 'application/json' });

        const res = await axios.post(
          `${apiHost}/uploadfile?access_token=${token}&path=${encodeURIComponent(backupFolder)}`,
          form,
          { headers: form.getHeaders() }
        );

        if (res.data && res.data.result === 0) {
          return { success: true, destination: 'pcloud', filename: backupFileName };
        }
      } catch (err) {
        console.warn('[pCloud] Cloud backup failed:', err.message);
      }
    }

    // Local backup
    const backupPath = path.join(LOCAL_UPLOAD_DIR, backupFileName);
    fs.writeFileSync(backupPath, buffer);
    return { success: true, destination: 'local', filename: backupFileName, path: backupPath };
  }
}

module.exports = new PCloudStorageService();
