'use client';

import React, { useMemo } from 'react';
import type { CalendarEvent } from './calendarTypes';
import DayCell from './DayCell';

type MonthGridProps = {
  month: number; // 0-11
  year: number;
  eventsByDay: Map<string, CalendarEvent[]>;
  selectedDate: Date | null;
  onSelectDate: (date: Date) => void;
};

type DayCellInfo = { date: Date; inCurrentMonth: boolean };

const WEEKDAY_LABELS = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];

function buildDayKeyFromDate(d: Date): string {
  const year = d.getFullYear();
  const month = d.getMonth() + 1;
  const day = d.getDate();
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

export default function MonthGrid({ month, year, eventsByDay, selectedDate, onSelectDate }: MonthGridProps) {
  const today = new Date();

  const cells: DayCellInfo[] = useMemo(() => {
    const result: DayCellInfo[] = [];

    const firstOfMonth = new Date(year, month, 1);
    const startWeekday = (firstOfMonth.getDay() + 6) % 7; // Segunda=0

    const daysInMonth = new Date(year, month + 1, 0).getDate();

    // Dias do mês anterior para completar a primeira semana
    for (let i = 0; i < startWeekday; i++) {
      const date = new Date(year, month, 1 - (startWeekday - i));
      result.push({ date, inCurrentMonth: false });
    }

    // Dias do mês atual
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month, day);
      result.push({ date, inCurrentMonth: true });
    }

    // Completa até 6 linhas (42 células)
    while (result.length < 42) {
      const last = result[result.length - 1];
      const next = new Date(last.date);
      next.setDate(next.getDate() + 1);
      result.push({ date: next, inCurrentMonth: false });
    }

    return result;
  }, [month, year]);

  const selectedKey = selectedDate ? buildDayKeyFromDate(selectedDate) : null;
  const todayKey = buildDayKeyFromDate(today);

  return (
    <div className="calendar-month-grid">
      <div className="calendar-weekdays-row">
        {WEEKDAY_LABELS.map((label) => (
          <div key={label} className="calendar-weekday">{label}</div>
        ))}
      </div>

      <div className="calendar-days-grid">
        {cells.map((cell) => {
          const key = buildDayKeyFromDate(cell.date);
          const events = eventsByDay.get(key) ?? [];
          const isSelected = selectedKey === key;
          const isToday = todayKey === key;

          return (
            <DayCell
              key={key}
              date={cell.date}
              inCurrentMonth={cell.inCurrentMonth}
              events={events}
              isSelected={isSelected}
              isToday={isToday}
              onClick={() => onSelectDate(cell.date)}
            />
          );
        })}
      </div>
    </div>
  );
}
