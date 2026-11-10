import React, { useCallback, useEffect, useState } from 'react';
import { Undo2 } from 'lucide-react';
import { api } from '../../api';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { Button } from './Button';
import { formatRelativeTime } from '../../utils/formatters';

/** Admin-only list of deleted incidents with a Restore button. Deleted records are kept, never destroyed. */
export function DeletedIncidents({ onRestored }) {
  const { user } = useAuth();
  const { success, error: toastError } = useToast();
  const [items, setItems] = useState([]);
  const [show, setShow] = useState(false);
  const isLead = user?.role === 'lead';

  const load = useCallback(async () => {
    try {
      const res = await api.getIncidents({ deleted: true, size: 50 });
      setItems(res.items || []);
    } catch {
      setItems([]);
    }
  }, []);

  useEffect(() => {
    if (isLead) load();
  }, [isLead, load]);

  if (!isLead) return null;

  const restore = async (inc) => {
    try {
      await api.restoreIncident(inc.id);
      success(`Incident #${inc.id} restored`);
      await load();
      if (onRestored) onRestored();
    } catch (err) {
      toastError(err.message || 'Could not restore');
    }
  };

  return (
    <section className="bg-white rounded-xl border border-slate-200/80 shadow-xs px-5 py-3">
      <button onClick={() => setShow((v) => !v)} className="text-xs font-medium text-slate-600 hover:text-slate-900">
        {show ? 'Hide' : 'Show'} deleted incidents ({items.length})
      </button>
      {show && (
        <ul className="mt-3 space-y-2">
          {items.length === 0 && <li className="text-xs text-slate-500">Nothing deleted.</li>}
          {items.map((i) => (
            <li key={i.id} className="flex items-start justify-between gap-3 text-xs border border-slate-100 rounded-lg p-3 bg-slate-50/50">
              <div className="min-w-0">
                <div className="text-slate-800 font-medium">#{i.id} {i.title}</div>
                <div className="text-[11px] text-slate-500 mt-1">
                  {i.complaint_count} complaints · deleted {formatRelativeTime(i.deleted_at)}: {i.deleted_reason || 'no reason'}
                </div>
              </div>
              <Button size="sm" variant="ghost" icon={Undo2} onClick={() => restore(i)}>Restore</Button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
