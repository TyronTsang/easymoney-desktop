import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Switch } from '../components/ui/switch';
import { Download, FileSpreadsheet, Users, CreditCard, Banknote, FolderOpen, AlertCircle, Calendar, Clock } from 'lucide-react';
import { Alert, AlertDescription } from '../components/ui/alert';

export default function Export() {
  const { api, user } = useAuth();
  const [exportType, setExportType] = useState('all');
  const [dateRange, setDateRange] = useState('today');
  const [saveToPath, setSaveToPath] = useState(false);
  const [settings, setSettings] = useState({});
  const [loading, setLoading] = useState(false);
  const [selectedFolder, setSelectedFolder] = useState('');
  const [customDateFrom, setCustomDateFrom] = useState('');
  const [customDateTo, setCustomDateTo] = useState('');

  useEffect(() => { 
    const fetchSettings = async () => { 
      try { 
        const res = await api().get('/settings'); 
        setSettings(res.data); 
        setSelectedFolder(res.data.export_folder_path || ''); 
      } catch (err) { 
        console.error('Failed to load settings'); 
      } 
    }; 
    fetchSettings(); 
  }, [api]);

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
      
      // In Electron mode, use folder dialog and export directly
      if (window.electronAPI) {
        let folder = selectedFolder;
        if (!folder) {
          folder = await window.electronAPI.selectFolder();
          if (!folder) {
            setLoading(false);
            return;
          }
          setSelectedFolder(folder);
        }
        const result = await window.electronAPI.exportData(exportType, user?.id || '');
        if (result?.success) {
          toast.success(`Exported to ${result.filePath || folder}`);
        } else {
          toast.error(result?.error || 'Export failed');
        }
        setLoading(false);
        return;
      }

      // Web mode - download file
      const res = await api().post('/export', { 
        export_type: exportType, 
        save_to_path: saveToPath,
        date_from: dateFrom,
        date_to: dateTo
      });
      
      if (res.data.saved_to_path) { 
        toast.success(res.data.message); 
      } else {
        const byteCharacters = atob(res.data.data);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) { 
          byteNumbers[i] = byteCharacters.charCodeAt(i); 
        }
        const byteArray = new Uint8Array(byteNumbers);
        const blob = new Blob([byteArray], { type: res.data.content_type });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; 
        a.download = res.data.filename;
        document.body.appendChild(a); 
        a.click(); 
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
        toast.success(`Export downloaded as ${res.data.filename}`);
      }
    } catch (err) { 
      toast.error(err.response?.data?.detail || err.message || 'Export failed'); 
    } finally { 
      setLoading(false); 
    }
  };

  const getDateRangeLabel = () => {
    const { dateFrom, dateTo } = getDateRangeForExport();
    if (!dateFrom && !dateTo) return 'All time';
    if (dateFrom === dateTo) return new Date(dateFrom).toLocaleDateString('en-ZA');
    return `${new Date(dateFrom).toLocaleDateString('en-ZA')} - ${new Date(dateTo).toLocaleDateString('en-ZA')}`;
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold font-heading">Export Data</h1>
        <p className="text-muted-foreground mt-2">Generate and download comprehensive reports</p>
      </div>

      <Card className="border-border">
        <CardHeader>
          <CardTitle className="text-lg font-heading flex items-center gap-2">
            <Calendar className="w-5 h-5 text-red-500" strokeWidth={1.5} />
            Time Period
          </CardTitle>
          <CardDescription>Select the date range for your export</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Date Range Options */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <button
              onClick={() => setDateRange('today')}
              className={`p-4 rounded-lg border-2 transition-all text-left ${
                dateRange === 'today' 
                  ? 'border-red-500 bg-red-500/10' 
                  : 'border-gray-200 hover:border-red-300'
              }`}
            >
              <Clock className="w-5 h-5 text-red-500 mb-2" />
              <p className="font-medium text-sm">Today</p>
              <p className="text-xs text-muted-foreground">Daily activity</p>
            </button>

            <button
              onClick={() => setDateRange('week')}
              className={`p-4 rounded-lg border-2 transition-all text-left ${
                dateRange === 'week' 
                  ? 'border-red-500 bg-red-500/10' 
                  : 'border-gray-200 hover:border-red-300'
              }`}
            >
              <Calendar className="w-5 h-5 text-red-500 mb-2" />
              <p className="font-medium text-sm">Last 7 Days</p>
              <p className="text-xs text-muted-foreground">Weekly report</p>
            </button>

            <button
              onClick={() => setDateRange('month')}
              className={`p-4 rounded-lg border-2 transition-all text-left ${
                dateRange === 'month' 
                  ? 'border-red-500 bg-red-500/10' 
                  : 'border-gray-200 hover:border-red-300'
              }`}
            >
              <Calendar className="w-5 h-5 text-red-500 mb-2" />
              <p className="font-medium text-sm">Last 30 Days</p>
              <p className="text-xs text-muted-foreground">Monthly report</p>
            </button>

            <button
              onClick={() => setDateRange('custom')}
              className={`p-4 rounded-lg border-2 transition-all text-left ${
                dateRange === 'custom' 
                  ? 'border-red-500 bg-red-500/10' 
                  : 'border-gray-200 hover:border-red-300'
              }`}
            >
              <Calendar className="w-5 h-5 text-red-500 mb-2" />
              <p className="font-medium text-sm">Custom Range</p>
              <p className="text-xs text-muted-foreground">Choose dates</p>
            </button>

            <button
              onClick={() => setDateRange('all')}
              className={`p-4 rounded-lg border-2 transition-all text-left ${
                dateRange === 'all' 
                  ? 'border-red-500 bg-red-500/10' 
                  : 'border-gray-200 hover:border-red-300'
              }`}
            >
              <FileSpreadsheet className="w-5 h-5 text-red-500 mb-2" />
              <p className="font-medium text-sm">All Data</p>
              <p className="text-xs text-muted-foreground">Complete history</p>
            </button>
          </div>

          {/* Custom Date Range Inputs */}
          {dateRange === 'custom' && (
            <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
              <div className="space-y-2">
                <Label>Start Date</Label>
                <Input
                  type="date"
                  value={customDateFrom}
                  onChange={(e) => setCustomDateFrom(e.target.value)}
                  max={customDateTo || new Date().toISOString().split('T')[0]}
                  className="bg-white"
                />
              </div>
              <div className="space-y-2">
                <Label>End Date</Label>
                <Input
                  type="date"
                  value={customDateTo}
                  onChange={(e) => setCustomDateTo(e.target.value)}
                  min={customDateFrom}
                  max={new Date().toISOString().split('T')[0]}
                  className="bg-white"
                />
              </div>
            </div>
          )}

          {/* Selected Range Display */}
          <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
            <p className="text-sm text-blue-700">
              <strong>Exporting:</strong> {getDateRangeLabel()}
            </p>
          </div>
        </CardContent>
      </Card>

      <Card className="border-border">
        <CardHeader>
          <CardTitle className="text-lg font-heading flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5 text-red-500" strokeWidth={1.5} />
            Export Options
          </CardTitle>
          <CardDescription>What data to include in the export</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3">
            <button onClick={() => setExportType('all')} className={`p-4 rounded-lg border-2 transition-all text-left ${exportType === 'all' ? 'border-red-500 bg-red-500/10' : 'border-gray-200 hover:border-red-300'}`}><div className="flex items-center gap-3"><FileSpreadsheet className="w-5 h-5 text-red-500" /><div><p className="font-medium">All Data</p><p className="text-xs text-muted-foreground">Customers, loans, and payments</p></div></div></button>
            <button onClick={() => setExportType('customers')} className={`p-4 rounded-lg border-2 transition-all text-left ${exportType === 'customers' ? 'border-red-500 bg-red-500/10' : 'border-gray-200 hover:border-red-300'}`}><div className="flex items-center gap-3"><Users className="w-5 h-5 text-red-500" /><div><p className="font-medium">Customers Only</p><p className="text-xs text-muted-foreground">Customer information</p></div></div></button>
            <button onClick={() => setExportType('loans')} className={`p-4 rounded-lg border-2 transition-all text-left ${exportType === 'loans' ? 'border-red-500 bg-red-500/10' : 'border-gray-200 hover:border-red-300'}`}><div className="flex items-center gap-3"><CreditCard className="w-5 h-5 text-red-500" /><div><p className="font-medium">Loans Only</p><p className="text-xs text-muted-foreground">Loan records</p></div></div></button>
            <button onClick={() => setExportType('payments')} className={`p-4 rounded-lg border-2 transition-all text-left ${exportType === 'payments' ? 'border-red-500 bg-red-500/10' : 'border-gray-200 hover:border-red-300'}`}><div className="flex items-center gap-3"><Banknote className="w-5 h-5 text-red-500" /><div><p className="font-medium">Payments Only</p><p className="text-xs text-muted-foreground">Payment transactions</p></div></div></button>
          </div>
        </CardContent>
      </Card>

      <Card className="border-border">
        <CardHeader>
          <CardTitle className="text-lg font-heading flex items-center gap-2">
            <FolderOpen className="w-5 h-5 text-red-500" strokeWidth={1.5} />
            Export Destination
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
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
