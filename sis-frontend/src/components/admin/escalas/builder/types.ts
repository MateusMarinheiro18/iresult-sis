export type RespostaFormState = {
    tempId: string;
    id?: number;
    resposta: string;
    valor: number | '';// 1–5
  };
  
  export type ModuloFormState = {
    tempId: string;
    id?: number;
    nome: string;
  
    valorInicialFavoravel: string;
    valorFinalFavoravel: string;
    valorInicialIntermediario: string;
    valorFinalIntermediario: string;
    valorInicialRisco: string;
    valorFinalRisco: string;
  };
  
  export type CategoriaFormState = {
    tempId: string;
    id?: number;
    nome: string;
    moduloTempId: string;
  };
  
  export type PerguntaFormState = {
    tempId: string;
    id?: number;
    pergunta: string;
    ordem: number;
    moduloTempId: string;
    categoriaTempId: string;
    respostas: RespostaFormState[];
  };
  
  export type EscalaFormState = {
    id?: number;
    nome: string;
    dataVencimento: string;
    ativo: boolean;
    modulos: ModuloFormState[];
    categorias: CategoriaFormState[];
    perguntas: PerguntaFormState[];
  };
  