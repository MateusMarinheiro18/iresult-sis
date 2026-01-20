// src/components/Headbar.tsx
"use client";

import React, { useEffect, useRef, useState } from "react";
import IconButton from "@mui/material/IconButton";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import NotificationsNoneOutlinedIcon from "@mui/icons-material/NotificationsNoneOutlined";
import MenuIcon from "@mui/icons-material/Menu";
import DarkModeOutlinedIcon from "@mui/icons-material/DarkModeOutlined";
import LightModeOutlinedIcon from "@mui/icons-material/LightModeOutlined";
import AccountCircleOutlined from "@mui/icons-material/AccountCircleOutlined";
import SearchIcon from "@mui/icons-material/Search";
import ArrowDropDownIcon from "@mui/icons-material/ArrowDropDown";
import Link from "next/link";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import toast from "react-hot-toast";

type Variant = "client" | "admin";

interface HeadbarProps {
  variant?: Variant;
  dynamicCounts?: Record<string, number>;
  onToggleMobile?: () => void;
  /**
   * Optional override for the logout endpoint.
   * If not provided, defaults to:
   *  - admin -> /api/admins/logout
   *  - client -> /api/rh/logout
   */
  logoutUrl?: string;
}

type Company = { id: number; name: string };

export default function Headbar({
  variant = "client",
  dynamicCounts = {},
  onToggleMobile,
  logoutUrl,
}: HeadbarProps) {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const open = Boolean(anchorEl);
  const [dark, setDark] = useState<boolean>(false);
  const [loggingOut, setLoggingOut] = useState(false);

  // --- NEW: company selector state ---
  const [companyAnchor, setCompanyAnchor] = useState<null | HTMLElement>(null);
  const companyOpen = Boolean(companyAnchor);
  const [companies, setCompanies] = useState<Company[] | null>(null);
  const [companyQuery, setCompanyQuery] = useState("");
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const [loadingCompanies, setLoadingCompanies] = useState(false);

  const searchRef = useRef<HTMLInputElement | null>(null);
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();

  // focus search with Ctrl+K (or Cmd+K)
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const isK = e.key.toLowerCase() === "k";
      const mod = e.ctrlKey || e.metaKey;
      if (mod && isK) {
        e.preventDefault();
        searchRef.current?.focus();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  function getDefaultLogoutUrl(v: Variant) {
    return v === "admin" ? "/api/admins/logout" : "/api/rh/logout";
  }

  async function handleLogout() {
    if (loggingOut) return;
    setAnchorEl(null); // fecha menu
    setLoggingOut(true);
    const id = toast.loading("Saindo...");

    const url = logoutUrl ?? getDefaultLogoutUrl(variant);

    try {
      const res = await fetch(url, {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
      });

      // tenta extrair mensagem
      let data: any = {};
      try {
        data = await res.json();
      } catch {
        data = {};
      }

      if (!res.ok) {
        const msg = data?.error ?? "Erro ao sair da sessão.";
        toast.error(msg, { id });
        setLoggingOut(false);
        return;
      }

      toast.success(data?.message ?? "Sessão finalizada.", { id });

      // redireciona para página de login adequada
      const redirectPath = variant === "admin" ? "/admin/login" : "/client/login";
      // replace evita voltar para tela autenticada
      router.replace(redirectPath);
    } catch (err) {
      console.error("Erro no logout:", err);
      toast.error("Erro de rede ao encerrar a sessão.", { id });
      setLoggingOut(false);
    }
  }

  // --- UPDATED: fetch companies based on variant ---
  useEffect(() => {
    let mounted = true;
    async function load() {
      setLoadingCompanies(true);
      try {
        if (variant === "admin") {
          // Admin: busca todas as empresas
          const res = await fetch("/api/admins/companies");
          if (!res.ok) throw new Error("no api");
          const data = (await res.json()) as Company[];
          if (!mounted) return;
          setCompanies(data);
        } else {
          // Client: busca apenas a empresa do RH logado
          const res = await fetch("/api/rh/company");
          if (!res.ok) throw new Error("no api");
          const data = (await res.json()) as Company;
          if (!mounted) return;
          setCompanies([data]);
          setSelectedCompany(data); // já seleciona automaticamente
        }
      } catch (e) {
        // fallback sample list while API is not ready
        if (!mounted) return;
        if (variant === "admin") {
          setCompanies([
            { id: 0, name: "EMPRESA" },
            { id: 1, name: "Nova Empresa" },
            { id: 2, name: "Empresa Beta" },
            { id: 3, name: "Empresa Gamma" },
          ]);
        } else {
          // Client fallback: empresa fictícia
          const fallback = { id: 1, name: "Minha Empresa" };
          setCompanies([fallback]);
          setSelectedCompany(fallback);
        }
      } finally {
        if (!mounted) return;
        setLoadingCompanies(false);
      }
    }
    load();
    return () => {
      mounted = false;
    };
  }, [variant]);

  // --- UPDATED: sync selectedCompany from URL (route param takes priority) ---
  useEffect(() => {
    if (variant !== "admin" || !companies) return;

    // Tenta extrair companyId da rota dinâmica (ex: /admin/relatorios/8)
    const routeCompanyMatch = pathname.match(/\/admin\/relatorios\/(\d+)/);
    
    if (routeCompanyMatch) {
      // Prioridade 1: companyId na rota
      const routeCompanyId = Number(routeCompanyMatch[1]);
      const found = companies.find((c) => c.id === routeCompanyId);
      if (found) {
        setSelectedCompany(found);
      }
      return;
    }

    // Prioridade 2: query param ?company=
    const companyParam = searchParams.get("company");
    if (!companyParam) {
      setSelectedCompany(null);
      return;
    }

    const companyId = Number(companyParam);
    const found = companies.find((c) => c.id === companyId);
    if (found) {
      setSelectedCompany(found);
    }
  }, [searchParams, pathname, companies, variant]);

  // --- UPDATED: helper to navigate with company filter ---
  function applyCompanyToUrl(companyId: number | null) {
    // Se estamos em uma rota dinâmica de empresa, navega para a listagem geral
    const isInCompanyRoute = pathname.match(/\/admin\/relatorios\/\d+/);
    
    if (isInCompanyRoute) {
      // Volta para /admin/relatorios com ou sem filtro
      if (companyId === null || companyId === 0) {
        router.push('/admin/relatorios');
      } else {
        router.push(`/admin/relatorios?company=${companyId}`);
      }
      return;
    }

    // Se já estamos na listagem geral, apenas atualiza query param
    const params = new URLSearchParams(searchParams.toString());
    if (companyId === null || companyId === 0) {
      params.delete("company");
    } else {
      params.set("company", String(companyId));
    }

    const newUrl = `${pathname}${params.toString() ? "?" + params.toString() : ""}`;
    router.push(newUrl);
  }

  function handleCompanySelect(c: Company) {
    setSelectedCompany(c.id === 0 ? null : c);
    applyCompanyToUrl(c.id === 0 ? null : c.id);
    setCompanyAnchor(null);
  }

  const filteredCompanies =
    companies?.filter((c) => c.name.toLowerCase().includes(companyQuery.toLowerCase())) ?? [];

  return (
    <header className="w-full backdrop-blur-sm border-b border-gray-100 bg-[#F3F4FF]">
      <div className="max-w-[1600px] mx-auto px-4 py-3 flex items-center gap-4">
        {/* Left: hamburger (mobile) + company selector */}
        <div className="flex items-center gap-3">
          <div className="min-[851px]:hidden max-[850px]:block">
            <IconButton onClick={() => onToggleMobile?.()} aria-label="Abrir menu" size="small">
              <MenuIcon />
            </IconButton>
          </div>

          {/* --- Company selector button (both admin and client) --- */}
          <div>
            <button
              onClick={(e) => variant === "admin" && setCompanyAnchor(e.currentTarget)}
              disabled={variant === "client"}
              className="inline-flex items-center justify-center gap-2 rounded-full border px-4 py-2 font-semibold text-sm leading-none
                         border-[#130438] text-[#130438] bg-white shadow-sm
                         hover:bg-gray-50 transition-colors
                         disabled:hover:bg-white disabled:cursor-default
                         h-[36px] min-w-[120px]"
              aria-haspopup={variant === "admin" ? "true" : undefined}
              aria-expanded={companyOpen ? "true" : undefined}
              aria-label="Empresa"
              title={variant === "client" ? "Sua empresa" : "Selecionar Empresa"}
            >
              <span className="truncate max-w-[160px]">
                {selectedCompany ? selectedCompany.name : "EMPRESA"}
              </span>
              {variant === "admin" && <ArrowDropDownIcon className="text-[20px]" />}
            </button>

            {/* Menu apenas para admin */}
            {variant === "admin" && (
              <Menu
                anchorEl={companyAnchor}
                open={companyOpen}
                onClose={() => setCompanyAnchor(null)}
                anchorOrigin={{ horizontal: "left", vertical: "bottom" }}
                transformOrigin={{ horizontal: "left", vertical: "top" }}
                PaperProps={{ className: "p-2 w-[320px]" }}
              >
                {/* search inside dropdown */}
                <div className="px-2 py-1">
                  <input
                    placeholder="Buscar empresa..."
                    value={companyQuery}
                    onChange={(e) => setCompanyQuery(e.target.value)}
                    className="w-full rounded-md border px-3 py-2 text-sm outline-none"
                    autoFocus
                  />
                </div>

                <div className="max-h-[240px] overflow-auto">
                  {/* "Todos" / EMPRESA option */}
                  <MenuItem
                    onClick={() => handleCompanySelect({ id: 0, name: "EMPRESA" })}
                    selected={!selectedCompany}
                  >
                    Todas as empresas
                  </MenuItem>

                  {loadingCompanies && (
                    <div className="px-4 py-2 text-xs text-gray-500">Carregando...</div>
                  )}

                  {!loadingCompanies && filteredCompanies.length === 0 && (
                    <div className="px-4 py-2 text-xs text-gray-500">Nenhuma empresa encontrada</div>
                  )}

                  {!loadingCompanies &&
                    filteredCompanies.map((c) => (
                      <MenuItem
                        key={c.id}
                        onClick={() => handleCompanySelect(c)}
                        selected={selectedCompany?.id === c.id}
                      >
                        <div className="flex flex-col">
                          <span className="text-sm">{c.name}</span>
                          <span className="text-xs text-gray-400">ID: {c.id}</span>
                        </div>
                      </MenuItem>
                    ))}
                </div>

                <div className="px-2 pt-1 border-t mt-2">
                  <Link href="/admin/empresas" className="text-xs">
                    Gerenciar empresas
                  </Link>
                </div>
              </Menu>
            )}
          </div>
        </div>

        {/* center spacer */}
        <div className="flex-1" />

        {/* Right icons */}
        <div className="flex items-center gap-2">
          {/* theme toggle - keep the placeholder behaviour you had */}
          <button
            onClick={() => setDark((s) => !s)}
            className="p-1 rounded-full hover:bg-gray-100"
            aria-label="Toggle theme"
            title="Toggle theme"
          >
            {dark ? <LightModeOutlinedIcon /> : <DarkModeOutlinedIcon />}
          </button>

          {/* profile icon */}
          <div className="relative">
            <IconButton
              onClick={(e) => setAnchorEl(e.currentTarget)}
              aria-controls={open ? "profile-menu" : undefined}
              aria-haspopup="true"
              aria-expanded={open ? "true" : undefined}
              size="small"
              className="rounded-full p-1"
              aria-label="Abrir menu de perfil"
            >
              <AccountCircleOutlined className="text-gray-700" style={{ fontSize: 28 }} />
            </IconButton>

            <Menu
              id="profile-menu"
              anchorEl={anchorEl}
              open={open}
              onClose={() => setAnchorEl(null)}
              anchorOrigin={{ horizontal: "right", vertical: "bottom" }}
              transformOrigin={{ horizontal: "right", vertical: "top" }}
              MenuListProps={{ "aria-labelledby": "profile-button" }}
            >
              <MenuItem
                onClick={() => {
                  // dispara logout
                  handleLogout();
                }}
                disabled={loggingOut}
              >
                {loggingOut ? "Saindo..." : "Sair"}
              </MenuItem>
            </Menu>
          </div>
        </div>
      </div>
    </header>
  );
}
