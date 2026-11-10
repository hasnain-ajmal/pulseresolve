import React, { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Inbox, RefreshCw, UserPlus, CheckCircle2, Undo2, Trash2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../api';
import { formatRelativeTime, truncateText } from '../../utils/formatters';
import { CategoryBadge, SentimentBadge, PriorityBadge } from './Badge';
import { LoadingState, ErrorState } from './States';
import { Button } from './Button';
import { Modal } from './Modal';
import { TeamSelect } from './TeamSelect';
import { DeadlineSelect, DueChip } from './Deadlines';
import { useToast } from '../../context/ToastContext';

const URGENCY_RANK = { critical: 4, high: 3, medium: 2, low: 1 };

/**
 * Standalone complaints: complaints that are NOT part of any incident.
 * Staff can assign each one to a team, mark it resolved (with a note) and reopen it if needed.
 * Nothing is deleted: resolved complaints move to the "Resolved" list below and stay in the history.
 */
export function UnassignedComplaints({
  title = 'Standalone complaints (not part of any incident)',
  note = 'These did not match any incident. Assign them to a team and mark them resolved when done. They can still join an incident if related complaints arrive.',
}) {
  const { success, error: toastError } = useToast();
  const { user } = useAuth();
  const isLead = user?.role === 'lead'; // only the lead (admin) can delete or restore; the server enforces it too
  const [deletedItems, setDeletedItems] = useState([]);
  const [showBin, setShowBin] = useState(false);
  const [open, setOpen] = useState([]);
  const [done, setDone] = useState([]);
  const [showDone, setShowDone] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [dialog, setDialog] = useState(null); // { type: 'assign' | 'resolve', complaint }
  const [text, setText] = useState('');
  const [due, setDue] = useState('');
  const [msg, setMsg] = useState(''); // message the customer will see when they check their complaint ID
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [a, b, d] = await Promise.all([
        api.getComplaints({ status: 'new', size: 100 }),
        api.getComplaints({ status: 'resolved', size: 100 }),
        api.getComplaints({ deleted: true, size: 100 }),
      ]);
      setDeletedItems((d.items || []).filter((c) => c.incident_id == null));
      const list = (a.items || []).filter((c) => c.incident_id == null);
      list.sort((x, y) => (URGENCY_RANK[y.urgency] || 0) - (URGENCY_RANK[x.urgency] || 0) || y.id - x.id);
      setOpen(list);
      setDone((b.items || []).filter((c) => c.incident_id == null));
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const openDialog = (type, complaint) => {
    setDialog({ type, complaint });
    setText(type === 'assign' ? complaint.assigned_team || '' : '');
    setDue('');
    setMsg('');
  };

  const submitDialog = async (e) => {
    e.preventDefault();
    if (!dialog) return;
    setBusy(true);
    try {
      if (dialog.type === 'assign') {
        await api.assignComplaint(dialog.complaint.id, text.trim(), due ? Number(due) : undefined);
        success(`Complaint #${dialog.complaint.id} assigned to ${text.trim()}`);
      } else if (dialog.type === 'delete') {
        await api.deleteComplaint(dialog.complaint.id, text.trim());
        success(`Complaint #${dialog.complaint.id} deleted. It is kept in the records and can be restored.`);
      } else {
        await api.resolveComplaint(dialog.complaint.id, text.trim(), msg.trim());
        success(`Complaint #${dialog.complaint.id} marked resolved`);
      }
      setDialog(null);
      await load();
    } catch (err) {
      toastError(err.message || 'Action failed');
    } finally {
      setBusy(false);
    }
  };

  const restore = async (c) => {
    try {
      await api.restoreComplaint(c.id);
      success(`Complaint #${c.id} restored`);
      await load();
    } catch (err) {
      toastError(err.message || 'Could not restore');
    }
  };

  const reopen = async (c) => {
    try {
      await api.reopenComplaint(c.id, 'Reopened from the standalone list');
      success(`Complaint #${c.id} reopened`);
      await load();
    } catch (err) {
      toastError(err.message || 'Could not reopen');
    }
  };

  return (
    <section className="bg-white rounded-xl border border-slate-200/80 shadow-xs overflow-hidden">
      <div className="px-5 py-4 border-b border-slate-100 flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <Inbox className="w-4 h-4 text-slate-500" />
            <h2 className="text-sm font-bold text-slate-900">{title}</h2>
            {!loading && !error && (
              <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 text-[11px] font-semibold border border-slate-200">
                {open.length} to handle
              </span>
            )}
          </div>
          <p className="text-[11px] text-slate-500 mt-1">{note}</p>
        </div>
        <button onClick={load} className="text-slate-400 hover:text-slate-700 p-1 rounded-md" title="Refresh" aria-label="Refresh standalone complaints">
          <RefreshCw className="w-3.5 h-3.5" />
        </button>
      </div>

      {loading ? (
        <div className="p-6">
          <LoadingState message="Loading standalone complaints..." className="py-6" />
        </div>
      ) : error ? (
        <div className="p-6">
          <ErrorState error={error} onRetry={load} />
        </div>
      ) : open.length === 0 ? (
        <p className="p-6 text-xs text-slate-500">Nothing standalone left to handle.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 text-[11px] uppercase tracking-wide">
              <tr>
                <th className="py-2.5 px-4 font-semibold">#</th>
                <th className="py-2.5 px-4 font-semibold">Customer</th>
                <th className="py-2.5 px-4 font-semibold min-w-[220px]">Complaint</th>
                <th className="py-2.5 px-4 font-semibold">Category</th>
                <th className="py-2.5 px-4 font-semibold">Sentiment</th>
                <th className="py-2.5 px-4 font-semibold">Urgency</th>
                <th className="py-2.5 px-4 font-semibold">Team</th>
                <th className="py-2.5 px-4 font-semibold">Received</th>
                <th className="py-2.5 px-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {open.map((c) => (
                <tr key={c.id} className="hover:bg-slate-50/60">
                  <td className="py-3 px-4 font-mono text-slate-500">
                    <Link to={`/complaints?q=${encodeURIComponent(c.text.slice(0, 30))}`} className="hover:text-purple-700">#{c.id}</Link>
                  </td>
                  <td className="py-3 px-4 text-slate-700 whitespace-nowrap">{c.customer_name}</td>
                  <td className="py-3 px-4 text-slate-700" title={c.text}>
                    {truncateText(c.text, 100)}
                    {c.multi_issue && (
                      <div className="mt-1">
                        <span
                          className="inline-flex items-center px-2 py-0.5 rounded-full bg-amber-50 border border-amber-200 text-amber-800 text-[11px] font-semibold"
                          title="This report describes several unrelated problems, so it is not grouped into any incident. Handle each problem, then resolve."
                        >
                          Multiple problems ({c.problem_count}), handle individually
                        </span>
                      </div>
                    )}
                  </td>
                  <td className="py-3 px-4"><CategoryBadge category={c.category} /></td>
                  <td className="py-3 px-4"><SentimentBadge sentiment={c.sentiment} /></td>
                  <td className="py-3 px-4"><PriorityBadge priority={c.urgency} /></td>
                  <td className="py-3 px-4 text-slate-600 whitespace-nowrap">
                    {c.assigned_team || <span className="text-slate-300 font-mono">unassigned</span>}
                    {c.assigned_team && c.due_at && <div className="mt-1"><DueChip dueAt={c.due_at} /></div>}
                  </td>
                  <td className="py-3 px-4 text-slate-500 whitespace-nowrap text-[11px]">{formatRelativeTime(c.created_at)}</td>
                  <td className="py-3 px-4">
                    <div className="flex items-center justify-end gap-1.5">
                      <Button size="sm" variant="secondary" icon={UserPlus} onClick={() => openDialog('assign', c)}>
                        {c.assigned_team ? 'Reassign' : 'Assign'}
                      </Button>
                      <Button size="sm" variant="brand" icon={CheckCircle2} onClick={() => openDialog('resolve', c)}>
                        Resolve
                      </Button>
                      {isLead && (
                        <Button size="sm" variant="ghost" icon={Trash2} onClick={() => openDialog('delete', c)} title="Delete (kept in the records, restorable)">
                          Delete
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {!loading && !error && (
        <div className="border-t border-slate-100 px-5 py-3">
          <button onClick={() => setShowDone((v) => !v)} className="text-xs font-medium text-slate-600 hover:text-slate-900">
            {showDone ? 'Hide' : 'Show'} resolved standalone complaints ({done.length})
          </button>
          {showDone && (
            <ul className="mt-3 space-y-2">
              {done.length === 0 && <li className="text-xs text-slate-500">None yet.</li>}
              {done.map((c) => (
                <li key={c.id} className="flex items-start justify-between gap-3 text-xs border border-slate-100 rounded-lg p-3 bg-slate-50/50">
                  <div className="min-w-0">
                    <div className="text-slate-700">
                      <span className="font-mono text-slate-400">#{c.id}</span> {truncateText(c.text, 120)}
                    </div>
                    <div className="text-[11px] text-slate-500 mt-1">
                      Resolved{c.assigned_team ? ` by ${c.assigned_team}` : ''}: {c.resolution_note || 'no note'}
                      {c.resolved_at ? ` (${formatRelativeTime(c.resolved_at)})` : ''}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Button size="sm" variant="ghost" icon={Undo2} onClick={() => reopen(c)}>
                      Reopen
                    </Button>
                    {isLead && (
                      <Button size="sm" variant="ghost" icon={Trash2} onClick={() => openDialog('delete', c)}>
                        Delete
                      </Button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {!loading && !error && isLead && (
        <div className="border-t border-slate-100 px-5 py-3">
          <button onClick={() => setShowBin((v) => !v)} className="text-xs font-medium text-slate-600 hover:text-slate-900">
            {showBin ? 'Hide' : 'Show'} deleted complaints ({deletedItems.length})
          </button>
          {showBin && (
            <ul className="mt-3 space-y-2">
              {deletedItems.length === 0 && <li className="text-xs text-slate-500">Nothing deleted.</li>}
              {deletedItems.map((c) => (
                <li key={c.id} className="flex items-start justify-between gap-3 text-xs border border-slate-100 rounded-lg p-3 bg-slate-50/50">
                  <div className="min-w-0">
                    <div className="text-slate-700">
                      <span className="font-mono text-slate-400">#{c.id}</span> {truncateText(c.text, 120)}
                    </div>
                    <div className="text-[11px] text-slate-500 mt-1">Deleted: {c.deleted_reason || 'no reason'}</div>
                  </div>
                  <Button size="sm" variant="ghost" icon={Undo2} onClick={() => restore(c)}>Restore</Button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      <Modal
        isOpen={Boolean(dialog)}
        onClose={() => setDialog(null)}
        title={
          dialog?.type === 'assign' ? `Assign complaint #${dialog?.complaint.id}`
            : dialog?.type === 'delete' ? `Delete complaint #${dialog?.complaint.id}`
            : `Resolve complaint #${dialog?.complaint.id}`
        }
        description={
          dialog?.type === 'assign'
            ? 'Choose or type the team that will handle this complaint.'
            : dialog?.type === 'delete'
              ? 'It disappears from every list, chart and alert. The record is kept with your name and reason, and an admin can restore it.'
              : 'Describe what was done. The complaint moves to the resolved list and stays in the history.'
        }
      >
        <form onSubmit={submitDialog} className="space-y-4">
          {dialog?.type === 'assign' ? (
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1" htmlFor="assign-team">Team</label>
              <TeamSelect key={dialog.complaint.id} value={text} onChange={setText} id="assign-team" />
              <label className="block text-xs font-semibold text-slate-700 mt-3 mb-1" htmlFor="assign-due">Deadline for the team</label>
              <DeadlineSelect value={due} onChange={setDue} id="assign-due" />
            </div>
          ) : (
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1" htmlFor="note-input">{dialog?.type === 'delete' ? 'Reason for deleting' : 'Resolution note'}</label>
              <textarea
                id="note-input"
                rows={3}
                value={text}
                maxLength={500}
                onChange={(e) => setText(e.target.value)}
                placeholder={dialog?.type === 'delete' ? 'e.g. Positive review, nothing to act on' : 'e.g. Added the request to the roadmap'}
                className="w-full text-xs border border-slate-200 rounded-lg p-2.5 focus:ring-2 focus:ring-purple-600"
              />
              {dialog?.type === 'resolve' && (
                <div className="mt-3">
                  <label className="block text-xs font-semibold text-slate-700 mb-1" htmlFor="customer-msg">
                    Message to the customer <span className="text-rose-500">*</span>
                  </label>
                  <textarea
                    id="customer-msg"
                    rows={3}
                    value={msg}
                    maxLength={500}
                    onChange={(e) => setMsg(e.target.value)}
                    placeholder="e.g. Thank you for the suggestion, we have added dark mode to our plan for next month."
                    className="w-full text-xs border border-slate-200 rounded-lg p-2.5 focus:ring-2 focus:ring-purple-600"
                  />
                  <p className="text-[11px] text-slate-500 mt-1">
                    The customer sees this on the public "Check status" page. No personal or internal details, please.
                  </p>
                </div>
              )}
            </div>
          )}
          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
            <Button variant="secondary" size="sm" onClick={() => setDialog(null)}>Cancel</Button>
            <Button
              type="submit"
              variant="brand"
              size="sm"
              loading={busy}
              disabled={
                dialog?.type === 'assign' ? !text.trim()
                  : dialog?.type === 'resolve' ? text.trim().length < 3 || msg.trim().length < 3
                  : text.trim().length < 3
              }
            >
              {dialog?.type === 'assign' ? 'Assign' : dialog?.type === 'delete' ? 'Delete complaint' : 'Mark resolved'}
            </Button>
          </div>
        </form>
      </Modal>
    </section>
  );
}
