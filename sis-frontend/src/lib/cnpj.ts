// src/lib/cnpj.ts
/** Remove tudo que não for dígito */
export function normalizeCnpj(input?: string): string {
    if (!input) return '';
    return String(input).replace(/\D/g, '');
  }
  
  /** Formata CNPJ (se tiver 14 dígitos retorna máscara, senão retorna input) */
  export function formatCnpj(value?: string): string {
    const d = normalizeCnpj(value).slice(0, 14);
    if (!d) return '';
    if (d.length <= 2) return d;
    if (d.length <= 5) return `${d.slice(0, 2)}.${d.slice(2)}`;
    if (d.length <= 8) return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5)}`;
    if (d.length <= 12) return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8)}`;
    return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8, 12)}-${d.slice(12)}`;
  }
  
  /** Retorna true se todos os 14 dígitos forem iguais (11111111111111) */
  function isAllDigitsEqual(cnpj: string): boolean {
    return /^(\d)\1{13}$/.test(cnpj);
  }
  
  /** Valida CNPJ (algoritmo dos dígitos verificadores) */
  export function isValidCnpj(raw?: string): boolean {
    const cnpj = normalizeCnpj(raw);
    if (cnpj.length !== 14) return false;
    if (isAllDigitsEqual(cnpj)) return false;
  
    // primeiro dígito verificador
    let soma = 0;
    let j = 5;
    for (let i = 0; i < 12; i++) {
      soma += Number(cnpj[i]) * j;
      j = j === 2 ? 9 : j - 1;
    }
    let resto = soma % 11;
    const digito1 = resto < 2 ? 0 : 11 - resto;
    if (Number(cnpj[12]) !== digito1) return false;
  
    // segundo dígito verificador
    soma = 0;
    j = 6;
    for (let i = 0; i < 13; i++) {
      soma += Number(cnpj[i]) * j;
      j = j === 2 ? 9 : j - 1;
    }
    resto = soma % 11;
    const digito2 = resto < 2 ? 0 : 11 - resto;
    return Number(cnpj[13]) === digito2;
  }
  