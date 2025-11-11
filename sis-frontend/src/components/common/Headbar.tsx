// src/components/Headbar.tsx
"use client";

import React, { useEffect, useRef, useState } from "react";
import IconButton from "@mui/material/IconButton";
import Badge from "@mui/material/Badge";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import NotificationsNoneOutlinedIcon from "@mui/icons-material/NotificationsNoneOutlined";
import MenuIcon from "@mui/icons-material/Menu";
import StarBorderOutlinedIcon from "@mui/icons-material/StarBorderOutlined";
import DarkModeOutlinedIcon from "@mui/icons-material/DarkModeOutlined";
import LightModeOutlinedIcon from "@mui/icons-material/LightModeOutlined";
import AccountCircleOutlined from "@mui/icons-material/AccountCircleOutlined";
import SearchIcon from "@mui/icons-material/Search";
import Link from "next/link";

type Variant = "client" | "admin";

interface HeadbarProps {
  variant?: Variant;
  dynamicCounts?: Record<string, number>;
  onToggleMobile?: () => void;
}

export default function Headbar({ variant = "client", dynamicCounts = {}, onToggleMobile }: HeadbarProps) {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const open = Boolean(anchorEl);
  const [dark, setDark] = useState<boolean>(false);

  const searchRef = useRef<HTMLInputElement | null>(null);

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

  return (
    <header className="w-full bg-white/95 backdrop-blur-sm border-b border-gray-100">
      <div className="max-w-[1600px] mx-auto px-4 py-3 flex items-center gap-4">
        {/* Left: hamburger (mobile) + search */}
        <div className="flex items-center gap-3">
          <div className="min-[851px]:hidden max-[850px]:block">
            <IconButton onClick={() => onToggleMobile?.()} aria-label="Abrir menu" size="small">
              <MenuIcon />
            </IconButton>
          </div>

          <div className="hidden md:flex items-center bg-white rounded-full shadow-sm px-3 py-2 w-[520px] max-w-full border border-gray-100">
            <SearchIcon className="text-gray-400 mr-2" />
            <input
              ref={searchRef}
              type="search"
              placeholder="Search [CTRL + K]"
              aria-label="Buscar"
              className="flex-1 outline-none text-sm text-gray-600 placeholder-gray-400 bg-transparent"
            />
            <span className="ml-3 text-xs text-gray-400 px-2 py-0.5 rounded">CTRL + K</span>
          </div>

          {/* compact search on small screens */}
          <div className="md:hidden">
            <button
              onClick={() => searchRef.current?.focus()}
              aria-label="Buscar"
              className="p-2 rounded-full hover:bg-gray-100"
              title="Buscar"
            >
              <SearchIcon />
            </button>
          </div>
        </div>

        {/* center spacer to mimic the subtle centered blurred area in the image */}
        <div className="flex-1" />

        {/* Right icons */}
        <div className="flex items-center gap-2">
          {/* theme toggle */}
          <IconButton
            onClick={() => setDark((d) => !d)}
            aria-label="Alternar tema"
            size="small"
            className="rounded-full p-1"
          >
            {dark ? <LightModeOutlinedIcon /> : <DarkModeOutlinedIcon />}
          </IconButton>

          {/* notifications */}
          <IconButton aria-label="Notificações" size="small" className="rounded-full p-1">
            <Badge badgeContent={dynamicCounts?.notifications ?? 0} color="error">
              <NotificationsNoneOutlinedIcon />
            </Badge>
          </IconButton>

          {/* profile icon (replaces profile photo) */}
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
                  setAnchorEl(null);
                  window.location.href = variant === "client" ? "/client/profile" : "/admin/profile";
                }}
              >
                Meu Perfil
              </MenuItem>
              <MenuItem
                onClick={() => {
                  setAnchorEl(null);
                  window.location.href = "/logout";
                }}
              >
                Sair
              </MenuItem>
            </Menu>
          </div>
        </div>
      </div>
    </header>
  );
}
