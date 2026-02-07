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
import { RefreshCw, Plus, Search, Zap, Lock, Filter, ChevronUp, ChevronDown, AlertCircle, Trash2, Pencil, ArrowUpCircle, UserCog } from 'lucide-react';

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
    client_name: '', id_number: '', mandate_id: '', cell_phone: '', sassa_end_date: '',
    principal_amount: '', repayment_plan_code: '1', existing_customer_id: ''
  });
  const [formLoading, setFormLoading] = useState(false);
  const [useExistingCustomer, setUseExistingCustomer] = useState(false);
  
  // Admin modals
  const [editPaymentOpen, setEditPaymentOpen] = useState(false);
  const [editingPayment, setEditingPayment] = useState(null);
  const [editAmount, setEditAmount] = useState('');
  const [editCustomerOpen, setEditCustomerOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState(null);
  const [editCustomerForm, setEditCustomerForm] = useState({ client_name: '', id_number: '', cell_phone: '', mandate_id: '' });
  const [topUpOpen, setTopUpOpen] = useState(false);
  const [topUpLoan, setTopUpLoan] = useState(null);
  const [topUpAmount, setTopUpAmount] = useState('');

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

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleRefresh = () => { setLoading(true); fetchData(); };

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

      if (!useExistingCustomer) {
        if (!loanForm.client_name || !loanForm.id_number || !loanForm.mandate_id) {
          toast.error('Please fill in all customer fields');
          setFormLoading(false);
          return;
        }

        // Check if customer already exists by ID number
        const existingCustomer = customers.find(c => c.id_number === loanForm.id_number);
        if (existingCustomer) {
          // Use existing customer instead of creating a new one
          customerId = existingCustomer.id;
          toast.info(`Using existing customer: ${existingCustomer.client_name}`);
        } else {
          const customerRes = await api().post('/customers', {
            client_name: loanForm.client_name,
            id_number: loanForm.id_number,
            mandate_id: loanForm.mandate_id,
            cell_phone: loanForm.cell_phone || null,
            sassa_end_date: loanForm.sassa_end_date || null
          });
          customerId = customerRes.data.id;
        }
      }

      if (!customerId) {
        toast.error('Please select or create a customer');
        setFormLoading(false);
        return;
      }

      await api().post('/loans', {
        customer_id: customerId,
        principal_amount: parseFloat(loanForm.principal_amount),
        repayment_plan_code: parseInt(loanForm.repayment_plan_code),
        loan_date: new Date().toISOString().split('T')[0]
      });

      toast.success('Loan created successfully!');
      setNewLoanOpen(false);
      setLoanForm({ client_name: '', id_number: '', mandate_id: '', cell_phone: '', sassa_end_date: '', principal_amount: '', repayment_plan_code: '1', existing_customer_id: '' });
      setUseExistingCustomer(false);
      fetchData();
    } catch (err) {
      let errorMsg = 'Failed to create loan';
      if (err.response?.data?.detail) {
        const detail = err.response.data.detail;
        errorMsg = Array.isArray(detail) ? (detail[0]?.msg || detail[0]?.message || errorMsg) : typeof detail === 'string' ? detail : errorMsg;
      } else if (err.message) { errorMsg = err.message; }
      toast.error(String(errorMsg));
    } finally { setFormLoading(false); }
  };

  const handleMarkPayment = async (e, loanId, installmentNumber, currentlyPaid) => {
    if (e?.stopPropagation) e.stopPropagation();
    const loan = loans.find(l => l.id === loanId);
    const isMultiPayment = loan && loan.repayment_plan_code > 1;
    const allPaid = loan?.payments?.every(p => p.is_paid);

    if (currentlyPaid && (!isMultiPayment || allPaid) && !isAdmin) {
      toast.error('Payments cannot be unmarked');
      return;
    }

    try {
      if (currentlyPaid) {
        await api().post('/payments/unmark-paid', { loan_id: loanId, installment_number: installmentNumber });
        toast.success(`Payment ${installmentNumber} unmarked`);
      } else {
        await api().post('/payments/mark-paid', { loan_id: loanId, installment_number: installmentNumber });
        toast.success(`Payment ${installmentNumber} marked as paid`);
      }
      fetchData();
    } catch (err) {
      let errorMsg = 'Failed to update payment';
      if (err.response?.data?.detail) {
        const detail = err.response.data.detail;
        errorMsg = Array.isArray(detail) ? (detail[0]?.msg || detail[0]?.message || errorMsg) : typeof detail === 'string' ? detail : errorMsg;
      } else if (err.message) { errorMsg = err.message; }
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
      
      let matchesDateRestriction = true;
      const today = new Date().toISOString().split('T')[0];
      const loanDate = loan.loan_date || loan.created_at?.split('T')[0];
      const isFullIdSearch = search.length === 13 && /^\d{13}$/.test(search);
      
      if (!isFullIdSearch) {
        matchesDateRestriction = loanDate === today;
      }
      
      return matchesSearch && matchesStatus && matchesDateRestriction;
    })
    .sort((a, b) => {
      let aVal = a[sortField];
      let bVal = b[sortField];
      if (sortField === 'created_at') { aVal = new Date(aVal); bVal = new Date(bVal); }
      if (sortDir === 'asc') return aVal > bVal ? 1 : -1;
      return aVal < bVal ? 1 : -1;
    });

  const toggleSort = (field) => {
    if (sortField === field) { setSortDir(sortDir === 'asc' ? 'desc' : 'asc'); }
    else { setSortField(field); setSortDir('desc'); }
  };

  const renderSortIcon = (field) => {
    if (sortField !== field) return null;
    return sortDir === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />;
  };

  // Group loans by customer
  const groupedByCustomer = {};
  filteredLoans.forEach(loan => {
    const key = loan.customer_id_number || loan.customer_name;
    if (!groupedByCustomer[key]) groupedByCustomer[key] = [];
    groupedByCustomer[key].push(loan);
  });

  const toggleCustomerExpand = (key) => {
    setExpandedCustomers(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const displayRows = [];
  Object.entries(groupedByCustomer).forEach(([key, customerLoans]) => {
    if (customerLoans.length === 1) {
      displayRows.push({ type: 'single', loan: customerLoans[0] });
    } else {
      displayRows.push({ type: 'group', key, loans: customerLoans, expanded: !!expandedCustomers[key] });
    }
  });

  // Admin: Delete loan
  const handleDeleteLoan = async (e, loanId) => {
    if (e) e.stopPropagation();
    if (!window.confirm('Are you sure you want to delete this entire loan and all its payments? This action is logged and cannot be undone.')) return;
    try {
      await api().delete(`/admin/loans/${loanId}`);
      toast.success('Loan deleted');
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.detail || err.message || 'Failed to delete loan');
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

  // Admin: Edit customer
  const openEditCustomer = (e, loan) => {
    if (e) e.stopPropagation();
    setEditingCustomer({ id: loan.customer_id, name: loan.customer_name });
    setEditCustomerForm({
      client_name: loan.customer_name || '',
      id_number: loan.customer_id_number || '',
      cell_phone: loan.customer_cell_phone || '',
      mandate_id: loan.mandate_id || loan.customer_mandate_id || ''
    });
    setEditCustomerOpen(true);
  };

  const handleSaveCustomer = async () => {
    if (!editingCustomer) return;
    try {
      await api().put(`/admin/customers/${editingCustomer.id}`, editCustomerForm);
      toast.success('Customer details updated');
      setEditCustomerOpen(false);
      setEditingCustomer(null);
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.detail || err.message || 'Failed to update customer');
    }
  };

  // Admin: Top up loan
  const openTopUp = (e, loan) => {
    if (e) e.stopPropagation();
    setTopUpLoan(loan);
    setTopUpAmount(loan.principal_amount?.toString() || '');
    setTopUpOpen(true);
  };

  const handleTopUp = async () => {
    if (!topUpLoan) return;
    const newAmount = parseFloat(topUpAmount);
    if (!newAmount || newAmount <= topUpLoan.principal_amount) {
      toast.error(`New amount must be greater than current R${topUpLoan.principal_amount.toFixed(2)}`);
      return;
    }
    if (newAmount > 8000) {
      toast.error('Loan amount cannot exceed R8,000');
      return;
    }
    try {
      await api().post('/loans/top-up', { loan_id: topUpLoan.id, new_principal: newAmount });
      toast.success(`Loan topped up to R${newAmount.toFixed(2)}`);
      setTopUpOpen(false);
      setTopUpLoan(null);
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.detail || err.message || 'Failed to top up loan');
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
          {isAdmin && (
            <button onClick={(e) => openEditCustomer(e, loan)} className="p-0.5 hover:bg-blue-100 rounded" title="Edit customer details">
              <UserCog className="w-3 h-3 text-blue-500" />
            </button>
          )}
        </div>
      </TableCell>
      <TableCell className="font-mono text-sm text-gray-600">
        {canViewFullId ? loan.customer_id_number : loan.customer_id_number_masked}
      </TableCell>
      <TableCell className="text-sm text-gray-600">{loan.customer_cell_phone || '-'}</TableCell>
      <TableCell className="text-sm text-gray-600">{loan.customer_mandate_id || loan.mandate_id || '-'}</TableCell>
      <TableCell className="text-sm text-gray-600">{loan.customer_sassa_end || '-'}</TableCell>
      <TableCell className="font-mono text-gray-900">R {loan.principal_amount?.toLocaleString('en-ZA', {minimumFractionDigits: 2})}</TableCell>
      <TableCell className="text-sm">
        <span className="text-gray-600">{planNames[loan.repayment_plan_code]?.split(' ')[0]}</span>
        <span className="text-gray-400 text-xs ml-1">({loan.repayment_plan_code}x)</span>
      </TableCell>
      <TableCell className="font-mono text-gray-900">R {loan.total_repayable?.toLocaleString('en-ZA', {minimumFractionDigits: 2})}</TableCell>
      <TableCell className={`font-mono font-semibold ${loan.outstanding_balance > 0 ? 'text-red-600' : 'text-green-600'}`}>
        R {loan.outstanding_balance?.toLocaleString('en-ZA', {minimumFractionDigits: 2})}
      </TableCell>
      <TableCell>
        <div className="flex items-center gap-2">
          <Badge className={loan.status === 'paid' ? 'bg-green-100 text-green-700 border-green-200' : 'bg-amber-100 text-amber-700 border-amber-200'}>
            {loan.status === 'paid' ? 'Paid' : 'Open'}
          </Badge>
          {isAdmin && (
            <div className="flex items-center gap-1">
              {loan.status === 'open' && (
                <button onClick={(e) => openTopUp(e, loan)} className="p-1 hover:bg-green-100 rounded" title="Top up loan (Admin)" data-testid={`top-up-btn-${loan.id}`}>
                  <ArrowUpCircle className="w-3.5 h-3.5 text-green-600" />
                </button>
              )}
              <button onClick={(e) => handleDeleteLoan(e, loan.id)} className="p-1 hover:bg-red-100 rounded" title="Delete loan (Admin)" data-testid={`delete-loan-btn-${loan.id}`}>
                <Trash2 className="w-3.5 h-3.5 text-red-500" />
              </button>
            </div>
          )}
        </div>
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
                  <button onClick={(e) => { e.stopPropagation(); setEditingPayment(payment); setEditAmount(payment.amount_due?.toString() || ''); setEditPaymentOpen(true); }} className="p-0.5 hover:bg-gray-200 rounded" title="Edit payment">
                    <Pencil className="w-3 h-3 text-blue-500" />
                  </button>
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
          <p className="text-gray-500 text-sm mt-1">{filteredLoans.length} loans found</p>
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
                    <TableCell colSpan={12} className="text-center py-8 text-gray-500">Loading loans...</TableCell>
                  </TableRow>
                ) : filteredLoans.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={12} className="text-center py-8 text-gray-500">No loans found</TableCell>
                  </TableRow>
                ) : (
                  displayRows.map((row) => {
                    if (row.type === 'single') return renderLoanRow(row.loan, false);
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
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-medium text-gray-900">Customer Details</h3>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-500">Existing customer?</span>
                  <Switch checked={useExistingCustomer} onCheckedChange={setUseExistingCustomer} />
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
                      <SelectItem key={c.id} value={c.id}>{c.client_name} - {c.id_number}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2 space-y-2">
                    <Label>Client Name *</Label>
                    <Input value={loanForm.client_name} onChange={(e) => setLoanForm({...loanForm, client_name: e.target.value})} placeholder="Full name" className="bg-gray-50" data-testid="client-name-input" required={!useExistingCustomer} />
                  </div>
                  <div className="space-y-2">
                    <Label>SA ID Number *</Label>
                    <div className="relative">
                      <Input value={loanForm.id_number} onChange={(e) => setLoanForm({...loanForm, id_number: e.target.value})} placeholder="13-digit ID" maxLength={13} className="bg-gray-50 font-mono pr-16" data-testid="id-number-input" required={!useExistingCustomer} />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400 font-mono">{loanForm.id_number.length}/13</span>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Mandate ID *</Label>
                    <Input value={loanForm.mandate_id} onChange={(e) => setLoanForm({...loanForm, mandate_id: e.target.value})} placeholder="Mandate reference" className="bg-gray-50" data-testid="mandate-id-input" required={!useExistingCustomer} />
                  </div>
                  <div className="col-span-2 space-y-2">
                    <Label>Cell Phone (optional)</Label>
                    <Input type="tel" value={loanForm.cell_phone} onChange={(e) => setLoanForm({...loanForm, cell_phone: e.target.value})} placeholder="0821234567" maxLength={10} className="bg-gray-50" data-testid="cell-phone-input" />
                  </div>
                  <div className="col-span-2 space-y-2">
                    <Label>SASSA End Date (optional)</Label>
                    <Input type="date" value={loanForm.sassa_end_date} onChange={(e) => setLoanForm({...loanForm, sassa_end_date: e.target.value})} className="bg-gray-50" data-testid="sassa-date-input" />
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-4 pt-4 border-t border-gray-200">
              <h3 className="font-medium text-gray-900">Loan Details</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Loan Amount (R) *</Label>
                  <Input type="number" value={loanForm.principal_amount} onChange={(e) => setLoanForm({...loanForm, principal_amount: e.target.value})} placeholder="Min: R400 - Max: R8000" min="400" max="8000" className="bg-gray-50 font-mono" data-testid="loan-amount-input" required />
                  <p className="text-xs text-gray-500">Loan amount must be between R400 and R8000</p>
                </div>
                <div className="space-y-2">
                  <Label>Repayment Plan *</Label>
                  <Select value={loanForm.repayment_plan_code} onValueChange={(v) => setLoanForm({...loanForm, repayment_plan_code: v})}>
                    <SelectTrigger className="bg-gray-50" data-testid="plan-select"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">Monthly (1 payment)</SelectItem>
                      <SelectItem value="2">Fortnightly (2 payments)</SelectItem>
                      <SelectItem value="4">Weekly (4 payments)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

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
                    <div className="font-mono text-gray-900">R {calc.installment.toFixed(2)} x {calc.planCode}</div>
                  </div>
                </div>
              )}
            </div>

            <div className="flex gap-3 pt-4">
              <Button type="button" variant="outline" className="flex-1" onClick={() => setNewLoanOpen(false)}>Cancel</Button>
              <Button type="submit" className="flex-1 bg-red-600 hover:bg-red-700" disabled={formLoading} data-testid="create-loan-submit">
                {formLoading ? 'Creating...' : 'Create Loan'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Admin Edit Payment Dialog */}
      <Dialog open={editPaymentOpen} onOpenChange={setEditPaymentOpen}>
        <DialogContent className="max-w-sm bg-white">
          <DialogHeader>
            <DialogTitle>Edit Payment Amount</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Amount Due (R)</Label>
              <Input type="number" step="0.01" value={editAmount} onChange={(e) => setEditAmount(e.target.value)} data-testid="edit-payment-amount" />
            </div>
            <Button onClick={handleEditPayment} className="w-full bg-blue-600 hover:bg-blue-700 text-white" data-testid="save-payment-edit-btn">Save Changes</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Admin Edit Customer Dialog */}
      <Dialog open={editCustomerOpen} onOpenChange={setEditCustomerOpen}>
        <DialogContent className="max-w-md bg-white">
          <DialogHeader>
            <DialogTitle>Edit Customer Details</DialogTitle>
            <DialogDescription>Update customer information (Admin only)</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Client Name</Label>
              <Input value={editCustomerForm.client_name} onChange={(e) => setEditCustomerForm({...editCustomerForm, client_name: e.target.value})} data-testid="edit-customer-name" />
            </div>
            <div className="space-y-2">
              <Label>ID Number</Label>
              <Input value={editCustomerForm.id_number} onChange={(e) => setEditCustomerForm({...editCustomerForm, id_number: e.target.value})} maxLength={13} className="font-mono" data-testid="edit-customer-id" />
            </div>
            <div className="space-y-2">
              <Label>Cell Phone</Label>
              <Input value={editCustomerForm.cell_phone} onChange={(e) => setEditCustomerForm({...editCustomerForm, cell_phone: e.target.value})} maxLength={10} data-testid="edit-customer-phone" />
            </div>
            <div className="space-y-2">
              <Label>Mandate ID</Label>
              <Input value={editCustomerForm.mandate_id} onChange={(e) => setEditCustomerForm({...editCustomerForm, mandate_id: e.target.value})} data-testid="edit-customer-mandate" />
            </div>
            <Button onClick={handleSaveCustomer} className="w-full bg-blue-600 hover:bg-blue-700 text-white" data-testid="save-customer-edit-btn">Save Changes</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Admin Top Up Loan Dialog */}
      <Dialog open={topUpOpen} onOpenChange={setTopUpOpen}>
        <DialogContent className="max-w-md bg-white">
          <DialogHeader>
            <DialogTitle>Top Up Loan</DialogTitle>
            <DialogDescription>Increase the loan amount for {topUpLoan?.customer_name}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="p-3 bg-gray-50 rounded-lg text-sm space-y-1">
              <div className="flex justify-between"><span className="text-gray-500">Current Loan:</span><span className="font-mono font-medium">R {topUpLoan?.principal_amount?.toFixed(2)}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Total Repayable:</span><span className="font-mono">R {topUpLoan?.total_repayable?.toFixed(2)}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Outstanding:</span><span className="font-mono text-red-600">R {topUpLoan?.outstanding_balance?.toFixed(2)}</span></div>
            </div>
            <div className="space-y-2">
              <Label>New Loan Amount (R)</Label>
              <Input type="number" min={topUpLoan?.principal_amount ? topUpLoan.principal_amount + 1 : 0} max="8000" step="100" value={topUpAmount} onChange={(e) => setTopUpAmount(e.target.value)} placeholder="Enter new amount" className="font-mono" data-testid="top-up-amount" />
              <p className="text-xs text-gray-500">Must be greater than R{topUpLoan?.principal_amount?.toFixed(2)} and max R8,000</p>
            </div>
            {topUpAmount && parseFloat(topUpAmount) > (topUpLoan?.principal_amount || 0) && (
              <div className="p-3 bg-green-50 rounded-lg text-sm space-y-1 border border-green-200">
                <div className="flex justify-between"><span className="text-gray-600">New Principal:</span><span className="font-mono font-medium">R {parseFloat(topUpAmount).toFixed(2)}</span></div>
                <div className="flex justify-between"><span className="text-gray-600">New Total (40% + R12):</span><span className="font-mono font-bold text-green-700">R {((parseFloat(topUpAmount) * 1.4) + 12).toFixed(2)}</span></div>
                <div className="flex justify-between"><span className="text-gray-600">Top-up Difference:</span><span className="font-mono text-blue-600">+R {(parseFloat(topUpAmount) - (topUpLoan?.principal_amount || 0)).toFixed(2)}</span></div>
              </div>
            )}
            <Button onClick={handleTopUp} className="w-full bg-green-600 hover:bg-green-700 text-white" data-testid="confirm-top-up-btn">Confirm Top Up</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
