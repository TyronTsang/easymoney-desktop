import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../components/ui/table';
import { CreditCard, Search, AlertTriangle, Clock, Eye, Plus } from 'lucide-react';

export default function LoanList() {
  const { api, user } = useAuth();
  const navigate = useNavigate();
  const [loans, setLoans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const canViewFullId = ['manager', 'admin'].includes(user?.role);
  const planNames = { 1: 'Monthly', 2: 'Fortnightly', 4: 'Weekly' };

  useEffect(() => {
    const fetchLoans = async () => {
      try {
        const res = await api().get('/loans');
        setLoans(res.data);
      } catch (err) {
        toast.error('Failed to load loans');
      } finally {
        setLoading(false);
      }
    };
    fetchLoans();
  }, [api]);

  const filteredLoans = loans.filter(loan => {
    const matchesSearch = loan.customer_name.toLowerCase().includes(search.toLowerCase()) ||
      loan.id.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === 'all' || loan.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (status) => {
    switch (status) {
      case 'open':
        return <Badge className="badge-warning">Open</Badge>;
      case 'paid':
        return <Badge className="badge-success">Paid</Badge>;
      case 'archived':
        return <Badge className="badge-neutral">Archived</Badge>;
      default:
        return <Badge className="badge-neutral">{status}</Badge>;
    }
  };

  const getFraudIndicators = (flags) => {
    if (!flags || flags.length === 0) return null;
    return (
      <div className="flex gap-1">
        {flags.includes('QUICK_CLOSE') && (
          <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-500 border border-amber-500/20">
            <Clock className="w-3 h-3" /> Quick-Close
          </span>
        )}
        {flags.includes('DUPLICATE_CUSTOMER') && (
          <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-purple-500/15 text-purple-500 border border-purple-500/20">
            <AlertTriangle className="w-3 h-3" /> Duplicate
          </span>
        )}
      </div>
    );
  };

  const getRowClass = (flags) => {
    if (!flags || flags.length === 0) return '';
    if (flags.includes('QUICK_CLOSE')) return 'fraud-quick-close';
    if (flags.includes('DUPLICATE_CUSTOMER')) return 'fraud-duplicate';
    return '';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-heading font-bold tracking-tight">Loans</h1>
          <p className="text-muted-foreground text-sm mt-1">
            View and manage all loans
          </p>
        </div>
        <Button onClick={() => navigate('/loans/new')} className="gap-2 bg-red-600 hover:bg-red-700" data-testid="new-loan-btn">
          <Plus className="w-4 h-4" /> New Loan
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search by customer name or loan ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 bg-secondary"
            data-testid="loan-search-input"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px] bg-secondary" data-testid="status-filter">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="open">Open</SelectItem>
            <SelectItem value="paid">Paid</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <Card className="border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg font-heading flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-red-500" strokeWidth={1.5} />
            Loan List
            <span className="text-sm font-normal text-muted-foreground ml-2">
              ({filteredLoans.length} records)
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border border-border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50 hover:bg-muted/50">
                  <TableHead>Customer</TableHead>
                  <TableHead>Principal</TableHead>
                  <TableHead>Outstanding</TableHead>
                  <TableHead>Plan</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Alerts</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                      Loading loans...
                    </TableCell>
                  </TableRow>
                ) : filteredLoans.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                      No loans found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredLoans.map((loan) => (
                    <TableRow 
                      key={loan.id} 
                      className={`cursor-pointer ${getRowClass(loan.fraud_flags)}`}
                      onClick={() => navigate(`/loans/${loan.id}`)}
                      data-testid={`loan-row-${loan.id}`}
                    >
                      <TableCell>
                        <div>
                          <p className="font-medium">{loan.customer_name}</p>
                          <p className="text-xs font-mono text-muted-foreground">
                            {canViewFullId ? loan.customer_id_number : loan.customer_id_number_masked}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell className="font-mono">R{loan.principal_amount.toFixed(2)}</TableCell>
                      <TableCell className="font-mono font-medium text-amber-500">
                        R{loan.outstanding_balance.toFixed(2)}
                      </TableCell>
                      <TableCell className="text-sm">{planNames[loan.repayment_plan_code]}</TableCell>
                      <TableCell>{getStatusBadge(loan.status)}</TableCell>
                      <TableCell>{getFraudIndicators(loan.fraud_flags)}</TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {new Date(loan.created_at).toLocaleDateString('en-ZA')}
                      </TableCell>
                      <TableCell>
                        <Button variant="ghost" size="icon" data-testid={`view-loan-${loan.id}`}>
                          <Eye className="w-4 h-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
