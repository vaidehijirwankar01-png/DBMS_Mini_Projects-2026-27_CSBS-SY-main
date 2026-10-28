import React, { useEffect } from 'react';
import { X } from 'lucide-react';

export default function Modal({ isOpen, onClose, title, children, maxWidth = 'max-w-xl' }) {
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm transition-opacity" 
        onClick={onClose}
      />

      {/* Modal Dialog */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div className={`relative w-full ${maxWidth} bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-6 overflow-hidden z-10 animate-in fade-in zoom-in-95 duration-150`}>
          <div className="flex items-center justify-between pb-4 border-b border-slate-800 mb-5">
            <h3 className="text-lg font-semibold text-white tracking-tight">{title}</h3>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div>{children}</div>
        </div>
      </div>
    </div>
  );
}
