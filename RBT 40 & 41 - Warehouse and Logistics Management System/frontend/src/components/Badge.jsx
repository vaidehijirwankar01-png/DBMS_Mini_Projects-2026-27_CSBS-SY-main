import React from 'react';

export default function Badge({ children, variant = 'default', className = '' }) {
  const variants = {
    default: 'bg-slate-800 text-slate-300 border-slate-700',
    pending: 'bg-amber-950/60 text-amber-300 border-amber-800/60',
    inTransit: 'bg-blue-950/60 text-blue-300 border-blue-800/60',
    delivered: 'bg-emerald-950/60 text-emerald-300 border-emerald-800/60',
    cancelled: 'bg-rose-950/60 text-rose-300 border-rose-800/60',
    healthy: 'bg-emerald-950/60 text-emerald-300 border-emerald-800/60',
    lowStock: 'bg-amber-950/60 text-amber-300 border-amber-800/60',
    outOfStock: 'bg-rose-950/60 text-rose-300 border-rose-800/60',
    air: 'bg-sky-950/60 text-sky-300 border-sky-800/60',
    road: 'bg-orange-950/60 text-orange-300 border-orange-800/60',
    rail: 'bg-emerald-950/60 text-emerald-300 border-emerald-800/60',
    sea: 'bg-indigo-950/60 text-indigo-300 border-indigo-800/60',
  };

  const style = variants[variant] || variants.default;

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${style} ${className}`}>
      {children}
    </span>
  );
}
