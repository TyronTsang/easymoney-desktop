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
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow className="bg-gray-50 hover:bg-gray-50">
            <TableHead className="font-semibold text-gray-700">Customer</TableHead>
            <TableHead className="font-semibold text-gray-700">Principal</TableHead>
            <TableHead className="font-semibold text-gray-700">Status</TableHead>
            <TableHead className="font-semibold text-gray-700">Created</TableHead>
            <TableHead className="font-semibold text-gray-700">Created By</TableHead>
            <TableHead className="font-semibold text-gray-700"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.length === 0 ? (
            <TableRow>
              <TableCell colSpan={6} className="text-center py-12 text-gray-500">
                No {type} alerts found
              </TableCell>
            </TableRow>
          ) : (
            data.map((loan) => (
              <TableRow 
                key={loan.id}
                className={`table-row-hover ${type === 'quick-close' ? 'fraud-quick-close' : 'fraud-duplicate'}`}
                data-testid={`fraud-row-${loan.id}`}
              >
                <TableCell>
                  <div>
                    <p className="font-medium text-gray-900">{loan.customer_name}</p>
                    <p className="text-xs font-mono text-gray-500">
                      {canViewFullId ? loan.customer_id_number : loan.customer_id_number_masked}
                    </p>
                  </div>
                </TableCell>
                <TableCell className="font-mono text-gray-900">R{loan.principal_amount.toFixed(2)}</TableCell>
                <TableCell>
                  {loan.status === 'paid' ? (
                    <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200">Paid</Badge>
                  ) : (
                    <Badge className="bg-amber-100 text-amber-700 border-amber-200">Open</Badge>
                  )}
                </TableCell>
                <TableCell className="text-sm text-gray-600">
                  {new Date(loan.created_at).toLocaleDateString('en-ZA')}
                </TableCell>
                <TableCell className="text-sm text-gray-600">
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
      <div>
        <h1 className="text-2xl font-heading font-bold text-gray-900">Fraud Alerts</h1>
        <p className="text-gray-500 text-sm mt-1">Monitor suspicious loan activity</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="border-amber-200 bg-amber-50 shadow-sm" data-testid="quick-close-summary">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-lg bg-amber-100 flex items-center justify-center">
                <Clock className="w-6 h-6 text-amber-600" strokeWidth={1.5} />
              </div>
              <div>
                <p className="text-sm text-amber-700">Quick-Close Alerts</p>
                <p className="text-2xl font-heading font-bold text-amber-700">{quickCloseLoans.length}</p>
                <p className="text-xs text-amber-600">Loans paid same day as created</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-purple-200 bg-purple-50 shadow-sm" data-testid="duplicate-summary">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-lg bg-purple-100 flex items-center justify-center">
                <Users className="w-6 h-6 text-purple-600" strokeWidth={1.5} />
              </div>
              <div>
                <p className="text-sm text-purple-700">Duplicate Customer Alerts</p>
                <p className="text-2xl font-heading font-bold text-purple-700">{duplicateCustomerLoans.length}</p>
                <p className="text-xs text-purple-600">Customers with multiple loans</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="quick-close" className="w-full">
        <TabsList className="grid w-full max-w-md grid-cols-2 bg-gray-100">
          <TabsTrigger value="quick-close" className="gap-2 data-[state=active]:bg-white" data-testid="quick-close-tab">
            <Clock className="w-4 h-4" /> Quick-Close ({quickCloseLoans.length})
          </TabsTrigger>
          <TabsTrigger value="duplicate" className="gap-2 data-[state=active]:bg-white" data-testid="duplicate-tab">
            <Users className="w-4 h-4" /> Duplicates ({duplicateCustomerLoans.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="quick-close" className="mt-6">
          <Card className="border-gray-200 shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg font-heading flex items-center gap-2 text-gray-900">
                <Clock className="w-5 h-5 text-amber-500" strokeWidth={1.5} />
                Quick-Close Loans
              </CardTitle>
              <CardDescription>
                Loans that were created and fully paid on the same day may indicate fraud
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              {loading ? (
                <p className="text-center py-12 text-gray-500">Loading...</p>
              ) : (
                <LoanTable data={quickCloseLoans} type="quick-close" />
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="duplicate" className="mt-6">
          <Card className="border-gray-200 shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg font-heading flex items-center gap-2 text-gray-900">
                <Users className="w-5 h-5 text-purple-500" strokeWidth={1.5} />
                Duplicate Customer Loans
              </CardTitle>
              <CardDescription>
                Customers with multiple open loans may indicate over-lending or fraud
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              {loading ? (
                <p className="text-center py-12 text-gray-500">Loading...</p>
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
