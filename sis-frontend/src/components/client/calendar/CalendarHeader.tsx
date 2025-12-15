'use client';

import React from 'react';
import { useRouter } from 'next/navigation';

import FilterListOutlinedIcon from '@mui/icons-material/FilterListOutlined';
import SearchOutlinedIcon from '@mui/icons-material/SearchOutlined';
import AddCircleOutlineOutlinedIcon from '@mui/icons-material/AddCircleOutlineOutlined';

type Props = {
  month: number;
  year: number;
  onMonthChange: (month: number) => void;
  onYearChange: (year: number) => void;
  onTodayClick: () => void;
  onClearFilters: () => void;
  searchText: string;
  onSearchChange: (value: string) => void;
  tipos: string[];
  selectedTipo: string | null;
  onTipoChange: (value: string | null) => void;
};

const MONTH_LABELS = [
  'Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro',
];

export default function CalendarHeader({
  month,
  year,
  onMonthChange,
  onYearChange,
  onTodayClick,
  onClearFilters,
  searchText,
  onSearchChange,
  tipos,
  selectedTipo,
  onTipoChange,
}: Props) {
  const router = useRouter();

  const handlePrevMonth = () => {
    const newMonth = month - 1;
    if (newMonth < 0) {
      onMonthChange(11);
      onYearChange(year - 1);
    } else {
      onMonthChange(newMonth);
    }
  };

  const handleNextMonth = () => {
    const newMonth = month + 1;
    if (newMonth > 11) {
      onMonthChange(0);
      onYearChange(year + 1);
    } else {
      onMonthChange(newMonth);
    }
  };

  const handleYearSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onYearChange(Number(e.target.value));
  };

  const handleMonthSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onMonthChange(Number(e.target.value));
  };

  const handleNewEventClick = () => {
    // client-side "novo evento" pode apontar para a área de trilhas do client
    router.push('/client/trilhas');
  };

  const yearOptions: number[] = [];
  for (let y = year - 2; y <= year + 3; y++) yearOptions.push(y);

  return (
    <div className="calendar-header">
      <div className="calendar-header-left">
        <div className="calendar-header-row">
          <button type="button" className="calendar-nav-btn" onClick={handlePrevMonth} aria-label="Mês anterior">‹</button>

          <select className="calendar-select" value={month} onChange={handleMonthSelect}>
            {MONTH_LABELS.map((label, index) => <option key={label} value={index}>{label}</option>)}
          </select>

          <select className="calendar-select calendar-year-select" value={year} onChange={handleYearSelect}>
            {yearOptions.map((y) => <option key={y} value={y}>{y}</option>)}
          </select>

          <button type="button" className="calendar-nav-btn" onClick={handleNextMonth} aria-label="Próximo mês">›</button>

          <button type="button" className="calendar-today-btn" onClick={onTodayClick}>Hoje</button>
        </div>

        <button type="button" className="calendar-new-event-btn" onClick={handleNewEventClick}>
          <AddCircleOutlineOutlinedIcon />
          <span>Novo Evento</span>
        </button>
      </div>

      <div className="calendar-header-right">
        <div className="calendar-search">
          <SearchOutlinedIcon className="calendar-search-icon" />
          <input type="text" placeholder="Buscar por nome, trilha ou empresa..." value={searchText} onChange={(e) => onSearchChange(e.target.value)} />
        </div>

        <div className="calendar-filter">
          <FilterListOutlinedIcon className="calendar-filter-icon" />
          <select
            className="calendar-select calendar-filter-select"
            value={selectedTipo ?? ''}
            onChange={(e) => onTipoChange(e.target.value === '' ? null : e.target.value)}
          >
            <option value="">Todos os tipos</option>
            {tipos.map((tipo) => (
              <option key={tipo} value={tipo}>
                {tipo}
              </option>
            ))}
          </select>
        </div>

        <button type="button" className="calendar-clear-filters-btn" onClick={onClearFilters}>Limpar filtros</button>
      </div>
    </div>
  );
}
