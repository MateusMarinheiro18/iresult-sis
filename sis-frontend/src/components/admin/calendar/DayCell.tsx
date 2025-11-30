// src/components/admin/calendar/DayCell.tsx
'use client';

import React from 'react';
import type { CalendarEvent } from './calendarTypes';

type DayCellProps = {
  date: Date;
  inCurrentMonth: boolean;
  events: CalendarEvent[];
  isSelected: boolean;
  isToday: boolean;
  onClick: () => void;
};

export default function DayCell({
  date,
  inCurrentMonth,
  events,
  isSelected,
  isToday,
  onClick,
}: DayCellProps) {
  const dayNumber = date.getDate();
  const hasEvents = events.length > 0;

  const classNames = [
    'calendar-day-cell',
    inCurrentMonth ? 'calendar-day-in-month' : 'calendar-day-out-month',
    hasEvents ? 'calendar-day-has-events' : '',
    isSelected ? 'calendar-day-selected' : '',
    isToday ? 'calendar-day-today' : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <button type="button" className={classNames} onClick={onClick}>
      <div className="calendar-day-number">{dayNumber}</div>
      {hasEvents && (
        <div className="calendar-day-dots">
          {events.slice(0, 3).map((event) => (
            <span
              key={event.id}
              className="calendar-day-dot"
              title={event.nome}
            />
          ))}
          {events.length > 3 && (
            <span className="calendar-day-more">+{events.length - 3}</span>
          )}
        </div>
      )}
    </button>
  );
}
