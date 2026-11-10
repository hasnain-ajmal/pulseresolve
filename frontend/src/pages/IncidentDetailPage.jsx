import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { 
  AlertOctagon, 
  ArrowLeft, 
  Sparkles, 
  CheckCircle2, 
  XCircle, 
  Layers, 
  Clock, 
  Search, 
  Users, 
  CheckSquare, 
  Square, 
  AlertTriangle, 
  History, 
  ArrowRight, 
  ShieldAlert, 
  ExternalLink,
  RotateCcw,
  Zap
} from 'lucide-react';
import { api } from '../api';
import { formatDate, formatRelativeTime } from '../utils/formatters';
import { StatusBadge, PriorityBadge, SentimentBadge, CategoryBadge } from '../components/common/Badge';
import { AIBadge, AIPill } from '../components/common/AIBadge';
import { Button } from '../components/common/Button';
import { Modal } from '../components/common/Modal';
import { Card, CardHeader, CardBody } from '../components/common/Card';
import { LoadingState, EmptyState, ErrorState } from '../components/common/States';
import { useToast } from '../context/ToastContext';
import { UnassignedComplaints } from '../components/common/UnassignedComplaints';
import { TeamSelect } from '../components/common/TeamSelect';

export function IncidentDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { success, error: toastError } = useToast();

  const [incident, setIncident] = useState(null);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(null);

  // Investigation checklist local interactive state
  const [checkedActions, setCheckedActions] = useState({});

  // Action Modals State
  const [isApproveModalOpen, setIsApproveModalOpen] = useState(false);
  const [approveTeam, setApproveTeam] = useState('');
  const [approvePriority, setApprovePriority] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState('');

  const [isResolveModalOpen, setIsResolveModalOpen] = useState(false);
  const [resolutionNote, setResolutionNote] = useState('');

  const [isReopenModalOpen, setIsReopenModalOpen] = useState(false);
  const [reopenNote, setReopenNote] = useState('');

  // Row highlight ref when cited complaint is clicked
  const [highlightedComplaintId, setHighlightedComplaintId] = useState(null);
  const complaintRowRefs = useRef({});

  const fetchIncidentDetail = useCallback(async () => {
    setLoading(true);
    setFetchError(null);
    try {
      const data = await api.getIncidentDetail(id);
      setIncident(data);
      setApproveTeam(data.assigned_team || '');
      setApprovePriority(data.priority || 'medium');
    } catch (err) {
      setFetchError(err);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchIncidentDetail();
  }, [fetchIncidentDetail]);

  const toggleChecklist = (index) => {
    setCheckedActions(prev => ({
      ...prev,
      [index]: !prev[index]
    }));
  };

  const scrollToComplaint = (complaintId) => {
    setHighlightedComplaintId(complaintId);
    const element = complaintRowRefs.current[complaintId];
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
    setTimeout(() => {
      setHighlightedComplaintId(null);
    }, 2800);
  };

  // Action Handlers
  const handleApprove = async (e) => {
    e.preventDefault();
    setActionLoading(true);
    try {
      const updated = await api.approveIncident(incident.id, {
        assigned_team: approveTeam.trim() || undefined,
        priority: approvePriority || undefined
      });
      setIncident(updated);
      setIsApproveModalOpen(false);
      success("Incident approved. Status updated to Open.");
    } catch (err) {
      toastError(err.message || "Failed to approve incident.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async (e) => {
    e.preventDefault();
    if (!rejectReason || rejectReason.trim().length < 3) {
      toastError("Please provide a rejection reason (minimum 3 characters).");
      return;
    }
    setActionLoading(true);
    try {
      const updated = await api.rejectIncident(incident.id, {
        reason: rejectReason.trim()
      });
      setIncident(updated);
      setIsRejectModalOpen(false);
      success("Incident rejected. Linked complaints have been unlinked.");
    } catch (err) {
      toastError(err.message || "Failed to reject incident.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleMarkInvestigating = async () => {
    setActionLoading(true);
    try {
      const updated = await api.updateIncident(incident.id, {
        status: 'investigating'
      });
      setIncident(updated);
      success("Status updated to Investigating.");
    } catch (err) {
      toastError(err.message || "Failed to update incident.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleResolve = async (e) => {
    e.preventDefault();
    if (!resolutionNote || resolutionNote.trim().length < 3) {
      toastError("Please provide a resolution note (minimum 3 characters).");
      return;
    }
    setActionLoading(true);
    try {
      const updated = await api.resolveIncident(incident.id, {
        resolution_note: resolutionNote.trim()
      });
      setIncident(updated);
      setIsResolveModalOpen(false);
      success("Incident resolved. All linked complaints updated to Resolved.");
    } catch (err) {
      toastError(err.message || "Failed to resolve incident.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleReopen = async (e) => {
    e.preventDefault();
    setActionLoading(true);
    try {
      const updated = await api.reopenIncident(incident.id, {
        note: reopenNote.trim() || undefined
      });
      setIncident(updated);
      setIsReopenModalOpen(false);
      success("Incident reopened. Recurrence complaints folded into incident.");
    } catch (err) {
      toastError(err.message || "Failed to reopen incident.");
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-slate-200/80 p-12">
        <LoadingState message="Assembling incident intelligence cluster..." />
      </div>
    );
  }

  if (fetchError || !incident) {
    return (
      <div className="bg-white rounded-xl border border-slate-200/80 p-12">
        <ErrorState
          title="Incident Not Found"
          error={fetchError || "The requested incident record does not exist."}
          onRetry={fetchIncidentDetail}
        />
        <div className="mt-4 text-center">
          <Link to="/incidents" className="text-xs text-purple-600 hover:underline">
            &larr; Back to Incidents Triage
          </Link>
        </div>
      </div>
    );
  }

  const isSuggested = incident.status === 'suggested';
  const isOpen = incident.status === 'open';
  const isInvestigating = incident.status === 'investigating';
  const isResolved = incident.status === 'resolved';
  const isRejected = incident.status === 'rejected';

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-16">
      {/* Back button & quick breadcrumb */}
      <div className="flex items-center justify-between">
        <Link
          to="/incidents"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-slate-900 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to Incidents List
        </Link>
        <span className="text-xs font-mono text-slate-400">
          Last updated {formatRelativeTime(incident.updated_at)}
        </span>
      </div>

      {/* State-Specific Alert Banners */}
      {isSuggested && (
        <div className="p-4 rounded-xl bg-gradient-to-r from-purple-50 via-purple-50/70 to-indigo-50/50 border border-purple-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-in fade-in duration-200">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-purple-100 flex items-center justify-center shrink-0 mt-0.5 text-purple-700">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-purple-900 uppercase tracking-wider">AI Cluster Suggestion</span>
                <span className="text-[10px] bg-purple-200 text-purple-800 px-2 py-0.2 rounded-full font-medium">Pending Review</span>
              </div>
              <p className="text-xs text-purple-950 mt-0.5">
                Suggested by AI based on complaint telemetry correlation. Review hypotheses and grouping evidence, then approve into active investigation or reject.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsRejectModalOpen(true)}
              className="text-slate-700 bg-white hover:bg-slate-50 border-slate-200 text-xs"
            >
              Reject Suggestion
            </Button>
            <Button
              variant="brand"
              size="sm"
              onClick={() => setIsApproveModalOpen(true)}
              icon={CheckCircle2}
              className="text-xs"
            >
              Approve Incident
            </Button>
          </div>
        </div>
      )}

      {/* Warning banner if resolved incident has new matching recurrence complaints (Spec requirement) */}
      {isResolved && incident.new_matching_complaints > 0 && (
        <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-in fade-in">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center shrink-0 mt-0.5 text-amber-800">
              <AlertTriangle className="w-4 h-4" />
            </div>
            <div>
              <span className="text-xs font-bold text-amber-900 uppercase tracking-wider">Potential Issue Recurrence</span>
              <p className="text-xs text-amber-950 mt-0.5">
                <strong>{incident.new_matching_complaints} new matching complaints</strong> arrived after this incident was resolved. Symptoms may have re-occurred in production.
              </p>
            </div>
          </div>
          <Button
            variant="danger"
            size="sm"
            onClick={() => setIsReopenModalOpen(true)}
            icon={RotateCcw}
            className="text-xs shrink-0 self-end sm:self-center"
          >
            Reopen Incident
          </Button>
        </div>
      )}

      {/* Incident Header (Section 1) */}
      <div className="bg-white rounded-xl border border-slate-200/80 shadow-xs p-6 space-y-4">
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
          <div className="space-y-1.5 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-mono text-xs font-bold text-slate-700 px-2 py-0.5 rounded bg-slate-100 border border-slate-200">
                INC-{incident.id}
              </span>
              <span className="text-xs font-mono font-medium text-slate-600 bg-slate-100 px-2 py-0.5 rounded">
                Service: {incident.affected_service}
              </span>
              <StatusBadge status={incident.status} type="incident" />
              <PriorityBadge priority={incident.priority} />
            </div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
              {incident.title}
            </h1>
          </div>

          {/* Context-Sensitive Action Buttons (Spec Transitions) */}
          <div className="flex flex-wrap items-center gap-2 self-start">
            {isSuggested && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsRejectModalOpen(true)}
                  disabled={actionLoading}
                >
                  Reject
                </Button>
                <Button
                  variant="brand"
                  size="sm"
                  onClick={() => setIsApproveModalOpen(true)}
                  icon={CheckCircle2}
                  disabled={actionLoading}
                >
                  Approve
                </Button>
              </>
            )}

            {isOpen && (
              <>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={handleMarkInvestigating}
                  icon={Search}
                  loading={actionLoading}
                >
                  Mark Investigating
                </Button>
                <Button
                  variant="brand"
                  size="sm"
                  onClick={() => setIsResolveModalOpen(true)}
                  icon={CheckCircle2}
                  disabled={actionLoading}
                >
                  Resolve Incident
                </Button>
              </>
            )}

            {isInvestigating && (
              <Button
                variant="brand"
                size="sm"
                onClick={() => setIsResolveModalOpen(true)}
                icon={CheckCircle2}
                disabled={actionLoading}
              >
                Resolve Incident
              </Button>
            )}

            {isResolved && incident.new_matching_complaints === 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsReopenModalOpen(true)}
                icon={RotateCcw}
                disabled={actionLoading}
              >
                Reopen Incident
              </Button>
            )}

            {isRejected && (
              <span className="text-xs text-slate-400 font-mono italic">
                Closed as Rejected
              </span>
            )}
          </div>
        </div>

        {/* Meta Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4 border-t border-slate-100 text-xs">
          <div>
            <span className="text-slate-400 block text-[11px]">Assigned Team</span>
            <span className="font-medium text-slate-800">
              {incident.assigned_team || 'Unassigned'}
            </span>
          </div>
          <div>
            <span className="text-slate-400 block text-[11px]">Linked Complaints</span>
            <span className="font-semibold text-purple-700 font-mono">
              {incident.complaint_count} customer reports
            </span>
          </div>
          <div>
            <span className="text-slate-400 block text-[11px]">Incident Created</span>
            <span className="text-slate-700">
              {formatDate(incident.created_at)}
            </span>
          </div>
          <div>
            <span className="text-slate-400 block text-[11px]">Resolution Status</span>
            <span className="text-slate-700">
              {incident.resolved_at ? `Resolved at ${formatDate(incident.resolved_at)}` : 'Active / Unresolved'}
            </span>
          </div>
        </div>
      </div>

      {/* Grid: Main Investigation Sections (Left) & Supporting Data (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (2 Cols) */}
        <div className="lg:col-span-2 space-y-6">
          {/* Section 1 & 2: AI Summary and Shared Symptoms */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between w-full">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-slate-900">Incident Intelligence Brief</h3>
                  <AIPill text="Synthesis" />
                </div>
                <AIBadge />
              </div>
            </CardHeader>
            <CardBody className="space-y-4">
              <div>
                <p className="text-xs text-slate-700 leading-relaxed font-sans">
                  {incident.summary || "AI analysis of correlated tickets indicates systemic degradation in core transaction pathways."}
                </p>
              </div>

              {/* Shared Symptoms Chips (Section 2) */}
              {incident.shared_symptoms && incident.shared_symptoms.length > 0 && (
                <div className="pt-3 border-t border-slate-100">
                  <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block mb-2">
                    Correlated Shared Symptoms
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {incident.shared_symptoms.map((symptom, idx) => (
                      <span
                        key={idx}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-slate-100 text-slate-700 border border-slate-200/80"
                      >
                        <span className="w-1.5 h-1.5 rounded-full bg-purple-500"></span>
                        {symptom}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </CardBody>
          </Card>

          {/* Section 4: Possible Root Causes (Hypotheses) */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between w-full">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Possible Root Causes (AI Hypotheses)</h3>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Unconfirmed hypotheses synthesized from incoming error patterns and user descriptions.
                  </p>
                </div>
                <AIBadge />
              </div>
            </CardHeader>
            <CardBody className="space-y-3">
              {incident.hypotheses && incident.hypotheses.length > 0 ? (
                incident.hypotheses.map((item, idx) => {
                  const conf = (item.confidence || 'medium').toLowerCase();
                  return (
                    <div
                      key={idx}
                      className="p-4 rounded-xl border border-slate-200/80 bg-slate-50/40 hover:bg-slate-50 transition-colors space-y-2.5"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-2">
                          <span className="w-5 h-5 rounded-full bg-purple-100 text-purple-700 flex items-center justify-center text-[10px] font-bold shrink-0">
                            H{idx + 1}
                          </span>
                          <span className="text-xs font-semibold text-slate-900">
                            Possible Cause:
                          </span>
                        </div>
                        <span
                          className={`text-[10px] font-semibold px-2 py-0.5 rounded-full uppercase tracking-wider border ${
                            conf === 'high'
                              ? 'bg-rose-50 text-rose-700 border-rose-200'
                              : conf === 'medium'
                              ? 'bg-amber-50 text-amber-700 border-amber-200'
                              : 'bg-slate-100 text-slate-600 border-slate-200'
                          }`}
                        >
                          {conf} confidence
                        </span>
                      </div>

                      {/* Hypothesis Text (Must state possible, never certain) */}
                      <p className="text-xs text-slate-700 leading-relaxed pl-7">
                        {item.text}
                      </p>

                      {/* Interactive Citation Links (Spec requirement: scroll to row) */}
                      {item.cited_complaint_ids && item.cited_complaint_ids.length > 0 && (
                        <div className="pl-7 pt-1 flex items-center gap-2 text-[11px]">
                          <span className="text-slate-400 font-medium">Cited telemetry evidence:</span>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            {item.cited_complaint_ids.map((cId) => (
                              <button
                                key={cId}
                                onClick={() => scrollToComplaint(cId)}
                                className="font-mono text-[11px] font-semibold text-purple-600 hover:text-purple-800 bg-purple-50 hover:bg-purple-100 px-2 py-0.5 rounded border border-purple-200/60 transition-colors flex items-center gap-1"
                                title={`Scroll to linked complaint #${cId}`}
                              >
                                <span>#{cId}</span>
                                <ArrowRight className="w-2.5 h-2.5" />
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })
              ) : (
                <p className="text-xs text-slate-400 italic">No specific hypotheses recorded.</p>
              )}
            </CardBody>
          </Card>

          {/* Section 3: Why These Complaints Were Grouped (Evidence Section) */}
          <Card>
            <CardHeader>
              <div>
                <h3 className="text-sm font-bold text-slate-900">Clustering Evidence &amp; Pairwise Similarity</h3>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Semantic distance metrics and keyword correlations justifying grouping.
                </p>
              </div>
            </CardHeader>
            <CardBody className="space-y-3">
              {incident.evidence && incident.evidence.length > 0 ? (
                incident.evidence.map((ev, idx) => {
                  const percent = Math.round((ev.similarity || 0) * 100);
                  return (
                    <div
                      key={idx}
                      className="p-3.5 rounded-lg border border-slate-100 bg-slate-50/30 space-y-2"
                    >
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => scrollToComplaint(ev.complaint_a)}
                            className="font-mono font-semibold text-purple-700 hover:underline"
                          >
                            Complaint #{ev.complaint_a}
                          </button>
                          <span className="text-slate-400">&harr;</span>
                          <button
                            onClick={() => scrollToComplaint(ev.complaint_b)}
                            className="font-mono font-semibold text-purple-700 hover:underline"
                          >
                            Complaint #{ev.complaint_b}
                          </button>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-semibold text-slate-700">
                            {percent}% similarity
                          </span>
                        </div>
                      </div>

                      {/* Visual Similarity Progress Bar */}
                      <div className="w-full bg-slate-200 rounded-full h-1.5 overflow-hidden">
                        <div
                          className="bg-gradient-to-r from-purple-500 to-indigo-600 h-1.5 rounded-full transition-all duration-300"
                          style={{ width: `${percent}%` }}
                        />
                      </div>

                      <p className="text-xs text-slate-600 leading-relaxed font-sans">
                        {ev.reason}
                      </p>
                    </div>
                  );
                })
              ) : (
                <p className="text-xs text-slate-400 italic">No pairwise evidence available.</p>
              )}
            </CardBody>
          </Card>

          {/* Section 6: Linked Complaints Table */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between w-full">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Linked Customer Complaints</h3>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    {incident.complaints?.length || 0} customer tickets tied directly to this incident lifecycle.
                  </p>
                </div>
                <span className="text-xs font-mono font-medium text-purple-700 bg-purple-50 px-2 py-0.5 rounded border border-purple-200/60">
                  Auto-updated on resolve
                </span>
              </div>
            </CardHeader>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/75 text-slate-500 uppercase text-[10px] font-semibold">
                    <th className="py-2.5 px-3 w-16">ID</th>
                    <th className="py-2.5 px-3 w-36">Customer</th>
                    <th className="py-2.5 px-3">Complaint Text</th>
                    <th className="py-2.5 px-3 w-24">Sentiment</th>
                    <th className="py-2.5 px-3 w-20">Urgency</th>
                    <th className="py-2.5 px-3 w-24">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {incident.complaints && incident.complaints.length > 0 ? (
                    incident.complaints.map((c) => {
                      const isHighlighted = highlightedComplaintId === c.id;
                      return (
                        <tr
                          key={c.id}
                          ref={el => complaintRowRefs.current[c.id] = el}
                          className={`transition-colors ${
                            isHighlighted
                              ? 'bg-purple-100 ring-2 ring-purple-500/50'
                              : 'hover:bg-slate-50/80'
                          }`}
                        >
                          <td className="py-3 px-3 font-mono font-bold text-slate-900">
                            #{c.id}
                          </td>
                          <td className="py-3 px-3">
                            <div className="font-medium text-slate-900">{c.customer_name}</div>
                            {c.customer_contact && (
                              <div className="text-[10px] text-slate-400 truncate max-w-[120px]">{c.customer_contact}</div>
                            )}
                          </td>
                          <td className="py-3 px-3 text-slate-700 leading-relaxed font-sans max-w-sm">
                            {c.text}
                          </td>
                          <td className="py-3 px-3">
                            <SentimentBadge sentiment={c.sentiment} />
                          </td>
                          <td className="py-3 px-3">
                            <PriorityBadge priority={c.urgency} />
                          </td>
                          <td className="py-3 px-3">
                            <StatusBadge status={c.status} type="complaint" />
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={6} className="py-6 text-center text-slate-400 text-xs">
                        No linked complaints attached to this incident.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </div>

        {/* Right Column (1 Col): Actions Checklist & Status History */}
        <div className="space-y-6">
          {/* Section 5: Suggested Investigation Checklist */}
          <Card>
            <CardHeader>
              <div>
                <h3 className="text-sm font-bold text-slate-900">Suggested Action Checklist</h3>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  AI-recommended runbook tasks for on-call engineers.
                </p>
              </div>
            </CardHeader>
            <CardBody className="space-y-2.5">
              {incident.suggested_actions && incident.suggested_actions.length > 0 ? (
                incident.suggested_actions.map((action, idx) => {
                  const isChecked = Boolean(checkedActions[idx]);
                  return (
                    <div
                      key={idx}
                      onClick={() => toggleChecklist(idx)}
                      className={`p-3 rounded-lg border transition-all cursor-pointer flex items-start gap-2.5 text-xs select-none ${
                        isChecked
                          ? 'bg-emerald-50/50 border-emerald-200 text-emerald-900 line-through'
                          : 'bg-white border-slate-200/80 hover:border-purple-300 text-slate-800'
                      }`}
                    >
                      <button type="button" className="shrink-0 mt-0.5 text-purple-600">
                        {isChecked ? (
                          <CheckSquare className="w-4 h-4 text-emerald-600" />
                        ) : (
                          <Square className="w-4 h-4 text-slate-400" />
                        )}
                      </button>
                      <span className="leading-snug">{action}</span>
                    </div>
                  );
                })
              ) : (
                <p className="text-xs text-slate-400 italic">No automated action steps generated.</p>
              )}
            </CardBody>
          </Card>

          {/* Section 7: Incident Status History Timeline */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <History className="w-4 h-4 text-slate-400" />
                <h3 className="text-sm font-bold text-slate-900">Audit &amp; Status Timeline</h3>
              </div>
            </CardHeader>
            <CardBody>
              <div className="relative pl-6 space-y-5 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
                {incident.history && incident.history.length > 0 ? (
                  incident.history.map((entry, idx) => (
                    <div key={idx} className="relative text-xs">
                      {/* Timeline dot */}
                      <span className="absolute -left-6 top-1 w-2.5 h-2.5 rounded-full bg-purple-600 ring-4 ring-white" />
                      <div className="flex items-center justify-between gap-1">
                        <span className="font-semibold text-slate-800">
                          {entry.from_status ? `${entry.from_status} → ${entry.to_status}` : entry.to_status}
                        </span>
                        <span className="text-[10px] text-slate-400 whitespace-nowrap">
                          {formatRelativeTime(entry.at)}
                        </span>
                      </div>
                      <p className="text-slate-600 mt-1 leading-relaxed bg-slate-50 p-2 rounded border border-slate-100">
                        {entry.note || 'Status updated'}
                      </p>
                      <span className="text-[10px] text-slate-400 block mt-1 font-mono">
                        Actor: {entry.actor}
                      </span>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-slate-400 italic">No transition history recorded.</p>
                )}
              </div>
            </CardBody>
          </Card>
        </div>
      </div>

      {/* APPROVE MODAL (Spec: suggested -> open, optional team & priority) */}
      <Modal
        isOpen={isApproveModalOpen}
        onClose={() => setIsApproveModalOpen(false)}
        title="Approve AI Incident Suggestion"
        description="Confirm this AI-correlated incident to promote it to Open status and dispatch to operations."
      >
        <form onSubmit={handleApprove} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Assign to Team <span className="text-slate-400 font-normal">(Optional)</span>
            </label>
            <TeamSelect value={approveTeam} onChange={setApproveTeam} optional id="approve-team" />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Incident Priority
            </label>
            <select
              value={approvePriority}
              onChange={(e) => setApprovePriority(e.target.value)}
              className="w-full text-xs border border-slate-200 rounded-lg px-3 py-2 bg-white focus:ring-2 focus:ring-purple-600"
            >
              <option value="critical">Critical</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
            <Button variant="secondary" size="sm" onClick={() => setIsApproveModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="brand" size="sm" loading={actionLoading}>
              Confirm Approval
            </Button>
          </div>
        </form>
      </Modal>

      {/* REJECT MODAL (Spec: suggested -> rejected, required reason 3-300 chars, unlinks complaints) */}
      <Modal
        isOpen={isRejectModalOpen}
        onClose={() => setIsRejectModalOpen(false)}
        title="Reject Incident Suggestion"
        description="Rejecting will dismiss this incident and unlink all grouped complaints back to independent status."
      >
        <form onSubmit={handleReject} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Rejection Reason <span className="text-rose-500">* (3-300 characters)</span>
            </label>
            <textarea
              rows={3}
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Explain why these complaints should not be clustered together..."
              required
              minLength={3}
              maxLength={300}
              className="w-full text-xs border border-slate-200 rounded-lg p-2.5 focus:ring-2 focus:ring-purple-600"
            />
            <span className="text-[10px] text-slate-400 float-right">
              {rejectReason.length}/300
            </span>
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
            <Button variant="secondary" size="sm" onClick={() => setIsRejectModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="danger" size="sm" loading={actionLoading} disabled={rejectReason.trim().length < 3}>
              Reject and Unlink
            </Button>
          </div>
        </form>
      </Modal>

      {/* RESOLVE MODAL (Spec: open/investigating -> resolved, required note 3-500 chars, updates all linked complaints) */}
      <Modal
        isOpen={isResolveModalOpen}
        onClose={() => setIsResolveModalOpen(false)}
        title="Resolve Incident &amp; Close Linked Tickets"
        description="Resolving this incident marks all linked customer complaints as resolved simultaneously."
      >
        <form onSubmit={handleResolve} className="space-y-4">
          <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-xs text-emerald-900 flex items-start gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <span>
              This action will update all <strong>{incident.complaint_count} customer reports</strong> to "Resolved" in one atomic operation.
            </span>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Resolution Note &amp; Root Cause Summary <span className="text-rose-500">* (3-500 characters)</span>
            </label>
            <textarea
              rows={4}
              value={resolutionNote}
              onChange={(e) => setResolutionNote(e.target.value)}
              placeholder="Describe the hotfix deployed, configuration change, or mitigation applied..."
              required
              minLength={3}
              maxLength={500}
              className="w-full text-xs border border-slate-200 rounded-lg p-2.5 focus:ring-2 focus:ring-purple-600"
            />
            <span className="text-[10px] text-slate-400 float-right">
              {resolutionNote.length}/500
            </span>
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
            <Button variant="secondary" size="sm" onClick={() => setIsResolveModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="brand" size="sm" loading={actionLoading} disabled={resolutionNote.trim().length < 3}>
              Confirm Resolution
            </Button>
          </div>
        </form>
      </Modal>

      {/* REOPEN MODAL (Spec: resolved -> open, note required) */}
      <Modal
        isOpen={isReopenModalOpen}
        onClose={() => setIsReopenModalOpen(false)}
        title="Reopen Incident"
        description="Move this incident back to Open status and incorporate new recurring complaints."
      >
        <form onSubmit={handleReopen} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Reopening Note / Recurrence Observation
            </label>
            <textarea
              rows={3}
              value={reopenNote}
              onChange={(e) => setReopenNote(e.target.value)}
              placeholder="Describe new symptoms or why resolution was premature..."
              className="w-full text-xs border border-slate-200 rounded-lg p-2.5 focus:ring-2 focus:ring-purple-600"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
            <Button variant="secondary" size="sm" onClick={() => setIsReopenModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="danger" size="sm" loading={actionLoading}>
              Reopen Incident
            </Button>
          </div>
        </form>
      </Modal>

      {/* Context for triage: complaints that are not part of any incident */}
      <UnassignedComplaints
        title="Other complaints not in any incident"
        note="So you can see everything left to handle without leaving this page. Related ones may join an incident as more arrive."
      />
    </div>
  );
}
