// src/app/admin/calendario/CalendarPageClient.tsx
'use client';

import React, { useEffect, useMemo, useState } from 'react';
import CalendarTodayOutlined from '@mui/icons-material/CalendarTodayOutlined';
import toast from 'react-hot-toast';

import type { CalendarEvent } from '@/components/admin/calendar/calendarTypes';
import CalendarHeader from '@/components/admin/calendar/CalendarHeader';
import MonthGrid from '@/components/admin/calendar/MonthGrid';
import EventListPanel from '@/components/admin/calendar/EventListPanel';

// IMPORTA OS ESTILOS DO CALENDÁRIO
import './calendar.css';

function buildDayKeyFromDate(d: Date): string {
  const year = d.getFullYear();
  const month = d.getMonth() + 1;
  const day = d.getDate();
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

/**
 * Converte uma string ISO/DATE ('2025-12-08' ou '2025-12-08T00:00:00.000Z')
 * para uma Date no fuso local, sem o shift de timezone.
 */
function parseDateAsLocal(iso: string): Date {
  if (!iso) return new Date(NaN);

  const datePart = iso.substring(0, 10); // pega só 'YYYY-MM-DD'
  const [yearStr, monthStr, dayStr] = datePart.split('-');
  const year = Number(yearStr);
  const month = Number(monthStr);
  const day = Number(dayStr);

  if (!year || !month || !day) return new Date(NaN);

  // new Date(ano, mesIndex, dia) cria no horário local (sem interpretar como UTC)
  return new Date(year, month - 1, day);
}

function buildDayKeyFromISO(iso: string): string {
  const d = parseDateAsLocal(iso);
  return buildDayKeyFromDate(d);
}

export default function CalendarPageClient() {
  const today = new Date();

  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [currentMonth, setCurrentMonth] = useState(today.getMonth());
  const [currentYear, setCurrentYear] = useState(today.getFullYear());
  const [selectedDate, setSelectedDate] = useState<Date | null>(today);

  const [searchText, setSearchText] = useState('');
  const [selectedTipo, setSelectedTipo] = useState<string | 'all'>('all');

  useEffect(() => {
    async function fetchEvents() {
      try {
        setLoading(true);
        setError(null);

        const res = await fetch('/api/calendario/itens');
        if (!res.ok) {
          throw new Error('Falha ao carregar eventos do calendário.');
        }
        const data = await res.json();
        const items = (data.items || []) as any[];

        const mapped: CalendarEvent[] = items.map((item) => ({
          id: item.id,
          nome: item.nome,
          tipo: item.tipo,
          detalhes: item.detalhes,
          data: item.data,
          trilha: item.trilha,
          empresas: item.empresas ?? [],
        }));

        setEvents(mapped);
      } catch (err: any) {
        console.error(err);
        setError(err?.message ?? 'Erro inesperado ao carregar eventos.');
        toast.error('Erro ao carregar eventos do calendário.');
      } finally {
        setLoading(false);
      }
    }

    fetchEvents();
  }, []);

  const tiposDisponiveis = useMemo(() => {
    const set = new Set<string>();
    events.forEach((e) => {
      if (e.tipo) set.add(e.tipo);
    });
    return Array.from(set).sort();
  }, [events]);

  const filteredEventsForMonth = useMemo(() => {
    return events.filter((event) => {
      if (!event.data) return false;

      // ❗ Usa data local em vez de new Date(event.data)
      const d = parseDateAsLocal(event.data);

      if (d.getMonth() !== currentMonth || d.getFullYear() !== currentYear) {
        return false;
      }

      if (selectedTipo !== 'all' && event.tipo !== selectedTipo) {
        return false;
      }

      if (searchText.trim()) {
        const q = searchText.toLowerCase();
        const haystack = [
          event.nome,
          event.tipo ?? '',
          event.detalhes ?? '',
          event.trilha?.nome ?? '',
          ...event.empresas.map((e) => e.razaoSocial),
        ]
          .join(' ')
          .toLowerCase();

        if (!haystack.includes(q)) return false;
      }

      return true;
    });
  }, [events, currentMonth, currentYear, selectedTipo, searchText]);

  const eventsByDay = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>();
    filteredEventsForMonth.forEach((event) => {
      const key = buildDayKeyFromISO(event.data);
      const list = map.get(key);
      if (list) list.push(event);
      else map.set(key, [event]);
    });
    return map;
  }, [filteredEventsForMonth]);

  const selectedDateKey = selectedDate ? buildDayKeyFromDate(selectedDate) : null;
  const eventsForSelectedDate = selectedDateKey
    ? eventsByDay.get(selectedDateKey) ?? []
    : [];

  const listEvents = selectedDateKey ? eventsForSelectedDate : filteredEventsForMonth;

  const handleSelectDate = (date: Date) => {
    const key = buildDayKeyFromDate(date);
    if (selectedDate && buildDayKeyFromDate(selectedDate) === key) {
      setSelectedDate(null);
    } else {
      setSelectedDate(date);
      if (date.getMonth() !== currentMonth || date.getFullYear() !== currentYear) {
        setCurrentMonth(date.getMonth());
        setCurrentYear(date.getFullYear());
      }
    }
  };

  const handleToday = () => {
    const now = new Date();
    setCurrentMonth(now.getMonth());
    setCurrentYear(now.getFullYear());
    setSelectedDate(now);
  };

  const handleClearFilters = () => {
    setSelectedTipo('all');
    setSearchText('');
    setSelectedDate(null);
  };

  return (
    <section className="admin-calendar-page">
      <header className="page-header">
        <div className="page-header-title">
          <div>
            <h1>Calendário</h1>
            <p className="page-header-subtitle">
              Visualize todos os eventos de trilhas em uma linha do tempo unificada.
            </p>
          </div>
        </div>
      </header>

      <div className="calendar-layout">
        <div className="calendar-main">
          <CalendarHeader
            month={currentMonth}
            year={currentYear}
            onMonthChange={setCurrentMonth}
            onYearChange={setCurrentYear}
            onTodayClick={handleToday}
            onClearFilters={handleClearFilters}
            searchText={searchText}
            onSearchChange={setSearchText}
            tipos={tiposDisponiveis}
            selectedTipo={selectedTipo === 'all' ? null : selectedTipo}
            onTipoChange={(t) => setSelectedTipo(t ?? 'all')}
          />

          {loading ? (
            <div className="calendar-loading">Carregando eventos...</div>
          ) : error ? (
            <div className="calendar-error">
              {error}
              <button type="button" onClick={() => window.location.reload()}>
                Tentar novamente
              </button>
            </div>
          ) : (
            <MonthGrid
              month={currentMonth}
              year={currentYear}
              eventsByDay={eventsByDay}
              selectedDate={selectedDate}
              onSelectDate={handleSelectDate}
            />
          )}
        </div>

        <aside className="calendar-sidebar">
          <EventListPanel
            events={listEvents}
            selectedDate={selectedDate}
            loading={loading}
          />
        </aside>
      </div>
    </section>
  );
}