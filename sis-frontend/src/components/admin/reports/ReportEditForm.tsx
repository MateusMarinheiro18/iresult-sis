// src/components/admin/reports/ReportEditForm.tsx
'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';

type Initial = {
  id: number;
  titulo: string;
  texto?: string | null;
  dataPublicacao?: string | null;
};

export default function ReportEditForm({
  companyId,
  reportId,
  initial,
}: {
  companyId: number;
  reportId: number;
  initial: Initial;
}) {
  const router = useRouter();

  const [titulo, setTitulo] = useState(initial?.titulo ?? '');
  const [texto, setTexto] = useState(initial?.texto ?? '');
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    setTitulo(initial?.titulo ?? '');
    setTexto(initial?.texto ?? '');
  }, [initial?.id]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!titulo.trim()) {
      toast.error('Título do relatório é obrigatório.');
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(`/api/companies/${companyId}/reports/${reportId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ titulo: titulo.trim(), texto: texto.trim() || null }),
      });

      const bodyText = await res.text().then(t => {
        try { return t ? JSON.parse(t) : {}; } catch { return t; }
      });

      if (!res.ok) {
        const msg = (bodyText && bodyText.message) || String(bodyText) || 'Erro ao atualizar relatório.';
        toast.error(msg);
        setSaving(false);
        return;
      }

      const successMsg = (bodyText && (bodyText.message || bodyText.msg)) ?? 'Relatório atualizado.';
      toast.success(successMsg);

      setTimeout(() => {
        router.push(`/admin/relatorios/${companyId}`);
      }, 700);
    } catch (err: any) {
      console.error(err);
      toast.error(err?.message ?? 'Erro inesperado');
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!confirm('Tem certeza que deseja excluir este relatório? Esta ação pode ser desfeita apenas pelo administrador do banco.')) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/companies/${companyId}/reports/${reportId}`, { method: 'DELETE' });
      if (!res.ok) {
        const body = await res.text();
        toast.error(body || 'Erro ao excluir.');
        setDeleting(false);
        return;
      }
      toast.success('Relatório excluído.');
      setTimeout(() => router.push(`/admin/relatorios/${companyId}`), 500);
    } catch (err: any) {
      console.error(err);
      toast.error('Erro inesperado ao excluir.');
      setDeleting(false);
    }
  }

  function handleCancel() {
    router.push(`/admin/relatorios/${companyId}`);
  }

  return (
    <form className="form-root" onSubmit={handleSubmit} noValidate>
      <div className="grid">
        <div className="field full">
          <label className="label">Título do Relatório *</label>
          <input
            className="input"
            value={titulo}
            onChange={(e) => setTitulo(e.target.value)}
            placeholder="Título do relatório"
            required
          />
        </div>

        <div className="field full">
          <label className="label">Texto / Descrição</label>
          <textarea
            className="input textarea"
            value={texto ?? ''}
            onChange={(e) => setTexto(e.target.value)}
            placeholder="Digite aqui o texto ou resumo do relatório..."
            rows={6}
          />
        </div>
      </div>

      <div className="buttons">
        <button type="submit" className="btn primary" disabled={saving || deleting}>
          {saving ? 'Salvando...' : 'SALVAR'}
        </button>

        <button type="button" className="btn secondary" onClick={handleCancel} disabled={saving || deleting}>
          CANCELAR
        </button>

      </div>

      <style jsx>{`
        .form-root { display:block; }
        .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 18px; align-items: start; }
        .field{ display:flex; flex-direction:column; }
        .field.full { grid-column: 1 / -1; }
        .label{ font-size:12px; font-weight:700; color:#233; margin-bottom:8px; letter-spacing:0.2px; }
        .input{ padding:8px 12px; border:1px solid #e6e9ef; border-radius:8px; background:#fff; font-size:14px; outline:none; transition:box-shadow .12s, border-color .12s; color:#111827; }
        .input:focus{ border-color:#421E97; box-shadow:0 0 0 3px rgba(11,37,39,0.06); }
        .textarea{ min-height:140px; resize:vertical; line-height:1.5; }
        .buttons { margin-top:26px; display:flex; gap:12px; justify-content:center; align-items:center; flex-wrap:wrap; }
        .btn{ min-width:140px; height:44px; border-radius:999px; font-weight:700; letter-spacing:0.6px; cursor:pointer; border:none; }
        .btn.primary{ background:#421E97; color:white; box-shadow:0 6px 20px rgba(11,37,39,0.12); }
        .btn.secondary{ background:white; color:#421E97; border:1px solid #421E97; }
        @media (max-width:960px){ .grid{ grid-template-columns:1fr; } .buttons{ flex-direction:column; } .btn{ width:100%; min-width:0; } .btn + .btn{ margin-top:8px; } }
      `}</style>
    </form>
  );
}
