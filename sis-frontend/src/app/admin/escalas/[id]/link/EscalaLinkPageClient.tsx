// src/app/admin/escalas/[id]/link/EscalaLinkPageClient.tsx
'use client';

import React, { useState } from 'react';
import EscalaEmpresasSection from '@/components/admin/escalas/EscalaEmpresasSection';

type Props = {
  escalaId: number;
  escalaNome: string;
  initialMessage?: string;
};

export default function EscalaLinkPageClient({
  escalaId,
  escalaNome,
  initialMessage = '',
}: Props) {
  const [message, setMessage] = useState(initialMessage);
  const [sending, setSending] = useState(false);
  const [feedback, setFeedback] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  async function handleSendLinks() {
    setSending(true);
    setFeedback(null);

    try {
      const res = await fetch(`/api/escalas/${escalaId}/send-links`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message,
        }),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        const text =
          data?.error ??
          'Não foi possível enviar os e-mails. Tente novamente em instantes.';
        setFeedback({ type: 'error', text });
        return;
      }

      const totalEmpresas = data?.totalEmpresas ?? 0;
      const totalDestinatarios = data?.totalDestinatarios ?? 0;

      setFeedback({
        type: 'success',
        text:
          totalEmpresas === 0
            ? 'Nenhuma empresa com funcionários com e-mail foi encontrada.'
            : `Envio concluído. Empresas com e-mail: ${totalEmpresas}. Destinatários: ${totalDestinatarios}.`,
      });
    } catch (err) {
      console.error(err);
      setFeedback({
        type: 'error',
        text: 'Ocorreu um erro inesperado ao enviar os e-mails. Tente novamente.',
      });
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="page-root">
      <main className="container">
        <header className="header-row">
          <div>
            <h1 className="page-title">Empresas da escala</h1>
            <p className="page-subtitle">
              Selecione as empresas que participarão da escala{' '}
              <strong>{escalaNome}</strong>.
            </p>
          </div>
        </header>

        {/* Bloco da mensagem do e-mail */}
        <section className="email-card">
          <h2 className="email-title">Mensagem do e-mail</h2>
          <p className="email-subtitle">
            Este texto será incluído no corpo do e-mail. O link para o formulário de
            cada empresa será adicionado automaticamente ao final da mensagem.
          </p>

          <textarea
            className="email-textarea"
            rows={6}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Ex: Olá, tudo bem? Gostaríamos de contar com a sua participação respondendo a esta enquete..."
          />
        </section>

        {/* seção de empresas (continua igual) */}
        <EscalaEmpresasSection escalaId={escalaId} />

        {/* Bloco final com botão de enviar */}
        <section className="send-section">
          <div className="send-text">
            <p>
              Após definir as empresas vinculadas, você poderá enviar o link do
              formulário para todos os funcionários dessas empresas.
            </p>
          </div>
          <div className="send-actions">
            <button
              type="button"
              className="btn-send"
              onClick={handleSendLinks}
              disabled={sending}
            >
              {sending ? 'Enviando links...' : 'Enviar links para funcionários'}
            </button>
          </div>
        </section>

        {/* feedback de envio */}
        {feedback && (
          <section
            className={`feedback ${
              feedback.type === 'error' ? 'feedback-error' : 'feedback-success'
            }`}
          >
            {feedback.text}
          </section>
        )}
      </main>

      <style jsx>{`
        .page-root {
          width: 100%;
        }

        .container {
          max-width: 1120px;
          margin: 0 auto;
          padding: 24px 16px 40px;
        }

        .header-row {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 20px;
        }

        .page-title {
          font-size: 20px;
          font-weight: 700;
          color: #111827;
          margin: 0 0 4px;
        }

        .page-subtitle {
          font-size: 14px;
          color: #6b7280;
          margin: 0;
        }

        .email-card {
          margin-bottom: 16px;
          padding: 16px 18px;
          border-radius: 12px;
          background: #ffffff;
          box-shadow: 0 6px 18px rgba(11, 37, 39, 0.06);
        }

        .email-title {
          margin: 0 0 4px;
          font-size: 16px;
          font-weight: 700;
          color: #111827;
        }

        .email-subtitle {
          margin: 0 0 10px;
          font-size: 13px;
          color: #6b7280;
        }

        .email-textarea {
          width: 100%;
          border-radius: 12px;
          border: 1px solid #e5e7eb;
          padding: 10px 12px;
          font-size: 14px;
          resize: vertical;
          min-height: 120px;
          box-sizing: border-box;
          font-family: inherit;
          color: #111827;
        }

        .email-textarea:focus {
          outline: none;
          border-color: #0b2527;
          box-shadow: 0 0 0 1px #0b2527;
        }

        .send-section {
          margin-top: 20px;
          padding: 16px 18px;
          border-radius: 12px;
          border: 1px dashed #d1d5db;
          background: #f9fafb;
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 12px;
        }

        .send-text p {
          margin: 0;
          font-size: 13px;
          color: #4b5563;
        }

        .send-actions {
          display: flex;
          align-items: center;
          justify-content: flex-end;
        }

        .btn-send {
          border-radius: 999px;
          padding: 8px 18px;
          font-size: 13px;
          font-weight: 700;
          cursor: pointer;
          border: 1px solid #0b2527;
          background: #0b2527;
          color: #ffffff;
          white-space: nowrap;
          transition: all 0.15s ease;
        }

        .btn-send:hover:not(:disabled) {
          background: #134148;
          border-color: #134148;
        }

        .btn-send:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .feedback {
          margin-top: 16px;
          padding: 10px 14px;
          border-radius: 12px;
          font-size: 13px;
        }

        .feedback-error {
          background: #fef2f2;
          color: #b91c1c;
          border: 1px solid #fecaca;
        }

        .feedback-success {
          background: #ecfdf3;
          color: #166534;
          border: 1px solid #bbf7d0;
        }

        @media (max-width: 960px) {
          .header-row {
            flex-direction: column;
            align-items: flex-start;
          }

          .send-section {
            flex-direction: column;
            align-items: flex-start;
          }

          .send-actions {
            width: 100%;
            justify-content: flex-start;
          }
        }
      `}</style>
    </div>
  );
}
