'use client';
import React from 'react';
type Props = { label: string; value?: number | null };
export default function ScoreDial({ label, value }: Props) {
  const v = value ?? 0; const pct = Math.max(0, Math.min(100, v));
  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative w-24 h-24">
        <svg viewBox="0 0 36 36" className="w-full h-full">
          <path d="M18 2 a 16 16 0 1 1 0 32 a 16 16 0 1 1 0 -32" fill="none" strokeWidth="3" stroke="currentColor" opacity="0.15"/>
          <path d="M18 2 a 16 16 0 1 1 0 32 a 16 16 0 1 1 0 -32" fill="none" strokeWidth="3" strokeDasharray={`${pct}, 100`} strokeLinecap="round" stroke="currentColor"/>
        </svg>
        <div className="absolute inset-0 flex items-center justify-center text-xl font-semibold">{Math.round(pct)}</div>
      </div>
      <div className="text-sm opacity-75">{label}</div>
    </div>
  );
}
