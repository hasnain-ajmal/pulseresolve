import React from 'react';
import { Loader2, Inbox, AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from './Button';

export function LoadingState({ message = "Loading incident intelligence...", className = "py-16" }) {
  return (
    <div className={`flex flex-col items-center justify-center text-center ${className}`}>
      <div className="w-10 h-10 rounded-full bg-purple-50 flex items-center justify-center mb-3">
        <Loader2 className="w-5 h-5 text-purple-600 animate-spin" />
      </div>
      <p className="text-sm font-medium text-slate-700">{message}</p>
      <p className="text-xs text-slate-400 mt-1">Analyzing telemetry and complaint clusters...</p>
    </div>
  );
}

export function EmptyState({ 
  icon: Icon = Inbox, 
  title = "No data found", 
  description = "There are no records matching your selected filters.",
  actionText,
  onAction,
  className = "py-16" 
}) {
  return (
    <div className={`flex flex-col items-center justify-center text-center px-4 ${className}`}>
      <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center mb-3 border border-slate-200/60">
        <Icon className="w-6 h-6 text-slate-400" />
      </div>
      <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
      <p className="text-xs text-slate-500 mt-1 max-w-sm">{description}</p>
      {actionText && onAction && (
        <div className="mt-4">
          <Button variant="secondary" size="sm" onClick={onAction}>
            {actionText}
          </Button>
        </div>
      )}
    </div>
  );
}

export function ErrorState({ 
  title = "Failed to load data", 
  error, 
  onRetry, 
  className = "py-12" 
}) {
  const errorMessage = error?.message || (typeof error === 'string' ? error : "An unexpected operational error occurred.");

  return (
    <div className={`flex flex-col items-center justify-center text-center px-4 ${className}`}>
      <div className="w-12 h-12 rounded-xl bg-rose-50 flex items-center justify-center mb-3 border border-rose-200">
        <AlertTriangle className="w-6 h-6 text-rose-600" />
      </div>
      <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
      <p className="text-xs text-rose-600 mt-1 max-w-md font-mono bg-rose-50/50 px-2 py-1 rounded border border-rose-100">
        {errorMessage}
      </p>
      {onRetry && (
        <div className="mt-4">
          <Button variant="secondary" size="sm" icon={RefreshCw} onClick={onRetry}>
            Retry Request
          </Button>
        </div>
      )}
    </div>
  );
}
