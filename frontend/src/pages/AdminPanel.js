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
import { Settings, Users, FolderOpen, Shield, Plus, UserCheck, UserX, CheckCircle, XCircle, Server, Wifi, WifiOff, AlertCircle, Loader2 } from 'lucide-react';

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

  useEffect(() => {
    fetchData();
    fetchAdConfig();
  }, [fetchData, fetchAdConfig]);

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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-heading font-bold tracking-tight">Admin Panel</h1>
        <p className="text-muted-foreground text-sm mt-1">Manage users, settings, and security</p>
      </div>

      <Tabs defaultValue="users" className="w-full">
        <TabsList className="grid w-full max-w-2xl grid-cols-4">
          <TabsTrigger value="users" className="gap-2" data-testid="users-tab">
            <Users className="w-4 h-4" /> Users
          </TabsTrigger>
          <TabsTrigger value="settings" className="gap-2" data-testid="settings-tab">
            <Settings className="w-4 h-4" /> Settings
          </TabsTrigger>
          <TabsTrigger value="ad" className="gap-2" data-testid="ad-tab">
            <Server className="w-4 h-4" /> Active Directory
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
                <Input 
                  id="export_path" 
                  value={settingsForm.export_folder_path} 
                  onChange={(e) => setSettingsForm({...settingsForm, export_folder_path: e.target.value})} 
                  placeholder="C:\Users\Staff\Dropbox\EasyMoneyLoans\Exports" 
                  className="bg-secondary font-mono text-sm" 
                  data-testid="export-path-input" 
                />
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
                <p className="text-xs text-muted-foreground">This will appear in export filenames</p>
              </div>
              <Button onClick={handleSaveSettings} className="w-full bg-red-600 hover:bg-red-700" data-testid="save-settings-btn">
                Save Settings
              </Button>
            </CardContent>
          </Card>
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
                  {adTestResult.server_info && (
                    <div className="mt-2 text-sm text-muted-foreground">
                      <p>Server Type: {adTestResult.server_info.server_type}</p>
                    </div>
                  )}
                </div>
              )}

              {/* Info Box */}
              <div className="p-4 rounded-lg bg-blue-500/10 border border-blue-500/20">
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-5 h-5 text-blue-400 mt-0.5" />
                  <div className="text-sm">
                    <p className="text-blue-400 font-medium">How AD Authentication Works</p>
                    <ul className="text-muted-foreground mt-2 space-y-1 list-disc list-inside">
                      <li>Users can login with their Windows username (e.g., john.smith)</li>
                      <li>New AD users are automatically created with the default role</li>
                      <li>Local users can still login with their existing credentials</li>
                      <li>Admins can promote AD users to higher roles after they login</li>
                    </ul>
                  </div>
                </div>
              </div>

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
              <CardDescription>Verify data integrity and manage security settings</CardDescription>
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
                </ul>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
