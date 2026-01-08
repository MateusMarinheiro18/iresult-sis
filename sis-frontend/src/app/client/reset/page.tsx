// src/app/client/reset/page.tsx
import { Suspense } from 'react';
import ResetClient from './ResetClient';

export default function ClientResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <div
          style={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: '#421E97',
            color: '#fff',
          }}
        >
          Carregando...
        </div>
      }
    >
      <ResetClient />
    </Suspense>
  );
}
