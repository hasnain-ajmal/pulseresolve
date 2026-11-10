import React, { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { CheckCircle2, Clock, Inbox, Loader2, Search, Wrench } from 'lucide-react';
import { api } from '../api';
import { PublicLayout } from '../components/layout/PublicLayout';
import { Button } from '../components/common/Button';
import { formatDate } from '../utils/formatters';

const STAGES = [
  { key: 'received', label: 'Received', icon: Inbox },
  { key: 'in_progress', label: 'In progress', icon: Wrench },
  { key: 'resolved', label: 'Resolved', icon: CheckCircle2 },
];

export function TrackComplaintPage() {
  const [params, setParams] = useSearchParams();
  const [id, setId] = useState(params.get('id') || '');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const lookup = async (value) => {
    const clean = String(value).replace('#', '').trim();
    if (!/^\d+$/.test(clean)) {
      setError('Please enter the complaint ID you were given. It is a number, for example 33.');
      setResult(null);
      return;
    }
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      setResult(await api.trackComplaint(clean));
      setParams({ id: clean }, { replace: true });
    } catch (err) {
      setError(
        err.status === 404 ? 'No complaint was found with that ID. Please check the number and try again.'
          : err.code === 'rate_limited' ? 'Too many lookups. Please wait a moment and try again.'
          : err.message || 'Could not check the status. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (params.get('id')) lookup(params.get('id'));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const stageIndex = result ? STAGES.findIndex((s) => s.key === result.stage) : -1;

  return (
    <PublicLayout>
      <div className="max-w-xl mx-auto w-full">
        <div className="mb-6">
          <span className="text-[11px] font-semibold tracking-wider uppercase text-purple-700">Complaint status</span>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 mt-1">Check your complaint</h1>
          <p className="text-sm text-slate-500 mt-2">Enter the complaint ID you received when you submitted it to see where it stands.</p>
        </div>

        <form
          onSubmit={(e) => { e.preventDefault(); lookup(id); }}
          className="bg-white rounded-2xl border border-slate-200/80 shadow-card p-5 flex flex-col sm:flex-row gap-3"
        >
          <label htmlFor="complaint-id" className="sr-only">Complaint ID</label>
          <input
            id="complaint-id"
            inputMode="numeric"
            value={id}
            onChange={(e) => setId(e.target.value)}
            placeholder="Complaint ID, e.g. 33"
            className="flex-1 text-sm border border-slate-200 rounded-lg px-3.5 py-2.5 focus:ring-2 focus:ring-purple-600 focus:outline-none"
          />
          <Button type="submit" variant="brand" loading={loading} icon={Search}>Check status</Button>
        </form>

        {error && (
          <div className="mt-4 p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800" role="alert">{error}</div>
        )}

        {loading && (
          <div className="mt-6 flex items-center gap-2 text-xs text-slate-500">
            <Loader2 className="w-4 h-4 animate-spin" /> Looking up your complaint...
          </div>
        )}

        {result && (
          <div className="mt-6 bg-white rounded-2xl border border-slate-200/80 shadow-card p-6">
            <div className="flex items-center justify-between gap-3">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 text-slate-700 text-xs font-mono font-medium">
                Complaint #{result.id}
              </span>
              <span className="text-[11px] text-slate-500 flex items-center gap-1">
                <Clock className="w-3 h-3" /> Submitted {formatDate(result.submitted_at, true)}
              </span>
            </div>

            <h2 className={`mt-4 text-xl font-bold tracking-tight ${result.stage === 'resolved' ? 'text-emerald-700' : 'text-slate-900'}`}>
              {result.label}
            </h2>

            <ol className="mt-5 grid grid-cols-3 gap-2" aria-label="Progress">
              {STAGES.map((s, i) => {
                const Icon = s.icon;
                const done = i <= stageIndex;
                return (
                  <li key={s.key} className="flex flex-col items-center text-center gap-1.5">
                    <span className={`w-9 h-9 rounded-full flex items-center justify-center border ${
                      done ? (result.stage === 'resolved' ? 'bg-emerald-50 border-emerald-300 text-emerald-600' : 'bg-purple-50 border-purple-300 text-purple-600')
                           : 'bg-slate-50 border-slate-200 text-slate-300'
                    }`}>
                      <Icon className="w-4 h-4" />
                    </span>
                    <span className={`text-[11px] font-medium ${done ? 'text-slate-800' : 'text-slate-400'}`}>{s.label}</span>
                  </li>
                );
              })}
            </ol>

            {result.stage === 'resolved' && (
              <div className="mt-6 p-4 rounded-xl bg-emerald-50 border border-emerald-200">
                <div className="text-[11px] font-semibold uppercase tracking-wider text-emerald-800">Message from our team</div>
                <p className="mt-1.5 text-sm text-emerald-950 leading-relaxed whitespace-pre-line">{result.message}</p>
                {result.resolved_at && (
                  <p className="mt-2 text-[11px] text-emerald-800/80">Resolved {formatDate(result.resolved_at, true)}</p>
                )}
              </div>
            )}
            {result.stage !== 'resolved' && (
              <p className="mt-5 text-xs text-slate-500">
                We will post a message here as soon as your complaint is resolved. You can come back and check again at any time.
              </p>
            )}
          </div>
        )}

        <p className="mt-8 text-xs text-slate-500">
          Need to report a problem? <Link to="/submit" className="text-purple-700 font-medium hover:underline">Submit a complaint</Link>
        </p>
      </div>
    </PublicLayout>
  );
}
