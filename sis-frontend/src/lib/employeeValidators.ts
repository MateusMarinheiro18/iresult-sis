// src/lib/employeeValidators.ts
export type EmployeeRow = {
    origem_linha?: number | null;
    nome?: string | null;
    email?: string | null;
    telefone?: string | null;
    data_nascimento?: string | null; // ISO or dd/mm/yyyy
    cidade_nascimento?: string | null;
    gestor?: string | null;
    ativo?: number | boolean | null;
    [k: string]: any;
  };
  
  export function isValidEmail(email: string) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }
  
  export function parseDateStringMaybe(val?: string | null): Date | null {
    if (!val) return null;
    // try ISO first
    const iso = new Date(val);
    if (!Number.isNaN(iso.getTime())) return iso;
    // try dd/mm/yyyy or dd-mm-yyyy
    const m = val.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
    if (m) {
      const d = Number(m[1]), mo = Number(m[2]) - 1, y = Number(m[3]);
      const dt = new Date(y, mo, d);
      if (!Number.isNaN(dt.getTime())) return dt;
    }
    return null;
  }
  
  export function validateEmployeeRow(r: EmployeeRow): string[] {
    const errors: string[] = [];
    const nome = (r.nome ?? '').toString().trim();
    if (!nome || nome.length < 2) errors.push('nome obrigatório (mínimo 2 caracteres)');
  
    const emailRaw = (r.email ?? '').toString().trim();
    if (emailRaw) {
      if (!isValidEmail(emailRaw)) errors.push('email inválido');
    }
  
    if (r.data_nascimento) {
      const d = parseDateStringMaybe(r.data_nascimento?.toString?.());
      if (!d) errors.push('data_nascimento inválida');
      else if (d.getTime() > Date.now()) errors.push('data_nascimento no futuro');
    }
  
    if (r.telefone) {
      const digits = (r.telefone ?? '').toString().replace(/\D/g, '');
      if (digits.length < 8) errors.push('telefone inválido (muito curto)');
    }
  
    return errors;
  }
  