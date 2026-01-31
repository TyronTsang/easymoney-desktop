import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '../components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../components/ui/table';
import { Users, Plus, Search, Eye, EyeOff } from 'lucide-react';

export default function Customers() {
  const { api, user } = useAuth();
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    client_name: '',
    id_number: '',
    mandate_id: ''
  });
  const [formLoading, setFormLoading] = useState(false);

  const canViewFullId = ['manager', 'admin'].includes(user?.role);

  const fetchCustomers = async () => {
    try {
      const res = await api().get('/customers');
      setCustomers(res.data);
    } catch (err) {
      toast.error('Failed to load customers');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomers();
  }, [api]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormLoading(true);
    try {
      await api().post('/customers', formData);
      toast.success('Customer created successfully');
      setDialogOpen(false);
      setFormData({ client_name: '', id_number: '', mandate_id: '' });
      fetchCustomers();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to create customer');
    } finally {
      setFormLoading(false);
    }
  };

  const filteredCustomers = customers.filter(c => 
    c.client_name.toLowerCase().includes(search.toLowerCase()) ||
    c.mandate_id.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-heading font-bold tracking-tight">Customers</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Manage customer records
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2" data-testid="add-customer-btn">
              <Plus className="w-4 h-4" />
              Add Customer
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-card border-border">
            <DialogHeader>
              <DialogTitle className="font-heading">New Customer</DialogTitle>
              <DialogDescription>
                Enter the customer details. SA ID will be validated.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="client_name">Client Name</Label>
                <Input
                  id="client_name"
                  placeholder="Full name"
                  value={formData.client_name}
                  onChange={(e) => setFormData({...formData, client_name: e.target.value})}
                  className="bg-secondary"
                  data-testid="customer-name-input"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="id_number">SA ID Number</Label>
                <Input
                  id="id_number"
                  placeholder="13-digit SA ID"
                  value={formData.id_number}
                  onChange={(e) => setFormData({...formData, id_number: e.target.value.replace(/\D/g, '').slice(0, 13)})}
                  className="bg-secondary font-mono"
                  maxLength={13}
                  data-testid="customer-id-input"
                  required
                />
                <p className="text-xs text-muted-foreground">
                  {formData.id_number.length}/13 digits
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="mandate_id">Mandate ID</Label>
                <Input
                  id="mandate_id"
                  placeholder="Bank mandate reference"
                  value={formData.mandate_id}
                  onChange={(e) => setFormData({...formData, mandate_id: e.target.value})}
                  className="bg-secondary"
                  data-testid="customer-mandate-input"
                  required
                />
              </div>
              <div className="flex gap-2 pt-4">
                <Button type="button" variant="secondary" onClick={() => setDialogOpen(false)} className="flex-1">
                  Cancel
                </Button>
                <Button type="submit" disabled={formLoading} className="flex-1" data-testid="create-customer-btn">
                  {formLoading ? 'Creating...' : 'Create Customer'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search by name or mandate ID..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10 bg-secondary"
          data-testid="customer-search-input"
        />
      </div>

      {/* Table */}
      <Card className="border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg font-heading flex items-center gap-2">
            <Users className="w-5 h-5 text-emerald-500" strokeWidth={1.5} />
            Customer List
            <span className="text-sm font-normal text-muted-foreground ml-2">
              ({filteredCustomers.length} records)
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border border-border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50 hover:bg-muted/50">
                  <TableHead>Client Name</TableHead>
                  <TableHead>
                    <div className="flex items-center gap-1">
                      SA ID Number
                      {canViewFullId ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                    </div>
                  </TableHead>
                  <TableHead>Mandate ID</TableHead>
                  <TableHead>Created By</TableHead>
                  <TableHead>Created At</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                      Loading customers...
                    </TableCell>
                  </TableRow>
                ) : filteredCustomers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                      No customers found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredCustomers.map((customer) => (
                    <TableRow key={customer.id} data-testid={`customer-row-${customer.id}`}>
                      <TableCell className="font-medium">{customer.client_name}</TableCell>
                      <TableCell className="font-mono text-sm">
                        {canViewFullId ? customer.id_number : customer.id_number_masked}
                      </TableCell>
                      <TableCell className="font-mono text-sm">{customer.mandate_id}</TableCell>
                      <TableCell className="text-muted-foreground text-sm">{customer.created_by_name}</TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {new Date(customer.created_at).toLocaleDateString('en-ZA')}
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
