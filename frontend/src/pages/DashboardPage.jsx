import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { 
  MessageSquareText, 
  AlertOctagon, 
  Flame, 
  Sparkles, 
  TrendingUp, 
  Layers, 
  ArrowRight, 
  RefreshCw,
  ExternalLink,
  Clock,
  PieChart as PieIcon,
  BarChart3,
  Activity
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell, 
  Tooltip as RechartsTooltip, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  LineChart, 
  Line, 
  CartesianGrid 
} from 'recharts';
import { api } from '../api';
import { formatDate, formatRelativeTime, truncateText } from '../utils/formatters';
import { StatusBadge, PriorityBadge, SentimentBadge, CategoryBadge } from '../components/common/Badge';
import { Button } from '../components/common/Button';
import { Card, CardHeader, CardBody } from '../components/common/Card';
import { LoadingState, EmptyState, ErrorState } from '../components/common/States';

export function DashboardPage() {
  const navigate = useNavigate();

  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(null);

  const fetchStats = useCallback(async () => {
    setLoading(true);
    setFetchError(null);
    try {
      const data = await api.getDashboardStats();
      setStats(data);
    } catch (err) {
      setFetchError(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-slate-200/80 p-12">
        <LoadingState message="Aggregating operational incident metrics..." />
      </div>
    );
  }

  if (fetchError || !stats) {
    return (
      <div className="bg-white rounded-xl border border-slate-200/80 p-12">
        <ErrorState
          title="Failed to Load Dashboard Metrics"
          error={fetchError}
          onRetry={fetchStats}
        />
      </div>
    );
  }

  // Sentiment Donut Data
  const sentimentData = [
    { name: 'Frustrated', value: stats.sentiment?.frustrated || 0, color: '#e11d48' },
    { name: 'Negative', value: stats.sentiment?.negative || 0, color: '#f97316' },
    { name: 'Neutral', value: stats.sentiment?.neutral || 0, color: '#64748b' },
    { name: 'Positive', value: stats.sentiment?.positive || 0, color: '#10b981' }
  ].filter(d => d.value > 0);

  // Category Bar Data
  const categoryData = (stats.by_category || []).map(item => ({
    name: item.category.charAt(0).toUpperCase() + item.category.slice(1),
    count: item.count
  }));

  // Trend Line Data
  const perDayData = (stats.per_day || []).map(item => ({
    date: item.date.slice(5), // "11-10"
    count: item.count
  }));

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Incident Intelligence Overview</h1>
          <p className="text-xs text-slate-500 mt-1">
            Real-time telemetry, sentiment clustering, and root-cause indicators across customer complaint streams.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link to="/correlation">
            <Button variant="secondary" size="sm" icon={Activity} className="text-xs">
              View Correlation Graph
            </Button>
          </Link>
          <Button
            variant="secondary"
            size="sm"
            icon={RefreshCw}
            onClick={fetchStats}
            loading={loading}
          >
            Refresh
          </Button>
        </div>
      </div>

      {/* Top Section: 4 KPI Cards (Clickable to filtered views) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Complaints */}
        <div
          onClick={() => navigate('/complaints')}
          className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-xs hover:border-slate-300 hover:shadow-sm cursor-pointer transition-all group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Total Ingested
            </span>
            <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-600 group-hover:bg-slate-200 transition-colors">
              <MessageSquareText className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="text-2xl font-bold text-slate-900 font-mono">
              {stats.total_complaints}
            </span>
            <span className="text-xs text-slate-400 group-hover:text-purple-600 flex items-center gap-0.5">
              Feed &rarr;
            </span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Across all digital channels</p>
        </div>

        {/* Active Incidents */}
        <div
          onClick={() => navigate('/incidents')}
          className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-xs hover:border-slate-300 hover:shadow-sm cursor-pointer transition-all group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Active Incidents
            </span>
            <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600 group-hover:bg-blue-100 transition-colors">
              <AlertOctagon className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="text-2xl font-bold text-blue-600 font-mono">
              {stats.active_incidents}
            </span>
            <span className="text-xs text-slate-400 group-hover:text-blue-600 flex items-center gap-0.5">
              Triage &rarr;
            </span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Currently open or investigating</p>
        </div>

        {/* High Priority Incidents */}
        <div
          onClick={() => navigate('/incidents?priority=high')}
          className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-xs hover:border-orange-300 hover:shadow-sm cursor-pointer transition-all group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              High / Critical
            </span>
            <div className="w-8 h-8 rounded-lg bg-orange-50 flex items-center justify-center text-orange-600 group-hover:bg-orange-100 transition-colors">
              <Flame className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="text-2xl font-bold text-orange-600 font-mono">
              {stats.high_priority_incidents}
            </span>
            <span className="text-xs text-slate-400 group-hover:text-orange-600 flex items-center gap-0.5">
              Filtered &rarr;
            </span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Requiring immediate response</p>
        </div>

        {/* Pending AI Suggestions (Click goes to suggested filter) */}
        <div
          onClick={() => navigate('/incidents?status=suggested')}
          className="bg-gradient-to-b from-purple-50/50 to-white rounded-xl border border-purple-200 p-5 shadow-xs hover:border-purple-300 hover:shadow-sm cursor-pointer transition-all group ring-1 ring-purple-400/20"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-purple-900 uppercase tracking-wider flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-purple-600" />
              AI Suggestions
            </span>
            <div className="w-8 h-8 rounded-lg bg-purple-100 flex items-center justify-center text-purple-700 group-hover:bg-purple-200 transition-colors">
              <Layers className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="text-2xl font-bold text-purple-700 font-mono">
              {stats.pending_suggestions}
            </span>
            <span className="text-xs text-purple-600 font-medium flex items-center gap-0.5">
              Review &rarr;
            </span>
          </div>
          <p className="text-[11px] text-purple-600/80 mt-1">Awaiting human staff approval</p>
        </div>
      </div>

      {/* Middle Section: Recharts Visualizations */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Sentiment Donut */}
        <Card className="flex flex-col">
          <CardHeader
            title="Customer Sentiment Distribution"
            subtitle="Real-time sentiment classification from incoming complaints"
          />
          <CardBody className="flex-1 flex flex-col justify-between">
            <div className="h-48 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={sentimentData}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={45}
                    outerRadius={70}
                    paddingAngle={3}
                  >
                    {sentimentData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <RechartsTooltip
                    contentStyle={{ fontSize: '11px', borderRadius: '8px', border: '1px solid #e2e8f0' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100 text-xs">
              {sentimentData.map((d) => (
                <div key={d.name} className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: d.color }}></span>
                  <span className="text-slate-600 truncate">{d.name}:</span>
                  <span className="font-mono font-bold text-slate-800 ml-auto">{d.value}</span>
                </div>
              ))}
            </div>
          </CardBody>
        </Card>

        {/* Complaints by Category Bar */}
        <Card className="flex flex-col">
          <CardHeader
            title="Complaints by Category"
            subtitle="Top issue classification categories identified by AI"
          />
          <CardBody className="flex-1 flex flex-col justify-between">
            <div className="h-56 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={categoryData} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis 
                    dataKey="name" 
                    tick={{ fontSize: 10, fill: '#64748b' }} 
                    interval={0}
                    angle={-25}
                    textAnchor="end"
                  />
                  <YAxis tick={{ fontSize: 10, fill: '#64748b' }} allowDecimals={false} />
                  <RechartsTooltip
                    contentStyle={{ fontSize: '11px', borderRadius: '8px', border: '1px solid #e2e8f0' }}
                  />
                  <Bar dataKey="count" fill="#7c3aed" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardBody>
        </Card>

        {/* Complaints Per Day Trend Line */}
        <Card className="flex flex-col">
          <CardHeader
            title="Complaint Velocity"
            subtitle="Report volume trend over the recent operating period"
          />
          <CardBody className="flex-1 flex flex-col justify-between">
            <div className="h-56 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={perDayData} margin={{ top: 10, right: 15, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#64748b' }} />
                  <YAxis tick={{ fontSize: 10, fill: '#64748b' }} allowDecimals={false} />
                  <RechartsTooltip
                    contentStyle={{ fontSize: '11px', borderRadius: '8px', border: '1px solid #e2e8f0' }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="count" 
                    stroke="#2563eb" 
                    strokeWidth={2} 
                    dot={{ r: 3, fill: '#2563eb' }}
                    activeDot={{ r: 5 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardBody>
        </Card>
      </div>

      {/* Bottom Section: Active Incidents & Recent Complaints */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Active Incidents List */}
        <Card>
          <CardHeader
            title="Active Incidents in Triage"
            subtitle="Grouped systemic issues requiring operational attention"
            action={
              <Link to="/incidents" className="text-xs font-semibold text-purple-600 hover:text-purple-700 flex items-center gap-1">
                View all <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            }
          />
          <div className="divide-y divide-slate-100">
            {stats.active_incident_list && stats.active_incident_list.length > 0 ? (
              stats.active_incident_list.map((inc) => (
                <div
                  key={inc.id}
                  onClick={() => navigate(`/incidents/${inc.id}`)}
                  className="p-4 hover:bg-slate-50 cursor-pointer transition-colors flex items-center justify-between gap-3 group"
                >
                  <div className="min-w-0 space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-slate-800 group-hover:text-purple-600">
                        INC-{inc.id}
                      </span>
                      <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-100 text-slate-600">
                        {inc.affected_service}
                      </span>
                      <PriorityBadge priority={inc.priority} />
                    </div>
                    <p className="text-xs font-medium text-slate-900 truncate">
                      {inc.title}
                    </p>
                  </div>
                  <div className="shrink-0 flex items-center gap-2 text-right">
                    <StatusBadge status={inc.status} type="incident" />
                    <span className="text-xs font-mono text-purple-700 font-semibold bg-purple-50 px-2 py-0.5 rounded border border-purple-200/60">
                      {inc.complaint_count} reports
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <div className="p-8 text-center text-xs text-slate-400">
                No active incidents currently undergoing triage.
              </div>
            )}
          </div>
        </Card>

        {/* Recent Ingested Complaints */}
        <Card>
          <CardHeader
            title="Recent Customer Complaints"
            subtitle="Latest ingested raw feedback and telemetry tickets"
            action={
              <Link to="/complaints" className="text-xs font-semibold text-purple-600 hover:text-purple-700 flex items-center gap-1">
                View all <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            }
          />
          <div className="divide-y divide-slate-100">
            {stats.recent_complaints && stats.recent_complaints.length > 0 ? (
              stats.recent_complaints.map((c) => (
                <div
                  key={c.id}
                  onClick={() => navigate('/complaints')}
                  className="p-3.5 hover:bg-slate-50 cursor-pointer transition-colors flex items-center justify-between gap-3"
                >
                  <div className="min-w-0 flex-1 space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-slate-800">#{c.id}</span>
                      <span className="text-xs font-medium text-slate-900 truncate">{c.customer_name}</span>
                      <CategoryBadge category={c.category} />
                    </div>
                    <p className="text-xs text-slate-600 truncate">
                      {c.text}
                    </p>
                  </div>
                  <div className="shrink-0 flex items-center gap-2 text-right">
                    <SentimentBadge sentiment={c.sentiment} />
                    <span className="text-[11px] text-slate-400 whitespace-nowrap">
                      {formatRelativeTime(c.created_at)}
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <div className="p-8 text-center text-xs text-slate-400">
                No complaints recorded in database.
              </div>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
