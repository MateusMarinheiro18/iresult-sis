// src/components/admin/company/CompanyRowActions.tsx
'use client';
import React, { useState, useEffect, useRef } from 'react';
import toast from 'react-hot-toast';
import { useRouter } from 'next/navigation';
import { useConfirm } from '@/components/ui/ConfirmProvider';

function extractMessageFromBody(body: any): string | null {
  if (!body) return null;
  if (typeof body === 'string' && body.trim()) return body;
  if (typeof body.message === 'string' && body.message.trim()) return body.message;
  if (typeof body.msg === 'string' && body.msg.trim()) return body.msg;
  if (typeof body.error === 'string' && body.error.trim()) return body.error;
  return null;
}

export default function CompanyRowActions({ companyId }: { companyId: number }) {
  const router = useRouter();
  const confirm = useConfirm();
  const [loading, setLoading] = useState(false); // excluir
  const [openMenu, setOpenMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  // envio escala
  const [sendOpen, setSendOpen] = useState(false);
  const [sendMessage, setSendMessage] = useState('');
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (!openMenu) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpenMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [openMenu]);

  async function handleDelete() {
    if (loading) return;

    const ok = await confirm({
      title: 'Excluir empresa',
      description: 'Tem certeza que deseja excluir esta empresa? Esta ação não pode ser desfeita.',
      confirmLabel: 'Excluir',
      cancelLabel: 'Cancelar',
      danger: true,
    });

    if (!ok) return;

    setLoading(true);
    setOpenMenu(false);

    const loadingId = toast.loading('Excluindo empresa…');

    try {
      const res = await fetch(`/api/companies/${companyId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
      });

      const body = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(body.error || body.message || 'Erro ao deletar empresa');
      }

      const successMsg = extractMessageFromBody(body) || 'Empresa deletada com sucesso!';
      toast.success(successMsg, { id: loadingId });

      setTimeout(() => router.refresh(), 800);
    } catch (err: any) {
      console.error('Erro ao deletar empresa:', err);
      const errorMsg = err.message || 'Erro ao deletar empresa';
      toast.error(errorMsg, { id: loadingId });
    } finally {
      setLoading(false);
    }
  }

  function handleEdit() {
    setOpenMenu(false);
    router.push(`/admin/empresas/${companyId}/edit`);
  }

  function handleOpenSend() {
    setOpenMenu(false);
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
        body: JSON.stringify({ message: sendMessage }),
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
      console.error('Erro ao enviar escala:', err);
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
        aria-expanded={openMenu}
        onClick={() => setOpenMenu(!openMenu)}
        title="Mais ações"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="5" r="1.5" fill="currentColor" />
          <circle cx="12" cy="12" r="1.5" fill="currentColor" />
          <circle cx="12" cy="19" r="1.5" fill="currentColor" />
        </svg>
      </button>

      {openMenu && (
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
            {loading ? 'Processando...' : 'Excluir'}
          </button>
        </div>
      )}

      {sendOpen && (
        <div className="modal-backdrop">
          <div className="modal">
            <h3 className="modal-title">Enviar escala</h3>
            <p className="modal-text">
              Digite a mensagem que será enviada para os funcionários desta empresa junto com o link da escala.
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
          display: flex;
          align-items: center;
          justify-content: center;
          width: 32px;
          height: 32px;
          background: transparent;
          border: none;
          padding: 6px;
          border-radius: 6px;
          cursor: pointer;
          transition: background 0.2s ease;
          color: #6b7280;
        }

        .dots-btn:hover {
          background: rgba(11, 37, 39, 0.06);
          color: #421E97;
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
          display: flex;
          align-items: center;
          padding: 10px 14px;
          text-align: left;
          border: none;
          background: transparent;
          font-weight: 600;
          font-size: 14px;
          cursor: pointer;
          color: #374151;
          transition: all 0.15s ease;
        }

        .menu-item:hover:not(:disabled) {
          background: rgba(11, 37, 39, 0.04);
        }

        .menu-item:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .menu-item.danger {
          color: #dc2626;
        }

        .menu-item.danger:hover:not(:disabled) {
          background: #fef2f2;
        }

        /* Modal */

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
