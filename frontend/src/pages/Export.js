import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Label } from '../components/ui/label';
import { Switch } from '../components/ui/switch';
import { Download, FileSpreadsheet, Users, CreditCard, Banknote, FolderOpen, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '../components/ui/alert';

export default function Export() {
  const { api, user } = useAuth();
  const [exportType, setExportType] = useState('all');
  const [saveToPath, setSaveToPath] = useState(false);
  const [settings, setSettings] = useState({});
  const [loading, setLoading] = useState(false);

  useEffect(() => { const fetchSettings = async () => { try { const res = await api().get('/settings'); setSettings(res.data); } catch (err) { console.error('Failed to load settings'); } }; fetchSettings(); }, [api]);

  const handleExport = async () => {
    setLoading(true);
    try {
      const res = await api().post('/export', { export_type: exportType, save_to_path: saveToPath });
      if (res.data.saved_to_path) { toast.success(res.data.message); } 
      else {
        const byteCharacters = atob(res.data.data);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) { byteNumbers[i] = byteCharacters.charCodeAt(i); }
        const byteArray = new Uint8Array(byteNumbers);
        const blob = new Blob([byteArray], { type: res.data.content_type });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = res.data.filename;
        document.body.appendChild(a); a.click(); document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
        toast.success(`Export downloaded as ${res.data.filename}`);
      }
    } catch (err) { toast.error(err.response?.data?.detail || 'Export failed'); } finally { setLoading(false); }
  };

  const exportOptions = [
    { value: 'all', label: 'All Data', icon: FileSpreadsheet, description: 'Customers, Loans, and Payments' },
    { value: 'customers', label: 'Customers Only', icon: Users, description: 'Customer records with ID numbers' },
    { value: 'loans', label: 'Loans Only', icon: CreditCard, description: 'Loan records with status' },
    { value: 'payments', label: 'Payments Only', icon: Banknote, description: 'Payment records with paid status' },
  ];

  return (
    <div className="space-y-6 max-w-2xl">
      <div><h1 className="text-3xl font-heading font-bold tracking-tight">Export Data</h1><p className="text-muted-foreground text-sm mt-1">Export data to Excel for backup or reporting</p></div>

      <Card className="border-border" data-testid="export-card">
        <CardHeader><CardTitle className="text-lg font-heading flex items-center gap-2"><Download className="w-5 h-5 text-red-500" strokeWidth={1.5} />Excel Export</CardTitle><CardDescription>Select what data to export. Files will be named with today's date and your branch.</CardDescription></CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-3">
            <Label>Export Type</Label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {exportOptions.map((option) => (
                <div key={option.value} className={`p-4 rounded-lg border cursor-pointer transition-all ${exportType === option.value ? 'border-red-500 bg-red-500/10' : 'border-border bg-secondary/50 hover:bg-secondary'}`} onClick={() => setExportType(option.value)} data-testid={`export-option-${option.value}`}>
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${exportType === option.value ? 'bg-red-500/20' : 'bg-secondary'}`}><option.icon className={`w-5 h-5 ${exportType === option.value ? 'text-red-500' : 'text-muted-foreground'}`} strokeWidth={1.5} /></div>
                    <div><p className="font-medium">{option.label}</p><p className="text-xs text-muted-foreground">{option.description}</p></div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="p-4 rounded-lg bg-secondary/50 border border-border"><p className="text-sm text-muted-foreground mb-2">Export Details</p><ul className="text-sm space-y-1"><li>• File format: Excel (.xlsx)</li><li>• Filename: Loans_{new Date().toISOString().split('T')[0]}_{user?.branch?.replace(/\s/g, '_')}.xlsx</li><li>• SA ID numbers formatted as text (prevents scientific notation)</li><li>• Includes Created By, Paid By, and timestamps</li></ul></div>

          <div className="p-4 rounded-lg bg-secondary/50 border border-border">
            <div className="flex items-center justify-between"><div className="flex items-center gap-3"><FolderOpen className="w-5 h-5 text-red-500" /><div><p className="font-medium">Save to Dropbox Folder</p><p className="text-xs text-muted-foreground">{settings.export_folder_path ? `Save directly to: ${settings.export_folder_path}` : 'No export folder configured'}</p></div></div><Switch checked={saveToPath} onCheckedChange={setSaveToPath} disabled={!settings.export_folder_path} data-testid="save-to-path-switch" /></div>
          </div>

          {saveToPath && !settings.export_folder_path && <Alert className="border-amber-500/20 bg-amber-500/10"><AlertCircle className="h-4 w-4 text-amber-500" /><AlertDescription className="text-sm text-amber-200/80">Export folder not configured. Please configure in Admin Panel → Settings.</AlertDescription></Alert>}

          <Button onClick={handleExport} disabled={loading || (saveToPath && !settings.export_folder_path)} className="w-full gap-2 bg-red-600 hover:bg-red-700" data-testid="export-btn"><Download className="w-4 h-4" />{loading ? 'Exporting...' : saveToPath ? 'Save to Folder' : 'Download Export'}</Button>
        </CardContent>
      </Card>
    </div>
  );
}
