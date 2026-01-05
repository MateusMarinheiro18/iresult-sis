// types.ts

export interface RespostaFormState {
  id?: number; // ID real do banco (para edição)
  tempId: string;
  resposta: string;
  valor: number | ''; // 1–5
}

export interface ModuloFormState {
  id?: number; // ID real do banco (para edição)
  tempId: string;
  nome: string;

  valorInicialFavoravel: string;
  valorFinalFavoravel: string;
  valorInicialIntermediario: string;
  valorFinalIntermediario: string;
  valorInicialRisco: string;
  valorFinalRisco: string;
}

export interface CategoriaFormState {
  id?: number; // ID real do banco (para edição)
  tempId: string;
  nome: string;
  moduloTempId: string;
}

export interface PerguntaFormState {
  id?: number; // ID real do banco (para edição)
  tempId: string;
  pergunta: string;
  ordem: number;
  moduloTempId: string;
  categoriasTempIds: string[]; // ✅ MUDOU: agora é array de IDs
  respostas: RespostaFormState[];
}

export interface EscalaFormState {
  id?: number;
  nome: string;
  dataVencimento: string;
  ativo: boolean;
  modulos: ModuloFormState[];
  categorias: CategoriaFormState[];
  perguntas: PerguntaFormState[];
}