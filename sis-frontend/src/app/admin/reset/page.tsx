// src/app/client/reset/page.tsx
import { Suspense } from 'react';
import ResetClient from './ResetClient';

export default function ClientResetPasswordPage() {
  // Mantemos esta página como Server Component;
  // toda a lógica que precisa de hooks/estado fica no ResetClient (client component).
  return (
    <Suspense fallback={
      <div style={{ 
        minHeight: '100vh', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        background: '#421E97',
        color: '#fff'
      }}>
        Carregando...
      </div>
    }>
      <ResetClient />
    </Suspense>
  );
}
