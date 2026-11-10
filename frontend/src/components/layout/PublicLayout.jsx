import React from 'react';
import { Activity } from 'lucide-react';

export function PublicLayout({ children }) {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-between">
      {/* Public Header */}
      <header className="border-b border-slate-200/80 bg-white/80 backdrop-blur-md sticky top-0 z-30">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-600 to-indigo-700 flex items-center justify-center text-white shadow-sm">
              <Activity className="w-4 h-4 text-white" />
            </div>
            <div>
              <span className="font-semibold text-slate-900 tracking-tight text-sm">PulseResolve</span>
              <span className="text-[11px] text-slate-500 block leading-none">Customer Resolution Portal</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <a 
              href="/login" 
              className="text-xs font-medium text-slate-500 hover:text-slate-900 transition-colors"
            >
              Staff Portal &rarr;
            </a>
          </div>
        </div>
      </header>

      {/* Main Form Body */}
      <main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 py-8 sm:py-12 flex flex-col justify-center">
        {children}
      </main>

      {/* Public Footer */}
      <footer className="border-t border-slate-200/60 py-6 text-center text-xs text-slate-400">
        <div className="max-w-4xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>&copy; {new Date().getFullYear()} PulseResolve Inc. Automated Incident Intelligence.</span>
          <span className="text-[11px] text-slate-400">Untrusted text sanitized &bull; Privacy protected</span>
        </div>
      </footer>
    </div>
  );
}
