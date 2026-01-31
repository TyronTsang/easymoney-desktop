import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '../components/ui/dialog';
import { ScrollArea } from '../components/ui/scroll-area';
import { ScrollText, Search, Eye, Filter } from 'lucide-react';

export default function AuditLogs() {
  const { api } = useAuth();
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [entityFilter, setEntityFilter] = useState('all');
  const [selectedLog, setSelectedLog] = useState(null);

  useEffect(() => {
    const fetchLogs = async () => {
      try {
        const res = await api().get('/audit-logs', { params: { limit: 500 } });
        setLogs(res.data);
      } catch (err) {
        toast.error('Failed to load audit logs');
      } finally {
        setLoading(false);
      }
    };
    fetchLogs();
  }, [api]);

  const filteredLogs = logs.filter(log => {
    const matchesSearch = log.actor_name.toLowerCase().includes(search.toLowerCase()) ||
      log.entity_id.toLowerCase().includes(search.toLowerCase()) ||
      log.action.toLowerCase().includes(search.toLowerCase());
    const matchesEntity = entityFilter === 'all' || log.entity_type === entityFilter;
    return matchesSearch && matchesEntity;
  });

  const getActionBadge = (action) => {
    switch (action) {
      case 'create': return <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200">Create</Badge>;
      case 'update': return <Badge className="bg-blue-100 text-blue-700 border-blue-200">Update</Badge>;
      case 'mark_paid': return <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200">Mark Paid</Badge>;
      case 'login': return <Badge className="bg-gray-100 text-gray-700 border-gray-200">Login</Badge>;
      case 'archive': return <Badge className="bg-red-100 text-red-700 border-red-200">Archive</Badge>;
      case 'field_override': return <Badge className="bg-amber-100 text-amber-700 border-amber-200">Override</Badge>;
      case 'export_data': return <Badge className="bg-purple-100 text-purple-700 border-purple-200">Export</Badge>;
      default: return <Badge className="bg-gray-100 text-gray-700 border-gray-200">{action}</Badge>;
    }
  };

  const getEntityBadge = (entity) => {
    switch (entity) {
      case 'loan': return <Badge variant="outline" className="border-red-300 text-red-600">Loan</Badge>;
      case 'customer': return <Badge variant="outline" className="border-blue-300 text-blue-600">Customer</Badge>;
      case 'payment': return <Badge variant="outline" className="border-amber-300 text-amber-600">Payment</Badge>;
      case 'user': return <Badge variant="outline" className="border-purple-300 text-purple-600">User</Badge>;
      case 'settings': return <Badge variant="outline" className="border-gray-300 text-gray-600">Settings</Badge>;
      case 'export': return <Badge variant="outline" className="border-gray-300 text-gray-600">Export</Badge>;
      default: return <Badge variant="outline">{entity}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-heading font-bold text-gray-900">Audit Logs</h1>
        <p className="text-gray-500 text-sm mt-1">Immutable record of all system activities</p>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            placeholder="Search by actor, entity ID, or action..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 bg-white border-gray-200"
            data-testid="audit-search-input"
          />
        </div>
        <Select value={entityFilter} onValueChange={setEntityFilter}>
          <SelectTrigger className="w-[180px] bg-white border-gray-200" data-testid="entity-filter">
            <Filter className="w-4 h-4 mr-2" />
            <SelectValue placeholder="Filter by entity" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Entities</SelectItem>
            <SelectItem value="loan">Loans</SelectItem>
            <SelectItem value="customer">Customers</SelectItem>
            <SelectItem value="payment">Payments</SelectItem>
            <SelectItem value="user">Users</SelectItem>
            <SelectItem value="settings">Settings</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <Card className="border-gray-200 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg font-heading flex items-center gap-2 text-gray-900">
            <ScrollText className="w-5 h-5 text-red-600" strokeWidth={1.5} />
            Activity Log
            <span className="text-sm font-normal text-gray-500 ml-2">
              ({filteredLogs.length} entries)
            </span>
          </CardTitle>
          <CardDescription>
            All actions are logged and cannot be modified or deleted
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50 hover:bg-gray-50">
                  <TableHead className="font-semibold text-gray-700">Timestamp</TableHead>
                  <TableHead className="font-semibold text-gray-700">Actor</TableHead>
                  <TableHead className="font-semibold text-gray-700">Entity</TableHead>
                  <TableHead className="font-semibold text-gray-700">Action</TableHead>
                  <TableHead className="font-semibold text-gray-700">Entity ID</TableHead>
                  <TableHead className="font-semibold text-gray-700"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-12 text-gray-500">
                      Loading audit logs...
                    </TableCell>
                  </TableRow>
                ) : filteredLogs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-12 text-gray-500">
                      No audit logs found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredLogs.map((log) => (
                    <TableRow key={log.id} className="table-row-hover" data-testid={`audit-row-${log.id}`}>
                      <TableCell className="text-sm">
                        <div>
                          <p className="text-gray-900">{new Date(log.created_at).toLocaleDateString('en-ZA')}</p>
                          <p className="text-xs text-gray-500">
                            {new Date(log.created_at).toLocaleTimeString('en-ZA')}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell className="font-medium text-gray-900">{log.actor_name}</TableCell>
                      <TableCell>{getEntityBadge(log.entity_type)}</TableCell>
                      <TableCell>{getActionBadge(log.action)}</TableCell>
                      <TableCell className="font-mono text-xs text-gray-500 max-w-[150px] truncate">
                        {log.entity_id}
                      </TableCell>
                      <TableCell>
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button 
                              variant="ghost" 
                              size="icon"
                              onClick={() => setSelectedLog(log)}
                              data-testid={`view-log-${log.id}`}
                            >
                              <Eye className="w-4 h-4" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-2xl">
                            <DialogHeader>
                              <DialogTitle className="font-heading">Audit Log Details</DialogTitle>
                            </DialogHeader>
                            <ScrollArea className="max-h-[60vh]">
                              <div className="space-y-4">
                                <div className="grid grid-cols-2 gap-4 text-sm">
                                  <div>
                                    <p className="text-gray-500">Timestamp</p>
                                    <p className="font-medium text-gray-900">{new Date(log.created_at).toLocaleString('en-ZA')}</p>
                                  </div>
                                  <div>
                                    <p className="text-gray-500">Actor</p>
                                    <p className="font-medium text-gray-900">{log.actor_name}</p>
                                  </div>
                                  <div>
                                    <p className="text-gray-500">Entity Type</p>
                                    <p>{getEntityBadge(log.entity_type)}</p>
                                  </div>
                                  <div>
                                    <p className="text-gray-500">Action</p>
                                    <p>{getActionBadge(log.action)}</p>
                                  </div>
                                </div>
                                
                                <div>
                                  <p className="text-gray-500 text-sm mb-1">Entity ID</p>
                                  <p className="font-mono text-xs bg-gray-100 p-2 rounded text-gray-700">{log.entity_id}</p>
                                </div>
                                
                                {log.reason && (
                                  <div>
                                    <p className="text-gray-500 text-sm mb-1">Reason</p>
                                    <p className="bg-amber-50 border border-amber-200 p-2 rounded text-sm text-amber-700">{log.reason}</p>
                                  </div>
                                )}
                                
                                {log.before_json && (
                                  <div>
                                    <p className="text-gray-500 text-sm mb-1">Before</p>
                                    <pre className="bg-gray-100 p-3 rounded text-xs overflow-auto font-mono text-gray-700">
                                      {JSON.stringify(log.before_json, null, 2)}
                                    </pre>
                                  </div>
                                )}
                                
                                {log.after_json && (
                                  <div>
                                    <p className="text-gray-500 text-sm mb-1">After</p>
                                    <pre className="bg-gray-100 p-3 rounded text-xs overflow-auto font-mono text-gray-700">
                                      {JSON.stringify(log.after_json, null, 2)}
                                    </pre>
                                  </div>
                                )}
                                
                                <div>
                                  <p className="text-gray-500 text-sm mb-1">Integrity Hash</p>
                                  <p className="font-mono text-xs bg-gray-100 p-2 rounded break-all text-gray-600">{log.integrity_hash}</p>
                                </div>
                              </div>
                            </ScrollArea>
                          </DialogContent>
                        </Dialog>
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
