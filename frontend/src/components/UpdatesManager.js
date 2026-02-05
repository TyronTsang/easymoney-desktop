import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Alert, AlertDescription } from './ui/alert';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from './ui/dialog';
import { Download, RefreshCw, CheckCircle, AlertCircle, Loader2, Package, Calendar, FileText } from 'lucide-react';

export default function UpdatesManager() {
  const [currentVersion, setCurrentVersion] = useState('');
  const [checking, setChecking] = useState(false);
  const [updateInfo, setUpdateInfo] = useState(null);
  const [downloading, setDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [downloadedFilePath, setDownloadedFilePath] = useState(null);
  const [showUpdateDialog, setShowUpdateDialog] = useState(false);

  const isElectron = window.electronAPI?.isElectron;

  useEffect(() => {
    if (isElectron) {
      loadCurrentVersion();
    }
  }, [isElectron]);

  const loadCurrentVersion = async () => {
    try {
      const version = await window.electronAPI.getAppVersion();
      setCurrentVersion(version);
    } catch (error) {
      console.error('Failed to get version:', error);
    }
  };

  const handleCheckForUpdates = async () => {
    setChecking(true);
    setUpdateInfo(null);

    try {
      const result = await window.electronAPI.checkForUpdates();
      
      if (!result.success) {
        toast.error(result.error || 'Failed to check for updates');
        return;
      }

      setUpdateInfo(result.data);

      if (result.data.hasUpdate) {
        setShowUpdateDialog(true);
        toast.success('Update available!');
      } else if (result.data.error) {
        toast.error(result.data.error);
      } else {
        toast.success('You\'re on the latest version!');
      }
    } catch (error) {
      toast.error('Failed to check for updates: ' + error.message);
    } finally {
      setChecking(false);
    }
  };

  const handleDownloadUpdate = async () => {
    if (!updateInfo?.downloadUrl) return;

    setDownloading(true);
    setDownloadProgress(0);

    // Listen for progress updates
    window.electronAPI.onDownloadProgress((progress) => {
      setDownloadProgress(progress);
    });

    try {
      const result = await window.electronAPI.downloadUpdate(updateInfo.downloadUrl);
      
      if (!result.success) {
        toast.error('Download failed: ' + result.error);
        return;
      }

      setDownloadedFilePath(result.filePath);
      toast.success('Update downloaded successfully!');
    } catch (error) {
      toast.error('Download failed: ' + error.message);
    } finally {
      setDownloading(false);
    }
  };

  const handleInstallUpdate = async () => {
    if (!downloadedFilePath) return;

    try {
      await window.electronAPI.installUpdate(downloadedFilePath);
      toast.success('Installing update... App will restart.');
    } catch (error) {
      toast.error('Installation failed: ' + error.message);
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return 'N/A';
    return new Date(dateStr).toLocaleDateString('en-ZA', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  };

  if (!isElectron) {
    return (
      <Alert>
        <AlertCircle className="w-4 h-4" />
        <AlertDescription>
          Updates are only available in the desktop application.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      {/* Current Version Card */}
      <Card className="border-border">
        <CardHeader>
          <CardTitle className="text-lg font-heading flex items-center gap-2">
            <Package className="w-5 h-5 text-blue-400" strokeWidth={1.5} />
            Application Version
          </CardTitle>
          <CardDescription>Check for updates and keep your app secure</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-secondary rounded-lg">
            <div>
              <p className="text-sm text-muted-foreground">Current Version</p>
              <p className="text-2xl font-bold font-mono">{currentVersion || 'Loading...'}</p>
            </div>
            <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/20">
              Installed
            </Badge>
          </div>

          <Button 
            onClick={handleCheckForUpdates} 
            disabled={checking}
            className="w-full gap-2 bg-red-600 hover:bg-red-700"
          >
            {checking ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Checking for Updates...
              </>
            ) : (
              <>
                <RefreshCw className="w-4 h-4" />
                Check for Updates
              </>
            )}
          </Button>

          {updateInfo && !updateInfo.hasUpdate && !updateInfo.error && (
            <Alert>
              <CheckCircle className="w-4 h-4 text-green-500" />
              <AlertDescription>
                You're running the latest version of EasyMoneyLoans!
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Update Instructions */}
      <Card className="border-border">
        <CardHeader>
          <CardTitle className="text-lg font-heading flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-blue-400" strokeWidth={1.5} />
            How Updates Work
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="text-sm text-muted-foreground space-y-2">
            <li className="flex items-start gap-2">
              <CheckCircle className="w-4 h-4 text-emerald-500 mt-0.5 flex-shrink-0" />
              <span>Click "Check for Updates" to see if a new version is available</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle className="w-4 h-4 text-emerald-500 mt-0.5 flex-shrink-0" />
              <span>Updates are securely downloaded from GitHub</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle className="w-4 h-4 text-emerald-500 mt-0.5 flex-shrink-0" />
              <span>All your data stays safe on your computer during updates</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle className="w-4 h-4 text-emerald-500 mt-0.5 flex-shrink-0" />
              <span>The app will restart automatically after installation</span>
            </li>
            <li className="flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />
              <span>Make sure to save any work before installing updates</span>
            </li>
          </ul>
        </CardContent>
      </Card>

      {/* Update Dialog */}
      <Dialog open={showUpdateDialog} onOpenChange={setShowUpdateDialog}>
        <DialogContent className="max-w-2xl bg-white">
          <DialogHeader>
            <DialogTitle className="text-xl font-heading flex items-center gap-2">
              <Download className="w-5 h-5 text-green-500" />
              Update Available
            </DialogTitle>
            <DialogDescription>
              A new version of EasyMoneyLoans is ready to install
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Version Info */}
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="text-xs text-gray-500 mb-1">Current Version</p>
                <p className="text-lg font-bold font-mono">{updateInfo?.currentVersion}</p>
              </div>
              <div className="p-4 bg-green-50 rounded-lg">
                <p className="text-xs text-gray-500 mb-1">New Version</p>
                <p className="text-lg font-bold font-mono text-green-600">{updateInfo?.latestVersion}</p>
              </div>
            </div>

            {/* Release Info */}
            {updateInfo?.releaseDate && (
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Calendar className="w-4 h-4" />
                <span>Released: {formatDate(updateInfo.releaseDate)}</span>
              </div>
            )}

            {updateInfo?.fileSize && (
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Package className="w-4 h-4" />
                <span>Download Size: {updateInfo.fileSize}</span>
              </div>
            )}

            {/* Changelog */}
            {updateInfo?.changelog && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <FileText className="w-4 h-4" />
                  What's New:
                </div>
                <div className="p-4 bg-gray-50 rounded-lg text-sm whitespace-pre-wrap max-h-48 overflow-y-auto">
                  {updateInfo.changelog}
                </div>
              </div>
            )}

            {/* Download Progress */}
            {downloading && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span>Downloading...</span>
                  <span>{downloadProgress}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-red-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${downloadProgress}%` }}
                  />
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-3 pt-4">
              <Button 
                variant="outline" 
                onClick={() => setShowUpdateDialog(false)}
                className="flex-1"
                disabled={downloading}
              >
                Later
              </Button>
              
              {!downloadedFilePath ? (
                <Button 
                  onClick={handleDownloadUpdate}
                  disabled={downloading}
                  className="flex-1 bg-red-600 hover:bg-red-700 gap-2"
                >
                  {downloading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Downloading...
                    </>
                  ) : (
                    <>
                      <Download className="w-4 h-4" />
                      Download Update
                    </>
                  )}
                </Button>
              ) : (
                <Button 
                  onClick={handleInstallUpdate}
                  className="flex-1 bg-green-600 hover:bg-green-700 gap-2"
                >
                  <CheckCircle className="w-4 h-4" />
                  Install & Restart
                </Button>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
