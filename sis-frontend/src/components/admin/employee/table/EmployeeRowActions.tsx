// src/components/admin/employee/EmployeeRowActions.tsx
'use client';
import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { useConfirm } from '@/components/ui/ConfirmProvider';

function extractMessageFromBody(body: any): string | null {
  if (!body && body !== 0) return null;
  if (typeof body === 'string' && body.trim()) return body.trim();
  if (typeof body === 'object') {
    if (typeof body.message === 'string' && body.message.trim()) return body.message.trim();
    if (typeof body.msg === 'string' && body.msg.trim()) return body.msg.trim();
    if (typeof body.error === 'string' && body.error.trim()) return body.error.trim();
    if (typeof body.data === 'string' && body.data.trim()) return body.data.trim();
  }
  return null;
}

export default function EmployeeRowActions({
  companyId,
  employeeId,
}: {
  companyId: number;
  employeeId: number;
}) {
  const router = useRouter();
  const confirm = useConfirm();
  const [loading, setLoading] = useState(false); // excluir
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  // envio individual
  const [sendOpen, setSendOpen] = useState(false);
  const [sendMessage, setSendMessage] = useState('');
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onOutside);
    return () => document.removeEventListener('mousedown', onOutside);
  }, [open]);

  async function handleDelete() {
    if (loading) return;

    const ok = await confirm({
      title: 'Excluir funcionário',
      description: 'Tem certeza que deseja excluir este funcionário?',
      confirmLabel: 'Excluir',
      cancelLabel: 'Cancelar',
      danger: true,
    });
    if (!ok) return;

    setLoading(true);
    setOpen(false);

    const loadingId = toast.loading('Excluindo funcionário…');

    try {
      const res = await fetch(
        `/api/companies/${companyId}/employees/${employeeId}`,
        { method: 'DELETE', headers: { Accept: 'application/json' } }
      );

      const text = await res.text().catch(() => '');
      let body: any = {};
      try {
        body = text ? JSON.parse(text) : {};
      } catch {
        body = text;
      }

      if (!res.ok) {
        const msg = extractMessageFromBody(body) ?? 'Erro ao deletar funcionário.';
        toast.error(msg, { id: loadingId });
        setLoading(false);
        return;
      }

      const successMsg = extractMessageFromBody(body) ?? 'Funcionário deletado com sucesso.';
      toast.success(successMsg, { id: loadingId });

      setTimeout(() => router.refresh(), 800);
    } catch (err: any) {
      console.error('Erro ao deletar funcionário', err);
      const msg = err?.message ?? 'Erro inesperado ao deletar funcionário.';
      toast.error(msg, { id: loadingId });
      setLoading(false);
    } finally {
      setLoading(false);
    }
  }

  function handleEdit() {
    setOpen(false);
    router.push(`/admin/empresas/${companyId}/funcionarios/${employeeId}/edit`);
  }

  function handleOpenSend() {
    setOpen(false);
    setSendOpen(true);
  }

  async function handleConfirmSend() {
    if (sending) return;

    if (!sendMessage.trim()) {
      toast.error('Digite a mensagem que será enviada no e-mail.');
      return;
    }

    setSending(true);
    const loadingId = toast.loading('Enviando escala…');

    try {
      const res = await fetch(`/api/companies/${companyId}/send-escala`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: sendMessage, employeeId }),
      });

      const text = await res.text().catch(() => '');
      let body: any = {};
      try {
        body = text ? JSON.parse(text) : {};
      } catch {
        body = text;
      }

      if (!res.ok) {
        const msg = extractMessageFromBody(body) ?? 'Erro ao enviar escala.';
        toast.error(msg, { id: loadingId });
        setSending(false);
        return;
      }

      const sent = (body as any).sent ?? 0;
      const total = (body as any).total ?? sent;
      const skippedNoEmail = (body as any).skippedNoEmail ?? 0;

      const resumo =
        total > 1
          ? `Envio concluído. Destinatários: ${sent}/${total}. Sem e-mail: ${skippedNoEmail}.`
          : 'Envio concluído.';

      toast.success(resumo, { id: loadingId });

      setSendOpen(false);
      setSendMessage('');
    } catch (err: any) {
      console.error('Erro ao enviar escala (funcionário)', err);
      const msg = err?.message ?? 'Erro inesperado ao enviar escala.';
      toast.error(msg, { id: loadingId });
    } finally {
      setSending(false);
    }
  }

  function handleCancelSend() {
    if (sending) return;
    setSendOpen(false);
  }

  return (
    <div className="actions-root" ref={menuRef}>
      <button
        className="dots-btn"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((s) => !s)}
        title="Mais ações"
      >
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <circle cx="12" cy="5" r="1.5" fill="#6B7280" />
          <circle cx="12" cy="12" r="1.5" fill="#6B7280" />
          <circle cx="12" cy="19" r="1.5" fill="#6B7280" />
        </svg>
      </button>

      {open && (
        <div className="menu" role="menu">
          <button className="menu-item" onClick={handleOpenSend}>
            Enviar escala
          </button>
          <button className="menu-item" onClick={handleEdit}>
            Editar
          </button>
          <button
            className="menu-item danger"
            onClick={handleDelete}
            disabled={loading}
          >
            {loading ? 'Deletando...' : 'Excluir'}
          </button>
        </div>
      )}

      {sendOpen && (
        <div className="modal-backdrop">
          <div className="modal">
            <h3 className="modal-title">Enviar escala para funcionário</h3>
            <p className="modal-text">
              Digite a mensagem que será enviada para este funcionário junto com o link da escala.
            </p>
            <textarea
              className="modal-textarea"
              rows={5}
              value={sendMessage}
              onChange={(e) => setSendMessage(e.target.value)}
              placeholder="Olá, tudo bem? Por favor, responda a pesquisa no link abaixo..."
              disabled={sending}
            />
            <div className="modal-actions">
              <button
                type="button"
                className="modal-btn secondary"
                onClick={handleCancelSend}
                disabled={sending}
              >
                Cancelar
              </button>
              <button
                type="button"
                className="modal-btn primary"
                onClick={handleConfirmSend}
                disabled={sending}
              >
                {sending ? 'Enviando…' : 'Enviar'}
              </button>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        .actions-root {
          position: relative;
          display: inline-flex;
          align-items: center;
          justify-content: flex-end;
        }
        .dots-btn {
          background: transparent;
          border: none;
          padding: 6px;
          border-radius: 6px;
          cursor: pointer;
          transition: background 0.2s ease;
        }
        .dots-btn:hover {
          background: rgba(11, 37, 39, 0.06);
        }
        .menu {
          position: absolute;
          right: 0;
          top: calc(100% + 4px); /* abre para baixo */
          min-width: 160px;
          background: #fff;
          border: 1px solid rgba(11, 37, 39, 0.08);
          box-shadow: 0 8px 24px rgba(11, 37, 39, 0.12);
          border-radius: 8px;
          overflow: hidden;
          z-index: 100;
          display: flex;
          flex-direction: column;
        }
        .menu-item {
          padding: 10px 14px;
          text-align: left;
          border: none;
          background: transparent;
          font-weight: 600;
          font-size: 14px;
          cursor: pointer;
          color: #374151;
          transition: background 0.15s ease;
        }
        .menu-item:hover {
          background: rgba(11, 37, 39, 0.04);
        }
        .menu-item:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        .menu-item.danger {
          color: #dc2626;
          font-weight: 700;
        }
        .menu-item.danger:hover {
          background: #fef2f2;
        }

        .modal-backdrop {
          position: fixed;
          inset: 0;
          background: rgba(15, 23, 42, 0.45);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 9999;
        }

        .modal {
          width: 100%;
          max-width: 480px;
          background: #ffffff;
          border-radius: 16px;
          box-shadow: 0 24px 60px rgba(15, 23, 42, 0.45);
          padding: 20px 22px 18px;
        }

        .modal-title {
          margin: 0 0 6px;
          font-size: 18px;
          font-weight: 700;
          color: #421E97;
        }

        .modal-text {
          margin: 0 0 12px;
          font-size: 14px;
          color: #4b5563;
        }

        .modal-textarea {
          width: 100%;
          resize: vertical;
          min-height: 100px;
          border-radius: 10px;
          border: 1px solid #e5e7eb;
          padding: 10px 12px;
          font-size: 14px;
          outline: none;
          color: #111827;
        }

        .modal-textarea:focus {
          border-color: #421E97;
          box-shadow: 0 0 0 3px rgba(11, 37, 39, 0.08);
        }

        .modal-actions {
          margin-top: 14px;
          display: flex;
          justify-content: flex-end;
          gap: 10px;
        }

        .modal-btn {
          min-width: 120px;
          height: 40px;
          border-radius: 999px;
          border: none;
          font-weight: 700;
          font-size: 14px;
          cursor: pointer;
        }

        .modal-btn.primary {
          background: #421E97;
          color: #ffffff;
          box-shadow: 0 6px 20px rgba(11, 37, 39, 0.18);
        }

        .modal-btn.secondary {
          background: #ffffff;
          color: #421E97;
          border: 1px solid #421E97;
        }

        .modal-btn:disabled {
          opacity: 0.6;
          cursor: default;
          box-shadow: none;
        }
      `}</style>
    </div>
  );
}
