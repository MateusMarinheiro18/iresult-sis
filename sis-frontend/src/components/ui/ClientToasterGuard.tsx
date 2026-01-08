// src/components/ui/ClientToasterGuard.tsx
'use client';
import React, { useLayoutEffect, useState } from 'react';
import { Toaster } from 'react-hot-toast';

export default function ClientToasterGuard() {
  const [shouldRender, setShouldRender] = useState(false);

  useLayoutEffect(() => {
    if ((window as any).__hasGlobalToaster) {
      setShouldRender(false);
      return;
    }
    (window as any).__hasGlobalToaster = true;
    setShouldRender(true);
  }, []);

  if (!shouldRender) return null;

  return (
    <Toaster
      position="top-right"
      toastOptions={{
        duration: 4000,
        style: {
          borderRadius: 10,
          padding: '12px 16px',
          background: '#FFFFFF',
          color: '#421E97',
          fontWeight: 600,
          fontSize: '14px',
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
        },
        success: { 
          duration: 4000,
          iconTheme: {
            primary: '#10b981',
            secondary: '#fff',
          },
        },
        error: { 
          duration: 6000,
          iconTheme: {
            primary: '#ef4444',
            secondary: '#fff',
          },
        },
        loading: {
          duration: Infinity,
        },
      }}
    />
  );
}