// src/components/import/validators.ts
export type EmployeeRow = {
    origem_linha?: number | null;
    nome?: string | null;
    email?: string | null;
    telefone?: string | null;
    data_nascimento?: string | null;
    cidade_nascimento?: string | null;
    gestor?: string | null;
    ativo?: number | boolean | null;
    [k: string]: any;
  };
  
  export function normalizeKey(key: string) {
    return key.trim().toLowerCase().replace(/\s+/g, '_');
  }
  
  export function isValidEmail(email?: string | null) {
    if (!email) return false;
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }
  
  export function tryParseDate(s?: string | null): string | null {
    if (!s) return null;
    const iso = new Date(s);
    if (!Number.isNaN(iso.getTime())) return iso.toISOString();
    const m = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
    if (m) {
      const d = Number(m[1]), mo = Number(m[2]) - 1, y = Number(m[3]);
      const dt = new Date(y, mo, d);
      if (!Number.isNaN(dt.getTime())) return dt.toISOString();
    }
    return null;
  }
  
  /**
   * Minimal validation: returns map index -> errors[]
   */
  export function validateRows(rows: EmployeeRow[]) {
    const errorsByRow: Record<number, string[]> = {};
    rows.forEach((r, idx) => {
      const issues: string[] = [];
      const nome = (r.nome ?? '').toString().trim();
      if (!nome || nome.length < 2) issues.push('nome obrigatório (min 2 chars)');
      if (r.email && !isValidEmail(r.email)) issues.push('email inválido');
      if (r.data_nascimento) {
        const parsed = tryParseDate(r.data_nascimento);
        if (!parsed) issues.push('data_nascimento inválida');
        else r.data_nascimento = parsed;
      }
      if (issues.length) errorsByRow[idx] = issues;
    });
    return errorsByRow;
  }
  
  export function parseDateStringMaybe(val?: string | null): Date | null {
    if (!val) return null;
    
    // Tenta formato brasileiro DD/MM/YYYY ou DD-MM-YYYY
    const brMatch = val.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
    if (brMatch) {
      const d = Number(brMatch[1]);
      const m = Number(brMatch[2]) - 1;
      const y = Number(brMatch[3]);
      const dt = new Date(y, m, d, 12, 0, 0); // Meio-dia para evitar problema de timezone
      if (!Number.isNaN(dt.getTime())) return dt;
    }
    
    // Tenta formato ISO YYYY-MM-DD
    const isoMatch = val.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (isoMatch) {
      const y = Number(isoMatch[1]);
      const m = Number(isoMatch[2]) - 1;
      const d = Number(isoMatch[3]);
      const dt = new Date(y, m, d, 12, 0, 0);
      if (!Number.isNaN(dt.getTime())) return dt;
    }
    
    // Tenta número serial do Excel
    const num = Number(val);
    if (!isNaN(num) && num > 0 && num < 100000) {
      const excelEpoch = new Date(1900, 0, 1);
      return new Date(excelEpoch.getTime() + (num - 2) * 86400000);
    }
    
    return null;
  }