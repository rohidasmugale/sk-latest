import { useState, useEffect, useMemo } from "react";
import axios from "axios";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  History, Search, RefreshCw, Loader2, Filter, Eye, Calendar, User,
} from "lucide-react";
import { toast } from "sonner";

const API_URL = import.meta.env.VITE_API_URL ||
  (import.meta.env.DEV ? 'http://localhost:5001/api' : 'https://sk-backend-btbj.onrender.com/api');

interface AuditLog {
  _id: string;
  action: string;
  entity: string;
  entityId?: string;
  month?: string;
  employeeId?: string;
  employeeName?: string;
  performedBy: string;
  performedAt: string;
  description: string;
  before?: any;
  after?: any;
  metadata?: any;
}

const ACTION_COLORS: Record<string, string> = {
  'payroll.process': 'bg-blue-50 text-blue-700 border-blue-200',
  'payroll.bulkProcess': 'bg-blue-50 text-blue-700 border-blue-200',
  'payroll.adjust': 'bg-emerald-50 text-emerald-700 border-emerald-200',
  'payroll.removeAdjustment': 'bg-amber-50 text-amber-700 border-amber-200',
  'payroll.updatePaymentStatus': 'bg-indigo-50 text-indigo-700 border-indigo-200',
  'payroll.updateNotes': 'bg-gray-50 text-gray-700 border-gray-200',
  'payroll.delete': 'bg-red-50 text-red-700 border-red-200',
  'structure.create': 'bg-green-50 text-green-700 border-green-200',
  'structure.update': 'bg-yellow-50 text-yellow-700 border-yellow-200',
  'structure.delete': 'bg-red-50 text-red-700 border-red-200',
  'structure.import': 'bg-purple-50 text-purple-700 border-purple-200',
  'slip.generate': 'bg-blue-50 text-blue-700 border-blue-200',
  'slip.delete': 'bg-red-50 text-red-700 border-red-200',
  'slip.send': 'bg-indigo-50 text-indigo-700 border-indigo-200',
};

const getActionColor = (action: string) =>
  ACTION_COLORS[action] || 'bg-gray-50 text-gray-700 border-gray-200';

const formatDateTime = (iso: string) =>
  new Date(iso).toLocaleString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });

