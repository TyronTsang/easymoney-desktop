const { dialog, shell } = require('electron');
const https = require('https');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

class AppUpdater {
  constructor(currentVersion, githubRepo) {
    this.currentVersion = currentVersion;
    this.githubRepo = githubRepo;
    this.downloadPath = path.join(require('os').tmpdir(), 'easymoney-update.exe');
  }

  /**
   * Make an HTTPS GET request to GitHub API
   */
  _githubRequest(apiPath) {
    return new Promise((resolve, reject) => {
      const options = {
        hostname: 'api.github.com',
        path: apiPath,
        method: 'GET',
        headers: {
          'User-Agent': 'EasyMoneyLoans-Desktop',
          'Accept': 'application/vnd.github.v3+json'
        }
      };

      https.get(options, (res) => {
        let data = '';
        res.on('data', (chunk) => { data += chunk; });
        res.on('end', () => {
          resolve({ statusCode: res.statusCode, body: data });
        });
      }).on('error', (error) => {
        reject(new Error(`Network error: ${error.message}. Check your internet connection.`));
      });
    });
  }

  /**
   * Check GitHub for the latest release
   */
  async checkForUpdates() {
    // First try /releases/latest (only finds published, non-draft, non-prerelease)
    let response = await this._githubRequest(`/repos/${this.githubRepo}/releases/latest`);

    // If 404, try listing all releases (the user might have only drafts or pre-releases)
    if (response.statusCode === 404) {
      response = await this._githubRequest(`/repos/${this.githubRepo}/releases`);
      
      if (response.statusCode === 404) {
        return {
          hasUpdate: false,
          error: `Repository "${this.githubRepo}" not found on GitHub. Check the repo name is correct and public.`
        };
      }

      const releases = JSON.parse(response.body);
      if (!Array.isArray(releases) || releases.length === 0) {
        return {
          hasUpdate: false,
          error: `No releases found in "${this.githubRepo}". Create a release on GitHub first.`
        };
      }

      // Check if all releases are drafts
      const published = releases.filter(r => !r.draft);
      if (published.length === 0) {
        return {
          hasUpdate: false,
          error: `Found ${releases.length} release(s) but they are all drafts. Publish the release on GitHub to make it available.`
        };
      }

      // Use the first published release
      return this._processRelease(published[0]);
    }

    if (response.statusCode !== 200) {
      return {
        hasUpdate: false,
        error: `GitHub API returned status ${response.statusCode}. Try again later.`
      };
    }

    const release = JSON.parse(response.body);
    return this._processRelease(release);
  }

  /**
   * Process a single release object from GitHub API
   */
  _processRelease(release) {
    const latestVersion = release.tag_name.replace(/^v/, '');
    const currentVersion = this.currentVersion.replace(/^v/, '');

    // Find a downloadable asset (.exe or .zip)
    const exeAsset = release.assets.find(a => a.name.endsWith('.exe'));
    const zipAsset = release.assets.find(a => a.name.endsWith('.zip'));
    const asset = exeAsset || zipAsset;

    if (!asset) {
      const assetNames = release.assets.map(a => a.name).join(', ');
      return {
        hasUpdate: false,
        latestVersion: release.tag_name,
        currentVersion: this.currentVersion,
        error: release.assets.length === 0
          ? `Release ${release.tag_name} has no files attached. Upload the .exe file to the release on GitHub.`
          : `Release ${release.tag_name} has files (${assetNames}) but no .exe found. Upload the portable .exe file.`
      };
    }

    const hasUpdate = this.compareVersions(latestVersion, currentVersion) > 0;

    return {
      hasUpdate,
      latestVersion: release.tag_name,
      currentVersion: this.currentVersion,
      downloadUrl: asset.browser_download_url,
      changelog: release.body || 'No changelog available',
      releaseDate: release.published_at,
      fileName: asset.name,
      fileSize: this.formatBytes(asset.size),
      isExe: asset.name.endsWith('.exe')
    };
  }

  /**
   * Compare version strings (e.g., "1.0.1" vs "1.0.0")
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
   * Download the update file with progress
   */
  async downloadUpdate(downloadUrl, progressCallback) {
    return new Promise((resolve, reject) => {
      const download = (url) => {
        https.get(url, (response) => {
          // Follow redirects (GitHub uses them for asset downloads)
          if (response.statusCode === 302 || response.statusCode === 301) {
            return download(response.headers.location);
          }

          if (response.statusCode !== 200) {
            reject(new Error(`Download failed with status ${response.statusCode}`));
            return;
          }

          const file = fs.createWriteStream(this.downloadPath);
          const totalSize = parseInt(response.headers['content-length'], 10);
          let downloadedSize = 0;

          response.on('data', (chunk) => {
            downloadedSize += chunk.length;
            if (totalSize && progressCallback) {
              progressCallback(Math.round((downloadedSize / totalSize) * 100));
            }
          });

          response.pipe(file);

          file.on('finish', () => {
            file.close();
            resolve(this.downloadPath);
          });

          file.on('error', (err) => {
            fs.unlink(this.downloadPath, () => {});
            reject(new Error(`File write error: ${err.message}`));
          });
        }).on('error', (error) => {
          fs.unlink(this.downloadPath, () => {});
          reject(new Error(`Download failed: ${error.message}`));
        });
      };

      download(downloadUrl);
    });
  }

  /**
   * Install the downloaded update
   */
  async installUpdate(filePath) {
    return new Promise((resolve, reject) => {
      exec(`"${filePath}"`, (error) => {
        if (error) {
          reject(new Error(`Failed to launch installer: ${error.message}`));
        } else {
          resolve();
        }
      });
    });
  }

  formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  }
}

module.exports = AppUpdater;
