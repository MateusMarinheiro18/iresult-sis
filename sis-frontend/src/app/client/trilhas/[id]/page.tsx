// app/client/trilhas/[id]/page.tsx
'use client';

import React from 'react';
import { useParams } from 'next/navigation';
import TrilhaDetailPageClient from '@/app/client/trilhas/[id]/TrilhaDetailPageClient';

export default function Page() {
  const params = useParams();
  const id = params?.id ?? null;
  const trilhaId = id ? Number(id) : NaN;

  if (!trilhaId || Number.isNaN(trilhaId) || trilhaId <= 0) {
    return (
      <div style={{ padding: 24 }}>
        <h1>Trilha não encontrada</h1>
      </div>
    );
  }

  return <TrilhaDetailPageClient trilhaId={trilhaId} />;
}
