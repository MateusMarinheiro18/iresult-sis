// src/components/admin/trilhas/types.ts

export type TrilhaItemFormState = {
    tempId: string;
    id?: number;
    nome: string;
    tipo: string;
    data: string; // yyyy-mm-dd
    detalhes: string;
  };
  
  export type TrilhaFormState = {
    id?: number;
    nome: string;
    ativo: boolean;
    itens: TrilhaItemFormState[];
  };
  