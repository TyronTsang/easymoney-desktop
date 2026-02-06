import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { toast } from 'sonner';
import { Card, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '../components/ui/dialog';
import { RefreshCw, Plus, Search, Zap, Lock, Filter, ChevronUp, ChevronDown, AlertCircle, Trash2, Pencil } from 'lucide-react';

export default function LoanList() {
  const { api, user } = useAuth();
  const navigate = useNavigate();
  const [loans, setLoans] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [newLoanOpen, setNewLoanOpen] = useState(false);
  const [sortField, setSortField] = useState('created_at');
  const [sortDir, setSortDir] = useState('desc');
  const [expandedCustomers, setExpandedCustomers] = useState({});

  // New Loan Form State
  const [loanForm, setLoanForm] = useState({
    // Customer fields
    client_name: '',
    id_number: '',
    mandate_id: '',
    cell_phone: '',
    sassa_end_date: '',
    // Loan fields
    principal_amount: '',
    repayment_plan_code: '1',
    // Existing customer
    existing_customer_id: ''
  });
  const [formLoading, setFormLoading] = useState(false);
  const [useExistingCustomer, setUseExistingCustomer] = useState(false);
  const [editPaymentOpen, setEditPaymentOpen] = useState(false);
  const [editingPayment, setEditingPayment] = useState(null);
  const [editAmount, setEditAmount] = useState('');

  const isAdmin = user?.role === 'admin';
  const canViewFullId = ['manager', 'admin'].includes(user?.role);
  const planNames = { 1: 'Monthly (1x)', 2: 'Fortnightly (2x)', 4: 'Weekly (4x)' };

  const fetchData = useCallback(async () => {
    try {
      const [loansRes, customersRes] = await Promise.all([
        api().get('/loans'),
        api().get('/customers')
      ]);
      setLoans(loansRes.data);
      setCustomers(customersRes.data);
    } catch (err) {
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  }, [api]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleRefresh = () => {
    setLoading(true);
    fetchData();
  };

  // Calculate loan preview
  const calculateLoan = () => {
    const principal = parseFloat(loanForm.principal_amount) || 0;
    const interest = principal * 0.4;
    const serviceFee = 12;
    const total = principal + interest + serviceFee;
    const planCode = parseInt(loanForm.repayment_plan_code);
    const installment = total / planCode;
    return { principal, interest, serviceFee, total, installment, planCode };
  };

  const handleCreateLoan = async (e) => {
    e.preventDefault();
    setFormLoading(true);

    try {
      let customerId = loanForm.existing_customer_id;

      // Create new customer if not using existing
      if (!useExistingCustomer) {
        if (!loanForm.client_name || !loanForm.id_number || !loanForm.mandate_id) {
          toast.error('Please fill in all customer fields');
          setFormLoading(false);
          return;
        }

        const customerRes = await api().post('/customers', {
          client_name: loanForm.client_name,
          id_number: loanForm.id_number,
          mandate_id: loanForm.mandate_id,
          cell_phone: loanForm.cell_phone || null,
          sassa_end_date: loanForm.sassa_end_date || null
        });
        customerId = customerRes.data.id;
      }

      if (!customerId) {
        toast.error('Please select or create a customer');
        setFormLoading(false);
        return;
      }

      // Create loan
      await api().post('/loans', {
        customer_id: customerId,
        principal_amount: parseFloat(loanForm.principal_amount),
        repayment_plan_code: parseInt(loanForm.repayment_plan_code),
        loan_date: new Date().toISOString().split('T')[0]
      });

      toast.success('Loan created successfully!');
      setNewLoanOpen(false);
      setLoanForm({
        client_name: '',
        id_number: '',
        mandate_id: '',
        cell_phone: '',
        sassa_end_date: '',
        principal_amount: '',
        repayment_plan_code: '1',
        existing_customer_id: ''
      });
      setUseExistingCustomer(false);
      fetchData();
    } catch (err) {
      let errorMsg = 'Failed to create loan';
      
      if (err.response?.data?.detail) {
        const detail = err.response.data.detail;
        if (Array.isArray(detail)) {
          errorMsg = detail[0]?.msg || detail[0]?.message || errorMsg;
        } else if (typeof detail === 'string') {
          errorMsg = detail;
        }
      } else if (err.message) {
        errorMsg = err.message;
      }
      
      toast.error(String(errorMsg));
    } finally {
      setFormLoading(false);
    }
  };

  const handleMarkPayment = async (e, loanId, installmentNumber, currentlyPaid) => {
    if (e && e.stopPropagation) {
      e.stopPropagation();
    }
    
    // Find the loan to check if multi-payment
    const loan = loans.find(l => l.id === loanId);
    const isMultiPayment = loan && loan.repayment_plan_code > 1;
    const allPaid = loan?.payments?.every(p => p.is_paid);

    // For monthly (single payment) or fully paid multi-payment loans, block unmarking
    if (currentlyPaid && (!isMultiPayment || allPaid)) {
      toast.error('Payments cannot be unmarked');
      return;
    }

    try {
      if (currentlyPaid) {
        // Unmark payment for multi-payment plans
        await api().post('/payments/unmark-paid', {
          loan_id: loanId,
          installment_number: installmentNumber
        });
        toast.success(`Payment ${installmentNumber} unmarked`);
      } else {
        await api().post('/payments/mark-paid', {
          loan_id: loanId,
          installment_number: installmentNumber
        });
        toast.success(`Payment ${installmentNumber} marked as paid`);
      }
      fetchData();
    } catch (err) {
      let errorMsg = 'Failed to update payment';
      
      if (err.response?.data?.detail) {
        const detail = err.response.data.detail;
        if (Array.isArray(detail)) {
          errorMsg = detail[0]?.msg || detail[0]?.message || errorMsg;
        } else if (typeof detail === 'string') {
          errorMsg = detail;
        }
      } else if (err.message) {
        errorMsg = err.message;
      }
      
      toast.error(String(errorMsg));
    }
  };

  // Filtering and sorting
  const filteredLoans = loans
    .filter(loan => {
      const searchLower = search.toLowerCase();
      const matchesSearch = 
        loan.customer_name?.toLowerCase().includes(searchLower) ||
        loan.customer_id_number?.includes(search) ||
        loan.customer_mandate_id?.toLowerCase().includes(searchLower);
      const matchesStatus = statusFilter === 'all' || loan.status === statusFilter;
      
      // Security: Employees can only see today's loans unless they search with full 13-digit ID
      let matchesDateRestriction = true;
      if (user?.role === 'employee') {
        const today = new Date().toISOString().split('T')[0];
        const loanDate = loan.loan_date || loan.created_at?.split('T')[0];
        
        // If searching with full 13-digit ID, show all matching loans
        const isFullIdSearch = search.length === 13 && /^\d{13}$/.test(search);
        
        // Otherwise, only show today's loans
        if (!isFullIdSearch) {
          matchesDateRestriction = loanDate === today;
        }
      }
      
      return matchesSearch && matchesStatus && matchesDateRestriction;
    })
    .sort((a, b) => {
      let aVal = a[sortField];
      let bVal = b[sortField];
      if (sortField === 'created_at') {
        aVal = new Date(aVal);
        bVal = new Date(bVal);
      }
      if (sortDir === 'asc') return aVal > bVal ? 1 : -1;
      return aVal < bVal ? 1 : -1;
    });

  const toggleSort = (field) => {
    if (sortField === field) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDir('desc');
    }
  };

  const renderSortIcon = (field) => {
    if (sortField !== field) return null;
    return sortDir === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />;
  };

  // Group loans by customer for duplicate detection
  const groupedByCustomer = {};
  filteredLoans.forEach(loan => {
    const key = loan.customer_id_number || loan.customer_name;
    if (!groupedByCustomer[key]) {
      groupedByCustomer[key] = [];
    }
    groupedByCustomer[key].push(loan);
  });

  const toggleCustomerExpand = (key) => {
    setExpandedCustomers(prev => ({ ...prev, [key]: !prev[key] }));
  };

  // Build display rows: for customers with multiple loans, show first loan + expand toggle
  const displayRows = [];
  Object.entries(groupedByCustomer).forEach(([key, customerLoans]) => {
    if (customerLoans.length === 1) {
      displayRows.push({ type: 'single', loan: customerLoans[0] });
    } else {
      displayRows.push({ type: 'group', key, loans: customerLoans, expanded: !!expandedCustomers[key] });
    }
  });

  // Admin: Delete payment
  const handleDeletePayment = async (e, loanId, paymentId) => {
    if (e) e.stopPropagation();
    if (!window.confirm('Are you sure you want to delete this payment? This action is logged.')) return;
    try {
      await api().delete(`/admin/payments/${paymentId}`);
      toast.success('Payment deleted');
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.detail || err.message || 'Failed to delete payment');
    }
  };

  // Admin: Edit payment
  const handleEditPayment = async () => {
    if (!editingPayment) return;
    try {
      await api().put(`/admin/payments/${editingPayment.id}`, { amount_due: parseFloat(editAmount) });
      toast.success('Payment updated');
      setEditPaymentOpen(false);
      setEditingPayment(null);
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.detail || err.message || 'Failed to update payment');
    }
  };

  const calc = calculateLoan();

  const renderLoanRow = (loan, isNested) => (
    <TableRow 
      key={loan.id} 
      className={`hover:bg-gray-50 cursor-pointer ${isNested ? 'bg-gray-50/50' : ''} ${loan.fraud_flags?.includes('QUICK_CLOSE') ? 'bg-amber-50' : ''}`}
      onClick={() => navigate(`/loans/${loan.id}`)}
      data-testid={`loan-row-${loan.id}`}
    >
      <TableCell className="text-sm text-gray-600">
        {isNested && <span className="ml-4" />}
        {new Date(loan.created_at).toLocaleDateString('en-ZA', { day: '2-digit', month: 'short', year: 'numeric' })}
      </TableCell>
      <TableCell>
        <div className="flex items-center gap-2">
          {loan.fraud_flags?.includes('QUICK_CLOSE') && <Zap className="w-4 h-4 text-amber-500" />}
          <span className="font-medium text-gray-900">{loan.customer_name}</span>
        </div>
      </TableCell>
      <TableCell className="font-mono text-sm text-gray-600">
        {canViewFullId ? loan.customer_id_number : loan.customer_id_number_masked}
      </TableCell>
      <TableCell className="text-sm text-gray-600">{loan.customer_cell_phone || '-'}</TableCell>
      <TableCell className="text-sm text-gray-600">{loan.customer_mandate_id || '-'}</TableCell>
      <TableCell className="text-sm text-gray-600">{loan.customer_sassa_end || '-'}</TableCell>
      <TableCell className="font-mono text-gray-900">R {loan.principal_amount?.toLocaleString('en-ZA', {minimumFractionDigits: 2})}</TableCell>
      <TableCell className="text-sm">
        <span className="text-gray-600">{planNames[loan.repayment_plan_code]?.split(' ')[0]}</span>
        <span className="text-gray-400 text-xs ml-1">({loan.repayment_plan_code}x)</span>
      </TableCell>
      <TableCell className="font-mono text-gray-900">R {loan.total_amount?.toLocaleString('en-ZA', {minimumFractionDigits: 2})}</TableCell>
      <TableCell className={`font-mono font-semibold ${loan.outstanding_balance > 0 ? 'text-red-600' : 'text-green-600'}`}>
        R {loan.outstanding_balance?.toLocaleString('en-ZA', {minimumFractionDigits: 2})}
      </TableCell>
      <TableCell>
        <Badge className={loan.status === 'paid' ? 'bg-green-100 text-green-700 border-green-200' : 'bg-amber-100 text-amber-700 border-amber-200'}>
          {loan.status === 'paid' ? 'Paid' : 'Open'}
        </Badge>
      </TableCell>
      <TableCell>
        <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
          {loan.payments?.slice(0, 4).map((payment, idx) => {
            const allPaid = loan.payments?.every(p => p.is_paid);
            const isMultiPayment = loan.repayment_plan_code > 1;
            const shouldLock = payment.is_paid && (!isMultiPayment || allPaid);
            return (
              <div key={idx} className="flex items-center gap-1">
                {shouldLock && !isAdmin && <Lock className="w-3 h-3 text-gray-400" />}
                <span className="text-xs text-gray-500">P{idx + 1}</span>
                <Switch
                  checked={payment.is_paid}
                  onCheckedChange={() => handleMarkPayment(null, loan.id, payment.installment_number, payment.is_paid)}
                  disabled={shouldLock && !isAdmin}
                  className="data-[state=checked]:bg-green-500"
                  data-testid={`payment-toggle-${loan.id}-${idx + 1}`}
                />
                {isAdmin && (
                  <>
                    <button onClick={(e) => { e.stopPropagation(); setEditingPayment(payment); setEditAmount(payment.amount_due?.toString() || ''); setEditPaymentOpen(true); }} className="p-0.5 hover:bg-gray-200 rounded" title="Edit payment">
                      <Pencil className="w-3 h-3 text-blue-500" />
                    </button>
                    <button onClick={(e) => handleDeletePayment(e, loan.id, payment.id)} className="p-0.5 hover:bg-gray-200 rounded" title="Delete payment">
                      <Trash2 className="w-3 h-3 text-red-500" />
                    </button>
                  </>
                )}
              </div>
            );
          })}
        </div>
      </TableCell>
    </TableRow>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-heading font-bold tracking-tight text-gray-900">Loan Register</h1>
          <p className="text-gray-500 text-sm mt-1">
            {filteredLoans.length} loans found
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" onClick={handleRefresh} className="gap-2" data-testid="refresh-btn">
            <RefreshCw className="w-4 h-4" /> Refresh
          </Button>
          <Button onClick={() => setNewLoanOpen(true)} className="gap-2 bg-red-600 hover:bg-red-700" data-testid="new-loan-btn">
            <Plus className="w-4 h-4" /> New Loan
          </Button>
        </div>
      </div>

      {/* Search and Filters */}
      <Card className="border-gray-200">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder={user?.role === 'employee' ? "Search by name, ID number (13 digits to see old loans), or mandate..." : "Search by name, ID number, or mandate..."}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10 bg-gray-50 border-gray-200"
                data-testid="loan-search-input"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[140px] bg-gray-50 border-gray-200" data-testid="status-filter">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="open">Open</SelectItem>
                <SelectItem value="paid">Paid</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" className="gap-2">
              <Filter className="w-4 h-4" /> Filters
            </Button>
          </div>
          
          {user?.role === 'employee' && (
            <div className="mt-3 p-2 bg-blue-50 rounded-md border border-blue-200">
              <p className="text-xs text-blue-700 flex items-center gap-1">
                <AlertCircle className="w-3 h-3" />
                <span>Viewing today&apos;s loans only. To access older loans, search with the full 13-digit ID number.</span>
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Loan Table */}
      <Card className="border-gray-200">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50 hover:bg-gray-50">
                  <TableHead className="cursor-pointer" onClick={() => toggleSort('created_at')}>
                    <div className="flex items-center gap-1">Loan Date {renderSortIcon("created_at")}</div>
                  </TableHead>
                  <TableHead className="cursor-pointer" onClick={() => toggleSort('customer_name')}>
                    <div className="flex items-center gap-1">Client Name {renderSortIcon("customer_name")}</div>
                  </TableHead>
                  <TableHead>ID Number</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Mandate ID</TableHead>
                  <TableHead>SASSA End</TableHead>
                  <TableHead>Loan Amount</TableHead>
                  <TableHead>Plan</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead className="cursor-pointer" onClick={() => toggleSort('outstanding_balance')}>
                    <div className="flex items-center gap-1">Balance {renderSortIcon("outstanding_balance")}</div>
                  </TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Payments</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={11} className="text-center py-8 text-gray-500">
                      Loading loans...
                    </TableCell>
                  </TableRow>
                ) : filteredLoans.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={11} className="text-center py-8 text-gray-500">
                      No loans found
                    </TableCell>
                  </TableRow>
                ) : (
                  displayRows.map((row) => {
                    if (row.type === 'single') {
                      return renderLoanRow(row.loan, false);
                    }
                    const { key, loans: customerLoans, expanded } = row;
                    const firstLoan = customerLoans[0];
                    return (
                      <React.Fragment key={`group-${key}`}>
                        <TableRow 
                          className="hover:bg-gray-50 cursor-pointer bg-blue-50/50"
                          onClick={() => toggleCustomerExpand(key)}
                        >
                          <TableCell colSpan={7}>
                            <div className="flex items-center gap-2">
                              {expanded ? <ChevronUp className="w-4 h-4 text-blue-500" /> : <ChevronDown className="w-4 h-4 text-blue-500" />}
                              <span className="font-medium text-gray-900">{firstLoan.customer_name}</span>
                              <span className="font-mono text-sm text-gray-500">{canViewFullId ? firstLoan.customer_id_number : firstLoan.customer_id_number_masked}</span>
                              <Badge className="bg-blue-100 text-blue-700 border-blue-200">{customerLoans.length} loans</Badge>
                            </div>
                          </TableCell>
                          <TableCell colSpan={5} className="text-right">
                            <span className="text-sm text-gray-500">Click to {expanded ? 'collapse' : 'expand'}</span>
                          </TableCell>
                        </TableRow>
                        {expanded && customerLoans.map((loan) => renderLoanRow(loan, true))}
                      </React.Fragment>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* New Loan Dialog */}
      <Dialog open={newLoanOpen} onOpenChange={setNewLoanOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto bg-white">
          <DialogHeader>
            <DialogTitle className="text-xl font-heading">Create New Loan</DialogTitle>
            <DialogDescription>Enter customer and loan details</DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateLoan} className="space-y-6">
            {/* Customer Section */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-medium text-gray-900">Customer Details</h3>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-500">Existing customer?</span>
                  <Switch
                    checked={useExistingCustomer}
                    onCheckedChange={setUseExistingCustomer}
                  />
                </div>
              </div>

              {useExistingCustomer ? (
                <Select
                  value={loanForm.existing_customer_id}
                  onValueChange={(v) => setLoanForm({...loanForm, existing_customer_id: v})}
                >
                  <SelectTrigger className="bg-gray-50" data-testid="existing-customer-select">
                    <SelectValue placeholder="Select customer" />
                  </SelectTrigger>
                  <SelectContent>
                    {customers.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.client_name} - {c.id_number}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2 space-y-2">
                    <Label>Client Name *</Label>
                    <Input
                      value={loanForm.client_name}
                      onChange={(e) => setLoanForm({...loanForm, client_name: e.target.value})}
                      placeholder="Full name"
                      className="bg-gray-50"
                      data-testid="client-name-input"
                      required={!useExistingCustomer}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>SA ID Number *</Label>
                    <div className="relative">
                      <Input
                        value={loanForm.id_number}
                        onChange={(e) => setLoanForm({...loanForm, id_number: e.target.value})}
                        placeholder="13-digit ID"
                        maxLength={13}
                        className="bg-gray-50 font-mono pr-16"
                        data-testid="id-number-input"
                        required={!useExistingCustomer}
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400 font-mono">
                        {loanForm.id_number.length}/13
                      </span>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Mandate ID *</Label>
                    <Input
                      value={loanForm.mandate_id}
                      onChange={(e) => setLoanForm({...loanForm, mandate_id: e.target.value})}
                      placeholder="Mandate reference"
                      className="bg-gray-50"
                      data-testid="mandate-id-input"
                      required={!useExistingCustomer}
                    />
                  </div>
                  <div className="col-span-2 space-y-2">
                    <Label>Cell Phone (optional)</Label>
                    <Input
                      type="tel"
                      value={loanForm.cell_phone}
                      onChange={(e) => setLoanForm({...loanForm, cell_phone: e.target.value})}
                      placeholder="0821234567"
                      maxLength={10}
                      className="bg-gray-50"
                      data-testid="cell-phone-input"
                    />
                  </div>
                  <div className="col-span-2 space-y-2">
                    <Label>SASSA End Date (optional)</Label>
                    <Input
                      type="date"
                      value={loanForm.sassa_end_date}
                      onChange={(e) => setLoanForm({...loanForm, sassa_end_date: e.target.value})}
                      className="bg-gray-50"
                      data-testid="sassa-date-input"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Loan Section */}
            <div className="space-y-4 pt-4 border-t border-gray-200">
              <h3 className="font-medium text-gray-900">Loan Details</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Loan Amount (R) *</Label>
                  <Input
                    type="number"
                    value={loanForm.principal_amount}
                    onChange={(e) => setLoanForm({...loanForm, principal_amount: e.target.value})}
                    placeholder="Min: R400 - Max: R8000"
                    min="400"
                    max="8000"
                    className="bg-gray-50 font-mono"
                    data-testid="loan-amount-input"
                    required
                  />
                  <p className="text-xs text-gray-500">Loan amount must be between R400 and R8000</p>
                </div>
                <div className="space-y-2">
                  <Label>Repayment Plan *</Label>
                  <Select
                    value={loanForm.repayment_plan_code}
                    onValueChange={(v) => setLoanForm({...loanForm, repayment_plan_code: v})}
                  >
                    <SelectTrigger className="bg-gray-50" data-testid="plan-select">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">Monthly (1 payment)</SelectItem>
                      <SelectItem value="2">Fortnightly (2 payments)</SelectItem>
                      <SelectItem value="4">Weekly (4 payments)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Loan Preview */}
              {loanForm.principal_amount && (
                <div className="p-4 bg-gray-50 rounded-lg space-y-2">
                  <h4 className="text-sm font-medium text-gray-700">Loan Summary</h4>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div className="text-gray-500">Principal:</div>
                    <div className="font-mono text-gray-900">R {calc.principal.toFixed(2)}</div>
                    <div className="text-gray-500">Fees & Charges:</div>
                    <div className="font-mono text-gray-900">R {(calc.interest + calc.serviceFee).toFixed(2)}</div>
                    <div className="text-gray-700 font-medium">Total:</div>
                    <div className="font-mono font-bold text-red-600">R {calc.total.toFixed(2)}</div>
                    <div className="text-gray-500">Per installment:</div>
                    <div className="font-mono text-gray-900">R {calc.installment.toFixed(2)} × {calc.planCode}</div>
                  </div>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-4">
              <Button type="button" variant="outline" className="flex-1" onClick={() => setNewLoanOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" className="flex-1 bg-red-600 hover:bg-red-700" disabled={formLoading} data-testid="create-loan-submit">
                {formLoading ? 'Creating...' : 'Create Loan'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
