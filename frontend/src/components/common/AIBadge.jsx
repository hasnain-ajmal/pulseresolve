import React from 'react';
import { Sparkles } from 'lucide-react';

export function AIBadge({ className = '', size = 'sm' }) {
  const isSmall = size === 'sm';
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full font-medium tracking-tight bg-purple-50 text-purple-700 border border-purple-200/90 shadow-2xs ${
        isSmall ? 'text-[11px] px-2 py-0.5' : 'text-xs px-2.5 py-1'
      } ${className}`}
      title="AI-generated insight. Requires verification by operations staff."
    >
      <Sparkles className={isSmall ? "w-3 h-3 text-purple-600 shrink-0" : "w-3.5 h-3.5 text-purple-600 shrink-0"} />
      <span>AI-generated, needs human confirmation</span>
    </span>
  );
}

export function AIPill({ text = "AI Insight", className = "" }) {
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-purple-50 text-purple-700 border border-purple-200 ${className}`}>
      <Sparkles className="w-2.5 h-2.5 text-purple-600" />
      {text}
    </span>
  );
}
