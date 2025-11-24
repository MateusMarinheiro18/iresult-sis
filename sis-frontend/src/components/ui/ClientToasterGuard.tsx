// src/components/ui/ClientToasterGuard.tsx
'use client';
import React, { useEffect, useState } from 'react';
import ClientToaster from './ClientToaster';

export default function ClientToasterGuard() {
  const [shouldRender, setShouldRender] = useState(false);

  useEffect(() => {
    // marca globalmente que já existe um Toaster
    if ((window as any).__hasGlobalToaster) {
      setShouldRender(false);
      return;
    }
    (window as any).__hasGlobalToaster = true;
    setShouldRender(true);

    // intentionally do not remove the flag on unmount so other components don't remount new toasters
  }, []);

  if (!shouldRender) return null;
  return <ClientToaster />;
}
