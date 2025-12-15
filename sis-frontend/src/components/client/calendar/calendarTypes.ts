export type CalendarEvent = {
    id: number;
    nome: string;
    tipo?: string | null;
    detalhes?: string | null;
    data: string; // ISO string or 'yyyy-mm-dd'
    trilha?: {
      id: number;
      nome: string;
    } | null;
    empresas: {
      id: number;
      razaoSocial: string;
    }[];
  };
  