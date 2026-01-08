'use client';
import React from 'react';
import { useRouter } from 'next/navigation';
import EditEmployeeForm from '@/components/admin/employee/editForm/EditEmployeeForm';

type Props = {
  companyId?: number;
  companyName?: string | null;
  initial?: any;
  error?: string | null;
};

export default function EditEmployeePageClient({ companyId, companyName, initial, error }: Props) {
  const router = useRouter();

  if (error || !companyId || !initial) {
    return (
      <div className="page-root">
        <main className="container">
          <div className="header-row">
            <h1 className="title">FUNCIONÁRIO - EDITAR</h1>
            <button className="back-btn" onClick={() => router.push('/admin/empresas')}>
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
              <span>Voltar</span>
            </button>
          </div>

          <section className="card">
            <div className="card-header">
              <h2>Erro</h2>
            </div>
            <div className="card-body">
              <p style={{ color: '#b91c1c', marginBottom: 16 }}>
                {error ?? 'Não foi possível identificar a empresa ou o funcionário.'}
              </p>
            </div>
          </section>
        </main>

        <style jsx>{`
          .page-root { padding: 24px; background: #f3f4ff; min-height: 100vh; box-sizing: border-box; }
          .container { max-width: 1180px; margin: 0 auto; }
          .header-row { display:flex; justify-content:space-between; align-items:center; margin-bottom:20px; gap:12px; flex-wrap:wrap; }
          .title { font-size:20px; font-weight:700; color:#421E97; margin:0; }
          .back-btn { display:inline-flex; align-items:center; gap:6px; color:#421E97; border:none; border-radius:8px; font-size:14px; font-weight:600; padding:8px 14px; cursor:pointer; background:transparent; }
          .back-btn:hover { background: rgba(11,37,39,0.06); }
          .card { background:#fff; border-radius:14px; box-shadow:0 6px 18px rgba(11,37,39,0.06); overflow:hidden; }
          .card-header { background:#421E97; padding:18px 24px; }
          .card-header h2 { color:#fff; margin:0; font-size:16px; font-weight:700; }
          .card-body { padding:24px; }
        `}</style>
      </div>
    );
  }

  return (
    <div className="page-root">
      <main className="container">
        <div className="header-row">
          <h1 className="title">FUNCIONÁRIO - EDITAR{companyName ? ` — ${companyName}` : ''}</h1>
          <button className="back-btn" onClick={() => router.push(`/admin/empresas/${companyId}/funcionarios`)}>
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
            <span>Voltar</span>
          </button>
        </div>

        <section className="card">
          <div className="card-header">
            <h2>Dados</h2>
          </div>

          <div className="card-body">
            <EditEmployeeForm companyId={companyId!} initial={initial} />
          </div>
        </section>
      </main>

      <style jsx>{`
        .page-root { padding: 24px; background: #f3f4ff; min-height: 100vh; box-sizing: border-box; }
        .container { max-width: 1180px; margin: 0 auto; }
        .header-row { display:flex; justify-content:space-between; align-items:center; margin-bottom:20px; gap:12px; flex-wrap:wrap; }
        .title { font-size:20px; font-weight:700; color:#421E97; margin:0; }
        .back-btn { display:inline-flex; align-items:center; gap:6px; color:#421E97; border:none; border-radius:8px; font-size:14px; font-weight:600; padding:8px 14px; cursor:pointer; background:transparent; }
        .card { background:#fff; border-radius:14px; box-shadow:0 6px 18px rgba(11,37,39,0.06); overflow:hidden; }
        .card-header { background:#421E97; padding:18px 24px; }
        .card-header h2 { color:#fff; margin:0; font-size:16px; font-weight:700; }
        .card-body { padding:24px; }
      `}</style>
    </div>
  );
}
