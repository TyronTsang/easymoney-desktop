import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { AlertTriangle, Clock, Users, Eye } from 'lucide-react';

export default function FraudAlerts() {
  const { api, user } = useAuth();
  const navigate = useNavigate();
  const [loans, setLoans] = useState([]);
  const [loading, setLoading] = useState(true);

  const canViewFullId = ['manager', 'admin'].includes(user?.role);

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

  const quickCloseLoans = loans.filter(l => l.fraud_flags?.includes('QUICK_CLOSE'));
  const duplicateCustomerLoans = loans.filter(l => l.fraud_flags?.includes('DUPLICATE_CUSTOMER'));

  const LoanTable = ({ data, type }) => (
    <div className="rounded-md border border-border overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/50 hover:bg-muted/50">
            <TableHead>Customer</TableHead>
            <TableHead>Principal</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Created</TableHead>
            <TableHead>Created By</TableHead>
            <TableHead></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.length === 0 ? (
            <TableRow>
              <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                No {type} alerts found
              </TableCell>
            </TableRow>
          ) : (
            data.map((loan) => (
              <TableRow 
                key={loan.id}
                className={type === 'quick-close' ? 'fraud-quick-close' : 'fraud-duplicate'}
                data-testid={`fraud-row-${loan.id}`}
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
                <TableCell>
                  {loan.status === 'paid' ? (
                    <Badge className="badge-success">Paid</Badge>
                  ) : (
                    <Badge className="badge-warning">Open</Badge>
                  )}
                </TableCell>
                <TableCell className="text-sm">
                  {new Date(loan.created_at).toLocaleDateString('en-ZA')}
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {loan.created_by_name}
                </TableCell>
                <TableCell>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => navigate(`/loans/${loan.id}`)}
                    data-testid={`view-fraud-loan-${loan.id}`}
                  >
                    <Eye className="w-4 h-4 mr-1" /> View
                  </Button>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-heading font-bold tracking-tight">Fraud Alerts</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Monitor suspicious loan activity
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="border-amber-500/20 bg-amber-500/5" data-testid="quick-close-summary">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-lg bg-amber-500/15 flex items-center justify-center">
                <Clock className="w-6 h-6 text-amber-500" strokeWidth={1.5} />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Quick-Close Alerts</p>
                <p className="text-2xl font-heading font-bold text-amber-500">{quickCloseLoans.length}</p>
                <p className="text-xs text-muted-foreground">Loans paid same day as created</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-purple-500/20 bg-purple-500/5" data-testid="duplicate-summary">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-lg bg-purple-500/15 flex items-center justify-center">
                <Users className="w-6 h-6 text-purple-500" strokeWidth={1.5} />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Duplicate Customer Alerts</p>
                <p className="text-2xl font-heading font-bold text-purple-500">{duplicateCustomerLoans.length}</p>
                <p className="text-xs text-muted-foreground">Customers with multiple loans</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="quick-close" className="w-full">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="quick-close" className="gap-2" data-testid="quick-close-tab">
            <Clock className="w-4 h-4" /> Quick-Close ({quickCloseLoans.length})
          </TabsTrigger>
          <TabsTrigger value="duplicate" className="gap-2" data-testid="duplicate-tab">
            <Users className="w-4 h-4" /> Duplicates ({duplicateCustomerLoans.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="quick-close" className="mt-6">
          <Card className="border-border">
            <CardHeader>
              <CardTitle className="text-lg font-heading flex items-center gap-2">
                <Clock className="w-5 h-5 text-amber-500" strokeWidth={1.5} />
                Quick-Close Loans
              </CardTitle>
              <CardDescription>
                Loans that were created and fully paid on the same day may indicate fraud
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <p className="text-center py-8 text-muted-foreground">Loading...</p>
              ) : (
                <LoanTable data={quickCloseLoans} type="quick-close" />
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="duplicate" className="mt-6">
          <Card className="border-border">
            <CardHeader>
              <CardTitle className="text-lg font-heading flex items-center gap-2">
                <Users className="w-5 h-5 text-purple-500" strokeWidth={1.5} />
                Duplicate Customer Loans
              </CardTitle>
              <CardDescription>
                Customers with multiple open loans may indicate over-lending or fraud
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <p className="text-center py-8 text-muted-foreground">Loading...</p>
              ) : (
                <LoanTable data={duplicateCustomerLoans} type="duplicate" />
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
