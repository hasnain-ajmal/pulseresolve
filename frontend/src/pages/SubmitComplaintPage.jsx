import React, { useState, useEffect } from 'react';
import { 
  Send, 
  CheckCircle2, 
  AlertCircle, 
  Sparkles, 
  Clock, 
  ShieldAlert, 
  RotateCcw,
  Layers,
  ArrowRight
} from 'lucide-react';
import { api } from '../api';
import { PublicLayout } from '../components/layout/PublicLayout';
import { CategoryBadge, SentimentBadge, PriorityBadge } from '../components/common/Badge';
import { Button } from '../components/common/Button';

export function SubmitComplaintPage() {
  const [customerName, setCustomerName] = useState('');
  const [customerContact, setCustomerContact] = useState('');
  const [complaintText, setComplaintText] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [rateLimitSeconds, setRateLimitSeconds] = useState(null);
  const [submittedData, setSubmittedData] = useState(null);

  // Live validation
  const textLength = complaintText.trim().length;
  const isNameValid = customerName.trim().length >= 2 && customerName.trim().length <= 80;
  const isTextValid = textLength >= 10 && textLength <= 2000;
  const isFormValid = isNameValid && isTextValid && (!customerContact || customerContact.length <= 120);

  // Rate limit countdown effect
  useEffect(() => {
    if (rateLimitSeconds === null || rateLimitSeconds <= 0) return;
    const timer = setInterval(() => {
      setRateLimitSeconds(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          setError(null);
          return null;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [rateLimitSeconds]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    if (!isNameValid) {
      setError("Please enter your name (between 2 and 80 characters).");
      return;
    }
    if (textLength < 10) {
      setError("Please provide more detail in your complaint (minimum 10 characters).");
      return;
    }
    if (textLength > 2000) {
      setError("Complaint text exceeds maximum limit of 2000 characters.");
      return;
    }

    setLoading(true);
    try {
      const payload = {
        customer_name: customerName.trim(),
        customer_contact: customerContact.trim() || undefined,
        text: complaintText.trim()
      };
      const response = await api.submitComplaint(payload);
      setSubmittedData(response);
    } catch (err) {
      if (err.code === 'rate_limited' || err.status === 429) {
        const seconds = parseInt(err.retryAfter || '30', 10);
        setRateLimitSeconds(seconds);
        setError(`Too many submissions. Please wait ${seconds} seconds before trying again.`);
      } else {
        setError(err.message || "Failed to submit your complaint. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setCustomerName('');
    setCustomerContact('');
    setComplaintText('');
    setSubmittedData(null);
    setError(null);
  };

  return (
    <PublicLayout>
      <div className="max-w-2xl mx-auto w-full">
        {!submittedData ? (
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-card p-6 sm:p-10">
            {/* Header */}
            <div className="mb-8">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-purple-700 bg-purple-50 px-2.5 py-1 rounded-full border border-purple-200/60 inline-flex items-center gap-1.5 mb-3">
                <Sparkles className="w-3 h-3 text-purple-600" />
                AI-Assisted Resolution
              </span>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
                Tell us what went wrong.
              </h1>
              <p className="mt-2 text-sm text-slate-500">
                Submit your issue below. Our real-time intelligence engine immediately analyzes incoming reports to detect, correlate, and escalate systemic issues.
              </p>
            </div>

            {/* Error & Rate Limit Banners */}
            {error && (
              <div className="mb-6 p-4 rounded-xl bg-rose-50 border border-rose-200 flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-rose-900">Unable to Submit</p>
                  <p className="text-xs text-rose-700 mt-0.5">{error}</p>
                  {rateLimitSeconds !== null && rateLimitSeconds > 0 && (
                    <div className="mt-2 flex items-center gap-1.5 text-xs font-mono font-bold text-rose-800">
                      <Clock className="w-3.5 h-3.5 animate-spin" />
                      Cooldown: {rateLimitSeconds}s remaining
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Your Full Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="e.g. Ayesha Khan"
                  maxLength={80}
                  required
                  disabled={loading || rateLimitSeconds > 0}
                  className="block w-full px-3.5 py-2.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-600 focus:border-transparent bg-slate-50/50 hover:bg-white transition-colors"
                />
                <p className="mt-1 text-[11px] text-slate-400">Between 2 and 80 characters</p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Contact Information <span className="text-slate-400 font-normal">(Optional email or phone)</span>
                </label>
                <input
                  type="text"
                  value={customerContact}
                  onChange={(e) => setCustomerContact(e.target.value)}
                  placeholder="e.g. ayesha@example.com or +92 300 1234567"
                  maxLength={120}
                  disabled={loading || rateLimitSeconds > 0}
                  className="block w-full px-3.5 py-2.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-600 focus:border-transparent bg-slate-50/50 hover:bg-white transition-colors"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-semibold text-slate-700">
                    Complaint Details <span className="text-rose-500">*</span>
                  </label>
                  <span className={`text-[11px] font-mono ${
                    textLength > 2000 ? 'text-rose-600 font-bold' : textLength >= 10 ? 'text-slate-500' : 'text-amber-600'
                  }`}>
                    {textLength} / 2000 characters
                  </span>
                </div>
                <textarea
                  rows={5}
                  value={complaintText}
                  onChange={(e) => setComplaintText(e.target.value)}
                  placeholder="Please describe the incident, error messages, unexpected charges, or malfunction in detail..."
                  required
                  disabled={loading || rateLimitSeconds > 0}
                  className="block w-full px-3.5 py-2.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-600 focus:border-transparent bg-slate-50/50 hover:bg-white transition-colors resize-y"
                />
                <div className="flex items-center justify-between mt-1 text-[11px] text-slate-400">
                  <span>Minimum 10 characters required</span>
                  <span>Untrusted text is sanitized</span>
                </div>
              </div>

              <div className="pt-2">
                <Button
                  type="submit"
                  variant="brand"
                  size="lg"
                  loading={loading}
                  disabled={!isFormValid || rateLimitSeconds > 0}
                  className="w-full justify-center shadow-md shadow-purple-900/10"
                >
                  <Send className="w-4 h-4 mr-2" />
                  Submit Issue for Resolution
                </Button>
              </div>
            </form>
          </div>
        ) : (
          /* Confirmation State matching Section 6 & 7 */
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-card p-6 sm:p-10 animate-in fade-in duration-300">
            <div className="w-14 h-14 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600 mb-6 mx-auto sm:mx-0">
              <CheckCircle2 className="w-8 h-8" />
            </div>

            <div className="text-center sm:text-left">
              <h2 className="text-2xl font-bold tracking-tight text-slate-900">
                Your complaint has been received.
              </h2>
              <div className="mt-4 p-4 rounded-xl bg-purple-50 border border-purple-200">
                <div className="text-[11px] font-semibold uppercase tracking-wider text-purple-800">Your complaint ID. Please save it.</div>
                <div className="mt-1 flex items-center gap-3 justify-center sm:justify-start">
                  <span className="text-4xl font-bold font-mono text-purple-900" data-testid="complaint-id">#{submittedData.id}</span>
                  <button
                    type="button"
                    onClick={() => { try { navigator.clipboard.writeText(String(submittedData.id)); } catch { /* clipboard may be blocked */ } }}
                    className="text-xs font-medium text-purple-700 border border-purple-300 rounded-lg px-2.5 py-1 hover:bg-purple-100"
                  >
                    Copy ID
                  </button>
                </div>
                <p className="mt-2 text-xs text-purple-900/80">
                  Use this ID on the <a href={`/track?id=${submittedData.id}`} className="font-semibold underline">Check status</a> page to see when your complaint is resolved and read our team's message.
                </p>
              </div>
              <p className="mt-2 text-sm text-slate-500 leading-relaxed">
                Thank you for reporting this issue. Our engineering and support operations team has received your ticket and begun verification.
              </p>
            </div>

            {/* Linked Known Issue Notice (spec requirement) */}
            {submittedData.incident_id && (
              <div className="mt-6 p-4 rounded-xl bg-purple-50/70 border border-purple-200 flex items-start gap-3">
                <Layers className="w-5 h-5 text-purple-600 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-xs font-semibold text-purple-900 uppercase tracking-wider">
                    Correlated Active Event
                  </h4>
                  <p className="text-sm font-medium text-purple-950 mt-0.5">
                    Your report has been linked to a known issue.
                  </p>
                  <p className="text-xs text-purple-700/90 mt-1">
                    Multiple matching reports have been detected by our intelligence cluster. An operational incident response is already underway.
                  </p>
                </div>
              </div>
            )}

            {/* AI Real-time Triage Summary */}
            <div className="mt-6 p-5 rounded-xl bg-slate-50 border border-slate-200/80 space-y-3">
              <div className="flex items-center justify-between border-b border-slate-200/60 pb-3">
                <span className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-purple-600" />
                  Real-time AI Telemetry Classification
                </span>
                <span className="text-[11px] font-mono text-slate-400">
                  {submittedData.analysis_source === 'fallback' ? 'Algorithmic' : 'AI Model'}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                <div>
                  <span className="text-[11px] text-slate-400 block mb-1">Identified Category</span>
                  <CategoryBadge category={submittedData.category} />
                </div>
                <div>
                  <span className="text-[11px] text-slate-400 block mb-1">Detected Sentiment</span>
                  <SentimentBadge sentiment={submittedData.sentiment} />
                </div>
                <div>
                  <span className="text-[11px] text-slate-400 block mb-1">Calculated Urgency</span>
                  <PriorityBadge priority={submittedData.urgency} />
                </div>
              </div>
            </div>

            {/* Submitted text preview */}
            <div className="mt-6">
              <label className="text-xs font-medium text-slate-500 block mb-1">
                Submitted Summary
              </label>
              <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200/60 text-xs text-slate-700 whitespace-pre-wrap leading-relaxed font-sans">
                {submittedData.text}
              </div>
            </div>

            <div className="mt-8 pt-6 border-t border-slate-100 flex flex-col sm:flex-row gap-3">
              <Button
                variant="secondary"
                onClick={handleReset}
                icon={RotateCcw}
                className="w-full sm:w-auto"
              >
                Submit Another Complaint
              </Button>
              <a
                href="/login"
                className="inline-flex items-center justify-center px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors"
              >
                Staff Console &rarr;
              </a>
            </div>
          </div>
        )}
      </div>
    </PublicLayout>
  );
}
