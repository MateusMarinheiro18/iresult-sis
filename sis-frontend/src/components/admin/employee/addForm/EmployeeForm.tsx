'use client';
import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

type Payload = {
  nome: string;
  email?: string | null;
  telefone?: string | null;
  data_nascimento?: string | null;
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

export default function EmployeeForm({
  companyId,
  initial,
}: {
  companyId?: number;
  initial?: any;
}) {
  // helper to format date to yyyy-mm-dd
  function formatDateForInput(d: string | Date) {
    const date = d instanceof Date ? d : new Date(d);
    if (Number.isNaN(date.getTime())) return '';
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  }

  /**
   * Formata telefone BR incremental:
   * - assume +55 se não houver código de país explícito
   * - formata (DD) 9XXXX-XXXX ou (DD) XXXX-XXXX conforme comprimento
   * - também suporta números com código de país no início (ex: 5511999999999)
   */
  function formatPhone(value: string) {
    const raw = (value ?? '').replace(/\D/g, '');
    if (!raw) return '';

    let digits = raw;
    let country = '';

    // if more than 11 digits, assume leading country code(s)
    if (digits.length > 11) {
      country = digits.slice(0, digits.length - 11);
      digits = digits.slice(digits.length - 11);
    }

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

    // partial local numbers
    if (rest.length <= 4) {
      parts.push(`(${ddd}) ${rest}`);
      return parts.join(' ').trim();
    }

    // format with hyphen when possible
    if (rest.length <= 7) {
      parts.push(`(${ddd}) ${rest.slice(0, rest.length - 4)}-${rest.slice(-4)}`);
      return parts.join(' ').trim();
    }

    if (rest.length <= 10) {
      parts.push(`(${ddd}) ${rest.slice(0, rest.length - 4)}-${rest.slice(-4)}`);
      return parts.join(' ').trim();
    }

    // 11+ local digits (9xxxx-xxxx)
    parts.push(`(${ddd}) ${rest.slice(0, 5)}-${rest.slice(5, 9)}`);
    return parts.join(' ').trim();
  }

  const [nome, setNome] = useState(initial?.nome ?? '');
  const [email, setEmail] = useState(initial?.email ?? '');
  const [telefone, setTelefone] = useState<string>(
    initial?.telefone ? formatPhone(initial.telefone) : ''
  );
  const [dataNascimento, setDataNascimento] = useState(
    initial?.data_nascimento ? formatDateForInput(initial.data_nascimento) : ''
  );
  const [cidade, setCidade] = useState(initial?.cidade_nascimento ?? '');
  const [gestor, setGestor] = useState(initial?.gestor ?? '');
  const [ativo, setAtivo] = useState(initial?.ativo === 0 ? false : true);
  const [saving, setSaving] = useState(false);
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  // NOVO: grupos da empresa
  const [groups, setGroups] = useState<GroupOption[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState<string>('');

  // Reformat phone if `initial` changes (edge-cases where server props arrive later)
  useEffect(() => {
    setTelefone(initial?.telefone ? formatPhone(initial.telefone) : '');
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
          .filter((g: any) => g.ativo === undefined || g.ativo === null || g.ativo === 1)
          .map((g: any) => ({
            id: g.id,
            nome: g.nome as string,
          }));

        if (!cancelled) {
          setGroups(mapped);
          setSelectedGroupId(''); // sempre começa vazio; usuário escolhe
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
    // NOVO: se existem grupos cadastrados, obriga escolher um
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
      return;
    }

    if (!companyId || Number.isNaN(Number(companyId)) || Number(companyId) <= 0) {
      setError(
        'companyId inválido — impossível enviar. Verifique se você abriu a página com a rota correta ou se o parent passou companyId corretamente.'
      );
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
      // NOVO: id do grupo selecionado
      idGrupo: selectedGroupId ? Number(selectedGroupId) : null,
    };

    try {
      console.log(
        'Enviando payload para API:',
        `/api/companies/${companyId}/employees`,
        payload
      );

      const res = await fetch(`/api/companies/${companyId}/employees`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const text = await res.text().catch(() => '');
      let body: any = {};
      try {
        body = text ? JSON.parse(text) : {};
      } catch (e) {
        body = { text };
      }

      if (!res.ok) {
        console.error('API POST /employees retornou erro', {
          status: res.status,
          body,
        });
        setError(
          body?.error ??
            body?.message ??
            `Erro ao salvar (status ${res.status})`
        );
        setSaving(false);
        return;
      }

      // sucesso -> redireciona para a listagem
      router.push(`/admin/empresas/${companyId}/funcionarios`);
    } catch (err) {
      console.error('Erro ao salvar funcionário (fetch)', err);
      setError('Erro de rede ao salvar funcionário.');
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
            onChange={(e) => {
              const formatted = formatPhone(e.target.value);
              setTelefone(formatted);
            }}
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
            placeholder="Cidade de Nascimento"
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
              id="ativo-checkbox"
              type="checkbox"
              checked={ativo}
              onChange={(e) => setAtivo(e.target.checked)}
              aria-label="Ativo"
            />
            <label
              htmlFor="ativo-checkbox"
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
          Cancelar
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
          border-color: #421E97;
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
          gap: 16px;
          justify-content: center;
          align-items: center;
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
          background: #421E97;
          color: white;
          box-shadow: 0 6px 20px rgba(11, 37, 39, 0.12);
        }
        .btn.primary:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }
        .btn.secondary {
          background: white;
          color: #421E97;
          border: 1px solid #421E97;
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
