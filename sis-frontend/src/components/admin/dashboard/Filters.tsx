'use client';
import React, { useEffect, useRef, useState } from 'react';
import type { Empresa, Escala } from '@/app/admin/dashboard/DashboardAdminPageClient';

type Option = { value: string; label: string; meta?: any };

function buildOptionsFromEmpresas(empresas: Empresa[]): Option[] {
  return empresas.map((e) => ({ value: String(e.id), label: e.razaoSocial }));
}
function buildOptionsFromEscalas(escalas: Escala[]): Option[] {
  return escalas.map((s) => ({ value: String(s.id), label: s.nome }));
}

export default function Filters({
  empresas,
  escalas,
  empresaSelecionada,
  setEmpresaSelecionada,
  escalaSelecionada,
  setEscalaSelecionada,
}: {
  empresas: Empresa[];
  escalas: Escala[];
  empresaSelecionada: number | null;
  setEmpresaSelecionada: (id: number | null) => void;
  escalaSelecionada: number | null;
  setEscalaSelecionada: (id: number | null) => void;
}) {
  // options
  const empresaOptions = buildOptionsFromEmpresas(empresas);
  const escalaOptions = buildOptionsFromEscalas(escalas);

  return (
    <div className="filters-root" role="region" aria-label="Filtros do dashboard">
      <Dropdown
        id="filter-empresa"
        label="Todas as empresas"
        options={empresaOptions}
        value={empresaSelecionada !== null ? String(empresaSelecionada) : ''}
        onChange={(val) => setEmpresaSelecionada(val ? Number(val) : null)}
        placeholder="Todas as empresas"
        ariaLabel="Filtrar por empresa"
      />

      <Dropdown
        id="filter-escala"
        label="Todas as escalas"
        options={escalaOptions}
        value={escalaSelecionada !== null ? String(escalaSelecionada) : ''}
        onChange={(val) => setEscalaSelecionada(val ? Number(val) : null)}
        placeholder="Todas as escalas"
        ariaLabel="Filtrar por escala"
      />

      {(empresaSelecionada || escalaSelecionada) && (
        <div className="field action">
          <button
            type="button"
            onClick={() => {
              setEmpresaSelecionada(null);
              setEscalaSelecionada(null);
            }}
            aria-label="Limpar filtros"
          >
            Limpar filtros
          </button>
        </div>
      )}

      <style jsx>{`
        .filters-root {
          display: flex;
          gap: 16px;
          margin-bottom: 32px;
          align-items: center;
          flex-wrap: wrap;
        }

        .field {
          display: inline-flex;
          align-items: center;
        }

        .action button {
          padding: 12px 16px;
          border-radius: 8px;
          border: 1px solid #d1d5db;
          background: #0B2527;
          color: #ffffff;
          font-size: 14px;
          cursor: pointer;
          min-height: 44px;
        }

        .action button:hover {
          box-shadow: 0 1px 2px rgba(2, 6, 23, 0.06);
          border-color: #c7cbd0;
        }

        @media (max-width: 880px) {
          .filters-root {
            gap: 12px;
          }
        }

        @media (max-width: 640px) {
          .filters-root {
            flex-direction: column;
            align-items: stretch;
          }

          .field {
            width: 100%;
          }

          .action button {
            width: 100%;
          }
        }
      `}</style>
    </div>
  );
}

/* ====================================================================== */
/*  Dropdown component (custom)                                           */
/*  - keyboard: ArrowUp/Down to move, Enter to select, Esc to close       */
/*  - accessible attributes (aria)                                        */
/* ====================================================================== */

