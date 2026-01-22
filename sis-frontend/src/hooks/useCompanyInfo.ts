"use client";

import { useState, useEffect } from "react";

type CompanyInfo = {
  id: number;
  name: string;
  logoUrl?: string;
};

export function useCompanyInfo(variant: "client" | "admin") {
  const [company, setCompany] = useState<CompanyInfo | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (variant !== "client") {
      setLoading(false);
      return;
    }

    async function fetchCompany() {
      try {
        const res = await fetch("/api/rh/company");
        if (res.ok) {
          const data = await res.json();
          
          // Construir URL absoluta para a logo
          let logoUrl: string | undefined;
          if (data.logoFileName) {
            // Em produção, usar URL absoluta
            const baseUrl = typeof window !== 'undefined' 
              ? window.location.origin 
              : '';
            logoUrl = `${baseUrl}/uploads/logos/${data.logoFileName}`;
          }
          
          setCompany({
            id: data.id,
            name: data.name,
            logoUrl,
          });
        }
      } catch (err) {
        console.error("Erro ao buscar empresa:", err);
      } finally {
        setLoading(false);
      }
    }

    fetchCompany();
  }, [variant]);

  return { company, loading };
}
