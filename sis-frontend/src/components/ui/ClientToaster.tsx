// src/components/ui/ClientToaster.tsx
'use client';
import React from 'react';
import { Toaster } from 'react-hot-toast';

export default function ClientToaster() {
  return (
    <Toaster
      position="top-right"
      toastOptions={{
        duration: 4000,
        style: {
          borderRadius: 10,
          padding: '10px 14px',
          background: '#0B2527', // sua paleta
          color: '#F3F4FF',
          fontWeight: 600,
        },
        success: { duration: 3000 },
        error: { duration: 6000 },
      }}
    />
  );
}
