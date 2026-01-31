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
      case 'create': return <Badge className="badge-success">Create</Badge>;
      case 'update': return <Badge className="bg-blue-500/15 text-blue-400 border-blue-500/20">Update</Badge>;
      case 'mark_paid': return <Badge className="badge-success">Mark Paid</Badge>;
      case 'login': return <Badge className="badge-neutral">Login</Badge>;
      case 'archive': return <Badge className="badge-error">Archive</Badge>;
      case 'field_override': return <Badge className="badge-warning">Override</Badge>;
      case 'export_data': return <Badge className="bg-purple-500/15 text-purple-400 border-purple-500/20">Export</Badge>;
      default: return <Badge className="badge-neutral">{action}</Badge>;
    }
  };

  const getEntityBadge = (entity) => {
    switch (entity) {
      case 'loan': return <Badge variant="outline" className="border-emerald-500/30 text-emerald-500">Loan</Badge>;
      case 'customer': return <Badge variant="outline" className="border-blue-500/30 text-blue-500">Customer</Badge>;
      case 'payment': return <Badge variant="outline" className="border-amber-500/30 text-amber-500">Payment</Badge>;
      case 'user': return <Badge variant="outline" className="border-purple-500/30 text-purple-500">User</Badge>;
      case 'settings': return <Badge variant="outline" className="border-zinc-500/30 text-zinc-400">Settings</Badge>;
      case 'export': return <Badge variant="outline" className="border-zinc-500/30 text-zinc-400">Export</Badge>;
      default: return <Badge variant="outline">{entity}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-heading font-bold tracking-tight">Audit Logs</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Immutable record of all system activities
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search by actor, entity ID, or action..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 bg-secondary"
            data-testid="audit-search-input"
          />
        </div>
        <Select value={entityFilter} onValueChange={setEntityFilter}>
          <SelectTrigger className="w-[180px] bg-secondary" data-testid="entity-filter">
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
      <Card className="border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg font-heading flex items-center gap-2">
            <ScrollText className="w-5 h-5 text-emerald-500" strokeWidth={1.5} />
            Activity Log
            <span className="text-sm font-normal text-muted-foreground ml-2">
              ({filteredLogs.length} entries)
            </span>
          </CardTitle>
          <CardDescription>
            All actions are logged and cannot be modified or deleted
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border border-border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50 hover:bg-muted/50">
                  <TableHead>Timestamp</TableHead>
                  <TableHead>Actor</TableHead>
                  <TableHead>Entity</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Entity ID</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      Loading audit logs...
                    </TableCell>
                  </TableRow>
                ) : filteredLogs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      No audit logs found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredLogs.map((log) => (
                    <TableRow key={log.id} data-testid={`audit-row-${log.id}`}>
                      <TableCell className="text-sm">
                        <div>
                          <p>{new Date(log.created_at).toLocaleDateString('en-ZA')}</p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(log.created_at).toLocaleTimeString('en-ZA')}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell className="font-medium">{log.actor_name}</TableCell>
                      <TableCell>{getEntityBadge(log.entity_type)}</TableCell>
                      <TableCell>{getActionBadge(log.action)}</TableCell>
                      <TableCell className="font-mono text-xs text-muted-foreground max-w-[150px] truncate">
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
                          <DialogContent className="bg-card border-border max-w-2xl">
                            <DialogHeader>
                              <DialogTitle className="font-heading">Audit Log Details</DialogTitle>
                            </DialogHeader>
                            <ScrollArea className="max-h-[60vh]">
                              <div className="space-y-4">
                                <div className="grid grid-cols-2 gap-4 text-sm">
                                  <div>
                                    <p className="text-muted-foreground">Timestamp</p>
                                    <p className="font-medium">{new Date(log.created_at).toLocaleString('en-ZA')}</p>
                                  </div>
                                  <div>
                                    <p className="text-muted-foreground">Actor</p>
                                    <p className="font-medium">{log.actor_name}</p>
                                  </div>
                                  <div>
                                    <p className="text-muted-foreground">Entity Type</p>
                                    <p>{getEntityBadge(log.entity_type)}</p>
                                  </div>
                                  <div>
                                    <p className="text-muted-foreground">Action</p>
                                    <p>{getActionBadge(log.action)}</p>
                                  </div>
                                </div>
                                
                                <div>
                                  <p className="text-muted-foreground text-sm mb-1">Entity ID</p>
                                  <p className="font-mono text-xs bg-secondary p-2 rounded">{log.entity_id}</p>
                                </div>
                                
                                {log.reason && (
                                  <div>
                                    <p className="text-muted-foreground text-sm mb-1">Reason</p>
                                    <p className="bg-amber-500/10 border border-amber-500/20 p-2 rounded text-sm">{log.reason}</p>
                                  </div>
                                )}
                                
                                {log.before_json && (
                                  <div>
                                    <p className="text-muted-foreground text-sm mb-1">Before</p>
                                    <pre className="bg-secondary p-3 rounded text-xs overflow-auto font-mono">
                                      {JSON.stringify(log.before_json, null, 2)}
                                    </pre>
                                  </div>
                                )}
                                
                                {log.after_json && (
                                  <div>
                                    <p className="text-muted-foreground text-sm mb-1">After</p>
                                    <pre className="bg-secondary p-3 rounded text-xs overflow-auto font-mono">
                                      {JSON.stringify(log.after_json, null, 2)}
                                    </pre>
                                  </div>
                                )}
                                
                                <div>
                                  <p className="text-muted-foreground text-sm mb-1">Integrity Hash</p>
                                  <p className="font-mono text-xs bg-secondary p-2 rounded break-all">{log.integrity_hash}</p>
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
