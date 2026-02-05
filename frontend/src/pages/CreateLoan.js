import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import { Calendar } from '../components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '../components/ui/popover';
import { format } from 'date-fns';
import { CreditCard, User, CalendarIcon, Calculator, ArrowRight, Check } from 'lucide-react';

export default function CreateLoan() {
  const { api } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    customer_id: '',
    principal_amount: '',
    repayment_plan_code: '',
    loan_date: new Date()
  });
  const [calculation, setCalculation] = useState(null);

  useEffect(() => {
    const fetchCustomers = async () => {
      try {
        const res = await api().get('/customers');
        setCustomers(res.data);
      } catch (err) {
        toast.error('Failed to load customers');
      }
    };
    fetchCustomers();
  }, [api]);

  useEffect(() => {
    if (formData.principal_amount && formData.repayment_plan_code) {
      const principal = parseFloat(formData.principal_amount);
      const plan = parseInt(formData.repayment_plan_code);
      if (principal > 0 && plan > 0) {
        const total = (principal * 1.40) + 12;
        const installment = total / plan;
        setCalculation({
          principal,
          interest: principal * 0.40,
          serviceFee: 12,
          total,
          installments: plan,
          installmentAmount: installment
        });
      }
    } else {
      setCalculation(null);
    }
  }, [formData.principal_amount, formData.repayment_plan_code]);

  const handleSubmit = async () => {
    setLoading(true);
    try {
      const payload = {
        customer_id: formData.customer_id,
        principal_amount: parseFloat(formData.principal_amount),
        repayment_plan_code: parseInt(formData.repayment_plan_code),
        loan_date: formData.loan_date.toISOString()
      };
      const res = await api().post('/loans', payload);
      toast.success('Loan created successfully');
      navigate(`/loans/${res.data.id}`);
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to create loan');
    } finally {
      setLoading(false);
    }
  };

  const selectedCustomer = customers.find(c => c.id === formData.customer_id);
  const planNames = { '1': 'Monthly (1 payment)', '2': 'Fortnightly (2 payments)', '4': 'Weekly (4 payments)' };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-heading font-bold tracking-tight">New Loan</h1>
        <p className="text-muted-foreground text-sm mt-1">Create a new loan in 3 simple steps</p>
      </div>

      <div className="flex items-center gap-2">
        {[1, 2, 3].map((s) => (
          <div key={s} className="flex items-center">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
              step >= s ? 'bg-red-500 text-white' : 'bg-secondary text-muted-foreground'
            }`}>
              {step > s ? <Check className="w-4 h-4" /> : s}
            </div>
            {s < 3 && <div className={`w-16 h-0.5 ${step > s ? 'bg-red-500' : 'bg-secondary'}`} />}
          </div>
        ))}
      </div>

      {step === 1 && (
        <Card className="border-border" data-testid="step-1-card">
          <CardHeader>
            <CardTitle className="font-heading flex items-center gap-2">
              <User className="w-5 h-5 text-red-500" strokeWidth={1.5} />
              Step 1: Select Customer
            </CardTitle>
            <CardDescription>Choose an existing customer for this loan</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Customer</Label>
              <Select value={formData.customer_id} onValueChange={(v) => setFormData({...formData, customer_id: v})}>
                <SelectTrigger className="bg-secondary" data-testid="customer-select">
                  <SelectValue placeholder="Select a customer" />
                </SelectTrigger>
                <SelectContent>
                  {customers.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.client_name} - {c.id_number_masked}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedCustomer && (
              <div className="p-4 rounded-lg bg-secondary/50 border border-border">
                <p className="text-sm text-muted-foreground mb-2">Selected Customer</p>
                <p className="font-medium">{selectedCustomer.client_name}</p>
                <p className="text-sm font-mono text-muted-foreground">{selectedCustomer.id_number_masked}</p>
                <p className="text-sm text-muted-foreground">Mandate: {selectedCustomer.mandate_id}</p>
              </div>
            )}

            <div className="flex justify-end pt-4">
              <Button 
                onClick={() => setStep(2)} 
                disabled={!formData.customer_id}
                className="gap-2 bg-red-600 hover:bg-red-700"
                data-testid="step-1-next-btn"
              >
                Next <ArrowRight className="w-4 h-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {step === 2 && (
        <Card className="border-border" data-testid="step-2-card">
          <CardHeader>
            <CardTitle className="font-heading flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-red-500" strokeWidth={1.5} />
              Step 2: Loan Details
            </CardTitle>
            <CardDescription>Enter the loan amount and repayment plan</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="principal">Principal Amount (R)</Label>
                <Input
                  id="principal"
                  type="number"
                  placeholder="e.g., 1000"
                  value={formData.principal_amount}
                  onChange={(e) => setFormData({...formData, principal_amount: e.target.value})}
                  className="bg-secondary font-mono"
                  min="1"
                  data-testid="principal-input"
                />
              </div>
              <div className="space-y-2">
                <Label>Repayment Plan</Label>
                <Select value={formData.repayment_plan_code} onValueChange={(v) => setFormData({...formData, repayment_plan_code: v})}>
                  <SelectTrigger className="bg-secondary" data-testid="plan-select">
                    <SelectValue placeholder="Select plan" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">Monthly (1 payment)</SelectItem>
                    <SelectItem value="2">Fortnightly (2 payments)</SelectItem>
                    <SelectItem value="4">Weekly (4 payments)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Loan Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start text-left font-normal bg-secondary" data-testid="date-picker-btn">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {format(formData.loan_date, 'PPP')}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={formData.loan_date}
                    onSelect={(date) => date && setFormData({...formData, loan_date: date})}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="flex justify-between pt-4">
              <Button variant="secondary" onClick={() => setStep(1)} data-testid="step-2-back-btn">Back</Button>
              <Button 
                onClick={() => setStep(3)} 
                disabled={!formData.principal_amount || !formData.repayment_plan_code}
                className="gap-2 bg-red-600 hover:bg-red-700"
                data-testid="step-2-next-btn"
              >
                Next <ArrowRight className="w-4 h-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {step === 3 && (
        <Card className="border-border" data-testid="step-3-card">
          <CardHeader>
            <CardTitle className="font-heading flex items-center gap-2">
              <Calculator className="w-5 h-5 text-red-500" strokeWidth={1.5} />
              Step 3: Review & Confirm
            </CardTitle>
            <CardDescription>Verify the loan details before creating</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="p-4 rounded-lg bg-secondary/50 border border-border">
              <p className="text-sm text-muted-foreground mb-2">Customer</p>
              <p className="font-medium">{selectedCustomer?.client_name}</p>
              <p className="text-sm font-mono text-muted-foreground">{selectedCustomer?.id_number_masked}</p>
            </div>

            {calculation && (
              <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/20">
                <p className="text-sm text-red-500 mb-3 font-medium">Loan Calculation</p>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Principal Amount</span>
                    <span className="font-mono">R{calculation.principal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Fees & Charges</span>
                    <span className="font-mono">R{(calculation.interest + calculation.serviceFee).toFixed(2)}</span>
                  </div>
                  <div className="border-t border-red-500/20 pt-2 mt-2">
                    <div className="flex justify-between font-medium">
                      <span>Total Repayable</span>
                      <span className="font-mono text-red-500">R{calculation.total.toFixed(2)}</span>
                    </div>
                  </div>
                  <div className="flex justify-between text-muted-foreground">
                    <span>Repayment Plan</span>
                    <span>{planNames[formData.repayment_plan_code]}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Per Installment</span>
                    <span className="font-mono font-medium">R{calculation.installmentAmount.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-muted-foreground">
                    <span>Loan Date</span>
                    <span>{format(formData.loan_date, 'PPP')}</span>
                  </div>
                </div>
              </div>
            )}

            <div className="flex justify-between pt-4">
              <Button variant="secondary" onClick={() => setStep(2)} data-testid="step-3-back-btn">Back</Button>
              <Button 
                onClick={handleSubmit} 
                disabled={loading}
                className="gap-2 bg-red-600 hover:bg-red-700 glow-primary"
                data-testid="create-loan-btn"
              >
                {loading ? 'Creating...' : 'Create Loan'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
