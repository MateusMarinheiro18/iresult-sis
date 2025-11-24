// src/components/ui/ConfirmProvider.tsx
'use client';
import React, { createContext, useCallback, useContext, useRef, useState } from 'react';
import ReactDOM from 'react-dom';

type ConfirmOptions = {
  title?: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
  backdropCancel?: boolean;
};

type InternalConfirm = ConfirmOptions & { id: number };
type ConfirmFn = (opts?: ConfirmOptions) => Promise<boolean>;

const ConfirmContext = createContext<ConfirmFn | null>(null);

export function useConfirm(): ConfirmFn {
  const ctx = useContext(ConfirmContext);
  if (!ctx) throw new Error('useConfirm must be used within ConfirmProvider');
  return ctx;
}

export function ConfirmProvider({ children }: { children: React.ReactNode }) {
  const [queue, setQueue] = useState<InternalConfirm[]>([]);
  const resolveRef = useRef<Record<number, (v: boolean) => void>>({});
  const idRef = useRef(1);

  const showConfirm = useCallback((opts: ConfirmOptions = {}) => {
    const id = idRef.current++;
    const item: InternalConfirm = {
      id,
      title: opts.title ?? 'Confirmar',
      description: opts.description ?? '',
      confirmLabel: opts.confirmLabel ?? 'Confirmar',
      cancelLabel: opts.cancelLabel ?? 'Cancelar',
      danger: !!opts.danger,
      backdropCancel: opts.backdropCancel ?? true,
    };
    setQueue((q) => [...q, item]);

    return new Promise<boolean>((resolve) => {
      resolveRef.current[id] = resolve;
    });
  }, []);

  const handleClose = useCallback((id: number, result: boolean) => {
    const r = resolveRef.current[id];
    if (r) {
      r(result);
      delete resolveRef.current[id];
    }
    setQueue((q) => q.filter((it) => it.id !== id));
  }, []);

  const current = queue.length > 0 ? queue[0] : null;

  return (
    <ConfirmContext.Provider value={showConfirm}>
      {children}
      {current ? <ConfirmDialog key={current.id} opts={current} onClose={(res) => handleClose(current.id, res)} /> : null}
    </ConfirmContext.Provider>
  );
}

/* ---------------- internal ConfirmDialog ---------------- */
function ConfirmDialog({ opts, onClose }: { opts: InternalConfirm; onClose: (result: boolean) => void }) {
  const [loading, setLoading] = useState(false);

  const handleConfirm = () => {
    setLoading(true);
    try {
      onClose(true);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => onClose(false);

  if (typeof document === 'undefined') return null;

  return ReactDOM.createPortal(
    <div
      className="confirm-backdrop"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && opts.backdropCancel) handleCancel();
      }}
    >
      <div className="confirm-card" role="dialog" aria-modal="true" aria-labelledby="confirm-title" aria-describedby="confirm-desc">
        <h3 id="confirm-title" className="confirm-title">{opts.title}</h3>
        {opts.description ? <p id="confirm-desc" className="confirm-desc">{opts.description}</p> : null}

        <div className="confirm-actions">
          <button className="btn-cancel" onClick={handleCancel} disabled={loading}>
            {opts.cancelLabel}
          </button>

          <button className={`btn-confirm ${opts.danger ? 'danger' : ''}`} onClick={handleConfirm} disabled={loading}>
            {loading ? 'Processando...' : opts.confirmLabel}
          </button>
        </div>
      </div>

      <style jsx>{`
        .confirm-backdrop {
          position: fixed; inset: 0; z-index: 99999;
          display:flex; align-items:center; justify-content:center;
          background: rgba(2,6,23,0.45);
        }
        .confirm-card {
          width:100%; max-width:480px; background:#fff; border-radius:12px; padding:20px;
          box-shadow:0 12px 30px rgba(2,6,23,0.18); color:#0b1720;
        }
        .confirm-title { margin:0 0 8px 0; font-size:20px; font-weight:600; color:#111827; }
        .confirm-desc { margin:0 0 18px 0; font-size:14px; color:#475569; }
        .confirm-actions { display:flex; gap:10px; justify-content:flex-end; margin-top:6px; }
        .btn-cancel { padding:8px 12px; border-radius:8px; background:white; border:1px solid rgba(11,37,39,0.08); cursor:pointer; min-width:96px; color:#111827; font-weight:600; }
        .btn-confirm { padding:8px 12px; border-radius:8px; background:#0b2527; color:white; border:none; cursor:pointer; font-weight:800; min-width:96px; }
        .btn-confirm.danger { background:#dc2626; }
        .btn-cancel:disabled, .btn-confirm:disabled { opacity:0.7; cursor:not-allowed; }
        @media (max-width:520px) {
          .confirm-card { margin:0 16px; }
          .confirm-actions { flex-direction:column-reverse; }
          .btn-cancel, .btn-confirm { width:100%; }
        }
      `}</style>
    </div>,
    document.body!
  );
}
