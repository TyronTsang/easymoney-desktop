import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';
import { Switch } from '../components/ui/switch';
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '../components/ui/alert-dialog';
import { Search, Plus, AlertTriangle, Clock, Eye, RefreshCw } from 'lucide-react';

export default function LoanList() {
  const { api, user } = useAuth();
  const navigate = useNavigate();
  const [loans, setLoans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [markingPayment, setMarkingPayment] = useState(null);

  const canViewFullId = ['manager', 'admin'].includes(user?.role);
  const planNames = { 1: 'Monthly', 2: 'Fortnightly', 4: 'Weekly' };

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

  useEffect(() => {
    fetchLoans();
  }, [api]);

  const handleMarkPaid = async (loanId, installmentNumber) => {
    setMarkingPayment(`${loanId}-${installmentNumber}`);
    try {
      await api().post('/payments/mark-paid', {
        loan_id: loanId,
        installment_number: installmentNumber
      });
      toast.success(`Payment marked as paid`);
      fetchLoans();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to mark payment');
    } finally {
      setMarkingPayment(null);
    }
  };

  const filteredLoans = loans.filter(loan => {
    const matchesSearch = loan.customer_name.toLowerCase().includes(search.toLowerCase()) ||
      loan.id.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === 'all' || loan.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (status) => {
    switch (status) {
      case 'open':
        return <Badge className="bg-amber-100 text-amber-700 border-amber-200 hover:bg-amber-100">Open</Badge>;
      case 'paid':
        return <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 hover:bg-emerald-100">Paid</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getFraudIndicators = (flags) => {
    return (
      <div className="flex gap-1">
        {flags?.includes('QUICK_CLOSE') && (
          <span title="Quick-Close: Same day paid" className="text-amber-500">
            <Clock className="w-4 h-4" />
          </span>
        )}
        {flags?.includes('DUPLICATE_CUSTOMER') && (
          <span title="Duplicate Customer" className="text-purple-500">
            <AlertTriangle className="w-4 h-4" />
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

  // Get next unpaid payment for a loan
  const getNextPayment = (loan) => {
    if (!loan.payments) return null;
    return loan.payments
      .sort((a, b) => a.installment_number - b.installment_number)
      .find(p => !p.is_paid);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-heading font-bold text-gray-900">Loan Register</h1>
          <p className="text-gray-500 text-sm mt-1">
            Manage and track all loans
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={fetchLoans} data-testid="refresh-loans-btn">
            <RefreshCw className="w-4 h-4" />
          </Button>
          <Button onClick={() => navigate('/loans/new')} className="bg-red-600 hover:bg-red-700 gap-2" data-testid="new-loan-btn">
            <Plus className="w-4 h-4" /> New Loan
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            placeholder="Search by customer name or loan ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 bg-white border-gray-200"
            data-testid="loan-search-input"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px] bg-white border-gray-200" data-testid="status-filter">
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
      <Card className="border-gray-200 shadow-sm">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50 hover:bg-gray-50">
                  <TableHead className="font-semibold text-gray-700">Customer</TableHead>
                  <TableHead className="font-semibold text-gray-700">ID Number</TableHead>
                  <TableHead className="font-semibold text-gray-700">Mandate</TableHead>
                  <TableHead className="font-semibold text-gray-700">Principal</TableHead>
                  <TableHead className="font-semibold text-gray-700">Outstanding</TableHead>
                  <TableHead className="font-semibold text-gray-700">Plan</TableHead>
                  <TableHead className="font-semibold text-gray-700">Status</TableHead>
                  <TableHead className="font-semibold text-gray-700">Payment</TableHead>
                  <TableHead className="font-semibold text-gray-700">Alerts</TableHead>
                  <TableHead className="font-semibold text-gray-700"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={10} className="text-center py-12 text-gray-500">
                      Loading loans...
                    </TableCell>
                  </TableRow>
                ) : filteredLoans.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={10} className="text-center py-12 text-gray-500">
                      No loans found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredLoans.map((loan) => {
                    const nextPayment = getNextPayment(loan);
                    const paidCount = loan.payments?.filter(p => p.is_paid).length || 0;
                    const totalPayments = loan.payments?.length || 0;
                    
                    return (
                      <TableRow 
                        key={loan.id} 
                        className={`table-row-hover ${getRowClass(loan.fraud_flags)}`}
                        data-testid={`loan-row-${loan.id}`}
                      >
                        <TableCell className="font-medium text-gray-900">{loan.customer_name}</TableCell>
                        <TableCell className="font-mono text-sm text-gray-600">
                          {canViewFullId ? loan.customer_id_number : loan.customer_id_number_masked}
                        </TableCell>
                        <TableCell className="font-mono text-sm text-gray-600">{loan.mandate_id}</TableCell>
                        <TableCell className="font-mono text-gray-900">R{loan.principal_amount.toFixed(2)}</TableCell>
                        <TableCell className="font-mono font-semibold text-red-600">
                          R{loan.outstanding_balance.toFixed(2)}
                        </TableCell>
                        <TableCell className="text-sm text-gray-600">{planNames[loan.repayment_plan_code]}</TableCell>
                        <TableCell>{getStatusBadge(loan.status)}</TableCell>
                        <TableCell>
                          {loan.status === 'open' && nextPayment ? (
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button 
                                  size="sm" 
                                  variant="outline"
                                  className="text-xs border-emerald-300 text-emerald-700 hover:bg-emerald-50"
                                  disabled={markingPayment === `${loan.id}-${nextPayment.installment_number}`}
                                  data-testid={`quick-pay-${loan.id}`}
                                >
                                  Pay #{nextPayment.installment_number}
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Confirm Payment</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Mark payment #{nextPayment.installment_number} of R{nextPayment.amount_due.toFixed(2)} as paid?
                                    <br /><br />
                                    <span className="text-amber-600 font-medium">This action cannot be undone.</span>
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => handleMarkPaid(loan.id, nextPayment.installment_number)}
                                    className="bg-red-600 hover:bg-red-700"
                                  >
                                    Confirm Payment
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          ) : (
                            <span className="text-sm text-gray-400">{paidCount}/{totalPayments} paid</span>
                          )}
                        </TableCell>
                        <TableCell>{getFraudIndicators(loan.fraud_flags)}</TableCell>
                        <TableCell>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => navigate(`/loans/${loan.id}`)}
                            data-testid={`view-loan-${loan.id}`}
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Summary */}
      <div className="flex items-center justify-between text-sm text-gray-500">
        <span>{filteredLoans.length} loan(s) found</span>
        <span>
          Total Outstanding: <span className="font-mono font-semibold text-red-600">
            R{filteredLoans.reduce((sum, l) => sum + l.outstanding_balance, 0).toFixed(2)}
          </span>
        </span>
      </div>
    </div>
  );
}
