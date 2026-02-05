import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Badge } from '../components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Switch } from '../components/ui/switch';
import { Settings, Users, FolderOpen, Shield, Plus, UserCheck, UserX, CheckCircle, XCircle, Server, Wifi, WifiOff, AlertCircle, Loader2, Database, HardDrive, Clock, FileJson, Download, Upload } from 'lucide-react';

export default function AdminPanel() {
  const { api } = useAuth();
  const [users, setUsers] = useState([]);
  const [settings, setSettings] = useState({});
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [integrityResult, setIntegrityResult] = useState(null);
  const [formData, setFormData] = useState({ username: '', password: '', full_name: '', role: '', branch: '' });
  const [formLoading, setFormLoading] = useState(false);
  const [settingsForm, setSettingsForm] = useState({ export_folder_path: '', branch_name: '' });
  
  // AD Configuration State
  const [adConfig, setAdConfig] = useState({
    enabled: false,
    server_url: '',
    domain: '',
    base_dn: '',
    default_role: 'employee',
    default_branch: 'Head Office',
    ldap_available: false
  });
  const [adLoading, setAdLoading] = useState(false);
  const [adTestResult, setAdTestResult] = useState(null);

  // Backup State
  const [backupConfig, setBackupConfig] = useState({
    backup_folder_path: '',
    auto_backup_enabled: false,
    last_backup: null
  });
  const [backupLoading, setBackupLoading] = useState(false);
  const [backupResult, setBackupResult] = useState(null);

  const fetchData = useCallback(async () => {
    try {
      const [usersRes, settingsRes] = await Promise.all([
        api().get('/users'),
        api().get('/settings')
      ]);
      setUsers(usersRes.data);
      setSettings(settingsRes.data);
      setSettingsForm({
        export_folder_path: settingsRes.data.export_folder_path || '',
        branch_name: settingsRes.data.branch_name || ''
      });
    } catch (err) {
      toast.error('Failed to load admin data');
    } finally {
      setLoading(false);
    }
  }, [api]);

  const fetchAdConfig = useCallback(async () => {
    try {
      const res = await api().get('/settings/ad-config');
      setAdConfig(res.data);
    } catch (err) {
      console.error('Failed to load AD config:', err);
    }
  }, [api]);

  const fetchBackupStatus = useCallback(async () => {
    try {
      const res = await api().get('/backup/status');
      setBackupConfig(res.data);
    } catch (err) {
      console.error('Failed to load backup status:', err);
    }
  }, [api]);

  useEffect(() => {
    fetchData();
    fetchAdConfig();
    fetchBackupStatus();
  }, [fetchData, fetchAdConfig, fetchBackupStatus]);

  const handleCreateUser = async (e) => {
    e.preventDefault();
    setFormLoading(true);
    try {
      await api().post('/users', formData);
      toast.success('User created successfully');
      setDialogOpen(false);
      setFormData({ username: '', password: '', full_name: '', role: '', branch: '' });
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to create user');
    } finally {
      setFormLoading(false);
    }
  };

  const handleToggleUser = async (userId) => {
    try {
      await api().put(`/users/${userId}/toggle-active`);
      toast.success('User status updated');
      fetchData();
    } catch (err) {
      toast.error('Failed to update user');
    }
  };

  const handleSaveSettings = async () => {
    try {
      await api().put('/settings', settingsForm);
      toast.success('Settings saved');
      fetchData();
    } catch (err) {
      toast.error('Failed to save settings');
    }
  };

  const handleVerifyIntegrity = async () => {
    try {
      const res = await api().get('/audit-logs/verify-integrity');
      setIntegrityResult(res.data);
      if (res.data.valid) {
        toast.success('Audit log integrity verified');
      } else {
        toast.error('Tampering detected!');
      }
    } catch (err) {
      toast.error('Failed to verify integrity');
    }
  };

  const handleSaveAdConfig = async () => {
    setAdLoading(true);
    try {
      await api().put('/settings/ad-config', adConfig);
      toast.success('Active Directory configuration saved');
      fetchAdConfig();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to save AD configuration');
    } finally {
      setAdLoading(false);
    }
  };

  const handleTestAdConnection = async () => {
    setAdLoading(true);
    setAdTestResult(null);
    try {
      const res = await api().post('/settings/ad-config/test', adConfig);
      setAdTestResult(res.data);
      if (res.data.success) {
        toast.success('Connection successful!');
      } else {
        toast.error('Connection failed');
      }
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Connection test failed');
      setAdTestResult({ success: false, message: err.response?.data?.detail || 'Connection test failed' });
    } finally {
      setAdLoading(false);
    }
  };

  const handleSaveBackupConfig = async () => {
    setBackupLoading(true);
    try {
      await api().put('/backup/config', null, {
        params: {
          folder_path: backupConfig.backup_folder_path,
          auto_backup: backupConfig.auto_backup_enabled
        }
      });
      toast.success('Backup configuration saved');
      fetchBackupStatus();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to save backup configuration');
    } finally {
      setBackupLoading(false);
    }
  };

  const handleCreateBackup = async () => {
    setBackupLoading(true);
    setBackupResult(null);
    try {
      const res = await api().post('/backup/create', {});
      setBackupResult(res.data);
      if (res.data.success) {
        toast.success('Backup created successfully!');
        fetchBackupStatus();
      } else {
        toast.error('Backup failed');
      }
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Backup failed');
      setBackupResult({ success: false, message: err.response?.data?.detail || 'Backup failed' });
    } finally {
      setBackupLoading(false);
    }
  };

  const getRoleBadge = (role) => {
    switch (role) {
      case 'admin':
        return <Badge className="bg-red-500/15 text-red-400 border-red-500/20">Admin</Badge>;
      case 'manager':
        return <Badge className="bg-blue-500/15 text-blue-400 border-blue-500/20">Manager</Badge>;
      default:
        return <Badge className="badge-neutral">Employee</Badge>;
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return 'Never';
    const date = new Date(dateStr);
    return date.toLocaleString();
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-heading font-bold tracking-tight">Admin Panel</h1>
        <p className="text-muted-foreground text-sm mt-1">Manage users, settings, backup, and security</p>
      </div>

      <Tabs defaultValue="users" className="w-full">
        <TabsList className="grid w-full max-w-4xl grid-cols-6">
          <TabsTrigger value="users" className="gap-2" data-testid="users-tab">
            <Users className="w-4 h-4" /> Users
          </TabsTrigger>
          <TabsTrigger value="settings" className="gap-2" data-testid="settings-tab">
            <Settings className="w-4 h-4" /> Settings
          </TabsTrigger>
          <TabsTrigger value="backup" className="gap-2" data-testid="backup-tab">
            <Database className="w-4 h-4" /> Backup
          </TabsTrigger>
          <TabsTrigger value="updates" className="gap-2" data-testid="updates-tab">
            <Download className="w-4 h-4" /> Updates
          </TabsTrigger>
          <TabsTrigger value="ad" className="gap-2" data-testid="ad-tab">
            <Server className="w-4 h-4" /> AD
          </TabsTrigger>
          <TabsTrigger value="security" className="gap-2" data-testid="security-tab">
            <Shield className="w-4 h-4" /> Security
          </TabsTrigger>
        </TabsList>

        {/* Users Tab */}
        <TabsContent value="users" className="mt-6">
          <Card className="border-border">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-lg font-heading">User Management</CardTitle>
                <CardDescription>Add and manage staff accounts</CardDescription>
              </div>
              <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="gap-2 bg-red-600 hover:bg-red-700" data-testid="add-user-btn">
                    <Plus className="w-4 h-4" /> Add User
                  </Button>
                </DialogTrigger>
                <DialogContent className="bg-card border-border">
                  <DialogHeader>
                    <DialogTitle className="font-heading">New User</DialogTitle>
                    <DialogDescription>Create a new staff account</DialogDescription>
                  </DialogHeader>
                  <form onSubmit={handleCreateUser} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="username">Username</Label>
                        <Input id="username" value={formData.username} onChange={(e) => setFormData({...formData, username: e.target.value})} className="bg-secondary" data-testid="new-user-username" required />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="password">Password</Label>
                        <Input id="password" type="password" value={formData.password} onChange={(e) => setFormData({...formData, password: e.target.value})} className="bg-secondary" data-testid="new-user-password" required />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="full_name">Full Name</Label>
                      <Input id="full_name" value={formData.full_name} onChange={(e) => setFormData({...formData, full_name: e.target.value})} className="bg-secondary" data-testid="new-user-fullname" required />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Role</Label>
                        <Select value={formData.role} onValueChange={(v) => setFormData({...formData, role: v})}>
                          <SelectTrigger className="bg-secondary" data-testid="new-user-role">
                            <SelectValue placeholder="Select role" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="employee">Employee</SelectItem>
                            <SelectItem value="manager">Manager</SelectItem>
                            <SelectItem value="admin">Admin</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="branch">Branch</Label>
                        <Input id="branch" value={formData.branch} onChange={(e) => setFormData({...formData, branch: e.target.value})} className="bg-secondary" placeholder="e.g., Johannesburg" data-testid="new-user-branch" required />
                      </div>
                    </div>
                    <div className="flex gap-2 pt-4">
                      <Button type="button" variant="secondary" onClick={() => setDialogOpen(false)} className="flex-1">Cancel</Button>
                      <Button type="submit" disabled={formLoading} className="flex-1 bg-red-600 hover:bg-red-700" data-testid="create-user-btn">
                        {formLoading ? 'Creating...' : 'Create User'}
                      </Button>
                    </div>
                  </form>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border border-border overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50 hover:bg-muted/50">
                      <TableHead>Name</TableHead>
                      <TableHead>Username</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Branch</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Loading...</TableCell>
                      </TableRow>
                    ) : users.map((u) => (
                      <TableRow key={u.id} data-testid={`user-row-${u.id}`}>
                        <TableCell className="font-medium">{u.full_name}</TableCell>
                        <TableCell className="font-mono text-sm">{u.username}</TableCell>
                        <TableCell>{getRoleBadge(u.role)}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{u.branch}</TableCell>
                        <TableCell>
                          {u.is_active ? (
                            <Badge className="badge-success gap-1"><UserCheck className="w-3 h-3" /> Active</Badge>
                          ) : (
                            <Badge className="badge-error gap-1"><UserX className="w-3 h-3" /> Disabled</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <Button variant="ghost" size="sm" onClick={() => handleToggleUser(u.id)} data-testid={`toggle-user-${u.id}`}>
                            {u.is_active ? 'Disable' : 'Enable'}
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Settings Tab */}
        <TabsContent value="settings" className="mt-6">
          <Card className="border-border max-w-xl">
            <CardHeader>
              <CardTitle className="text-lg font-heading flex items-center gap-2">
                <FolderOpen className="w-5 h-5 text-red-500" strokeWidth={1.5} />
                Application Settings
              </CardTitle>
              <CardDescription>Configure export paths and branch information</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="export_path">Export Folder Path</Label>
                <div className="flex gap-2">
                  <Input 
                    id="export_path" 
                    value={settingsForm.export_folder_path} 
                    onChange={(e) => setSettingsForm({...settingsForm, export_folder_path: e.target.value})} 
                    placeholder="C:\Users\Staff\Dropbox\EasyMoneyLoans\Exports" 
                    className="bg-secondary font-mono text-sm flex-1" 
                    data-testid="export-path-input" 
                  />
                  <Button 
                    type="button"
                    variant="outline" 
                    onClick={async () => {
                      if (window.electronAPI?.selectFolder) {
                        const folder = await window.electronAPI.selectFolder();
                        if (folder) {
                          setSettingsForm({...settingsForm, export_folder_path: folder});
                        }
                      } else {
                        toast.error('Folder selection only available in desktop app');
                      }
                    }}
                    className="gap-2"
                  >
                    <FolderOpen className="w-4 h-4" />
                    Browse
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">Path to the Dropbox-synced folder for exports</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="branch_name">Branch Name</Label>
                <Input 
                  id="branch_name" 
                  value={settingsForm.branch_name} 
                  onChange={(e) => setSettingsForm({...settingsForm, branch_name: e.target.value})} 
                  placeholder="Johannesburg" 
                  className="bg-secondary" 
                  data-testid="branch-name-input" 
                />
                <p className="text-xs text-muted-foreground">This will appear in export and backup filenames</p>
              </div>
              <Button onClick={handleSaveSettings} className="w-full bg-red-600 hover:bg-red-700" data-testid="save-settings-btn">
                Save Settings
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Backup Tab */}
        <TabsContent value="backup" className="mt-6">
          <div className="grid gap-6 max-w-2xl">
            {/* Backup Configuration */}
            <Card className="border-border">
              <CardHeader>
                <CardTitle className="text-lg font-heading flex items-center gap-2">
                  <HardDrive className="w-5 h-5 text-red-500" strokeWidth={1.5} />
                  Backup Configuration
                </CardTitle>
                <CardDescription>Configure automatic database backups to a local folder</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="backup_path">Backup Folder Path</Label>
                  <div className="flex gap-2">
                    <Input
                      id="backup_path"
                      value={backupConfig.backup_folder_path}
                      onChange={(e) => setBackupConfig({...backupConfig, backup_folder_path: e.target.value})}
                      placeholder="C:\Users\Staff\Dropbox\EasyMoneyLoans\Backups"
                      className="bg-secondary font-mono text-sm flex-1"
                      data-testid="backup-path-input"
                    />
                    <Button 
                      type="button"
                      variant="outline" 
                      onClick={async () => {
                        if (window.electronAPI?.selectFolder) {
                          const folder = await window.electronAPI.selectFolder();
                          if (folder) {
                            setBackupConfig({...backupConfig, backup_folder_path: folder});
                          }
                        } else {
                          toast.error('Folder selection only available in desktop app');
                        }
                      }}
                      className="gap-2"
                    >
                      <FolderOpen className="w-4 h-4" />
                      Browse
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">Backups will be saved as JSON files with timestamps</p>
                </div>
                
                <Button onClick={handleSaveBackupConfig} disabled={backupLoading} className="w-full bg-red-600 hover:bg-red-700" data-testid="save-backup-config-btn">
                  {backupLoading ? 'Saving...' : 'Save Backup Settings'}
                </Button>
              </CardContent>
            </Card>

            {/* Create Backup */}
            <Card className="border-border">
              <CardHeader>
                <CardTitle className="text-lg font-heading flex items-center gap-2">
                  <Download className="w-5 h-5 text-emerald-500" strokeWidth={1.5} />
                  Create Backup
                </CardTitle>
                <CardDescription>Create a full database backup now</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Last Backup Info */}
                {backupConfig.last_backup && (
                  <div className="p-4 rounded-lg bg-secondary/50 border border-border">
                    <h4 className="font-medium flex items-center gap-2 mb-2">
                      <Clock className="w-4 h-4 text-muted-foreground" />
                      Last Backup
                    </h4>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div className="text-muted-foreground">Date:</div>
                      <div>{formatDate(backupConfig.last_backup.created_at)}</div>
                      <div className="text-muted-foreground">File:</div>
                      <div className="font-mono text-xs truncate">{backupConfig.last_backup.filename}</div>
                      <div className="text-muted-foreground">Size:</div>
                      <div>{backupConfig.last_backup.size}</div>
                      <div className="text-muted-foreground">Records:</div>
                      <div>
                        {backupConfig.last_backup.records && (
                          <span>
                            {backupConfig.last_backup.records.customers} customers, {backupConfig.last_backup.records.loans} loans
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* Backup Result */}
                {backupResult && (
                  <div className={`p-4 rounded-lg border ${backupResult.success ? 'bg-emerald-500/10 border-emerald-500/20' : 'bg-red-500/10 border-red-500/20'}`}>
                    <div className="flex items-center gap-2">
                      {backupResult.success ? (
                        <CheckCircle className="w-5 h-5 text-emerald-500" />
                      ) : (
                        <XCircle className="w-5 h-5 text-red-500" />
                      )}
                      <span className={`font-medium ${backupResult.success ? 'text-emerald-500' : 'text-red-500'}`}>
                        {backupResult.message}
                      </span>
                    </div>
                    {backupResult.success && backupResult.filename && (
                      <div className="mt-2 text-sm text-muted-foreground">
                        <p className="flex items-center gap-2">
                          <FileJson className="w-4 h-4" />
                          {backupResult.filename} ({backupResult.backup_size})
                        </p>
                      </div>
                    )}
                  </div>
                )}

                <Button 
                  onClick={handleCreateBackup} 
                  disabled={backupLoading || !backupConfig.backup_folder_path}
                  className="w-full gap-2"
                  variant="secondary"
                  data-testid="create-backup-btn"
                >
                  {backupLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Creating Backup...
                    </>
                  ) : (
                    <>
                      <Download className="w-4 h-4" />
                      Create Backup Now
                    </>
                  )}
                </Button>

                {!backupConfig.backup_folder_path && (
                  <p className="text-xs text-amber-500 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    Configure backup folder path above to enable backups
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Backup Info */}
            <Card className="border-border">
              <CardHeader>
                <CardTitle className="text-lg font-heading flex items-center gap-2">
                  <AlertCircle className="w-5 h-5 text-blue-400" strokeWidth={1.5} />
                  About Backups
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="text-sm text-muted-foreground space-y-2">
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 text-emerald-500 mt-0.5" />
                    <span>Backups include all customers, loans, and payment records</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 text-emerald-500 mt-0.5" />
                    <span>Audit logs are included for compliance</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 text-emerald-500 mt-0.5" />
                    <span>Backups are saved as JSON files with timestamps</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Shield className="w-4 h-4 text-amber-500 mt-0.5" />
                    <span>User passwords are NOT included in backups for security</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <HardDrive className="w-4 h-4 text-blue-400 mt-0.5" />
                    <span>Store backups in a Dropbox-synced folder for cloud backup</span>
                  </li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Active Directory Tab */}
        <TabsContent value="ad" className="mt-6">
          <Card className="border-border max-w-2xl">
            <CardHeader>
              <CardTitle className="text-lg font-heading flex items-center gap-2">
                <Server className="w-5 h-5 text-red-500" strokeWidth={1.5} />
                Windows Active Directory Integration
              </CardTitle>
              <CardDescription>
                Allow users to authenticate using their Windows domain credentials
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* LDAP Availability Status */}
              <div className={`p-4 rounded-lg border ${adConfig.ldap_available ? 'bg-emerald-500/10 border-emerald-500/20' : 'bg-amber-500/10 border-amber-500/20'}`}>
                <div className="flex items-center gap-2">
                  {adConfig.ldap_available ? (
                    <>
                      <Wifi className="w-5 h-5 text-emerald-500" />
                      <span className="text-emerald-500 font-medium">LDAP Library Available</span>
                    </>
                  ) : (
                    <>
                      <WifiOff className="w-5 h-5 text-amber-500" />
                      <span className="text-amber-500 font-medium">LDAP Library Not Installed</span>
                    </>
                  )}
                </div>
                {!adConfig.ldap_available && (
                  <p className="text-sm text-muted-foreground mt-2">
                    To enable AD authentication, install the ldap3 package: <code className="bg-secondary px-1 rounded">pip install ldap3</code>
                  </p>
                )}
              </div>

              {/* Enable/Disable Toggle */}
              <div className="flex items-center justify-between p-4 rounded-lg bg-secondary/50 border border-border">
                <div>
                  <h3 className="font-medium">Enable Active Directory Authentication</h3>
                  <p className="text-sm text-muted-foreground">Users can login with their Windows domain credentials</p>
                </div>
                <Switch
                  checked={adConfig.enabled}
                  onCheckedChange={(checked) => setAdConfig({...adConfig, enabled: checked})}
                  disabled={!adConfig.ldap_available}
                  data-testid="ad-enable-switch"
                />
              </div>

              {/* AD Configuration Form */}
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="server_url">LDAP Server URL</Label>
                  <Input
                    id="server_url"
                    value={adConfig.server_url}
                    onChange={(e) => setAdConfig({...adConfig, server_url: e.target.value})}
                    placeholder="ldap://ad.yourcompany.com:389"
                    className="bg-secondary font-mono text-sm"
                    disabled={!adConfig.ldap_available}
                    data-testid="ad-server-url"
                  />
                  <p className="text-xs text-muted-foreground">Use ldaps:// for secure connection (port 636)</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="domain">Windows Domain</Label>
                  <Input
                    id="domain"
                    value={adConfig.domain}
                    onChange={(e) => setAdConfig({...adConfig, domain: e.target.value})}
                    placeholder="YOURCOMPANY"
                    className="bg-secondary"
                    disabled={!adConfig.ldap_available}
                    data-testid="ad-domain"
                  />
                  <p className="text-xs text-muted-foreground">The NetBIOS domain name (e.g., COMPANY)</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="base_dn">Base DN (Optional)</Label>
                  <Input
                    id="base_dn"
                    value={adConfig.base_dn}
                    onChange={(e) => setAdConfig({...adConfig, base_dn: e.target.value})}
                    placeholder="OU=Users,DC=yourcompany,DC=com"
                    className="bg-secondary font-mono text-sm"
                    disabled={!adConfig.ldap_available}
                    data-testid="ad-base-dn"
                  />
                  <p className="text-xs text-muted-foreground">Where to search for user info (leave empty if unsure)</p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Default Role for AD Users</Label>
                    <Select
                      value={adConfig.default_role}
                      onValueChange={(v) => setAdConfig({...adConfig, default_role: v})}
                      disabled={!adConfig.ldap_available}
                    >
                      <SelectTrigger className="bg-secondary" data-testid="ad-default-role">
                        <SelectValue placeholder="Select role" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="employee">Employee</SelectItem>
                        <SelectItem value="manager">Manager</SelectItem>
                        <SelectItem value="admin">Admin</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="default_branch">Default Branch</Label>
                    <Input
                      id="default_branch"
                      value={adConfig.default_branch}
                      onChange={(e) => setAdConfig({...adConfig, default_branch: e.target.value})}
                      placeholder="Head Office"
                      className="bg-secondary"
                      disabled={!adConfig.ldap_available}
                      data-testid="ad-default-branch"
                    />
                  </div>
                </div>
              </div>

              {/* Test Connection Result */}
              {adTestResult && (
                <div className={`p-4 rounded-lg border ${adTestResult.success ? 'bg-emerald-500/10 border-emerald-500/20' : 'bg-red-500/10 border-red-500/20'}`}>
                  <div className="flex items-center gap-2">
                    {adTestResult.success ? (
                      <CheckCircle className="w-5 h-5 text-emerald-500" />
                    ) : (
                      <XCircle className="w-5 h-5 text-red-500" />
                    )}
                    <span className={`font-medium ${adTestResult.success ? 'text-emerald-500' : 'text-red-500'}`}>
                      {adTestResult.message}
                    </span>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-4">
                <Button
                  variant="secondary"
                  onClick={handleTestAdConnection}
                  disabled={adLoading || !adConfig.ldap_available || !adConfig.server_url}
                  className="flex-1"
                  data-testid="ad-test-btn"
                >
                  {adLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Testing...
                    </>
                  ) : (
                    'Test Connection'
                  )}
                </Button>
                <Button
                  onClick={handleSaveAdConfig}
                  disabled={adLoading || !adConfig.ldap_available}
                  className="flex-1 bg-red-600 hover:bg-red-700"
                  data-testid="ad-save-btn"
                >
                  {adLoading ? 'Saving...' : 'Save Configuration'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Security Tab */}
        <TabsContent value="security" className="mt-6">
          <Card className="border-border max-w-xl">
            <CardHeader>
              <CardTitle className="text-lg font-heading flex items-center gap-2">
                <Shield className="w-5 h-5 text-red-500" strokeWidth={1.5} />
                Security & Integrity
              </CardTitle>
              <CardDescription>Verify data integrity and view security features</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="p-4 rounded-lg bg-secondary/50 border border-border">
                <h3 className="font-medium mb-2">Audit Log Integrity</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Verify that audit logs have not been tampered with using hash chain verification.
                </p>
                <Button onClick={handleVerifyIntegrity} variant="secondary" data-testid="verify-integrity-btn">
                  Verify Integrity
                </Button>
                {integrityResult && (
                  <div className={`mt-4 p-4 rounded-lg ${integrityResult.valid ? 'bg-emerald-500/10 border-emerald-500/20' : 'bg-red-500/10 border-red-500/20'} border`}>
                    <div className="flex items-center gap-2">
                      {integrityResult.valid ? (
                        <CheckCircle className="w-5 h-5 text-emerald-500" />
                      ) : (
                        <XCircle className="w-5 h-5 text-red-500" />
                      )}
                      <span className={`font-medium ${integrityResult.valid ? 'text-emerald-500' : 'text-red-500'}`}>
                        {integrityResult.message}
                      </span>
                    </div>
                    {integrityResult.total_entries && (
                      <p className="text-sm text-muted-foreground mt-2">
                        Total entries verified: {integrityResult.total_entries}
                      </p>
                    )}
                  </div>
                )}
              </div>
              
              <div className="p-4 rounded-lg bg-secondary/50 border border-border">
                <h3 className="font-medium mb-2">Security Features</h3>
                <ul className="text-sm text-muted-foreground space-y-2">
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-emerald-500" />
                    Master password encryption
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-emerald-500" />
                    Role-based access control
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-emerald-500" />
                    Immutable audit logs with hash chain
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-emerald-500" />
                    Payment immutability enforcement
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-emerald-500" />
                    SA ID validation (Luhn algorithm)
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-emerald-500" />
                    Windows Active Directory integration
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-emerald-500" />
                    Database backup to local/cloud storage
                  </li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
