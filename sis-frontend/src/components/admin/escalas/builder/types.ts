// types.ts

export interface RespostaFormState {
  id?: number;
  tempId: string;
  resposta: string;
  valor: number | '';
}

export interface ModuloFormState {
  id?: number;
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
  id?: number;
  tempId: string;
  nome: string;
  moduloTempId: string;
}

export interface PerguntaFormState {
  id?: number;
  tempId: string;
  pergunta: string;
  ordem: number;
  moduloTempId: string;
  categoriasTempIds: string[];
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