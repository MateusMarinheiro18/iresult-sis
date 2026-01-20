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
          setCompany({
            id: data.id,
            name: data.name,
            logoUrl: data.logoFileName 
              ? `/uploads/logos/${data.logoFileName}`
              : undefined,
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
