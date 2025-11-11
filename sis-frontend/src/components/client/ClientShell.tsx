// src/components/ClientShell.tsx
"use client";

import React, { useState, useEffect } from "react";
import Sidebar from "@/components/common/Sidebar";
import Headbar from "@/components/common/Headbar";

export default function ClientShell({ children }: { children: React.ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const onResize = () => {
      if (window.innerWidth > 850) setMobileOpen(false);
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  // mocks de contadores (sem autenticação, públicos)
  const dynamicCounts = { notifications: 2, enquetes: 5 };

  return (
    <div className="min-h-screen flex bg-white">
      <Sidebar variant="client" openOnMobile={mobileOpen} onRequestClose={() => setMobileOpen(false)} />

      <div className="flex-1 flex flex-col min-h-screen">
        {/* Headbar não controla o mobile state — recebe callback */}
        <Headbar variant="client" dynamicCounts={dynamicCounts} onToggleMobile={() => setMobileOpen((s) => !s)} />

        <main className="p-6 flex-1">
          {children}
        </main>
      </div>
    </div>
  );
}
