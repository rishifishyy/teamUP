import React from 'react';
import { CheckCircle2, AlertCircle, Info } from 'lucide-react';

export default function ToastContainer({ toasts }) {
  if (!toasts || toasts.length === 0) return null;

  return (
    <div className="toast-container">
      {toasts.map(toast => (
        <div key={toast.id} className={`toast ${toast.type || 'info'}`}>
          {toast.type === 'success' && <CheckCircle2 size={16} />}
          {toast.type === 'warning' && <AlertCircle size={16} />}
          {(!toast.type || toast.type === 'info') && <Info size={16} />}
          <span>{toast.message}</span>
        </div>
      ))}
    </div>
  );
}
