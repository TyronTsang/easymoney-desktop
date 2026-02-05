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
  const [dateRange, setDateRange] = useState('today'); // New: date range filter
  const [saveToPath, setSaveToPath] = useState(false);
  const [settings, setSettings] = useState({});
  const [loading, setLoading] = useState(false);
  const [selectedFolder, setSelectedFolder] = useState('');
  const [customDateFrom, setCustomDateFrom] = useState('');
  const [customDateTo, setCustomDateTo] = useState('');

  useEffect(() => { const fetchSettings = async () => { try { const res = await api().get('/settings'); setSettings(res.data); setSelectedFolder(res.data.export_folder_path || ''); } catch (err) { console.error('Failed to load settings'); } }; fetchSettings(); }, [api]);

  const handleSelectFolder = async () => {
    if (window.electronAPI?.selectFolder) {
      const folder = await window.electronAPI.selectFolder();
      if (folder) {
        setSelectedFolder(folder);
        setSaveToPath(true);
      }
    } else {
      toast.error('Folder selection only available in desktop app');
    }
  };

  const getDateRangeForExport = () => {
    const today = new Date();
    let dateFrom = null;
    let dateTo = today.toISOString().split('T')[0];

    switch(dateRange) {
      case 'today':
        dateFrom = today.toISOString().split('T')[0];
        break;
      case 'week':
        const weekAgo = new Date(today);
        weekAgo.setDate(today.getDate() - 7);
        dateFrom = weekAgo.toISOString().split('T')[0];
        break;
      case 'month':
        const monthAgo = new Date(today);
        monthAgo.setMonth(today.getMonth() - 1);
        dateFrom = monthAgo.toISOString().split('T')[0];
        break;
      case 'custom':
        dateFrom = customDateFrom;
        dateTo = customDateTo;
        break;
      case 'all':
        dateFrom = null;
        dateTo = null;
        break;
    }

    return { dateFrom, dateTo };
  };

  const handleExport = async () => {
    if (dateRange === 'custom' && (!customDateFrom || !customDateTo)) {
      toast.error('Please select both start and end dates');
      return;
    }

    setLoading(true);
    try {
      const { dateFrom, dateTo } = getDateRangeForExport();
      
      const res = await api().post('/export', { 
        export_type: exportType, 
        save_to_path: saveToPath,
        date_from: dateFrom,
        date_to: dateTo
      });
      
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

          <div className="p-4 rounded-lg bg-secondary/50 border border-border space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <FolderOpen className="w-5 h-5 text-red-500" />
                <div>
                  <p className="font-medium">Save to Folder</p>
                  <p className="text-xs text-muted-foreground">
                    {selectedFolder ? `${selectedFolder}` : 'Select a folder to save exports'}
                  </p>
                </div>
              </div>
              <Switch 
                checked={saveToPath} 
                onCheckedChange={setSaveToPath} 
                disabled={!selectedFolder} 
                data-testid="save-to-path-switch" 
              />
            </div>
            
            <Button
              variant="outline"
              onClick={handleSelectFolder}
              className="w-full gap-2"
              disabled={!window.electronAPI?.isElectron}
            >
              <FolderOpen className="w-4 h-4" />
              {selectedFolder ? 'Change Folder' : 'Select Export Folder'}
            </Button>
            
            {!window.electronAPI?.isElectron && (
              <p className="text-xs text-amber-500 flex items-center gap-1">
                <AlertCircle className="w-3 h-3" />
                Folder selection only available in desktop app (currently in web preview)
              </p>
            )}
          </div>

          {saveToPath && !selectedFolder && <Alert className="border-amber-500/20 bg-amber-500/10"><AlertCircle className="h-4 w-4 text-amber-500" /><AlertDescription className="text-sm text-amber-200/80">Please select an export folder above.</AlertDescription></Alert>}

          <Button onClick={handleExport} disabled={loading || (saveToPath && !selectedFolder)} className="w-full gap-2 bg-red-600 hover:bg-red-700" data-testid="export-btn"><Download className="w-4 h-4" />{loading ? 'Exporting...' : saveToPath ? 'Save to Folder' : 'Download Export'}</Button>
        </CardContent>
      </Card>
    </div>
  );
}
