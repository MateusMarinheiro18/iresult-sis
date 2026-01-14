"use client";

import React, { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import {
  HomeOutlined,
  BarChartOutlined,
  TramOutlined,
  FilterOutlined,
  MenuOutlined,
  CalendarTodayOutlined,
  MapOutlined,
  LocalPostOfficeOutlined,
  BusinessCenter,
  SearchOutlined,
  PersonOutline,
  IntegrationInstructionsOutlined,
  ChevronLeftOutlined,
  ChevronRightOutlined,
} from "@mui/icons-material";
import CompanyLink from "@/components/common/CompanyLink";

export type Variant = "client" | "admin";

export type MenuItem = {
  key: string;
  label: string;
  href: string;
  icon?: React.ReactNode;
  badge?: number | null;
  permission?: string;
  external?: boolean;
};

interface SidebarProps {
  variant?: Variant;
  className?: string;
  menuItems?: MenuItem[];
  onRequestClose?: () => void;
  openOnMobile?: boolean;
  canAccess?: (permission?: string) => boolean;
  onCollapseChange?: (collapsed: boolean) => void;
}

const DEFAULT_MENUS: Record<Variant, MenuItem[]> = {
  client: [
    { key: "dashboard", label: "Dashboard", href: "/client/dashboard", icon: <HomeOutlined /> },
    { key: "calendario", label: "Calendário", href: "/client/calendario", icon: <CalendarTodayOutlined /> },
    { key: "trilhas", label: "Trilhas", href: "/client/trilhas", icon: <MapOutlined /> },
    { key: "relatorios", label: "Relatórios", href: "/client/relatorios", icon: <BarChartOutlined /> },
  ],
  admin: [
    { key: "dashboard", label: "Dashbd", href: "/admin/dashboard", icon: <HomeOutlined /> },
    { key: "calendario", label: "Calendário", href: "/admin/calendario", icon: <CalendarTodayOutlined /> },
    { key: "trilhas", label: "Trilhas", href: "/admin/trilhas", icon: <MapOutlined /> },
    { key: "escalas", label: "Escalas", href: "/admin/escalas", icon: <SearchOutlined /> },
    { key: "relatorios", label: "Relatórios", href: "/admin/relatorios", icon: <BarChartOutlined /> },
    { key: "empresas", label: "Empresas", href: "/admin/empresas", icon: <BusinessCenter /> },
    { key: "administradores", label: "Administradores", href: "/admin/administradores", icon: <PersonOutline />, permission: "integrations.view" },
  ],
};

const SIDEBAR_COLLAPSE_KEY = "sis.sidebar.collapsed";

export default function Sidebar({
  variant = "client",
  className = "",
  menuItems,
  onRequestClose,
  openOnMobile = false,
  canAccess = (p?: string) => true,
  onCollapseChange,
}: SidebarProps) {
  const pathname = usePathname?.() ?? "";
  const menu = menuItems ?? DEFAULT_MENUS[variant];

  // persisted collapse state (user can pin collapsed)
  const [collapsed, setCollapsed] = useState<boolean>(false);
  // hover state to temporarily expand when collapsed
  const [hoverOpen, setHoverOpen] = useState<boolean>(false);
  // track if user just clicked to collapse (prevents immediate hover expansion)
  const [justCollapsed, setJustCollapsed] = useState<boolean>(false);

  useEffect(() => {
    const saved = typeof window !== "undefined" ? localStorage.getItem(SIDEBAR_COLLAPSE_KEY) : null;
    if (saved === "1") {
      setCollapsed(true);
      onCollapseChange?.(true);
    }
  }, [onCollapseChange]);

  useEffect(() => {
    try {
      if (typeof window !== "undefined") {
        localStorage.setItem(SIDEBAR_COLLAPSE_KEY, collapsed ? "1" : "0");
        onCollapseChange?.(collapsed);
      }
    } catch {
      /* ignore */
    }
  }, [collapsed, onCollapseChange]);

  const isExpanded = !collapsed || hoverOpen;
  const desktopWidth = isExpanded ? "w-72" : "w-20";

  const handleToggleCollapse = () => {
    setCollapsed((s) => {
      const newState = !s;
      if (newState) {
        // Se está colapsando, marca como "justCollapsed" e desativa hover
        setJustCollapsed(true);
        setHoverOpen(false);
        // Após 300ms, permite hover novamente
        setTimeout(() => setJustCollapsed(false), 300);
      }
      return newState;
    });
  };

  const renderList = () => (
    <ul className="space-y-5">
      {menu.map((it) => {
        if (it.permission && !canAccess(it.permission)) return null;
        const active = pathname.startsWith(it.href);

        const itemBase = `flex items-center gap-3 w-full px-3 py-2 rounded-md transition-colors duration-150`;
        const itemActive = active
          ? "bg-[#F3F4FF] text-[#421E97] shadow-sm"
          : "text-[#F3F4FF] hover:bg-[#421E97]/30";

        return (
          <li key={it.key}>
            <CompanyLink
              href={it.href}
              className={`${itemBase} ${itemActive}`}
              onClick={() => onRequestClose?.()}
              target={it.external ? "_blank" : undefined}
              rel={it.external ? "noreferrer" : undefined}
              preserveCompany={variant === "admin" && !it.external}
            >
              {/* Icon container - sempre visível */}
              <span
                className={`flex items-center justify-center min-w-[24px] text-[20px] transition-colors ${
                  active ? "text-[#421E97]" : "text-[#F3F4FF]"
                }`}
              >
                {it.icon}
              </span>

              {/* Label - aparece/desaparece com transição suave */}
              <span
                className={`whitespace-nowrap transition-all duration-200 ease-in-out ${
                  isExpanded
                    ? "opacity-100 max-w-[200px]"
                    : "opacity-0 max-w-0 overflow-hidden"
                }`}
              >
                {it.label}
              </span>

              {/* Badge - só aparece quando expandido */}
              {typeof it.badge === "number" && isExpanded && (
                <span className="ml-auto inline-flex items-center justify-center min-w-[22px] px-2 py-0.5 text-xs font-medium rounded-full bg-red-500 text-white">
                  {it.badge}
                </span>
              )}
            </CompanyLink>
          </li>
        );
      })}
    </ul>
  );

  const Logo = () => (
    <div className="flex items-center justify-center px-6 py-1 border-b border-white/10">
      {/* Logo icon - sempre visível e centralizado */}
      <div className="flex-shrink-0">
        <img
          src="/logos/sis_white.png"
          alt="Logo"
          className="w-30 h-30 object-contain"
        />
      </div>

      {/* Botão de colapsar - só aparece quando expandido */}
      {isExpanded && (
        <button
          aria-label={collapsed ? "Expandir barra lateral" : "Reduzir barra lateral"}
          title={collapsed ? "Expandir" : "Reduzir"}
          onClick={handleToggleCollapse}
          className="absolute right-4 flex items-center justify-center rounded-md p-1 hover:bg-white/10 transition-colors focus:outline-none focus:ring-2 focus:ring-white/20"
        >
          <ChevronLeftOutlined className="text-[#F3F4FF]" />
        </button>
      )}
    </div>
  );

  return (
    <>
      {/* Desktop / wide */}
      <aside
        aria-label={`${variant} sidebar`}
        aria-expanded={isExpanded}
        onMouseEnter={() => {
          if (collapsed && !justCollapsed) setHoverOpen(true);
        }}
        onMouseLeave={() => {
          if (collapsed) setHoverOpen(false);
        }}
        className={`hidden min-[851px]:flex fixed left-0 top-0 h-screen flex-col ${desktopWidth} bg-[#421E97] text-[#F3F4FF] shadow-lg ${className} transition-all duration-200 ease-in-out z-30`}
      >
        <div className="relative">
          <Logo />
        </div>

        <nav className="flex-1 px-4 py-4 overflow-y-auto overflow-x-hidden">
          {renderList()}
        </nav>

        <div className="h-6" />
      </aside>

      {/* Mobile overlay quando openOnMobile */}
      {openOnMobile && (
        <div role="dialog" aria-modal="true" className="fixed inset-0 z-40 flex min-[851px]:hidden">
          <div className="fixed inset-0 bg-black/40" onClick={onRequestClose} />
          <aside className="relative z-50 w-72 bg-[#421E97] h-full text-[#F3F4FF] shadow-xl">
            <div className="relative flex items-center justify-center border-b border-white/10 px-4 py-6">
              <img src="/logos/sis_white.png" alt="Logo" className="w-22 h-12" />
              <button 
                onClick={onRequestClose} 
                aria-label="Fechar menu" 
                className="absolute right-4 p-2 rounded-md hover:bg-white/10 transition-colors"
              >
                <MenuOutlined className="text-[#F3F4FF]" />
              </button>
            </div>

            <nav className="px-4 py-4 overflow-y-auto">{renderList()}</nav>
          </aside>
        </div>
      )}
    </>
  );
}
