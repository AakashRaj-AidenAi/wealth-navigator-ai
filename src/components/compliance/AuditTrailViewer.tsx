import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { History, User, Database, ArrowRight, Filter, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';

interface AuditLog {
  id: string;
  table_name: string;
  record_id: string;
  action: string;
  old_data: any;
  new_data: any;
  changed_by: string;
  changed_at: string;
}

interface Profile {
  id: string;
  user_id: string;
  full_name: string | null;
  email: string;
}

export const AuditTrailViewer = () => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [profiles, setProfiles] = useState<Map<string, Profile>>(new Map());
  const [loading, setLoading] = useState(true);
  const [expandedLog, setExpandedLog] = useState<string | null>(null);
  const [filterTable, setFilterTable] = useState<string>('all');
  const [filterAction, setFilterAction] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchAuditLogs();
    fetchProfiles();
  }, []);

  const fetchProfiles = async () => {
    const { data } = await supabase.from('profiles').select('*');
    if (data) {
      const profileMap = new Map<string, Profile>();
      data.forEach(p => profileMap.set(p.user_id, p));
      setProfiles(profileMap);
    }
  };

  const fetchAuditLogs = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('audit_logs')
      .select('*')
      .order('changed_at', { ascending: false })
      .limit(100);

    if (data) {
      setLogs(data);
    }
    setLoading(false);
  };

  const getActionColor = (action: string) => {
    switch (action) {
      case 'INSERT':
        return 'bg-success/20 text-success';
      case 'UPDATE':
        return 'bg-primary/20 text-primary';
      case 'DELETE':
        return 'bg-destructive/20 text-destructive';
      default:
        return 'bg-secondary text-secondary-foreground';
    }
  };

  const getChangedFields = (oldData: any, newData: any) => {
    if (!oldData || !newData) return [];
    
    const changes: { field: string; oldValue: any; newValue: any }[] = [];
    const allKeys = new Set([...Object.keys(oldData || {}), ...Object.keys(newData || {})]);
    
    allKeys.forEach(key => {
      if (JSON.stringify(oldData?.[key]) !== JSON.stringify(newData?.[key])) {
        changes.push({
          field: key,
          oldValue: oldData?.[key],
          newValue: newData?.[key]
        });
      }
    });
    
    return changes;
  };

  const formatValue = (value: any) => {
    if (value === null || value === undefined) return <span className="text-muted-foreground italic">null</span>;
    if (typeof value === 'object') return JSON.stringify(value);
    if (typeof value === 'boolean') return value ? 'true' : 'false';
    return String(value);
  };

  const getUserName = (userId: string | null) => {
    if (!userId) return 'System';
    const profile = profiles.get(userId);
    return profile?.full_name || profile?.email || 'Unknown User';
  };

  const filteredLogs = logs.filter(log => {
    if (filterTable !== 'all' && log.table_name !== filterTable) return false;
    if (filterAction !== 'all' && log.action !== filterAction) return false;
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      return (
        log.table_name.toLowerCase().includes(searchLower) ||
        log.record_id.toLowerCase().includes(searchLower) ||
        getUserName(log.changed_by).toLowerCase().includes(searchLower)
      );
    }
    return true;
  });

  const uniqueTables = [...new Set(logs.map(l => l.table_name))];

  if (loading) {
    return (
      <div className="glass rounded-xl p-6">
        <h2 className="font-semibold mb-4">Audit Trail</h2>
        <div className="animate-pulse space-y-3">
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i} className="h-12 bg-secondary/30 rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="glass rounded-xl p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <History className="h-5 w-5 text-primary" />
          <h2 className="font-semibold">Audit Trail</h2>
          <Badge variant="secondary">{filteredLogs.length} entries</Badge>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-4">
        <Input
          placeholder="Search logs..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-48"
        />
        <Select value={filterTable} onValueChange={setFilterTable}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="All tables" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Tables</SelectItem>
            {uniqueTables.map(table => (
              <SelectItem key={table} value={table}>{table}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filterAction} onValueChange={setFilterAction}>
          <SelectTrigger className="w-32">
            <SelectValue placeholder="All actions" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Actions</SelectItem>
            <SelectItem value="INSERT">INSERT</SelectItem>
            <SelectItem value="UPDATE">UPDATE</SelectItem>
            <SelectItem value="DELETE">DELETE</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Logs List */}
      <div className="space-y-2 max-h-[500px] overflow-y-auto">
        {filteredLogs.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No audit logs found
          </div>
        ) : (
          filteredLogs.map(log => (
            <div key={log.id} className="rounded-lg border bg-secondary/10">
              <button
                onClick={() => setExpandedLog(expandedLog === log.id ? null : log.id)}
                className="w-full flex items-center justify-between p-3 hover:bg-secondary/20 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <span className={`px-2 py-0.5 rounded text-xs font-medium ${getActionColor(log.action)}`}>
                    {log.action}
                  </span>
                  <span className="font-medium">{log.table_name}</span>
                  <span className="text-xs text-muted-foreground font-mono">
                    {log.record_id.slice(0, 8)}...
                  </span>
                </div>
                <div className="flex items-center gap-3 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <User className="h-3 w-3" />
                    {getUserName(log.changed_by)}
                  </div>
                  <span>{format(new Date(log.changed_at), 'MMM d, HH:mm')}</span>
                  {expandedLog === log.id ? (
                    <ChevronUp className="h-4 w-4" />
                  ) : (
                    <ChevronDown className="h-4 w-4" />
                  )}
                </div>
              </button>

              {expandedLog === log.id && (
                <div className="px-3 pb-3 pt-1 border-t bg-secondary/5">
                  {log.action === 'UPDATE' ? (
                    <div className="space-y-2">
                      <p className="text-xs text-muted-foreground font-medium">Changed Fields:</p>
                      {getChangedFields(log.old_data, log.new_data).map(change => (
                        <div key={change.field} className="flex items-center gap-2 text-sm">
                          <span className="font-medium min-w-24">{change.field}:</span>
                          <span className="text-destructive/80 line-through">
                            {formatValue(change.oldValue)}
                          </span>
                          <ArrowRight className="h-3 w-3 text-muted-foreground" />
                          <span className="text-success">
                            {formatValue(change.newValue)}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : log.action === 'INSERT' ? (
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground font-medium">New Record:</p>
                      <pre className="text-xs bg-secondary/20 p-2 rounded overflow-x-auto">
                        {JSON.stringify(log.new_data, null, 2)}
                      </pre>
                    </div>
                  ) : (
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground font-medium">Deleted Record:</p>
                      <pre className="text-xs bg-secondary/20 p-2 rounded overflow-x-auto">
                        {JSON.stringify(log.old_data, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};
