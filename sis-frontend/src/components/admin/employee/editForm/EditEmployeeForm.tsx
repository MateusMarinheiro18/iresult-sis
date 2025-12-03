'use client';
import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { useConfirm } from '@/components/ui/ConfirmProvider';

type Payload = {
  nome: string;
  email?: string | null;
  telefone?: string | null;
  data_nascimento?: string | Date | null;
  cidade_nascimento?: string | null;
  gestor?: string | null;
  ativo?: number;
  idGrupo?: number | null; // novo: grupo interno da empresa
};

type GroupOption = {
  id: number;
  nome: string;
};

function sanitizeDigits(s?: string) {
  return s ? s.replace(/\D/g, '') : undefined;
}

function formatDateForInput(d?: string | Date | null) {
  if (!d) return '';
  const date = d instanceof Date ? d : new Date(String(d));
  if (Number.isNaN(date.getTime())) return '';
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function formatPhoneBR(value?: string) {
  const raw = (value ?? '').replace(/\D/g, '');
  if (!raw) return '';

  let digits = raw;
  let country = '';

  // assume country code if length > 11
  if (digits.length > 11) {
    country = digits.slice(0, digits.length - 11);
    digits = digits.slice(digits.length - 11);
  }

  // build formatted progressively
  const parts: string[] = [];
  if (country) parts.push(`+${country}`);

  if (digits.length <= 2) {
    parts.push(digits);
    return parts.join(' ').trim();
  }

  const ddd = digits.slice(0, 2);
  const rest = digits.slice(2);

  if (rest.length === 0) {
    parts.push(`(${ddd})`);
    return parts.join(' ').trim();
  }

  // if rest length <=4 => partial local
  if (rest.length <= 4) {
    parts.push(`(${ddd}) ${rest}`);
    return parts.join(' ').trim();
  }

  // if rest length between 5 and 7 => may be beginning of 9-digit number or landline
  if (rest.length <= 6) {
    parts.push(`(${ddd}) ${rest}`);
    return parts.join(' ').trim();
  }

  // 7..10 => format xxxx-xxxx or 9xxxx-xxxx
  if (rest.length <= 7) {
    // rest e.g. 7 -> 3 + 4 (partial)
    parts.push(`(${ddd}) ${rest.slice(0, rest.length - 4)}-${rest.slice(-4)}`);
    return parts.join(' ').trim();
  }

  if (rest.length <= 10) {
    parts.push(`(${ddd}) ${rest.slice(0, rest.length - 4)}-${rest.slice(-4)}`);
    return parts.join(' ').trim();
  }

  // full 11-digit (9xxxx-xxxx)
  parts.push(`(${ddd}) ${rest.slice(0, 5)}-${rest.slice(5, 9)}`);
  return parts.join(' ').trim();
}

/**
 * EditEmployeeForm
 * - initial: objeto do funcionário (de Server Component)
 * - companyId: id da empresa (rota)
 *
 * Nota: o campo id será procurado em initial.id_funcionario ou initial.id
 */
export default function EditEmployeeForm({
  initial,
  companyId,
}: {
  initial: any;
  companyId: number;
}) {
  const router = useRouter();
  const confirm = useConfirm();

  const employeeId = initial?.id_funcionario ?? initial?.id ?? null;

  const [nome, setNome] = useState(initial?.nome ?? '');
  const [email, setEmail] = useState(initial?.email ?? '');
  const [telefone, setTelefone] = useState<string>(
    initial?.telefone ? formatPhoneBR(initial.telefone) : ''
  );
  const [dataNascimento, setDataNascimento] = useState(
    formatDateForInput(initial?.data_nascimento)
  );
  const [cidade, setCidade] = useState(initial?.cidade_nascimento ?? '');
  const [gestor, setGestor] = useState(initial?.gestor ?? '');
  const [ativo, setAtivo] = useState(initial?.ativo === 0 ? false : true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // NOVO: grupos da empresa + grupo atual do funcionário
  const [groups, setGroups] = useState<GroupOption[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState<string>(() => {
    const ig =
      initial?.id_grupo ??
      initial?.idGrupo ??
      initial?.grupo?.id ??
      null;
    return ig ? String(ig) : '';
  });

  // Reformat initial telefone caso `initial` seja carregado/alterado depois
  useEffect(() => {
    setTelefone(initial?.telefone ? formatPhoneBR(initial.telefone) : '');
    setDataNascimento(formatDateForInput(initial?.data_nascimento));
    setCidade(initial?.cidade_nascimento ?? '');
    setGestor(initial?.gestor ?? '');
    setAtivo(initial?.ativo === 0 ? false : true);

    const ig =
      initial?.id_grupo ??
      initial?.idGrupo ??
      initial?.grupo?.id ??
      null;
    setSelectedGroupId(ig ? String(ig) : '');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initial?.id]);

  // NOVO: carrega grupos da empresa
  useEffect(() => {
    let cancelled = false;

    async function loadGroups() {
      if (!companyId || Number.isNaN(Number(companyId)) || Number(companyId) <= 0) {
        return;
      }

      try {
        const res = await fetch(`/api/companies/${companyId}`, {
          method: 'GET',
        });

        if (!res.ok) {
          console.error('Falha ao carregar grupos da empresa', res.status);
          return;
        }

        const text = await res.text();
        let data: any = {};
        try {
          data = text ? JSON.parse(text) : {};
        } catch {
          data = {};
        }

        const rawGroups: any[] = Array.isArray(data.gruposFuncionarios)
          ? data.gruposFuncionarios
          : Array.isArray(data.grupos)
          ? data.grupos
          : [];

        const mapped: GroupOption[] = rawGroups
          .filter((g: any) => g && typeof g.nome === 'string')
          // só grupos ativos (ativo === 1 ou null/undefined)
          .filter(
            (g: any) => g.ativo === undefined || g.ativo === null || g.ativo === 1
          )
          .map((g: any) => ({
            id: g.id,
            nome: g.nome as string,
          }));

        if (!cancelled) {
          setGroups(mapped);
          // NÃO resetamos selectedGroupId aqui, pra manter o grupo do funcionário
        }
      } catch (err) {
        console.error('Erro ao carregar grupos da empresa', err);
      }
    }

    loadGroups();

    return () => {
      cancelled = true;
    };
  }, [companyId]);

  function validate(): string | null {
    if (!nome || nome.trim().length < 2)
      return 'Nome é obrigatório (mínimo 2 caracteres).';
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
      return 'Email inválido.';
    if (dataNascimento) {
      const d = new Date(dataNascimento);
      if (Number.isNaN(d.getTime())) return 'Data de nascimento inválida.';
      if (d.getTime() > Date.now())
        return 'Data de nascimento não pode ser no futuro.';
    }
    // se existirem grupos cadastrados, obriga escolher um
    if (groups.length > 0 && !selectedGroupId) {
      return 'Selecione um grupo para este funcionário.';
    }
    return null;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const v = validate();
    if (v) {
      setError(v);
      toast.error(v);
      return;
    }

    if (!companyId || Number.isNaN(Number(companyId)) || Number(companyId) <= 0) {
      const msg = 'companyId inválido — impossível enviar. Verifique a rota.';
      setError(msg);
      toast.error(msg);
      return;
    }

    if (!employeeId) {
      const msg = 'employeeId inválido — impossível enviar. Verifique a rota.';
      setError(msg);
      toast.error(msg);
      return;
    }

    setSaving(true);

    const payload: Payload = {
      nome: nome.trim(),
      email: email.trim() || undefined,
      telefone: sanitizeDigits(telefone) || undefined,
      data_nascimento: dataNascimento || undefined,
      cidade_nascimento: cidade.trim() || undefined,
      gestor: gestor.trim() || undefined,
      ativo: ativo ? 1 : 0,
      idGrupo: selectedGroupId ? Number(selectedGroupId) : null,
    };

    const toastId = toast.loading('Atualizando funcionário…', { duration: Infinity });

    try {
      const res = await fetch(
        `/api/companies/${companyId}/employees/${employeeId}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        }
      );

      // tenta ler body tanto como json quanto como text
      const text = await res.text().catch(() => '');
      let body: any = {};
      try {
        body = text ? JSON.parse(text) : {};
      } catch {
        body = text;
      }

      if (!res.ok) {
        const msg =
          body?.error ?? body?.message ?? `Erro ao atualizar (status ${res.status})`;
        toast.error(msg, { id: toastId, duration: 4000 });
        setError(msg);
        setSaving(false);
        return;
      }

      const successMsg = body?.message ?? 'Funcionário atualizado com sucesso.';
      toast.success(successMsg, { id: toastId, duration: 4000 });

      // pequeno delay para mostrar toast antes de redirecionar
      setTimeout(() => {
        router.push(`/admin/empresas/${companyId}/funcionarios`);
      }, 700);
    } catch (err: any) {
      console.error('Erro ao atualizar funcionário', err);
      const msg = err?.message ?? 'Erro de rede ao atualizar funcionário.';
      toast.error(msg, { id: toastId, duration: 4000 });
      setError(msg);
      setSaving(false);
    } finally {
      setSaving(false);
    }
  }

  return (
    <form className="form-root" onSubmit={handleSubmit} noValidate>
      <div className="grid">
        <div className="field">
          <label className="label">Nome *</label>
          <input
            className="input"
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            placeholder="Nome completo"
            required
            aria-label="Nome"
          />
        </div>

        <div className="field">
          <label className="label">Email</label>
          <input
            className="input"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="contato@exemplo.com"
            aria-label="Email"
          />
        </div>

        <div className="field">
          <label className="label">Telefone</label>
          <input
            className="input"
            value={telefone}
            onChange={(e) => setTelefone(formatPhoneBR(e.target.value))}
            placeholder="+55 (11) 99999-9999"
            aria-label="Telefone"
          />
        </div>

        <div className="field">
          <label className="label">Data de Nascimento</label>
          <input
            className="input"
            type="date"
            value={dataNascimento}
            onChange={(e) => setDataNascimento(e.target.value)}
            aria-label="Data de Nascimento"
          />
        </div>

        <div className="field">
          <label className="label">Cidade de Nascimento</label>
          <input
            className="input"
            value={cidade}
            onChange={(e) => setCidade(e.target.value)}
            placeholder="Cidade"
            aria-label="Cidade de Nascimento"
          />
        </div>

        <div className="field">
          <label className="label">Gestor</label>
          <input
            className="input"
            value={gestor}
            onChange={(e) => setGestor(e.target.value)}
            placeholder="Nome do gestor"
            aria-label="Gestor"
          />
        </div>

        {/* NOVO: campo de grupo interno */}
        <div className="field">
          <label className="label">Grupo da empresa *</label>
          <select
            className="input"
            value={selectedGroupId}
            onChange={(e) => setSelectedGroupId(e.target.value)}
            aria-label="Grupo da empresa"
          >
            <option value="">
              {groups.length === 0
                ? 'Nenhum grupo cadastrado para esta empresa'
                : 'Selecione um grupo'}
            </option>
            {groups.map((g) => (
              <option key={g.id} value={g.id}>
                {g.nome}
              </option>
            ))}
          </select>
        </div>

        <div className="field" style={{ alignSelf: 'center' }}>
          <label className="label">Ativo</label>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <input
              id="ativo-checkbox-edit"
              type="checkbox"
              checked={ativo}
              onChange={(e) => setAtivo(e.target.checked)}
              aria-label="Ativo"
            />
            <label
              htmlFor="ativo-checkbox-edit"
              style={{ fontSize: 13, color: '#374151' }}
            >
              {ativo ? 'Sim' : 'Não'}
            </label>
          </div>
        </div>
      </div>

      {error && (
        <div className="form-error" role="alert">
          {error}
        </div>
      )}

      <div className="buttons">
        <button type="submit" className="btn primary" disabled={saving}>
          {saving ? 'Salvando...' : 'SALVAR'}
        </button>

        <button
          type="button"
          className="btn secondary"
          disabled={saving}
          onClick={() => history.back()}
        >
          CANCELAR
        </button>
      </div>

      <style jsx>{`
        .form-root {
          display: block;
        }
        .grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 18px;
          align-items: start;
        }
        .field {
          display: flex;
          flex-direction: column;
        }
        .label {
          font-size: 12px;
          font-weight: 700;
          color: #233;
          margin-bottom: 8px;
          letter-spacing: 0.2px;
        }
        .input {
          height: 42px;
          padding: 8px 12px;
          border: 1px solid #e6e9ef;
          border-radius: 8px;
          background: #fff;
          font-size: 14px;
          outline: none;
          transition: box-shadow 0.12s ease, border-color 0.12s ease;
          color: #111827;
        }
        .input::placeholder {
          color: #9ca3af;
          opacity: 1;
        }
        .input:focus {
          border-color: #0b2527;
          box-shadow: 0 0 0 3px rgba(11, 37, 39, 0.06);
        }
        .form-error {
          margin-top: 12px;
          color: #b91c1c;
          font-weight: 600;
        }
        .buttons {
          margin-top: 26px;
          display: flex;
          gap: 12px;
          justify-content: center;
          align-items: center;
          flex-wrap: wrap;
        }
        .btn {
          min-width: 180px;
          height: 44px;
          border-radius: 999px;
          font-weight: 700;
          letter-spacing: 0.6px;
          cursor: pointer;
          border: none;
        }
        .btn.primary {
          background: #0b2527;
          color: white;
          box-shadow: 0 6px 20px rgba(11, 37, 39, 0.12);
        }
        .btn.primary:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }
        .btn.secondary {
          background: white;
          color: #0b2527;
          border: 1px solid #0b2527;
        }
        @media (max-width: 960px) {
          .grid {
            grid-template-columns: 1fr;
          }
          .buttons {
            flex-direction: column;
          }
          .btn {
            width: 100%;
            min-width: 0;
          }
          .btn + .btn {
            margin-top: 8px;
          }
        }
      `}</style>
    </form>
  );
}
