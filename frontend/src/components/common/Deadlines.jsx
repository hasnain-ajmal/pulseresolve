import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { AlarmClock, Bell, X } from 'lucide-react';
import { api } from '../../api';
import { PriorityBadge } from './Badge';

/** Human text for a deadline: "Overdue by 12 min", "Due in 45 min", "Due in 3 h". */
export function dueLabel(dueAt) {
  if (!dueAt) return null;
  const mins = Math.round((new Date(dueAt).getTime() - Date.now()) / 60000);
  const abs = Math.abs(mins);
  const span = abs >= 1440 ? `${Math.round(abs / 1440)} d` : abs >= 120 ? `${Math.round(abs / 60)} h` : `${abs} min`;
  if (mins < 0) return { text: `Overdue by ${span}`, tone: 'overdue' };
  if (mins <= 60) return { text: `Due in ${span}`, tone: 'soon' };
  return { text: `Due in ${span}`, tone: 'ok' };
}

const TONE = {
  overdue: 'bg-rose-50 text-rose-700 border-rose-200',
  soon: 'bg-amber-50 text-amber-800 border-amber-200',
  ok: 'bg-slate-50 text-slate-600 border-slate-200',
};

export function DueChip({ dueAt }) {
  const d = dueLabel(dueAt);
  if (!d) return null;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[11px] font-semibold whitespace-nowrap ${TONE[d.tone]}`}>
      <AlarmClock className="w-3 h-3" />
      {d.text}
    </span>
  );
}

/** Deadline choices. Empty value = default allowance for the priority (critical gets the least time). */
export function DeadlineSelect({ value, onChange, id = 'deadline-select' }) {
  return (
    <select
      id={id}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full text-xs border border-slate-200 rounded-lg px-3 py-2 bg-white focus:ring-2 focus:ring-purple-600"
    >
      <option value="">Default for the priority (critical 2 h, high 8 h, medium 24 h, low 3 d)</option>
      <option value="30">30 minutes</option>
      <option value="60">1 hour</option>
      <option value="240">4 hours</option>
      <option value="1440">24 hours</option>
    </select>
  );
}

function useAlerts() {
  const [data, setData] = useState({ items: [], overdue: 0, due_soon: 0, window_minutes: 60 });
  const load = useCallback(async () => {
    try {
      setData(await api.getAlerts());
    } catch {
      /* alerts are best effort; never break the page */
    }
  }, []);
  useEffect(() => {
    load();
    const t = setInterval(load, 30000);
    return () => clearInterval(t);
  }, [load]);
  return { ...data, reload: load };
}

function AlertRow({ a, onNavigate }) {
  const to = a.kind === 'incident' ? `/incidents/${a.id}` : '/incidents';
  const overdue = a.level === 'overdue';
  const span = Math.abs(a.minutes_left);
  const text = overdue ? `Overdue by ${span} min` : `Due in ${span} min`;
  return (
    <li>
      <Link to={to} onClick={onNavigate} className="block px-4 py-3 hover:bg-slate-50 border-b border-slate-100">
        <div className="flex items-center justify-between gap-2">
          <span className={`text-[11px] font-bold ${overdue ? 'text-rose-600' : 'text-amber-600'}`}>{text}</span>
          <PriorityBadge priority={a.priority} />
        </div>
        <div className="text-xs text-slate-800 mt-1 font-medium truncate">
          {a.kind === 'incident' ? `Incident #${a.id}: ` : `Complaint #${a.id}: `}
          {a.title}
        </div>
        <div className="text-[11px] text-slate-500 mt-0.5">
          {a.assigned_team ? `Team: ${a.assigned_team}` : 'No team assigned'} · {a.status}
        </div>
      </Link>
    </li>
  );
}

/** Bell with a count in the top right of every staff page; opens the list of overdue / due-soon work. */
export function AlertsBell() {
  const { items, overdue, due_soon, window_minutes } = useAlerts();
  const [open, setOpen] = useState(false);
  const count = overdue + due_soon;
  return (
    <div className="fixed top-3 right-4 z-40">
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label={`Deadline alerts: ${count}`}
        className="relative p-2 rounded-full bg-white border border-slate-200 shadow-sm hover:bg-slate-50"
      >
        <Bell className={`w-4 h-4 ${overdue ? 'text-rose-600' : count ? 'text-amber-600' : 'text-slate-500'}`} />
        {count > 0 && (
          <span className={`absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-bold text-white flex items-center justify-center ${overdue ? 'bg-rose-600' : 'bg-amber-500'}`}>
            {count}
          </span>
        )}
      </button>
      {open && (
        <div className="absolute right-0 mt-2 w-80 max-w-[90vw] bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 bg-slate-50">
            <div>
              <div className="text-xs font-bold text-slate-900">Deadline alerts</div>
              <div className="text-[11px] text-slate-500">
                {overdue} overdue · {due_soon} due within {window_minutes} min
              </div>
            </div>
            <button onClick={() => setOpen(false)} className="text-slate-400 hover:text-slate-700" aria-label="Close alerts">
              <X className="w-4 h-4" />
            </button>
          </div>
          {items.length === 0 ? (
            <p className="px-4 py-6 text-xs text-slate-500">All clear. Nothing is overdue or about to expire.</p>
          ) : (
            <ul className="max-h-96 overflow-y-auto">
              {items.map((a) => (
                <AlertRow key={`${a.kind}-${a.id}`} a={a} onNavigate={() => setOpen(false)} />
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

/** Banner at the top of staff pages when something is overdue or about to expire. */
export function AlertsBanner() {
  const { items, overdue, due_soon, window_minutes } = useAlerts();
  if (!overdue && !due_soon) return null;
  const first = items[0];
  const to = first ? (first.kind === 'incident' ? `/incidents/${first.id}` : '/incidents') : '/incidents';
  return (
    <Link
      to={to}
      className={`mb-5 flex items-center gap-2 rounded-xl border px-4 py-3 text-xs font-semibold ${
        overdue ? 'bg-rose-50 border-rose-200 text-rose-800' : 'bg-amber-50 border-amber-200 text-amber-900'
      }`}
    >
      <AlarmClock className="w-4 h-4 shrink-0" />
      <span>
        {overdue > 0 && `${overdue} overdue`}
        {overdue > 0 && due_soon > 0 && ' and '}
        {due_soon > 0 && `${due_soon} due within ${window_minutes} minutes`}
        {' '}and not resolved yet. Click to open the most urgent one.
      </span>
    </Link>
  );
}
