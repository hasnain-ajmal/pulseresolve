import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { 
  MessageSquareText, 
  Search, 
  Filter, 
  UploadCloud, 
  X, 
  ChevronLeft, 
  ChevronRight, 
  ExternalLink,
  Layers,
  Sparkles,
  FileSpreadsheet,
  AlertCircle,
  CheckCircle2,
  RefreshCw
} from 'lucide-react';
import { api } from '../api';
import { formatDate, truncateText } from '../utils/formatters';
import { StatusBadge, PriorityBadge, SentimentBadge, CategoryBadge, AnalysisSourceBadge } from '../components/common/Badge';
import { Button } from '../components/common/Button';
import { Modal } from '../components/common/Modal';
import { LoadingState, EmptyState, ErrorState } from '../components/common/States';
import { useToast } from '../context/ToastContext';

export function ComplaintsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { success, error: toastError } = useToast();

  const [complaints, setComplaints] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [size] = useState(20);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState(searchParams.get('q') || '');
  const [statusFilter, setStatusFilter] = useState(searchParams.get('status') || '');
  const [categoryFilter, setCategoryFilter] = useState(searchParams.get('category') || '');
  const [sentimentFilter, setSentimentFilter] = useState(searchParams.get('sentiment') || '');

  // Side Drawer detail
  const [selectedComplaint, setSelectedComplaint] = useState(null);

  // CSV Import Modal state
  const [isImportModalOpen, setIsImportModalOpen] = useState(searchParams.get('import') === 'true');
  const [importFile, setImportFile] = useState(null);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState(null);

  const fetchComplaints = useCallback(async () => {
    setLoading(true);
    setFetchError(null);
    try {
      const params = {
        page,
        size,
        status: statusFilter || undefined,
        category: categoryFilter || undefined,
        sentiment: sentimentFilter || undefined,
        q: searchQuery.trim() || undefined
      };
      const res = await api.getComplaints(params);
      setComplaints(res.items || []);
      setTotal(res.total || 0);
    } catch (err) {
      setFetchError(err);
    } finally {
      setLoading(false);
    }
  }, [page, size, statusFilter, categoryFilter, sentimentFilter, searchQuery]);

  useEffect(() => {
    fetchComplaints();
  }, [fetchComplaints]);

  // Sync import param
  useEffect(() => {
    if (searchParams.get('import') === 'true') {
      setIsImportModalOpen(true);
    }
  }, [searchParams]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setPage(1);
    fetchComplaints();
  };

  const clearFilters = () => {
    setSearchQuery('');
    setStatusFilter('');
    setCategoryFilter('');
    setSentimentFilter('');
    setPage(1);
  };

  const handleCsvUpload = async (e) => {
    e.preventDefault();
    if (!importFile) return;

    setImporting(true);
    setImportResult(null);
    try {
      const res = await api.importCsv(importFile);
      setImportResult(res);
      success(`Successfully imported ${res.imported} complaints (${res.failed} failed)`);
      fetchComplaints();
    } catch (err) {
      toastError(err.message || "CSV import failed.");
      setImportResult({ imported: 0, failed: 1, errors: [{ row: 0, message: err.message }] });
    } finally {
      setImporting(false);
    }
  };

  const totalPages = Math.ceil(total / size) || 1;

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Complaints Feed</h1>
          <p className="text-xs text-slate-500 mt-1">
            Real-time ingested customer reports across all digital channels ({total} total).
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            icon={RefreshCw}
            onClick={fetchComplaints}
            loading={loading}
          >
            Refresh
          </Button>
          <Button
            variant="brand"
            size="sm"
            icon={UploadCloud}
            onClick={() => setIsImportModalOpen(true)}
          >
            Import CSV
          </Button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs space-y-3">
        <form onSubmit={handleSearchSubmit} className="flex flex-col md:flex-row items-stretch gap-3">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by customer name, ticket ID, or keywords..."
              className="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-600 focus:border-transparent bg-slate-50/50 hover:bg-white transition-colors"
            />
          </div>

          {/* Status Dropdown */}
          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
            className="text-xs border border-slate-200 rounded-lg px-3 py-2 bg-slate-50/50 focus:outline-none focus:ring-2 focus:ring-purple-600 text-slate-700 font-medium"
          >
            <option value="">All Statuses</option>
            <option value="new">New</option>
            <option value="linked">Linked</option>
            <option value="possible_recurrence">Possible Recurrence</option>
            <option value="resolved">Resolved</option>
          </select>

          {/* Category Dropdown */}
          <select
            value={categoryFilter}
            onChange={(e) => { setCategoryFilter(e.target.value); setPage(1); }}
            className="text-xs border border-slate-200 rounded-lg px-3 py-2 bg-slate-50/50 focus:outline-none focus:ring-2 focus:ring-purple-600 text-slate-700 font-medium"
          >
            <option value="">All Categories</option>
            <option value="billing">Billing</option>
            <option value="payment">Payment</option>
            <option value="login">Login</option>
            <option value="delivery">Delivery</option>
            <option value="performance">Performance</option>
            <option value="bug">Bug</option>
            <option value="account">Account</option>
            <option value="other">Other</option>
          </select>

          {/* Sentiment Dropdown */}
          <select
            value={sentimentFilter}
            onChange={(e) => { setSentimentFilter(e.target.value); setPage(1); }}
            className="text-xs border border-slate-200 rounded-lg px-3 py-2 bg-slate-50/50 focus:outline-none focus:ring-2 focus:ring-purple-600 text-slate-700 font-medium"
          >
            <option value="">All Sentiments</option>
            <option value="frustrated">Frustrated</option>
            <option value="negative">Negative</option>
            <option value="neutral">Neutral</option>
            <option value="positive">Positive</option>
          </select>

          {(searchQuery || statusFilter || categoryFilter || sentimentFilter) && (
            <Button variant="ghost" size="sm" onClick={clearFilters} className="text-slate-500 text-xs">
              Reset
            </Button>
          )}
        </form>
      </div>

      {/* Complaints Table */}
      <div className="bg-white rounded-xl border border-slate-200/80 shadow-xs overflow-hidden">
        {loading ? (
          <LoadingState message="Fetching complaints telemetry..." />
        ) : fetchError ? (
          <ErrorState error={fetchError} onRetry={fetchComplaints} />
        ) : complaints.length === 0 ? (
          <EmptyState
            title="No complaints found"
            description="No customer complaints match your search and filter criteria."
            actionText="Clear Filters"
            onAction={clearFilters}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200/80 bg-slate-50/75 text-slate-500 font-semibold tracking-wider uppercase text-[10px]">
                  <th className="py-3 px-4 w-16">ID</th>
                  <th className="py-3 px-4 w-44">Customer</th>
                  <th className="py-3 px-4 min-w-[280px]">Complaint Summary</th>
                  <th className="py-3 px-4 w-28">Category</th>
                  <th className="py-3 px-4 w-28">Sentiment</th>
                  <th className="py-3 px-4 w-24">Urgency</th>
                  <th className="py-3 px-4 w-28">Status</th>
                  <th className="py-3 px-4 w-28">Incident</th>
                  <th className="py-3 px-4 w-32">Received</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {complaints.map((item) => (
                  <tr
                    key={item.id}
                    onClick={() => setSelectedComplaint(item)}
                    className="hover:bg-slate-50/80 cursor-pointer transition-colors group"
                  >
                    <td className="py-3.5 px-4 font-mono font-semibold text-slate-900">
                      #{item.id}
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-medium text-slate-900 group-hover:text-purple-600 transition-colors">
                        {item.customer_name}
                      </div>
                      {item.customer_contact && (
                        <div className="text-[11px] text-slate-400 truncate max-w-[150px]">
                          {item.customer_contact}
                        </div>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-slate-700">
                      <p className="line-clamp-2 leading-relaxed" title={item.text}>
                        {truncateText(item.text, 110)}
                      </p>
                    </td>
                    <td className="py-3.5 px-4">
                      <CategoryBadge category={item.category} />
                    </td>
                    <td className="py-3.5 px-4">
                      <SentimentBadge sentiment={item.sentiment} />
                    </td>
                    <td className="py-3.5 px-4">
                      <PriorityBadge priority={item.urgency} />
                    </td>
                    <td className="py-3.5 px-4">
                      <StatusBadge status={item.status} type="complaint" />
                    </td>
                    <td className="py-3.5 px-4">
                      {item.incident_id ? (
                        <Link
                          to={`/incidents/${item.incident_id}`}
                          onClick={(e) => e.stopPropagation()}
                          className="inline-flex items-center gap-1 font-mono font-medium text-purple-600 hover:text-purple-800 hover:underline"
                        >
                          <Layers className="w-3 h-3" />
                          #{item.incident_id}
                        </Link>
                      ) : (
                        <span className="text-slate-300 font-mono">—</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-slate-500 whitespace-nowrap text-[11px]">
                      {formatDate(item.created_at)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Bar */}
        {total > 0 && (
          <div className="px-4 py-3 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between">
            <span className="text-xs text-slate-500">
              Showing <span className="font-medium text-slate-800">{Math.min((page - 1) * size + 1, total)}</span> to{' '}
              <span className="font-medium text-slate-800">{Math.min(page * size, total)}</span> of{' '}
              <span className="font-medium text-slate-800">{total}</span> complaints
            </span>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                icon={ChevronLeft}
                disabled={page <= 1 || loading}
                onClick={() => setPage(p => Math.max(p - 1, 1))}
              >
                Previous
              </Button>
              <span className="text-xs font-mono text-slate-600 px-2">
                Page {page} of {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= totalPages || loading}
                onClick={() => setPage(p => Math.min(p + 1, totalPages))}
              >
                Next <ChevronRight className="w-3.5 h-3.5 ml-1" />
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Side Slide-Over Panel for Complaint Details */}
      {selectedComplaint && (
        <div className="fixed inset-0 z-50 overflow-hidden">
          <div 
            className="absolute inset-0 bg-slate-950/30 backdrop-blur-xs transition-opacity" 
            onClick={() => setSelectedComplaint(null)} 
          />
          <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
            <div className="w-screen max-w-md bg-white shadow-2xl border-l border-slate-200 flex flex-col animate-in slide-in-from-right duration-200">
              {/* Drawer Header */}
              <div className="p-5 border-b border-slate-100 flex items-start justify-between bg-slate-50/50">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm font-bold text-slate-900">
                      Complaint #{selectedComplaint.id}
                    </span>
                    <AnalysisSourceBadge source={selectedComplaint.analysis_source} />
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Received {formatDate(selectedComplaint.created_at, true)}
                  </p>
                </div>
                <button
                  onClick={() => setSelectedComplaint(null)}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Drawer Content */}
              <div className="flex-1 overflow-y-auto p-5 space-y-6 text-xs">
                {/* Customer Details */}
                <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200/70 space-y-2">
                  <div className="text-[11px] font-semibold uppercase text-slate-400 tracking-wider">
                    Customer Profile
                  </div>
                  <div className="text-sm font-semibold text-slate-900">
                    {selectedComplaint.customer_name}
                  </div>
                  <div className="text-xs text-slate-600 font-mono">
                    {selectedComplaint.customer_contact || 'No direct contact provided'}
                  </div>
                </div>

                {/* AI Classification Badges */}
                <div className="space-y-3">
                  <div className="text-[11px] font-semibold uppercase text-slate-400 tracking-wider">
                    AI Triage Attributes
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 rounded-lg border border-slate-100 bg-white shadow-2xs">
                      <span className="text-[11px] text-slate-400 block mb-1">Category</span>
                      <CategoryBadge category={selectedComplaint.category} />
                    </div>
                    <div className="p-3 rounded-lg border border-slate-100 bg-white shadow-2xs">
                      <span className="text-[11px] text-slate-400 block mb-1">Sentiment</span>
                      <SentimentBadge sentiment={selectedComplaint.sentiment} />
                    </div>
                    <div className="p-3 rounded-lg border border-slate-100 bg-white shadow-2xs">
                      <span className="text-[11px] text-slate-400 block mb-1">Urgency</span>
                      <PriorityBadge priority={selectedComplaint.urgency} />
                    </div>
                    <div className="p-3 rounded-lg border border-slate-100 bg-white shadow-2xs">
                      <span className="text-[11px] text-slate-400 block mb-1">Workflow Status</span>
                      <StatusBadge status={selectedComplaint.status} type="complaint" />
                    </div>
                  </div>
                </div>

                {/* Full Complaint Text (Untrusted - rendered plain text only) */}
                <div className="space-y-2">
                  <div className="text-[11px] font-semibold uppercase text-slate-400 tracking-wider">
                    Raw Complaint Text
                  </div>
                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 text-xs text-slate-800 leading-relaxed whitespace-pre-wrap font-sans">
                    {selectedComplaint.text}
                  </div>
                  <p className="text-[10px] text-slate-400 italic">
                    Rendered securely as plain text without HTML evaluation.
                  </p>
                </div>

                {/* Incident Association */}
                {selectedComplaint.incident_id ? (
                  <div className="p-4 rounded-xl bg-purple-50/70 border border-purple-200 space-y-2">
                    <div className="flex items-center gap-1.5 text-purple-900 font-semibold text-xs">
                      <Layers className="w-4 h-4 text-purple-700" />
                      Associated Incident #{selectedComplaint.incident_id}
                    </div>
                    <p className="text-xs text-purple-800">
                      This complaint has been clustered into active incident #{selectedComplaint.incident_id}.
                    </p>
                    <Link
                      to={`/incidents/${selectedComplaint.incident_id}`}
                      className="inline-flex items-center gap-1.5 text-xs font-semibold text-purple-700 hover:text-purple-900 underline mt-1"
                    >
                      Open Incident Investigation <ExternalLink className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                ) : (
                  <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200 text-slate-500 text-xs">
                    This complaint is currently stand-alone and has not been clustered into an incident.
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CSV Import Modal (Spec Requirement) */}
      <Modal
        isOpen={isImportModalOpen}
        onClose={() => {
          setIsImportModalOpen(false);
          setImportFile(null);
          setImportResult(null);
        }}
        title="Import Complaints via CSV"
        description="Upload a CSV file containing customer complaints to run bulk AI classification and incident clustering."
      >
        <div className="space-y-4">
          <form onSubmit={handleCsvUpload} className="space-y-4">
            <div className="p-4 border-2 border-dashed border-slate-200 hover:border-purple-400 rounded-xl bg-slate-50/50 text-center transition-colors">
              <FileSpreadsheet className="w-8 h-8 text-purple-600 mx-auto mb-2" />
              <p className="text-xs font-semibold text-slate-800">
                {importFile ? importFile.name : 'Select CSV file to upload'}
              </p>
              <p className="text-[11px] text-slate-400 mt-1">
                Required header columns: <code className="font-mono text-purple-700">customer_name,customer_contact,text</code>
              </p>
              <input
                type="file"
                accept=".csv"
                onChange={(e) => setImportFile(e.target.files?.[0] || null)}
                className="mt-3 block w-full text-xs text-slate-500 file:mr-4 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-purple-50 file:text-purple-700 hover:file:bg-purple-100 cursor-pointer"
              />
            </div>

            {/* Results Display */}
            {importResult && (
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-2">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-1.5 text-emerald-700 font-semibold">
                    <CheckCircle2 className="w-4 h-4" />
                    Imported: {importResult.imported}
                  </div>
                  {importResult.failed > 0 && (
                    <div className="flex items-center gap-1.5 text-rose-700 font-semibold">
                      <AlertCircle className="w-4 h-4" />
                      Failed: {importResult.failed}
                    </div>
                  )}
                </div>

                {importResult.errors && importResult.errors.length > 0 && (
                  <div className="mt-3 border-t border-slate-200 pt-2">
                    <p className="text-[11px] font-semibold text-rose-800 mb-1">Row Errors:</p>
                    <div className="max-h-32 overflow-y-auto space-y-1">
                      {importResult.errors.map((err, i) => (
                        <div key={i} className="text-[11px] text-rose-700 font-mono bg-rose-50 px-2 py-0.5 rounded">
                          Row {err.row}: {err.message}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  setIsImportModalOpen(false);
                  setImportFile(null);
                  setImportResult(null);
                }}
              >
                Close
              </Button>
              <Button
                type="submit"
                variant="brand"
                size="sm"
                icon={UploadCloud}
                loading={importing}
                disabled={!importFile || importing}
              >
                Start Bulk Ingestion
              </Button>
            </div>
          </form>
        </div>
      </Modal>
    </div>
  );
}
