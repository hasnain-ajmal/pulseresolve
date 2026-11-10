import React, { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Inbox, RefreshCw } from 'lucide-react';
import { api } from '../../api';
import { formatRelativeTime, truncateText } from '../../utils/formatters';
import { CategoryBadge, SentimentBadge, PriorityBadge } from './Badge';
import { LoadingState, ErrorState } from './States';

const URGENCY_RANK = { critical: 4, high: 3, medium: 2, low: 1 };

/**
 * Shows every complaint that is NOT part of any incident, so staff see the whole picture
 * (grouped incidents above, standalone complaints here) without opening other pages.
 */
export function UnassignedComplaints({
  title = 'Standalone complaints (not part of any incident)',
  note = 'These did not match any incident. Handle them individually. They can still join an incident if related complaints arrive.',
}) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.getComplaints({ status: 'new', size: 100 });
      const list = (res.items || []).filter((c) => c.incident_id == null);
      list.sort((a, b) => (URGENCY_RANK[b.urgency] || 0) - (URGENCY_RANK[a.urgency] || 0) || b.id - a.id);
      setItems(list);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <section className="bg-white rounded-xl border border-slate-200/80 shadow-xs overflow-hidden">
      <div className="px-5 py-4 border-b border-slate-100 flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <Inbox className="w-4 h-4 text-slate-500" />
            <h2 className="text-sm font-bold text-slate-900">{title}</h2>
            {!loading && !error && (
              <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 text-[11px] font-semibold border border-slate-200">
                {items.length}
              </span>
            )}
          </div>
          <p className="text-[11px] text-slate-500 mt-1">{note}</p>
        </div>
        <button
          onClick={load}
          className="text-slate-400 hover:text-slate-700 p-1 rounded-md"
          title="Refresh"
          aria-label="Refresh standalone complaints"
        >
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
      ) : items.length === 0 ? (
        <p className="p-6 text-xs text-slate-500">Every complaint is part of an incident. Nothing standalone to handle.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 text-[11px] uppercase tracking-wide">
              <tr>
                <th className="py-2.5 px-4 font-semibold">#</th>
                <th className="py-2.5 px-4 font-semibold">Customer</th>
                <th className="py-2.5 px-4 font-semibold min-w-[240px]">Complaint</th>
                <th className="py-2.5 px-4 font-semibold">Category</th>
                <th className="py-2.5 px-4 font-semibold">Sentiment</th>
                <th className="py-2.5 px-4 font-semibold">Urgency</th>
                <th className="py-2.5 px-4 font-semibold">Received</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {items.map((c) => (
                <tr key={c.id} className="hover:bg-slate-50/60">
                  <td className="py-3 px-4 font-mono text-slate-500">
                    <Link to={`/complaints?q=${encodeURIComponent(c.text.slice(0, 30))}`} className="hover:text-purple-700">#{c.id}</Link>
                  </td>
                  <td className="py-3 px-4 text-slate-700 whitespace-nowrap">{c.customer_name}</td>
                  <td className="py-3 px-4 text-slate-700" title={c.text}>{truncateText(c.text, 110)}</td>
                  <td className="py-3 px-4"><CategoryBadge category={c.category} /></td>
                  <td className="py-3 px-4"><SentimentBadge sentiment={c.sentiment} /></td>
                  <td className="py-3 px-4"><PriorityBadge priority={c.urgency} /></td>
                  <td className="py-3 px-4 text-slate-500 whitespace-nowrap text-[11px]">{formatRelativeTime(c.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
