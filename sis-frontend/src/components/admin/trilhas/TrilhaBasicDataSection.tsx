// src/components/admin/trilhas/TrilhaBasicDataSection.tsx
import React from 'react';

type Props = {
  nome: string;
  ativo: boolean;
  onChangeNome: (value: string) => void;
  onChangeAtivo: (value: boolean) => void;
  createdAtLabel?: string; // apenas para exibir (read-only) na edição
};

export default function TrilhaBasicDataSection({
  nome,
  ativo,
  onChangeNome,
  onChangeAtivo,
  createdAtLabel,
}: Props) {
  return (
    <section className="card">
      <h2 className="card-title">Dados da trilha</h2>
      <p className="card-subtitle">
        Informe o nome da trilha. A data de criação é gerada automaticamente.
      </p>

      <div className="field-grid">
        <div className="field">
          <label className="label">
            Nome da trilha <span className="required">*</span>
          </label>
          <input
            type="text"
            className="input"
            value={nome}
            onChange={(e) => onChangeNome(e.target.value)}
            placeholder="Ex.: Trilha de Desenvolvimento de Liderança"
          />
        </div>

        <div className="field switch-field">
          <label className="label">Ativa</label>
          <label className="switch">
            <input
              type="checkbox"
              checked={ativo}
              onChange={(e) => onChangeAtivo(e.target.checked)}
            />
            <span className="slider" />
          </label>
        </div>
      </div>

      {createdAtLabel && (
        <p className="card-subtitle" style={{ marginTop: 8 }}>
          Criada em <strong>{createdAtLabel}</strong>
        </p>
      )}
    </section>
  );
}
