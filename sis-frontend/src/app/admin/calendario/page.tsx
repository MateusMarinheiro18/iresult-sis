// src/app/admin/calendario/page.tsx
import React from 'react';
import CalendarPageClient from './CalendarioPageClient';

export default function AdminCalendarPage() {
  return (
    <div className="page-root">
      <main className="container">
        <CalendarPageClient />
      </main>
    </div>
  );
}
