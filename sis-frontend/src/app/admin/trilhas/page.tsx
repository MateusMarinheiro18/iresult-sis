// src/app/admin/trilhas/page.tsx
import React from 'react';
import TrilhasPageClient from './TrilhasPageClient';

export default function TrilhasPage() {
  // Agora os dados vêm da API dentro do client component
  return <TrilhasPageClient />;
}
