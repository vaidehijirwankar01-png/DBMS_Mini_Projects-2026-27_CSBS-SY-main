import React from 'react';
import { Bell, ShieldCheck, Activity } from 'lucide-react';

export default function Header({ title, subtitle }) {
  return (
    <header className="h-16 bg-slate-900/80 backdrop-blur-md border-b border-slate-800 px-6 flex items-center justify-between sticky top-0 z-20">
      <div>
        <h2 className="text-lg font-semibold text-white tracking-tight">{title}</h2>
        {subtitle && <p className="text-xs text-slate-400">{subtitle}</p>}
      </div>

      <div className="flex items-center space-x-4">
        {/* Trigger/Procedure Indicator */}
        <div className="hidden md:flex items-center space-x-2 bg-slate-800/80 border border-slate-700/60 px-3 py-1.5 rounded-full text-xs text-slate-300">
          <Activity className="w-3.5 h-3.5 text-indigo-400 animate-spin" />
          <span>Triggers & Procedures Active</span>
        </div>

        {/* System Status Pill */}
        <div className="flex items-center space-x-2 bg-emerald-950/60 border border-emerald-800/50 px-3 py-1 rounded-full text-xs text-emerald-400 font-medium">
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>Connected</span>
        </div>
      </div>
    </header>
  );
}