function Dropdown({
  id,
  options,
  value,
  onChange,
  placeholder,
  label,
  ariaLabel,
}: {
  id: string;
  options: Option[];
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
  label?: string;
  ariaLabel?: string;
}) {
  const [open, setOpen] = useState(false);
  const [highlightIndex, setHighlightIndex] = useState<number>(-1);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);

  // close on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        menuRef.current &&
        triggerRef.current &&
        !menuRef.current.contains(e.target as Node) &&
        !triggerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  // set highlight to selected when opening
  useEffect(() => {
    if (open) {
      const selIndex = options.findIndex((o) => o.value === value);
      setHighlightIndex(selIndex >= 0 ? selIndex : 0);
      // focus the menu for key handling
      setTimeout(() => menuRef.current?.focus(), 0);
    } else {
      setHighlightIndex(-1);
    }
  }, [open, options, value]);

  function getLabelFor(val: string) {
    if (!val) return placeholder ?? label ?? '';
    const found = options.find((o) => o.value === val);
    return found ? found.label : placeholder ?? label ?? '';
  }

  function handleSelect(val: string) {
    onChange(val);
    setOpen(false);
    triggerRef.current?.focus();
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Escape') {
      e.preventDefault();
      setOpen(false);
      triggerRef.current?.focus();
      return;
    }

    if (e.key === 'Enter') {
      e.preventDefault();
      if (open && highlightIndex >= 0 && highlightIndex < options.length) {
        handleSelect(options[highlightIndex].value);
      } else {
        setOpen((v) => !v);
      }
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setOpen(true);
      setHighlightIndex((i) => {
        const next = i + 1;
        return next >= options.length ? 0 : next;
      });
      return;
    }

    if (e.key === 'ArrowUp') {
      e.preventDefault();
      setOpen(true);
      setHighlightIndex((i) => {
        const prev = i - 1;
        return prev < 0 ? options.length - 1 : prev;
      });
      return;
    }
  }

  return (
    <div className="dropdown-root field" style={{ position: 'relative' }}>
      <button
        id={id}
        ref={triggerRef}
        type="button"
        className="dropdown-trigger"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={ariaLabel ?? label ?? id}
        onClick={() => setOpen((v) => !v)}
        onKeyDown={(e) => {
          // allow keyboard open
          if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
            e.preventDefault();
            setOpen(true);
            setTimeout(() => menuRef.current?.focus(), 0);
          }
        }}
      >
        <span className="trigger-label">{getLabelFor(value)}</span>
        <span className="trigger-caret" aria-hidden>▾</span>
      </button>

      {open && (
        <div
          role="listbox"
          tabIndex={0}
          ref={menuRef}
          className="dropdown-menu"
          onKeyDown={onKeyDown}
        >
          {options.length === 0 ? (
            <div className="dropdown-empty">Sem opções</div>
          ) : (
            options.map((opt, idx) => {
              const selected = opt.value === value;
              const highlighted = idx === highlightIndex;
              return (
                <div
                  key={opt.value}
                  role="option"
                  aria-selected={selected}
                  className={`dropdown-item ${selected ? 'selected' : ''} ${highlighted ? 'highlight' : ''}`}
                  onMouseEnter={() => setHighlightIndex(idx)}
                  onMouseDown={(e) => {
                    // use onMouseDown to avoid losing focus before click
                    e.preventDefault();
                    handleSelect(opt.value);
                  }}
                >
                  <span className="item-label">{opt.label}</span>
                  {selected && <span className="item-check" aria-hidden>✓</span>}
                </div>
              );
            })
          )}
        </div>
      )}

      <style jsx>{`
        .dropdown-trigger {
          display: inline-flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          padding: 12px 14px;
          min-width: 220px;
          height: 44px;
          border-radius: 8px;
          border: 1px solid #d1d5db;
          background: #f7fafc;
          color: #0f172a;
          font-size: 14px;
          cursor: pointer;
        }

        .dropdown-trigger:focus {
          outline: 3px solid rgba(11,37,39,0.08);
        }

        .trigger-label {
          display: inline-block;
          text-align: left;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          max-width: 320px;
        }

        .trigger-caret {
          color: #6b7280;
          font-size: 12px;
        }

        .dropdown-menu {
          position: absolute;
          z-index: 999;
          top: calc(100% + 6px);
          left: 0;
          min-width: 240px;
          max-width: 420px;
          max-height: 240px;
          overflow: auto;
          background: #fff;
          border: 1px solid rgba(11,37,39,0.08);
          box-shadow: 0 8px 24px rgba(11,37,39,0.12);
          border-radius: 8px;
          padding: 6px;
        }

        .dropdown-empty {
          padding: 10px 12px;
          color: #6b7280;
          font-size: 14px;
        }

        .dropdown-item {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 10px 12px;
          border-radius: 6px;
          cursor: pointer;
          color: #0f172a;
          font-weight: 600;
          font-size: 14px;
        }

        .dropdown-item + .dropdown-item {
          margin-top: 4px;
        }

        /* highlight (hover / keyboard) */
        .dropdown-item.highlight {
          background: #0B2527; /* blue highlight */
          color: #ffffff;
        }

        .dropdown-item:hover {
          background: #0B2527;
        }

        /* selected style (show check and slightly bold) */
        .dropdown-item.selected {
          background: #0B2527;
          color: #F7FAFC;
        }

        .dropdown-item .item-check {
          color: inherit;
          font-weight: 700;
        }

        @media (max-width: 880px) {
          .dropdown-trigger {
            min-width: 160px;
          }
          .dropdown-menu {
            min-width: 180px;
            max-width: 300px;
          }
        }
      `}</style>
    </div>
  );
}
