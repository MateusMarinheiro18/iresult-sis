// src/components/admin/trilhas/TrilhaBasicDataSection.tsx
import React from 'react';

type Props = {
  nome: string;
  dataCriacao: string;
  ativo: boolean;
  onChangeNome: (value: string) => void;
  onChangeDataCriacao: (value: string) => void;
  onChangeAtivo: (value: boolean) => void;
};

export default function TrilhaBasicDataSection({
  nome,
  dataCriacao,
  ativo,
  onChangeNome,
  onChangeDataCriacao,
  onChangeAtivo,
}: Props) {
  return (
    <section className="card">
      <h2 className="card-title">Dados da trilha</h2>
      <p className="card-subtitle">
        Informe o nome da trilha e a data de início.
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

        <div className="field">
          <label className="label">Data de início</label>
          <input
            type="date"
            className="input"
            value={dataCriacao}
            onChange={(e) => onChangeDataCriacao(e.target.value)}
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
    </section>
  );
}
