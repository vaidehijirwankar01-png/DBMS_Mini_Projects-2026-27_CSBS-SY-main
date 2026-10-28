import React from 'react';

export default function StatCard({ title, value, subtitle, icon: Icon, color = 'indigo' }) {
  const colorMap = {
    indigo: 'from-indigo-500/10 to-indigo-500/5 text-indigo-400 border-indigo-500/20',
    emerald: 'from-emerald-500/10 to-emerald-500/5 text-emerald-400 border-emerald-500/20',
    amber: 'from-amber-500/10 to-amber-500/5 text-amber-400 border-amber-500/20',
    rose: 'from-rose-500/10 to-rose-500/5 text-rose-400 border-rose-500/20',
    cyan: 'from-cyan-500/10 to-cyan-500/5 text-cyan-400 border-cyan-500/20',
  };

  const currentTheme = colorMap[color] || colorMap.indigo;

  return (
    <div className={`p-5 rounded-xl border bg-gradient-to-br ${currentTheme} bg-slate-900 shadow-sm relative overflow-hidden`}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">{title}</p>
          <h3 className="text-2xl font-bold text-white mt-1 tracking-tight">{value}</h3>
          {subtitle && <p className="text-xs text-slate-400 mt-1">{subtitle}</p>}
        </div>
        {Icon && (
          <div className="w-12 h-12 rounded-xl bg-slate-800/80 border border-slate-700/50 flex items-center justify-center shrink-0">
            <Icon className="w-6 h-6" />
          </div>
        )}
      </div>
    </div>
  );
}
