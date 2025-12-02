'use client';

import React from 'react';
import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="notfound-root">
      <div className="notfound-card">
        <h1>Página não encontrada</h1>
        <p>
          O endereço acessado não existe. Escolha como deseja entrar no sistema:
        </p>

        <div className="buttons">
          <Link href="/client/login">
            <button type="button" className="btn btn-primary">
              Usuário RH
            </button>
          </Link>

          <Link href="/admin/login">
            <button type="button" className="btn btn-secondary">
              Administrador
            </button>
          </Link>
        </div>
      </div>

      <style jsx>{`
        .notfound-root {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #f3f5fb;
          padding: 2rem;
        }

        .notfound-card {
          width: 100%;
          max-width: 520px;
          text-align: center;
        }

        h1 {
          font-size: 3rem;
          margin-bottom: 0.75rem;
          color: #0b2527;
        }

        p {
          margin: 0;
          margin-bottom: 2rem;
          color: #4a5568;
          font-size: 0.95rem;
        }

        .buttons {
          display: flex;
          flex-wrap: wrap;
          gap: 1rem;
          justify-content: center;
        }

        .btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-width: 180px;
          height: 44px;
          padding: 0 1.5rem;
          border-radius: 999px;
          font-weight: 700;
          letter-spacing: 0.6px;
          cursor: pointer;
          border: none;
          font-size: 0.95rem;
        }

        .btn-primary {
          background: #0b2527;
          color: #ffffff;
          box-shadow: 0 6px 20px rgba(11, 37, 39, 0.12);
        }

        .btn-secondary {
          background: #ffffff;
          color: #0b2527;
          border: 1px solid #0b2527;
        }

        @media (max-width: 480px) {
          .notfound-card {
            padding: 2rem 1.5rem 0;
          }

          h1 {
            font-size: 2rem;
          }
        }
      `}</style>
    </div>
  );
}
