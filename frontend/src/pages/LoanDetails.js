import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
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
import { 
  CreditCard, 
  User, 
  CalendarDays, 
  Banknote, 
  Clock, 
  AlertTriangle,
  CheckCircle,
  ArrowLeft,
  Lock
} from 'lucide-react';

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

  useEffect(() => {
    fetchLoan();
  }, [loanId, api]);

  const handleMarkPaid = async (installmentNumber) => {
    setMarkingPayment(installmentNumber);
    try {
      await api().post('/payments/mark-paid', {
        loan_id: loanId,
        installment_number: installmentNumber
      });
      toast.success(`Payment ${installmentNumber} marked as paid`);
      fetchLoan();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to mark payment');
    } finally {
      setMarkingPayment(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-500">Loading loan details...</p>
      </div>
    );
  }

  if (!loan) return null;

  const paidPayments = loan.payments?.filter(p => p.is_paid).length || 0;
  const totalPayments = loan.payments?.length || 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/loans')} data-testid="back-btn">
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-heading font-bold text-gray-900">Loan Details</h1>
            <p className="text-gray-500 text-sm mt-1 font-mono">{loan.id}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {loan.fields_locked && (
            <span className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-md bg-gray-100 text-gray-600">
              <Lock className="w-3 h-3" /> Fields Locked
            </span>
          )}
          {loan.status === 'open' ? (
            <Badge className="bg-amber-100 text-amber-700 border-amber-200">Open</Badge>
          ) : (
            <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200">Paid</Badge>
          )}
        </div>
      </div>

      {/* Fraud Alerts */}
      {loan.fraud_flags?.length > 0 && (
        <div className="flex gap-2 flex-wrap">
          {loan.fraud_flags.includes('QUICK_CLOSE') && (
            <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-amber-50 border border-amber-200">
              <Clock className="w-4 h-4 text-amber-600" />
              <span className="text-sm text-amber-700 font-medium">Quick-Close Alert: Loan paid same day as created</span>
            </div>
          )}
          {loan.fraud_flags.includes('DUPLICATE_CUSTOMER') && (
            <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-purple-50 border border-purple-200">
              <AlertTriangle className="w-4 h-4 text-purple-600" />
              <span className="text-sm text-purple-700 font-medium">Duplicate Customer: Multiple loans for this customer</span>
            </div>
          )}
        </div>
      )}

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Customer Info */}
        <Card className="border-gray-200 shadow-sm" data-testid="customer-info-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg font-heading flex items-center gap-2 text-gray-900">
              <User className="w-5 h-5 text-red-600" strokeWidth={1.5} />
              Customer
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <p className="text-sm text-gray-500">Client Name</p>
              <p className="font-medium text-gray-900">{loan.customer_name}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">SA ID Number</p>
              <p className="font-mono text-sm text-gray-700">{canViewFullId ? loan.customer_id_number : loan.customer_id_number_masked}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Mandate ID</p>
              <p className="font-mono text-sm text-gray-700">{loan.mandate_id}</p>
            </div>
          </CardContent>
        </Card>

        {/* Loan Summary */}
        <Card className="border-gray-200 shadow-sm" data-testid="loan-summary-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg font-heading flex items-center gap-2 text-gray-900">
              <CreditCard className="w-5 h-5 text-red-600" strokeWidth={1.5} />
              Loan Summary
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-sm text-gray-500">Principal</p>
                <p className="font-mono font-medium text-gray-900">R{loan.principal_amount.toFixed(2)}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Interest (40%)</p>
                <p className="font-mono font-medium text-gray-900">R{(loan.principal_amount * 0.4).toFixed(2)}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Service Fee</p>
                <p className="font-mono font-medium text-gray-900">R{loan.service_fee.toFixed(2)}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Total Repayable</p>
                <p className="font-mono font-medium text-red-600">R{loan.total_repayable.toFixed(2)}</p>
              </div>
            </div>
            <div className="pt-2 border-t border-gray-200">
              <p className="text-sm text-gray-500">Outstanding Balance</p>
              <p className="font-mono text-xl font-bold text-amber-600">R{loan.outstanding_balance.toFixed(2)}</p>
            </div>
          </CardContent>
        </Card>

        {/* Loan Info */}
        <Card className="border-gray-200 shadow-sm" data-testid="loan-info-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg font-heading flex items-center gap-2 text-gray-900">
              <CalendarDays className="w-5 h-5 text-red-600" strokeWidth={1.5} />
              Loan Info
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <p className="text-sm text-gray-500">Loan Date</p>
              <p className="font-medium text-gray-900">{new Date(loan.loan_date).toLocaleDateString('en-ZA', { dateStyle: 'long' })}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Repayment Plan</p>
              <p className="font-medium text-gray-900">{planNames[loan.repayment_plan_code]}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Created By</p>
              <p className="font-medium text-gray-900">{loan.created_by_name}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Progress</p>
              <p className="font-medium text-gray-900">{paidPayments} of {totalPayments} payments</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Payment Schedule */}
      <Card className="border-gray-200 shadow-sm" data-testid="payment-schedule-card">
        <CardHeader>
          <CardTitle className="text-lg font-heading flex items-center gap-2 text-gray-900">
            <Banknote className="w-5 h-5 text-red-600" strokeWidth={1.5} />
            Payment Schedule
          </CardTitle>
          <CardDescription>
            Mark payments as they are received. Paid payments cannot be reversed.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50 hover:bg-gray-50">
                  <TableHead className="font-semibold text-gray-700">#</TableHead>
                  <TableHead className="font-semibold text-gray-700">Amount Due</TableHead>
                  <TableHead className="font-semibold text-gray-700">Due Date</TableHead>
                  <TableHead className="font-semibold text-gray-700">Status</TableHead>
                  <TableHead className="font-semibold text-gray-700">Paid By</TableHead>
                  <TableHead className="font-semibold text-gray-700">Paid At</TableHead>
                  <TableHead className="font-semibold text-gray-700"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loan.payments?.sort((a, b) => a.installment_number - b.installment_number).map((payment) => (
                  <TableRow key={payment.id} className="table-row-hover" data-testid={`payment-row-${payment.installment_number}`}>
                    <TableCell className="font-mono text-gray-900">{payment.installment_number}</TableCell>
                    <TableCell className="font-mono font-medium text-gray-900">R{payment.amount_due.toFixed(2)}</TableCell>
                    <TableCell className="text-sm text-gray-700">
                      {new Date(payment.due_date).toLocaleDateString('en-ZA')}
                    </TableCell>
                    <TableCell>
                      {payment.is_paid ? (
                        <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 gap-1">
                          <CheckCircle className="w-3 h-3" /> Paid
                        </Badge>
                      ) : (
                        <Badge className="bg-amber-100 text-amber-700 border-amber-200">Pending</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-gray-600">
                      {payment.paid_by_name || '-'}
                    </TableCell>
                    <TableCell className="text-sm text-gray-600">
                      {payment.paid_at ? new Date(payment.paid_at).toLocaleString('en-ZA') : '-'}
                    </TableCell>
                    <TableCell>
                      {!payment.is_paid && (
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button 
                              size="sm" 
                              className="bg-red-600 hover:bg-red-700 gap-1"
                              disabled={markingPayment === payment.installment_number}
                              data-testid={`mark-paid-btn-${payment.installment_number}`}
                            >
                              <CheckCircle className="w-3 h-3" />
                              Mark Paid
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Confirm Payment</AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure you want to mark installment #{payment.installment_number} as paid?
                                <br /><br />
                                <strong className="text-amber-600">This action cannot be undone.</strong>
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleMarkPaid(payment.installment_number)}
                                className="bg-red-600 hover:bg-red-700"
                                data-testid={`confirm-mark-paid-${payment.installment_number}`}
                              >
                                Confirm Payment
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
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
