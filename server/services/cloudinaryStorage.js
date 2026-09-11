const cloudinary = require('cloudinary').v2;
const { get } = require('../db/database');

class CloudinaryStorageService {
  async getCredentials() {
    const cloudNameRow = await get("SELECT value FROM settings WHERE key = 'cloudinary_cloud_name'");
    const apiKeyRow = await get("SELECT value FROM settings WHERE key = 'cloudinary_api_key'");
    const apiSecretRow = await get("SELECT value FROM settings WHERE key = 'cloudinary_api_secret'");

    const cloud_name = cloudNameRow?.value?.trim() || process.env.CLOUDINARY_CLOUD_NAME || '';
    const api_key = apiKeyRow?.value?.trim() || process.env.CLOUDINARY_API_KEY || '';
    const api_secret = apiSecretRow?.value?.trim() || process.env.CLOUDINARY_API_SECRET || '';

    const isConfigured = Boolean(cloud_name && api_key && api_secret);

    if (isConfigured) {
      cloudinary.config({
        cloud_name,
        api_key,
        api_secret,
        secure: true
      });
    }

    return {
      isConfigured,
      cloud_name,
      api_key,
      api_secret
    };
  }

  async testConnection(customConfig = null) {
    try {
      const cfg = customConfig || await this.getCredentials();
      if (!cfg.cloud_name || !cfg.api_key || !cfg.api_secret) {
        return {
          success: false,
          connected: false,
          message: 'Credenziali Cloudinary non configurate.'
        };
      }

      cloudinary.config({
        cloud_name: cfg.cloud_name,
        api_key: cfg.api_key,
        api_secret: cfg.api_secret,
        secure: true
      });

      const res = await cloudinary.api.ping();
      if (res && res.status === 'ok') {
        return {
          success: true,
          connected: true,
          cloud_name: cfg.cloud_name,
          message: `Connesso con successo a Cloudinary (${cfg.cloud_name})`
        };
      }
      return {
        success: false,
        connected: false,
        message: 'Verifica Cloudinary non riuscita.'
      };
    } catch (err) {
      return {
        success: false,
        connected: false,
        message: err.message || 'Errore di connessione a Cloudinary'
      };
    }
  }

  async uploadFile({ workspaceName = 'Generale', fileBuffer, fileName, mimeType }) {
    const creds = await this.getCredentials();
    if (!creds.isConfigured) {
      throw new Error('Cloudinary non configurato');
    }

    const sanitizedWorkspace = workspaceName.replace(/[^a-zA-Z0-9_-]/g, '_');
    const folder = `NonPosto/${sanitizedWorkspace}`;
    const resourceType = mimeType && mimeType.startsWith('video/') ? 'video' : 'auto';

    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder,
          resource_type: resourceType,
          use_filename: true,
          unique_filename: true,
          overwrite: false
        },
        (error, result) => {
          if (error) {
            console.error('[Cloudinary Upload Error]', error);
            return reject(error);
          }
          resolve({
            success: true,
            storageType: 'cloudinary',
            fileId: result.public_id,
            url: result.secure_url,
            fileName,
            fileSize: result.bytes,
            mimeType: result.format ? `${result.resource_type}/${result.format}` : mimeType,
            format: result.format,
            width: result.width,
            height: result.height
          });
        }
      );

      uploadStream.end(fileBuffer);
    });
  }
}

module.exports = new CloudinaryStorageService();
