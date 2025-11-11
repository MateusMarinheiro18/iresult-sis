// src/app/client/layout.tsx
import React from "react";
import ClientShell from "@/components/client/ClientShell";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "SIS — Portal Cliente",
  description: "Portal do cliente - SIS",
};

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>
        <ClientShell>{children}</ClientShell>
      </body>
    </html>
  );
}
