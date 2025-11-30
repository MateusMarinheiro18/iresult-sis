// src/components/admin/calendar/EventListPanel.tsx
'use client';

import React from 'react';
import type { CalendarEvent } from './calendarTypes';
import EventCard from './EventCard';

type EventListPanelProps = {
  events: CalendarEvent[];
  selectedDate: Date | null;
  loading?: boolean;
};

function formatSelectedDate(date: Date | null) {
  if (!date) return null;
  return date.toLocaleDateString('pt-BR', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
}

export default function EventListPanel({
  events,
  selectedDate,
  loading,
}: EventListPanelProps) {
  const hasSelection = !!selectedDate;
  const title = hasSelection ? 'Agendamentos do dia' : 'Agendamentos do mês';
  const subtitle = hasSelection
    ? formatSelectedDate(selectedDate)
    : 'Selecione um dia no calendário para filtrar.';

  return (
    <div className="calendar-event-panel">
      <header className="calendar-event-panel-header">
        <h2>{title}</h2>
        {subtitle && (
          <p className="calendar-event-panel-subtitle">{subtitle}</p>
        )}
      </header>

      {loading ? (
        <div className="calendar-event-panel-loading">Carregando eventos...</div>
      ) : events.length === 0 ? (
        <div className="calendar-event-panel-empty">
          Nenhum evento encontrado para este período.
        </div>
      ) : (
        <div className="calendar-event-list">
          {events.map((event) => (
            <EventCard key={event.id} event={event} />
          ))}
        </div>
      )}
    </div>
  );
}
