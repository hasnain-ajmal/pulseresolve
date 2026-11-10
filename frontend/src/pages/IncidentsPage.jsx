import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { 
  AlertOctagon, 
  Search, 
  Filter, 
  ChevronRight, 
  Layers, 
  Sparkles, 
  RefreshCw, 
  Users, 
  Clock, 
  ArrowUpRight 
} from 'lucide-react';
import { api } from '../api';
import { formatDate, formatRelativeTime } from '../utils/formatters';
import { StatusBadge, PriorityBadge } from '../components/common/Badge';
import { Button } from '../components/common/Button';
import { LoadingState, EmptyState, ErrorState } from '../components/common/States';
import { UnassignedComplaints } from '../components/common/UnassignedComplaints';
import { DeletedIncidents } from '../components/common/DeletedIncidents';

export function IncidentsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  const [incidents, setIncidents] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(null);

  // Filters
  const [statusFilter, setStatusFilter] = useState(searchParams.get('status') || '');
  const [priorityFilter, setPriorityFilter] = useState(searchParams.get('priority') || '');
  const [viewMode, setViewMode] = useState('cards'); // 'cards' | 'table'

  const fetchIncidents = useCallback(async () => {
    setLoading(true);
    setFetchError(null);
    try {
      const params = {
        page,
        size: 30,
        status: statusFilter || undefined,
        priority: priorityFilter || undefined
      };
      const res = await api.getIncidents(params);
      setIncidents(res.items || []);
      setTotal(res.total || 0);
    } catch (err) {
      setFetchError(err);
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter, priorityFilter]);

  useEffect(() => {
    fetchIncidents();
  }, [fetchIncidents]);

  const clearFilters = () => {
    setStatusFilter('');
    setPriorityFilter('');
    setPage(1);
  };

  const suggestedCount = incidents.filter(i => i.status === 'suggested').length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">Incident Triage</h1>
            {suggestedCount > 0 && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-100 text-purple-800 border border-purple-200">
                <Sparkles className="w-3 h-3 text-purple-600" />
                {suggestedCount} AI Suggestions Pending Review
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Grouped operational incidents clustered by complaint similarity, shared symptoms, and causal signals.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center bg-white border border-slate-200 rounded-lg p-0.5 shadow-2xs">
            <button
              onClick={() => setViewMode('cards')}
              className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${
                viewMode === 'cards' ? 'bg-slate-900 text-white shadow-2xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Cards
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${
                viewMode === 'table' ? 'bg-slate-900 text-white shadow-2xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Table
            </button>
          </div>
          <Button
            variant="secondary"
            size="sm"
            icon={RefreshCw}
            onClick={fetchIncidents}
            loading={loading}
          >
            Refresh
          </Button>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            Filters:
          </div>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
            className="text-xs border border-slate-200 rounded-lg px-3 py-1.5 bg-slate-50/50 focus:outline-none focus:ring-2 focus:ring-purple-600 text-slate-700 font-medium"
          >
            <option value="">All Statuses</option>
            <option value="suggested">Suggested (AI Pending)</option>
            <option value="open">Open</option>
            <option value="investigating">Investigating</option>
            <option value="resolved">Resolved</option>
            <option value="rejected">Rejected</option>
          </select>

          {/* Priority Filter */}
          <select
            value={priorityFilter}
            onChange={(e) => { setPriorityFilter(e.target.value); setPage(1); }}
            className="text-xs border border-slate-200 rounded-lg px-3 py-1.5 bg-slate-50/50 focus:outline-none focus:ring-2 focus:ring-purple-600 text-slate-700 font-medium"
          >
            <option value="">All Priorities</option>
            <option value="critical">Critical</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>

          {(statusFilter || priorityFilter) && (
            <Button variant="ghost" size="sm" onClick={clearFilters} className="text-slate-500 text-xs">
              Clear
            </Button>
          )}
        </div>

        <div className="text-xs text-slate-400 font-mono">
          Showing {incidents.length} of {total} incidents
        </div>
      </div>

      {/* Data Views */}
      {loading ? (
        <div className="bg-white rounded-xl border border-slate-200/80 p-8 shadow-xs">
          <LoadingState message="Correlating incident telemetry..." />
        </div>
      ) : fetchError ? (
        <div className="bg-white rounded-xl border border-slate-200/80 p-8 shadow-xs">
          <ErrorState error={fetchError} onRetry={fetchIncidents} />
        </div>
      ) : incidents.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200/80 p-8 shadow-xs">
          <EmptyState
            icon={AlertOctagon}
            title="No incidents found"
            description="No incidents match your selected status and priority filters."
            actionText="Reset Filters"
            onAction={clearFilters}
          />
        </div>
      ) : viewMode === 'cards' ? (
        /* Cards View with Suggested Visually Highlighted at Top */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {incidents.map((incident) => {
            const isSuggested = incident.status === 'suggested';
            return (
              <div
                key={incident.id}
                onClick={() => navigate(`/incidents/${incident.id}`)}
                className={`rounded-xl border p-5 shadow-xs transition-all duration-150 cursor-pointer flex flex-col justify-between hover:shadow-md hover:scale-[1.01] group ${
                  isSuggested
                    ? 'bg-gradient-to-b from-purple-50/40 via-white to-white border-purple-300 ring-1 ring-purple-400/20 shadow-purple-950/5'
                    : 'bg-white border-slate-200/80 hover:border-slate-300'
                }`}
              >
                <div>
                  {/* Top Bar */}
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-slate-900 group-hover:text-purple-600 transition-colors">
                        INC-{incident.id}
                      </span>
                      <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200/60">
                        {incident.affected_service}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <PriorityBadge priority={incident.priority} />
                    </div>
                  </div>

                  {/* Title */}
                  <h3 className="text-sm font-semibold text-slate-900 leading-snug group-hover:text-purple-700 transition-colors">
                    {incident.title}
                  </h3>

                  {/* Status Banner for Suggested */}
                  {isSuggested && (
                    <div className="mt-2.5 p-2 rounded-lg bg-purple-100/60 border border-purple-200 flex items-center gap-2 text-[11px] text-purple-900 font-medium">
                      <Sparkles className="w-3.5 h-3.5 text-purple-600 shrink-0" />
                      <span>Suggested by AI &bull; Review &amp; approve</span>
                    </div>
                  )}
                </div>

                {/* Footer Meta */}
                <div className="mt-5 pt-3.5 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                  <div className="flex items-center gap-3">
                    <StatusBadge status={incident.status} type="incident" />
                    <span className="flex items-center gap-1 text-[11px] font-mono text-slate-600">
                      <Layers className="w-3 h-3 text-slate-400" />
                      {incident.complaint_count} {incident.complaint_count === 1 ? 'ticket' : 'tickets'}
                    </span>
                  </div>

                  <div className="flex items-center gap-1 text-[11px] text-slate-400">
                    <Clock className="w-3 h-3" />
                    {formatRelativeTime(incident.updated_at)}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* Table View */
        <div className="bg-white rounded-xl border border-slate-200/80 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200/80 bg-slate-50/75 text-slate-500 font-semibold tracking-wider uppercase text-[10px]">
                  <th className="py-3 px-4 w-20">ID</th>
                  <th className="py-3 px-4 min-w-[280px]">Incident Title</th>
                  <th className="py-3 px-4 w-32">Affected Service</th>
                  <th className="py-3 px-4 w-32">Status</th>
                  <th className="py-3 px-4 w-24">Priority</th>
                  <th className="py-3 px-4 w-24">Linked</th>
                  <th className="py-3 px-4 w-36">Assigned Team</th>
                  <th className="py-3 px-4 w-32">Updated</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {incidents.map((inc) => (
                  <tr
                    key={inc.id}
                    onClick={() => navigate(`/incidents/${inc.id}`)}
                    className="hover:bg-slate-50/80 cursor-pointer transition-colors group"
                  >
                    <td className="py-3.5 px-4 font-mono font-semibold text-slate-900 group-hover:text-purple-600">
                      INC-{inc.id}
                    </td>
                    <td className="py-3.5 px-4 font-medium text-slate-900 group-hover:text-purple-700">
                      <div className="flex items-center gap-2">
                        {inc.status === 'suggested' && (
                          <Sparkles className="w-3.5 h-3.5 text-purple-600 shrink-0" />
                        )}
                        <span>{inc.title}</span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="font-mono text-[11px] text-slate-600 bg-slate-100 px-2 py-0.5 rounded">
                        {inc.affected_service}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <StatusBadge status={inc.status} type="incident" />
                    </td>
                    <td className="py-3.5 px-4">
                      <PriorityBadge priority={inc.priority} />
                    </td>
                    <td className="py-3.5 px-4 font-mono text-slate-700 font-medium">
                      {inc.complaint_count}
                    </td>
                    <td className="py-3.5 px-4 text-slate-500">
                      {inc.assigned_team || <span className="text-slate-300 font-mono">—</span>}
                    </td>
                    <td className="py-3.5 px-4 text-slate-500 whitespace-nowrap text-[11px]">
                      {formatRelativeTime(inc.updated_at)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Whole picture: standalone complaints that belong to no incident */}
      <UnassignedComplaints />

      {/* Admin only: deleted incidents can be restored */}
      <DeletedIncidents onRestored={fetchIncidents} />
    </div>
  );
}
