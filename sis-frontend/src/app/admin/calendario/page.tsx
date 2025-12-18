// src/app/admin/calendario/page.tsx
import React from 'react';
import CalendarPageClient from './CalendarioPageClient';

type Props = {
  searchParams?: { [key: string]: string | string[] | undefined } | Promise<{ [key: string]: string | string[] | undefined }>;
};

export default async function AdminCalendarPage(props: Props) {
  // compatível com searchParams sendo Promise em alguns ambientes Next
  const searchParams =
    props.searchParams && typeof (props.searchParams as any).then === 'function'
      ? await (props.searchParams as Promise<{ [k: string]: any }>)
      : (props.searchParams as { [k: string]: any } | undefined);

  const companyParam = Array.isArray(searchParams?.company) ? searchParams?.company[0] : searchParams?.company;
  const companyId = companyParam ? Number(companyParam) : null;

  return (
    <div className="page-root">
      <main className="container">
        <CalendarPageClient companyId={companyId && !Number.isNaN(companyId) && companyId > 0 ? companyId : null} />
      </main>
    </div>
  );
}
