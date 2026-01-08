'use client';
import React from 'react';
import { useRouter } from 'next/navigation';
import UsersRhFormEdit from '@/components/admin/usersrh/editForm/UsersRhFormEdit';
import Link from 'next/link';

type UserInitial = {
  id_usuario_rh: number;
  nome?: string | null;
  email?: string | null;
  telefone?: string | null;
  data_nascimento?: string | null; // yyyy-mm-dd or ''
  cidade?: string | null;
  gestor?: string | null;
  ativo?: boolean;
};

type Props = {
  companyId?: number;
  companyName?: string | null;
  userInitial?: UserInitial | null;
  error?: string;
};

/**
 * Edit page client for Usuário RH.
 * - Expects server page to call this with companyId and userInitial (prefetched).
 * - Reuses UsersRhFormEdit, passing companyId, userrhId and initial.
 *
 * NOTE: Ajuste os nomes de rota em router.push caso sua rota difira.
 */
export default function EditUserRhPageClient({ companyId, companyName, userInitial, error }: Props) {
  const router = useRouter();

  // Se houver erro de rota / ausência de companyId ou dados do usuário, mostramos mensagem
  if (error || !companyId || !userInitial) {
    return (
      <div className="page-root">
        <main className="container">
          <div className="header-row">
            <h1 className="title">USUÁRIO RH — EDITAR</h1>
            <button
              className="back-btn"
              onClick={() => router.push('/admin/empresas')}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="18"
                height="18"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
              <span>Voltar</span>
            </button>
          </div>

          <section className="card">
            <div className="card-header">
              <h2>Erro: dados insuficientes</h2>
            </div>
            <div className="card-body">
              <p style={{ color: '#b91c1c', marginBottom: 16 }}>
                {error || 'companyId e/ou dados do usuário não foram fornecidos.'}
              </p>
              <div style={{ color: '#6b7280', fontSize: 14 }}>
                <p><strong>Possíveis causas:</strong></p>
                <ul style={{ marginTop: 8, paddingLeft: 20 }}>
                  <li>Você abriu a URL sem os parâmetros: confirme que a rota é <code>/admin/empresas/123/usuariosrh/456/edit</code>.</li>
                  <li>O arquivo da página server deve estar em <code>src/app/admin/empresas/[id]/usuariosrh/[userrhId]/edit/page.tsx</code> e passar <code>userInitial</code> para este componente.</li>
                  <li>Se você navegou via código, verifique o <code>router.push()</code> ou o <code>Link</code>.</li>
                </ul>
              </div>
            </div>
          </section>
        </main>

        <style jsx>{`
          .page-root {
            padding: 24px;
            background: #f3f4ff;
            box-sizing: border-box;
            min-height: 100vh;
          }

          .container {
            max-width: 1180px;
            margin: 0 auto;
          }

          .header-row {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 20px;
            flex-wrap: wrap;
            gap: 12px;
          }

          .title {
            font-size: 20px;
            font-weight: 700;
            color: #421E97;
            margin: 0;
          }

          .back-btn {
            display: inline-flex;
            align-items: center;
            gap: 6px;
            color: #421E97;
            border: none;
            border-radius: 8px;
            font-size: 14px;
            font-weight: 600;
            padding: 8px 14px;
            cursor: pointer;
            transition: all 0.2s ease;
            background: transparent;
          }

          .back-btn:hover {
            background: rgba(11, 37, 39, 0.06);
          }

          .back-btn svg {
            stroke: #421E97;
          }

          .card {
            background: #fff;
            border-radius: 14px;
            box-shadow: 0 6px 18px rgba(11, 37, 39, 0.06);
            overflow: hidden;
          }

          .card-header {
            background: #421E97;
            padding: 18px 24px;
          }

          .card-header h2 {
            color: #fff;
            margin: 0;
            font-size: 16px;
            font-weight: 700;
          }

          .card-body {
            padding: 24px;
          }

          @media (max-width: 640px) {
            .container {
              padding: 8px;
            }

            .header-row {
              flex-direction: column;
              align-items: flex-start;
            }

            .back-btn {
              width: 100%;
              justify-content: center;
            }

            .card-body {
              padding: 16px;
            }
          }
        `}</style>
      </div>
    );
  }

  // Se chegou aqui, companyId e userInitial existem
  const userrhId = userInitial.id_usuario_rh;

  return (
    <div className="page-root">
      <main className="container">
        {/* Header com título e botão voltar */}
        <div className="header-row">
          <h1 className="title">
            USUÁRIO RH — EDITAR{companyName ? ` — ${companyName}` : ''}
          </h1>
          <button
            className="back-btn"
            onClick={() => router.push(`/admin/empresas/${companyId}/usuariosrh`)}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="18"
              height="18"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth="2"
            >
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
            {/* Usando o form de edição (UsersRhFormEdit) que aceita: companyId, userrhId, initial */}
            <UsersRhFormEdit
              companyId={companyId!}
              userrhId={userrhId}
              initial={userInitial}
            />
          </div>
        </section>
      </main>

      <style jsx>{`
        .page-root {
          padding: 24px;
          background: #f3f4ff;
          box-sizing: border-box;
          min-height: 100vh;
        }

        .container {
          max-width: 1180px;
          margin: 0 auto;
        }

        .header-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 20px;
          flex-wrap: wrap;
          gap: 12px;
        }

        .title {
          font-size: 20px;
          font-weight: 700;
          color: #421E97;
          margin: 0;
        }

        .back-btn {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          color: #421E97;
          border: none;
          border-radius: 8px;
          font-size: 14px;
          font-weight: 600;
          padding: 8px 14px;
          cursor: pointer;
          transition: all 0.2s ease;
          background: transparent;
        }

        .back-btn:hover {
          background: rgba(11, 37, 39, 0.06);
        }

        .back-btn svg {
          stroke: #421E97;
        }

        .card {
          background: #fff;
          border-radius: 14px;
          box-shadow: 0 6px 18px rgba(11, 37, 39, 0.06);
          overflow: hidden;
        }

        .card-header {
          background: #421E97;
          padding: 18px 24px;
        }

        .card-header h2 {
          color: #fff;
          margin: 0;
          font-size: 16px;
          font-weight: 700;
        }

        .card-body {
          padding: 24px;
        }

        @media (max-width: 640px) {
          .container {
            padding: 8px;
          }

          .header-row {
            flex-direction: column;
            align-items: flex-start;
          }

          .back-btn {
            width: 100%;
            justify-content: center;
          }

          .card-body {
            padding: 16px;
          }
        }
      `}</style>
    </div>
  );
}
