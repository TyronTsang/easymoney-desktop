import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Label } from '../components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import { Download, FileSpreadsheet, Users, CreditCard, Banknote } from 'lucide-react';

export default function Export() {
  const { api, user } = useAuth();
  const [exportType, setExportType] = useState('all');
  const [loading, setLoading] = useState(false);

  const handleExport = async () => {
    setLoading(true);
    try {
      const res = await api().post('/export', { export_type: exportType });
      
      // Convert base64 to blob and download
      const byteCharacters = atob(res.data.data);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: res.data.content_type });
      
      // Create download link
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = res.data.filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      
      toast.success(`Export saved as ${res.data.filename}`);
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Export failed');
    } finally {
      setLoading(false);
    }
  };

  const exportOptions = [
    { value: 'all', label: 'All Data', icon: FileSpreadsheet, description: 'Customers, Loans, and Payments' },
    { value: 'customers', label: 'Customers Only', icon: Users, description: 'Customer records with ID numbers' },
    { value: 'loans', label: 'Loans Only', icon: CreditCard, description: 'Loan records with status' },
    { value: 'payments', label: 'Payments Only', icon: Banknote, description: 'Payment records with paid status' },
  ];

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-heading font-bold tracking-tight">Export Data</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Export data to Excel for backup or reporting
        </p>
      </div>

      <Card className="border-border" data-testid="export-card">
        <CardHeader>
          <CardTitle className="text-lg font-heading flex items-center gap-2">
            <Download className="w-5 h-5 text-emerald-500" strokeWidth={1.5} />
            Excel Export
          </CardTitle>
          <CardDescription>
            Select what data to export. Files will be named with today's date and your branch.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-3">
            <Label>Export Type</Label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {exportOptions.map((option) => (
                <div
                  key={option.value}
                  className={`p-4 rounded-lg border cursor-pointer transition-all ${
                    exportType === option.value 
                      ? 'border-emerald-500 bg-emerald-500/10' 
                      : 'border-border bg-secondary/50 hover:bg-secondary'
                  }`}
                  onClick={() => setExportType(option.value)}
                  data-testid={`export-option-${option.value}`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                      exportType === option.value ? 'bg-emerald-500/20' : 'bg-secondary'
                    }`}>
                      <option.icon className={`w-5 h-5 ${
                        exportType === option.value ? 'text-emerald-500' : 'text-muted-foreground'
                      }`} strokeWidth={1.5} />
                    </div>
                    <div>
                      <p className="font-medium">{option.label}</p>
                      <p className="text-xs text-muted-foreground">{option.description}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="p-4 rounded-lg bg-secondary/50 border border-border">
            <p className="text-sm text-muted-foreground mb-2">Export Details</p>
            <ul className="text-sm space-y-1">
              <li>• File format: Excel (.xlsx)</li>
              <li>• Filename: Loans_{new Date().toISOString().split('T')[0]}_{user?.branch?.replace(/\s/g, '_')}.xlsx</li>
              <li>• SA ID numbers formatted as text (prevents scientific notation)</li>
              <li>• Includes Created By, Paid By, and timestamps</li>
            </ul>
          </div>

          <Button 
            onClick={handleExport} 
            disabled={loading} 
            className="w-full gap-2"
            data-testid="export-btn"
          >
            <Download className="w-4 h-4" />
            {loading ? 'Exporting...' : 'Export to Excel'}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
