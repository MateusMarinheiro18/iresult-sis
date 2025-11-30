// src/components/admin/calendar/calendarTypes.ts
export type CalendarEvent = {
    id: number;
    nome: string;
    tipo?: string | null;
    detalhes?: string | null;
    data: string; // ISO string
    trilha?: {
      id: number;
      nome: string;
    } | null;
    empresas: {
      id: number;
      razaoSocial: string;
    }[];
  };
  