// src/components/import/validators.ts

export type EmployeeRow = {
  origem_linha?: number | null;
  nome?: string | null;
  email?: string | null;
  telefone?: string | null;
  data_nascimento?: string | null;
  cidade_nascimento?: string | null;
  gestor?: string | null;
  grupo?: string | null; // NOVO
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

  // tenta parse direto
  const direct = new Date(s);
  if (!Number.isNaN(direct.getTime())) return direct.toISOString();

  // tenta DD/MM/YYYY ou DD-MM-YYYY
  const m = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (m) {
    const d = Number(m[1]);
    const mo = Number(m[2]) - 1;
    const y = Number(m[3]);
    const dt = new Date(y, mo, d, 12, 0, 0);
    if (!Number.isNaN(dt.getTime())) return dt.toISOString();
  }

  return null;
}

/**
 * Validação das linhas de import:
 * - nome obrigatório
 * - email válido (se informado) e sem duplicar dentro do arquivo
 * - data_nascimento válida e não futura (se informada)
 * - grupo obrigatório e pertencente à empresa (quando `validGroupNames` for passado)
 */
export function validateRows(
  rows: EmployeeRow[],
  validGroupNames?: string[]
): Record<number, string[]> {
  const errorsByRow: Record<number, string[]> = {};

  const emailSet = new Set<string>();
  const groupSet =
    validGroupNames && validGroupNames.length
      ? new Set(validGroupNames.map((g) => g.toLowerCase()))
      : null;

  rows.forEach((r, idx) => {
    const issues: string[] = [];

    // nome
    const nome = (r.nome ?? '').toString().trim();
    if (!nome || nome.length < 2) {
      issues.push('nome obrigatório (min 2 chars)');
    }

    // grupo
    if (groupSet) {
      const grupoNome = (r.grupo ?? '').toString().trim();
      if (!grupoNome) {
        issues.push('grupo obrigatório');
      } else if (!groupSet.has(grupoNome.toLowerCase())) {
        issues.push('grupo inválido para esta empresa');
      }
    }

    // email
    if (r.email) {
      const email = r.email.toString().trim();
      if (!isValidEmail(email)) {
        issues.push('email inválido');
      } else {
        const lower = email.toLowerCase();
        if (emailSet.has(lower)) {
          issues.push('email duplicado no arquivo');
        } else {
          emailSet.add(lower);
        }
      }
    }

    // data_nascimento
    if (r.data_nascimento) {
      const parsedIso = tryParseDate(r.data_nascimento);
      if (!parsedIso) {
        issues.push('data_nascimento inválida');
      } else {
        const d = new Date(parsedIso);
        if (Number.isNaN(d.getTime()) || d.getTime() > Date.now()) {
          issues.push('data_nascimento não pode ser no futuro');
        } else {
          // normaliza no próprio objeto
          r.data_nascimento = parsedIso;
        }
      }
    }

    if (issues.length) {
      errorsByRow[idx] = issues;
    }
  });

  return errorsByRow;
}

/** usado também na API de edição de funcionário */
export function parseDateStringMaybe(val?: string | null): Date | null {
  if (!val) return null;

  const s = val.toString().trim();
  if (!s) return null;

  // DD/MM/YYYY ou DD-MM-YYYY
  const brMatch = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (brMatch) {
    const d = Number(brMatch[1]);
    const m = Number(brMatch[2]) - 1;
    const y = Number(brMatch[3]);
    const dt = new Date(y, m, d, 12, 0, 0);
    if (!Number.isNaN(dt.getTime())) return dt;
  }

  // YYYY-MM-DD
  const isoMatch = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (isoMatch) {
    const y = Number(isoMatch[1]);
    const m = Number(isoMatch[2]) - 1;
    const d = Number(isoMatch[3]);
    const dt = new Date(y, m, d, 12, 0, 0);
    if (!Number.isNaN(dt.getTime())) return dt;
  }

  // serial Excel
  const num = Number(s);
  if (!isNaN(num) && num > 0 && num < 100000) {
    const excelEpoch = new Date(1900, 0, 1);
    return new Date(excelEpoch.getTime() + (num - 2) * 86400000);
  }

  // fallback
  const dt = new Date(s);
  if (!Number.isNaN(dt.getTime())) return dt;

  return null;
}
