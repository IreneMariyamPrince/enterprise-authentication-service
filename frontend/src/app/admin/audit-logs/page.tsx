'use client';

import React, { useState, useEffect } from 'react';
import { 
  ShieldAlert, Download, Search, Filter, ChevronDown, ChevronUp, 
  Activity, AlertTriangle, Key, Users, UserCheck, Shield
} from 'lucide-react';

interface AuditLog {
  id: string;
  requestId?: string;
  actorId?: string;
  targetUserId?: string;
  sessionId?: string;
  action: string;
  category: string;
  status: string;
  ipAddress?: string;
  browser?: string;
  os?: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  metadata?: any;
  createdAt: string;
  actor?: { firstName: string; lastName: string; email: string };
  targetUser?: { firstName: string; lastName: string; email: string };
}

export default function AuditLogsPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [meta, setMeta] = useState({ total: 0, page: 1, limit: 20, totalPages: 1 });
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [filters, setFilters] = useState({
    action: '',
    category: '',
    status: '',
    ipAddress: '',
    browser: '',
    os: ''
  });

  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchLogs();
  }, [meta.page, filters]);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('accessToken');
      
      const queryParams = new URLSearchParams({
        page: meta.page.toString(),
        limit: meta.limit.toString(),
        ...Object.fromEntries(Object.entries(filters).filter(([_, v]) => v !== ''))
      });

      const res = await fetch(`http://localhost:3000/audit-logs?${queryParams}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (res.ok) {
        const data = await res.json();
        setLogs(data.data);
        setMeta(data.meta);
      } else {
        setError('Failed to fetch audit logs.');
      }
    } catch (err) {
      setError('Network error.');
    } finally {
      setLoading(false);
    }
  };

  const handleExport = () => {
    const token = localStorage.getItem('accessToken');
    const queryParams = new URLSearchParams(
      Object.fromEntries(Object.entries(filters).filter(([_, v]) => v !== ''))
    );
    window.open(`http://localhost:3000/audit-logs/export?${queryParams}&token=${token}`, '_blank');
  };

  const toggleRow = (id: string) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(id)) newExpanded.delete(id);
    else newExpanded.add(id);
    setExpandedRows(newExpanded);
  };

  const getStatusColor = (status: string) => {
    switch(status) {
      case 'SUCCESS': return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20';
      case 'FAILED': return 'text-rose-400 bg-rose-500/10 border-rose-500/20';
      case 'WARNING': return 'text-amber-400 bg-amber-500/10 border-amber-500/20';
      default: return 'text-neutral-400 bg-neutral-500/10 border-neutral-500/20';
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-white">Security Event Center</h2>
          <p className="text-neutral-400 mt-1">Immutable audit trail of all enterprise security events.</p>
        </div>
        <button 
          onClick={handleExport}
          className="flex items-center space-x-2 bg-neutral-800 hover:bg-neutral-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
        >
          <Download className="w-4 h-4" />
          <span>Export CSV</span>
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-8">
        <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-4 flex flex-col justify-between">
          <div className="flex items-center gap-2 text-neutral-400 mb-2">
            <Activity className="w-4 h-4 text-indigo-400" /> <span className="text-sm font-medium">Total Events</span>
          </div>
          <span className="text-2xl font-bold text-white">{meta.total}</span>
        </div>
        <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-4 flex flex-col justify-between">
          <div className="flex items-center gap-2 text-neutral-400 mb-2">
            <AlertTriangle className="w-4 h-4 text-rose-400" /> <span className="text-sm font-medium">Failed Logins</span>
          </div>
          <span className="text-2xl font-bold text-white">--</span>
        </div>
        <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-4 flex flex-col justify-between">
          <div className="flex items-center gap-2 text-neutral-400 mb-2">
            <Shield className="w-4 h-4 text-emerald-400" /> <span className="text-sm font-medium">MFA Events</span>
          </div>
          <span className="text-2xl font-bold text-white">--</span>
        </div>
        <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-4 flex flex-col justify-between">
          <div className="flex items-center gap-2 text-neutral-400 mb-2">
            <Key className="w-4 h-4 text-amber-400" /> <span className="text-sm font-medium">Role Changes</span>
          </div>
          <span className="text-2xl font-bold text-white">--</span>
        </div>
        <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-4 flex flex-col justify-between">
          <div className="flex items-center gap-2 text-neutral-400 mb-2">
            <UserCheck className="w-4 h-4 text-blue-400" /> <span className="text-sm font-medium">Active Sessions</span>
          </div>
          <span className="text-2xl font-bold text-white">--</span>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-4 mb-8 flex flex-wrap gap-4">
        <div className="flex items-center bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 w-full md:w-64">
          <Search className="w-4 h-4 text-neutral-500 mr-2" />
          <input 
            type="text" 
            placeholder="Search action..."
            className="bg-transparent text-sm text-white w-full focus:outline-none"
            value={filters.action}
            onChange={(e) => setFilters({...filters, action: e.target.value})}
          />
        </div>
        <select 
          className="bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-sm text-neutral-300 focus:outline-none"
          value={filters.category}
          onChange={(e) => setFilters({...filters, category: e.target.value})}
        >
          <option value="">All Categories</option>
          <option value="AUTHENTICATION">Authentication</option>
          <option value="AUTHORIZATION">Authorization</option>
          <option value="MFA">MFA</option>
          <option value="ROLE">Role</option>
          <option value="SESSION">Session</option>
        </select>
        <select 
          className="bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-sm text-neutral-300 focus:outline-none"
          value={filters.status}
          onChange={(e) => setFilters({...filters, status: e.target.value})}
        >
          <option value="">All Statuses</option>
          <option value="SUCCESS">Success</option>
          <option value="FAILED">Failed</option>
          <option value="WARNING">Warning</option>
        </select>
        <input 
          type="text" 
          placeholder="Filter by IP..."
          className="bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none"
          value={filters.ipAddress}
          onChange={(e) => setFilters({...filters, ipAddress: e.target.value})}
        />
      </div>

      {error ? (
        <div className="bg-rose-900/20 border border-rose-900 rounded-lg p-6 text-center text-rose-400 font-medium">
          {error}
        </div>
      ) : (
        <div className="bg-neutral-900 border border-neutral-800 rounded-2xl overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="bg-neutral-950 text-neutral-400 border-b border-neutral-800">
                <tr>
                  <th className="px-6 py-4 font-medium">Date</th>
                  <th className="px-6 py-4 font-medium">Action</th>
                  <th className="px-6 py-4 font-medium">Actor</th>
                  <th className="px-6 py-4 font-medium">Target</th>
                  <th className="px-6 py-4 font-medium">Status</th>
                  <th className="px-6 py-4 font-medium">IP Address</th>
                  <th className="px-6 py-4 font-medium">Browser</th>
                  <th className="px-6 py-4"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-800">
                {logs.map((log) => (
                  <React.Fragment key={log.id}>
                    <tr className="hover:bg-neutral-800/30 transition-colors group">
                      <td className="px-6 py-4 text-neutral-300">
                        {new Date(log.createdAt).toLocaleString()}
                      </td>
                      <td className="px-6 py-4 font-medium text-white">
                        {log.action}
                        <div className="text-xs text-neutral-500 font-normal">{log.category}</div>
                      </td>
                      <td className="px-6 py-4">
                        {log.actor ? (
                          <div className="flex flex-col">
                            <span className="text-indigo-400 font-medium">{log.actor.firstName} {log.actor.lastName}</span>
                            <span className="text-neutral-500 text-xs">{log.actor.email}</span>
                          </div>
                        ) : <span className="text-neutral-600 italic">System</span>}
                      </td>
                      <td className="px-6 py-4">
                        {log.targetUser ? (
                          <div className="flex flex-col">
                            <span className="text-neutral-300">{log.targetUser.firstName} {log.targetUser.lastName}</span>
                            <span className="text-neutral-500 text-xs">{log.targetUser.email}</span>
                          </div>
                        ) : <span className="text-neutral-600">-</span>}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-bold border ${getStatusColor(log.status)}`}>
                          {log.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 font-mono text-neutral-400 text-xs">
                        {log.ipAddress || '-'}
                      </td>
                      <td className="px-6 py-4 text-neutral-400">
                        {log.browser ? `${log.browser} on ${log.os}` : '-'}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button 
                          onClick={() => toggleRow(log.id)}
                          className="text-neutral-500 hover:text-white p-1 rounded transition-colors"
                        >
                          {expandedRows.has(log.id) ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                        </button>
                      </td>
                    </tr>
                    
                    {/* Expandable Details Drawer */}
                    {expandedRows.has(log.id) && (
                      <tr className="bg-neutral-950/50">
                        <td colSpan={8} className="px-6 py-6 border-b border-neutral-800">
                          <div className="grid grid-cols-2 gap-8">
                            <div>
                              <h4 className="text-sm font-semibold text-white mb-3">Event Details</h4>
                              <div className="space-y-2 text-sm text-neutral-400">
                                <p><span className="font-medium text-neutral-300 w-24 inline-block">Event ID:</span> <span className="font-mono text-xs">{log.id}</span></p>
                                <p><span className="font-medium text-neutral-300 w-24 inline-block">Request ID:</span> <span className="font-mono text-xs">{log.requestId || 'N/A'}</span></p>
                                <p><span className="font-medium text-neutral-300 w-24 inline-block">Session ID:</span> <span className="font-mono text-xs">{log.sessionId || 'N/A'}</span></p>
                              </div>
                            </div>
                            <div>
                              <h4 className="text-sm font-semibold text-white mb-3">Metadata</h4>
                              <div className="bg-neutral-900 border border-neutral-800 rounded p-3 overflow-x-auto">
                                <pre className="text-xs font-mono text-emerald-400 m-0">
                                  {log.metadata ? JSON.stringify(log.metadata, null, 2) : 'No metadata attached.'}
                                </pre>
                              </div>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
                {logs.length === 0 && !loading && (
                  <tr>
                    <td colSpan={8} className="px-6 py-12 text-center text-neutral-500">
                      No audit logs found matching criteria.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          
          {/* Pagination */}
          <div className="px-6 py-4 border-t border-neutral-800 flex items-center justify-between bg-neutral-900">
            <span className="text-sm text-neutral-400">
              Page {meta.page} of {meta.totalPages || 1}
            </span>
            <div className="flex gap-2">
              <button 
                onClick={() => setMeta({...meta, page: Math.max(1, meta.page - 1)})}
                disabled={meta.page === 1}
                className="px-3 py-1 bg-neutral-800 text-neutral-300 rounded text-sm hover:bg-neutral-700 disabled:opacity-50"
              >
                Previous
              </button>
              <button 
                onClick={() => setMeta({...meta, page: Math.min(meta.totalPages, meta.page + 1)})}
                disabled={meta.page >= meta.totalPages}
                className="px-3 py-1 bg-neutral-800 text-neutral-300 rounded text-sm hover:bg-neutral-700 disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
