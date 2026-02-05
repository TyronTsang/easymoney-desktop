const { dialog, shell } = require('electron');
const https = require('https');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

class AppUpdater {
  constructor(currentVersion, githubRepo) {
    this.currentVersion = currentVersion;
    this.githubRepo = githubRepo; // Format: "username/repo"
    this.downloadPath = path.join(require('os').tmpdir(), 'easymoney-update.exe');
  }

  /**
   * Check GitHub for the latest release
   * @returns {Promise<Object>} { hasUpdate: boolean, latestVersion: string, downloadUrl: string, changelog: string }
   */
  async checkForUpdates() {
    return new Promise((resolve, reject) => {
      const options = {
        hostname: 'api.github.com',
        path: `/repos/${this.githubRepo}/releases/latest`,
        method: 'GET',
        headers: {
          'User-Agent': 'EasyMoneyLoans-Desktop'
        }
      };

      https.get(options, (res) => {
        let data = '';

        res.on('data', (chunk) => {
          data += chunk;
        });

        res.on('end', () => {
          try {
            if (res.statusCode === 404) {
              resolve({
                hasUpdate: false,
                error: 'No releases found on GitHub'
              });
              return;
            }

            const release = JSON.parse(data);
            const latestVersion = release.tag_name.replace('v', '');
            const currentVersion = this.currentVersion.replace('v', '');

            // Find the .exe asset
            const exeAsset = release.assets.find(asset => asset.name.endsWith('.exe'));
            
            if (!exeAsset) {
              resolve({
                hasUpdate: false,
                error: 'No .exe file found in latest release'
              });
              return;
            }

            const hasUpdate = this.compareVersions(latestVersion, currentVersion) > 0;

            resolve({
              hasUpdate,
              latestVersion: release.tag_name,
              currentVersion: this.currentVersion,
              downloadUrl: exeAsset.browser_download_url,
              changelog: release.body || 'No changelog available',
              releaseDate: release.published_at,
              fileName: exeAsset.name,
              fileSize: this.formatBytes(exeAsset.size)
            });
          } catch (error) {
            reject(new Error(`Failed to parse release data: ${error.message}`));
          }
        });
      }).on('error', (error) => {
        reject(new Error(`Failed to check for updates: ${error.message}`));
      });
    });
  }

  /**
   * Compare version strings (e.g., "1.0.1" vs "1.0.0")
   * @returns {number} 1 if v1 > v2, -1 if v1 < v2, 0 if equal
   */
  compareVersions(v1, v2) {
    const parts1 = v1.split('.').map(Number);
    const parts2 = v2.split('.').map(Number);

    for (let i = 0; i < Math.max(parts1.length, parts2.length); i++) {
      const p1 = parts1[i] || 0;
      const p2 = parts2[i] || 0;
      if (p1 > p2) return 1;
      if (p1 < p2) return -1;
    }
    return 0;
  }

  /**
   * Download the update file
   * @param {string} downloadUrl 
   * @param {Function} progressCallback - Called with download progress (0-100)
   * @returns {Promise<string>} Path to downloaded file
   */
  async downloadUpdate(downloadUrl, progressCallback) {
    return new Promise((resolve, reject) => {
      const file = fs.createWriteStream(this.downloadPath);

      https.get(downloadUrl, (response) => {
        // Handle redirects (GitHub uses them)
        if (response.statusCode === 302 || response.statusCode === 301) {
          return this.downloadUpdate(response.headers.location, progressCallback)
            .then(resolve)
            .catch(reject);
        }

        const totalSize = parseInt(response.headers['content-length'], 10);
        let downloadedSize = 0;

        response.on('data', (chunk) => {
          downloadedSize += chunk.length;
          const progress = Math.round((downloadedSize / totalSize) * 100);
          if (progressCallback) {
            progressCallback(progress);
          }
        });

        response.pipe(file);

        file.on('finish', () => {
          file.close();
          resolve(this.downloadPath);
        });
      }).on('error', (error) => {
        fs.unlink(this.downloadPath, () => {});
        reject(new Error(`Download failed: ${error.message}`));
      });
    });
  }

  /**
   * Install the downloaded update
   * @param {string} filePath - Path to the downloaded installer
   */
  async installUpdate(filePath) {
    return new Promise((resolve, reject) => {
      // Launch the installer
      exec(`"${filePath}"`, (error) => {
        if (error) {
          reject(new Error(`Failed to launch installer: ${error.message}`));
        } else {
          resolve();
        }
      });
    });
  }

  /**
   * Format bytes to human readable string
   */
  formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  }
}

module.exports = AppUpdater;
