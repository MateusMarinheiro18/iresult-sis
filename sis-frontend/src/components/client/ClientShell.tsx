// src/components/ClientShell.tsx
"use client";

import React, { useState, useEffect } from "react";
import Sidebar from "@/components/common/Sidebar";
import Headbar from "@/components/common/Headbar";

export default function ClientShell({ children }: { children: React.ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  useEffect(() => {
    const onResize = () => {
      if (window.innerWidth > 850) setMobileOpen(false);
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const dynamicCounts = { notifications: 1, escalasPendentes: 3 };

  return (
    <div className="min-h-screen flex bg-[#F3F4FF]">
      <Sidebar 
        variant="client" 
        openOnMobile={mobileOpen} 
        onRequestClose={() => setMobileOpen(false)}
        onCollapseChange={setSidebarCollapsed}
      />

      <div 
        className={`flex-1 flex flex-col min-h-screen transition-all duration-200 ${
          sidebarCollapsed ? 'min-[851px]:ml-20' : 'min-[851px]:ml-72'
        }`}
      >
        <Headbar variant="client" dynamicCounts={dynamicCounts} onToggleMobile={() => setMobileOpen((s) => !s)} />
        <main className="p-6 flex-1">{children}</main>
      </div>
    </div>
  );
}