const AuditLogTab = () => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState<{ entities: string[]; actions: string[]; users: string[] }>({
    entities: [], actions: [], users: [],
  });

  const [filters, setFilters] = useState({
    entity: 'all',
    action: 'all',
    performedBy: 'all',
    search: '',
    startDate: '',
    endDate: '',
  });

  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(50);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);

  const fetchStats = async () => {
    try {
      const res = await axios.get(`${API_URL}/audit-logs/stats`);
      if (res.data.success) setStats(res.data.data);
    } catch (err) {
      console.error('Failed to fetch audit stats:', err);
    }
  };

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const params: any = { page, limit };
      if (filters.entity !== 'all') params.entity = filters.entity;
      if (filters.action !== 'all') params.action = filters.action;
      if (filters.performedBy !== 'all') params.performedBy = filters.performedBy;
      if (filters.search.trim()) params.search = filters.search.trim();
      if (filters.startDate) params.startDate = filters.startDate;
      if (filters.endDate) params.endDate = filters.endDate;

      const res = await axios.get(`${API_URL}/audit-logs`, { params });
      if (res.data.success) {
        setLogs(res.data.data || []);
        setTotalPages(res.data.pagination?.totalPages || 1);
        setTotal(res.data.pagination?.total || 0);
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to load audit logs');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchStats(); }, []);
  useEffect(() => { fetchLogs(); }, [page, limit, filters.entity, filters.action, filters.performedBy, filters.startDate, filters.endDate]);

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => { setPage(1); fetchLogs(); }, 400);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.search]);

  const clearFilters = () => {
    setFilters({ entity: 'all', action: 'all', performedBy: 'all', search: '', startDate: '', endDate: '' });
    setPage(1);
  };

  const hasActiveFilters = useMemo(() => (
    filters.entity !== 'all' || filters.action !== 'all' || filters.performedBy !== 'all' ||
    filters.search || filters.startDate || filters.endDate
  ), [filters]);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <History className="h-5 w-5 text-indigo-600" /> Audit Log
          </h3>
          <p className="text-sm text-muted-foreground">
            {total} {total === 1 ? 'entry' : 'entries'} recorded
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchLogs} disabled={loading}>
          <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} /> Refresh
        </Button>
      </div>

      {/* Filters */}
      <div className="border rounded-lg p-3 bg-gray-50 space-y-3">
        <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
          <Filter className="h-4 w-4" /> Filters
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="relative">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search description / employee..."
              className="pl-8 bg-white"
              value={filters.search}
              onChange={(e) => setFilters(f => ({ ...f, search: e.target.value }))}
            />
          </div>

          <Select value={filters.entity} onValueChange={(v) => { setPage(1); setFilters(f => ({ ...f, entity: v })); }}>
            <SelectTrigger className="bg-white"><SelectValue placeholder="Entity" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Entities</SelectItem>
              {stats.entities.map(e => <SelectItem key={e} value={e}>{e}</SelectItem>)}
            </SelectContent>
          </Select>

          <Select value={filters.action} onValueChange={(v) => { setPage(1); setFilters(f => ({ ...f, action: v })); }}>
            <SelectTrigger className="bg-white"><SelectValue placeholder="Action" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Actions</SelectItem>
              {stats.actions.map(a => <SelectItem key={a} value={a}>{a}</SelectItem>)}
            </SelectContent>
          </Select>

          <Select value={filters.performedBy} onValueChange={(v) => { setPage(1); setFilters(f => ({ ...f, performedBy: v })); }}>
            <SelectTrigger className="bg-white"><SelectValue placeholder="Performed By" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Users</SelectItem>
              {stats.users.map(u => <SelectItem key={u} value={u}>{u}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="space-y-1">
            <Label className="text-xs">From Date</Label>
            <Input type="date" className="bg-white"
              value={filters.startDate}
              onChange={(e) => { setPage(1); setFilters(f => ({ ...f, startDate: e.target.value })); }} />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">To Date</Label>
            <Input type="date" className="bg-white"
              value={filters.endDate}
              onChange={(e) => { setPage(1); setFilters(f => ({ ...f, endDate: e.target.value })); }} />
          </div>
          <div className="flex items-end">
            {hasActiveFilters && (
              <Button variant="ghost" size="sm" onClick={clearFilters} className="text-gray-600">
                Clear Filters
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Table */}
      {loading && logs.length === 0 ? (
        <div className="flex justify-center items-center h-64"><Loader2 className="h-8 w-8 animate-spin" /></div>
      ) : logs.length === 0 ? (
        <div className="text-center py-12 border rounded-lg bg-gray-50">
          <History className="h-12 w-12 mx-auto mb-3 text-gray-400" />
          <p className="font-medium text-gray-700">No audit log entries found</p>
          <p className="text-sm text-muted-foreground">
            {hasActiveFilters ? 'Try adjusting your filters' : 'Actions will appear here as they happen'}
          </p>
        </div>
      ) : (
        <div className="border rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50">
                  <TableHead className="w-[160px]">When</TableHead>
                  <TableHead className="w-[180px]">Action</TableHead>
                  <TableHead className="w-[160px]">By</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="w-[80px] text-right">Details</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.map((log) => (
                  <TableRow key={log._id} className="hover:bg-gray-50/60">
                    <TableCell className="text-xs text-gray-600 whitespace-nowrap">
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {formatDateTime(log.performedAt)}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={`text-xs ${getActionColor(log.action)}`}>
                        {log.action}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs">
                      <div className="flex items-center gap-1">
                        <User className="h-3 w-3 text-gray-400" />
                        <span className="truncate max-w-[140px]" title={log.performedBy}>
                          {log.performedBy}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm">{log.description}</TableCell>
                    <TableCell className="text-right">
                      <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => setSelectedLog(log)}>
                        <Eye className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      {/* Pagination */}
      {total > 0 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
          <div className="text-sm text-muted-foreground">
            Page {page} of {totalPages} · {total} total
          </div>
          <div className="flex items-center gap-2">
            <Select value={String(limit)} onValueChange={(v) => { setLimit(parseInt(v)); setPage(1); }}>
              <SelectTrigger className="w-24 h-8"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="25">25</SelectItem>
                <SelectItem value="50">50</SelectItem>
                <SelectItem value="100">100</SelectItem>
                <SelectItem value="200">200</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm" className="h-8 w-8 p-0"
              onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>‹</Button>
            <Button variant="outline" size="sm" className="h-8 w-8 p-0"
              onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}>›</Button>
          </div>
        </div>
      )}

      {/* Detail Dialog */}
      <Dialog open={!!selectedLog} onOpenChange={(o) => { if (!o) setSelectedLog(null); }}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <History className="h-5 w-5 text-indigo-600" /> Audit Log Detail
            </DialogTitle>
            <DialogDescription>
              {selectedLog && formatDateTime(selectedLog.performedAt)}
            </DialogDescription>
          </DialogHeader>

          {selectedLog && (
            <div className="space-y-4 text-sm">
              <div className="grid grid-cols-2 gap-3">
                <div><Label className="text-xs text-muted-foreground">Action</Label>
                  <div className="font-medium">{selectedLog.action}</div></div>
                <div><Label className="text-xs text-muted-foreground">Entity</Label>
                  <div className="font-medium">{selectedLog.entity}</div></div>
                <div><Label className="text-xs text-muted-foreground">By</Label>
                  <div className="font-medium">{selectedLog.performedBy}</div></div>
                <div><Label className="text-xs text-muted-foreground">Month</Label>
                  <div className="font-medium">{selectedLog.month || '—'}</div></div>
                {selectedLog.employeeId && (
                  <div><Label className="text-xs text-muted-foreground">Employee</Label>
                    <div className="font-medium">{selectedLog.employeeId}</div></div>
                )}
                <div><Label className="text-xs text-muted-foreground">Entity ID</Label>
                  <div className="font-mono text-xs break-all">{selectedLog.entityId || '—'}</div></div>
              </div>

              <div>
                <Label className="text-xs text-muted-foreground">Description</Label>
                <div className="p-2 bg-gray-50 rounded border">{selectedLog.description}</div>
              </div>

              {selectedLog.before && (
                <div>
                  <Label className="text-xs text-muted-foreground">Before</Label>
                  <pre className="p-2 bg-red-50 border border-red-100 rounded text-xs overflow-auto max-h-48">
                    {JSON.stringify(selectedLog.before, null, 2)}
                  </pre>
                </div>
              )}

              {selectedLog.after && (
                <div>
                  <Label className="text-xs text-muted-foreground">After</Label>
                  <pre className="p-2 bg-green-50 border border-green-100 rounded text-xs overflow-auto max-h-48">
                    {JSON.stringify(selectedLog.after, null, 2)}
                  </pre>
                </div>
              )}

              {selectedLog.metadata && (
                <div>
                  <Label className="text-xs text-muted-foreground">Metadata</Label>
                  <pre className="p-2 bg-blue-50 border border-blue-100 rounded text-xs overflow-auto max-h-48">
                    {JSON.stringify(selectedLog.metadata, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AuditLogTab;