'use client';
import React from 'react';
import { useRouter } from 'next/navigation';
import AdminsEditForm from '@/components/admin/administradores/editForm/AdminsEditForm';

type Props = { initial?: any; error?: string };

export default function EditAdminPageClient({ initial, error }: Props) {
  const router = useRouter();

  if (error) {
    return (
      <div className="page-root">
        <main className="container">
          <div className="header-row">
            <h1 className="title">ADMINISTRADOR - EDITAR</h1>
            <button className="back-btn" onClick={() => router.push('/admin/administradores')}>
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
              <p style={{ color: '#b91c1c' }}>{error}</p>
              <div style={{ marginTop: 12 }}>
                <button className="btn secondary" onClick={() => router.push('/admin/administradores')}>Voltar para administradores</button>
              </div>
            </div>
          </section>
        </main>
        <style jsx>{/* reuse styles as before */''}</style>
      </div>
    );
  }

  return (
    <div className="page-root">
      <main className="container">
        <div className="header-row">
          <h1 className="title">ADMINISTRADOR - EDITAR</h1>
          <button className="back-btn" onClick={() => router.push('/admin/administradores')}>
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
            <span>Voltar</span>
          </button>
        </div>

        <section className="card">
          <div className="card-header"><h2>Dados</h2></div>
          <div className="card-body">
            <AdminsEditForm initial={initial} />
          </div>
        </section>
      </main>

      <style jsx>{`
        .page-root { padding:24px; background:#f3f4ff; min-height:100vh; box-sizing:border-box; }
        .container { max-width:1180px; margin:0 auto; }
        .header-row { display:flex; justify-content:space-between; align-items:center; gap:12px; margin-bottom:20px; }
        .title { font-size:20px; font-weight:700; color:#421E97; margin:0; }
        .back-btn { display:inline-flex; align-items:center; gap:6px; color:#421E97; border:none; border-radius:8px; padding:8px 14px; background:transparent; cursor:pointer; font-weight:600; }
        .card { background:#fff; border-radius:14px; box-shadow:0 6px 18px rgba(11,37,39,0.06); overflow:hidden; }
        .card-header { background:#421E97; padding:18px 24px; }
        .card-header h2 { color:#fff; margin:0; font-size:16px; font-weight:700; }
        .card-body { padding:24px; }
        @media (max-width:640px){ .container{padding:8px;} .header-row{flex-direction:column;align-items:flex-start;} .card-body{padding:16px;} }
      `}</style>
    </div>
  );
}
