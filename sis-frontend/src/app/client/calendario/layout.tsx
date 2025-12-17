// src/app/admin/empresas/layout.tsx
import React from 'react';
import ClientShell from '@/components/client/ClientShell';

export const revalidate = 0; // opcional, se usar ISR

export default function EmpresasLayout({ children }: { children: React.ReactNode }) {
  // Este layout é aninhado: não renderize <html> nem <body> aqui.
  return (
    <ClientShell>
      {children}
    </ClientShell>
  );
}
