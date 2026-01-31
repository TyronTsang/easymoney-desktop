import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '../components/ui/alert-dialog';
import { CreditCard, User, CalendarDays, Banknote, Clock, AlertTriangle, CheckCircle, ArrowLeft, Lock } from 'lucide-react';

export default function LoanDetails() {
  const { loanId } = useParams();
  const { api, user } = useAuth();
  const navigate = useNavigate();
  const [loan, setLoan] = useState(null);
  const [loading, setLoading] = useState(true);
  const [markingPayment, setMarkingPayment] = useState(null);
  const canViewFullId = ['manager', 'admin'].includes(user?.role);
  const planNames = { 1: 'Monthly', 2: 'Fortnightly', 4: 'Weekly' };

  const fetchLoan = async () => {
    try {
      const res = await api().get(`/loans/${loanId}`);
      setLoan(res.data);
    } catch (err) {
      toast.error('Failed to load loan details');
      navigate('/loans');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchLoan(); }, [loanId, api]);

  const handleMarkPaid = async (installmentNumber) => {
    setMarkingPayment(installmentNumber);
    try {
      await api().post('/payments/mark-paid', { loan_id: loanId, installment_number: installmentNumber });
      toast.success(`Payment ${installmentNumber} marked as paid`);
      fetchLoan();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to mark payment');
    } finally {
      setMarkingPayment(null);
    }
  };

  if (loading) return <div className="flex items-center justify-center h-64"><p className="text-muted-foreground">Loading loan details...</p></div>;
  if (!loan) return null;

  const paidPayments = loan.payments?.filter(p => p.is_paid).length || 0;
  const totalPayments = loan.payments?.length || 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/loans')} data-testid="back-btn"><ArrowLeft className="w-4 h-4" /></Button>
          <div>
            <h1 className="text-3xl font-heading font-bold tracking-tight">Loan Details</h1>
            <p className="text-muted-foreground text-sm mt-1 font-mono">{loan.id}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {loan.fields_locked && <span className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-md bg-secondary text-muted-foreground"><Lock className="w-3 h-3" /> Fields Locked</span>}
          {loan.status === 'open' ? <Badge className="badge-warning text-sm">Open</Badge> : <Badge className="badge-success text-sm">Paid</Badge>}
        </div>
      </div>

      {loan.fraud_flags?.length > 0 && (
        <div className="flex gap-2 flex-wrap">
          {loan.fraud_flags.includes('QUICK_CLOSE') && <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-amber-500/10 border border-amber-500/20 animate-shake"><Clock className="w-4 h-4 text-amber-500" /><span className="text-sm text-amber-500 font-medium">Quick-Close Alert: Loan paid same day as created</span></div>}
          {loan.fraud_flags.includes('DUPLICATE_CUSTOMER') && <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-purple-500/10 border border-purple-500/20 animate-shake"><AlertTriangle className="w-4 h-4 text-purple-500" /><span className="text-sm text-purple-500 font-medium">Duplicate Customer: Multiple loans for this customer</span></div>}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="border-border" data-testid="customer-info-card">
          <CardHeader className="pb-3"><CardTitle className="text-lg font-heading flex items-center gap-2"><User className="w-5 h-5 text-red-500" strokeWidth={1.5} />Customer</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div><p className="text-sm text-muted-foreground">Client Name</p><p className="font-medium">{loan.customer_name}</p></div>
            <div><p className="text-sm text-muted-foreground">SA ID Number</p><p className="font-mono text-sm">{canViewFullId ? loan.customer_id_number : loan.customer_id_number_masked}</p></div>
            <div><p className="text-sm text-muted-foreground">Mandate ID</p><p className="font-mono text-sm">{loan.mandate_id}</p></div>
          </CardContent>
        </Card>

        <Card className="border-border" data-testid="loan-summary-card">
          <CardHeader className="pb-3"><CardTitle className="text-lg font-heading flex items-center gap-2"><CreditCard className="w-5 h-5 text-red-500" strokeWidth={1.5} />Loan Summary</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div><p className="text-sm text-muted-foreground">Principal</p><p className="font-mono font-medium">R{loan.principal_amount.toFixed(2)}</p></div>
              <div><p className="text-sm text-muted-foreground">Interest (40%)</p><p className="font-mono font-medium">R{(loan.principal_amount * 0.4).toFixed(2)}</p></div>
              <div><p className="text-sm text-muted-foreground">Service Fee</p><p className="font-mono font-medium">R{loan.service_fee.toFixed(2)}</p></div>
              <div><p className="text-sm text-muted-foreground">Total Repayable</p><p className="font-mono font-medium text-red-500">R{loan.total_repayable.toFixed(2)}</p></div>
            </div>
            <div className="pt-2 border-t border-border"><p className="text-sm text-muted-foreground">Outstanding Balance</p><p className="font-mono text-xl font-bold text-amber-500">R{loan.outstanding_balance.toFixed(2)}</p></div>
          </CardContent>
        </Card>

        <Card className="border-border" data-testid="loan-info-card">
          <CardHeader className="pb-3"><CardTitle className="text-lg font-heading flex items-center gap-2"><CalendarDays className="w-5 h-5 text-red-500" strokeWidth={1.5} />Loan Info</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div><p className="text-sm text-muted-foreground">Loan Date</p><p className="font-medium">{new Date(loan.loan_date).toLocaleDateString('en-ZA', { dateStyle: 'long' })}</p></div>
            <div><p className="text-sm text-muted-foreground">Repayment Plan</p><p className="font-medium">{planNames[loan.repayment_plan_code]}</p></div>
            <div><p className="text-sm text-muted-foreground">Created By</p><p className="font-medium">{loan.created_by_name}</p></div>
            <div><p className="text-sm text-muted-foreground">Progress</p><p className="font-medium">{paidPayments} of {totalPayments} payments</p></div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-border" data-testid="payment-schedule-card">
        <CardHeader><CardTitle className="text-lg font-heading flex items-center gap-2"><Banknote className="w-5 h-5 text-red-500" strokeWidth={1.5} />Payment Schedule</CardTitle><CardDescription>Mark payments as they are received. Paid payments cannot be reversed.</CardDescription></CardHeader>
        <CardContent>
          <div className="rounded-md border border-border overflow-hidden">
            <Table>
              <TableHeader><TableRow className="bg-muted/50 hover:bg-muted/50"><TableHead>#</TableHead><TableHead>Amount Due</TableHead><TableHead>Due Date</TableHead><TableHead>Status</TableHead><TableHead>Paid By</TableHead><TableHead>Paid At</TableHead><TableHead></TableHead></TableRow></TableHeader>
              <TableBody>
                {loan.payments?.sort((a, b) => a.installment_number - b.installment_number).map((payment) => (
                  <TableRow key={payment.id} data-testid={`payment-row-${payment.installment_number}`}>
                    <TableCell className="font-mono">{payment.installment_number}</TableCell>
                    <TableCell className="font-mono font-medium">R{payment.amount_due.toFixed(2)}</TableCell>
                    <TableCell className="text-sm">{new Date(payment.due_date).toLocaleDateString('en-ZA')}</TableCell>
                    <TableCell>{payment.is_paid ? <Badge className="badge-success gap-1"><CheckCircle className="w-3 h-3" /> Paid</Badge> : <Badge className="badge-warning">Pending</Badge>}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{payment.paid_by_name || '-'}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{payment.paid_at ? new Date(payment.paid_at).toLocaleString('en-ZA') : '-'}</TableCell>
                    <TableCell>
                      {!payment.is_paid && (
                        <AlertDialog>
                          <AlertDialogTrigger asChild><Button size="sm" className="gap-1 bg-red-600 hover:bg-red-700" disabled={markingPayment === payment.installment_number} data-testid={`mark-paid-btn-${payment.installment_number}`}><CheckCircle className="w-3 h-3" />Mark Paid</Button></AlertDialogTrigger>
                          <AlertDialogContent className="bg-card border-border"><AlertDialogHeader><AlertDialogTitle>Confirm Payment</AlertDialogTitle><AlertDialogDescription>Are you sure you want to mark installment #{payment.installment_number} as paid?<br /><br /><strong className="text-amber-500">This action cannot be undone.</strong></AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={() => handleMarkPaid(payment.installment_number)} className="bg-red-600 hover:bg-red-700" data-testid={`confirm-mark-paid-${payment.installment_number}`}>Confirm Payment</AlertDialogAction></AlertDialogFooter></AlertDialogContent>
                        </AlertDialog>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
