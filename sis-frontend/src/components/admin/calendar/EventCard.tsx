// src/components/admin/calendar/EventCard.tsx
'use client';

import React from 'react';
import type { CalendarEvent } from './calendarTypes';

import EventOutlinedIcon from '@mui/icons-material/EventOutlined';
import TimelineOutlinedIcon from '@mui/icons-material/TimelineOutlined';
import BusinessOutlinedIcon from '@mui/icons-material/BusinessOutlined';

type Props = {
  event: CalendarEvent;
};

function formatDateTime(iso: string) {
  const d = new Date(iso);
  const datePart = d.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });

  let timePart = '';
  if (!(d.getHours() === 0 && d.getMinutes() === 0)) {
    timePart = d.toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  return timePart ? `${datePart} · ${timePart}` : datePart;
}

export default function EventCard({ event }: Props) {
  const empresasLabel =
    event.empresas && event.empresas.length > 0
      ? event.empresas.map((e) => e.razaoSocial).join(', ')
      : null;

  return (
    <article className="calendar-event-card">
      <header className="calendar-event-card-header">
        <span className="calendar-event-chip">{event.tipo || 'Evento'}</span>
        <h3 className="calendar-event-title">{event.nome}</h3>
      </header>

      <div className="calendar-event-body">
        <div className="calendar-event-row">
          <EventOutlinedIcon fontSize="small" />
          <span>{formatDateTime(event.data)}</span>
        </div>

        {event.trilha && (
          <div className="calendar-event-row">
            <TimelineOutlinedIcon fontSize="small" />
            <span>Trilha: {event.trilha.nome}</span>
          </div>
        )}

        {empresasLabel && (
          <div className="calendar-event-row">
            <BusinessOutlinedIcon fontSize="small" />
            <span>{empresasLabel}</span>
          </div>
        )}

        {event.detalhes && (
          <p className="calendar-event-description">{event.detalhes}</p>
        )}
      </div>
    </article>
  );
}
