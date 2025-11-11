// src/app/admin/empresas/layout.tsx
import React from 'react';
import AdminShell from '@/components/admin/AdminShell';

export const revalidate = 0; // opcional, se usar ISR

export default function EmpresasLayout({ children }: { children: React.ReactNode }) {
  // Este layout é aninhado: não renderize <html> nem <body> aqui.
  return (
    <AdminShell>
      {children}
    </AdminShell>
  );
}
