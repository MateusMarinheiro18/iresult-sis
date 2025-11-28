'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';

import CompanyReportsHeader from '@/components/admin/reports/CompanyReportsHeader';

type Props = {
  companyId: number;
  companyName?: string | null;
};

function deriveTitleFromFileName(name: string): string {
  const withoutExt = name.replace(/\.[^.]+$/, '');
  const cleaned = withoutExt.replace(/[_\-]+/g, ' ');
  const trimmed = cleaned.trim();
  if (!trimmed) return 'Relatório importado';
  return trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
}

export default function ImportReportPageClient({ companyId, companyName }: Props) {
  const router = useRouter();

  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [nameInput, setNameInput] = useState(''); // nome editável do relatório/arquivo

  const maxBytes =
    Number(process.env.NEXT_PUBLIC_MAX_UPLOAD_BYTES || 50 * 1024 * 1024); // 50MB default

  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    setError(null);
    const f = e.target.files?.[0];
    if (!f) return;

    const type = f.type || 'application/octet-stream';
    if (type !== 'application/pdf') {
      setError('Por favor, selecione um arquivo PDF.');
      setFile(null);
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
      setNameInput('');
      return;
    }

    if (f.size > maxBytes) {
      const mb = (maxBytes / (1024 * 1024)).toFixed(0);
      setError(`Arquivo muito grande. Tamanho máximo permitido: ${mb} MB.`);
      setFile(null);
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
      setNameInput('');
      return;
    }

    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }

    const url = URL.createObjectURL(f);
    const defaultTitle = deriveTitleFromFileName(f.name);

    setFile(f);
    setPreviewUrl(url);
    setNameInput(defaultTitle);
  }

  function handleClear() {
    setError(null);
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    setPreviewUrl(null);
    setFile(null);
    setNameInput('');
  }

  async function handleImport() {
    if (!file) {
      setError('Selecione um arquivo PDF antes de importar.');
      return;
    }

    const baseTitle = (nameInput || deriveTitleFromFileName(file.name)).trim();
    if (!baseTitle) {
      setError('Informe um nome para o relatório/arquivo.');
      return;
    }

    // usado como fileName (só rótulo; a key real é gerada no backend via slug)
    const displayFileName = baseTitle.endsWith('.pdf') ? baseTitle : `${baseTitle}.pdf`;

    setError(null);
    setUploading(true);
    const loadingId = toast.loading('Importando relatório…');

    try {
      // 1) Cria o relatório no banco (usa o nome editado)
      const createRes = await fetch(`/api/companies/${companyId}/reports`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          titulo: baseTitle,
          texto: null,
        }),
      });

      const createBody = await createRes.json().catch(() => ({} as any));
      if (!createRes.ok) {
        console.error('Erro ao criar relatório:', createRes.status, createBody);
        throw new Error(createBody?.message || 'Erro ao criar registro de relatório.');
      }

      const reportId: number =
        createBody?.report?.id ?? createBody?.id ?? createBody?.data?.id;

      if (!reportId) {
        console.error('Resposta inesperada ao criar relatório:', createBody);
        throw new Error('Resposta inválida ao criar o relatório.');
      }

      // 2) Pede URL presignada para upload (usa o nome editado como fileName)
      const presignRes = await fetch(`/api/companies/${companyId}/reports/presign`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          reportId,
          fileName: displayFileName,
          fileType: file.type || 'application/pdf',
          fileSize: file.size,
        }),
      });

      const presignBody = await presignRes.json().catch(() => ({} as any));
      if (!presignRes.ok || !presignBody?.uploadUrl || !presignBody?.fileKey) {
        console.error('Erro em presign:', presignRes.status, presignBody);
        throw new Error(presignBody?.message || 'Erro ao gerar URL de upload.');
      }

      const uploadUrl: string = presignBody.uploadUrl;
      const fileKey: string = presignBody.fileKey;
      const versionSuffix: number | undefined = presignBody.versionSuffix;

      console.log('⏫ Fazendo PUT no S3…', { uploadUrl, fileKey });

      // 3) Upload PUT direto pro S3
      const uploadRes = await fetch(uploadUrl, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/pdf',
        },
        body: file,
      });

      if (!uploadRes.ok) {
        const text = await uploadRes.text().catch(() => '');
        console.error('S3 upload error:', uploadRes.status, uploadRes.statusText, text);
        throw new Error('Falha ao enviar o arquivo para o armazenamento.');
      }

      // 4) Grava metadata no banco (fileKey, fileName, versionSuffix)
      const attachRes = await fetch(
        `/api/companies/${companyId}/reports/${reportId}/attach`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            fileKey,
            fileName: displayFileName,
            versionSuffix,
          }),
        }
      );

      const attachBody = await attachRes.json().catch(() => ({} as any));
      if (!attachRes.ok) {
        console.error('Erro em attach:', attachRes.status, attachBody);
        throw new Error(attachBody?.message || 'Erro ao associar o arquivo ao relatório.');
      }

      toast.success('Relatório importado com sucesso.', { id: loadingId });

      // Redireciona para o detalhe do relatório
      router.push(`/admin/relatorios/${companyId}/${reportId}`);
    } catch (err: any) {
      console.error(err);
      toast.error(err?.message || 'Erro ao importar relatório.', { id: loadingId });
      setError(err?.message || 'Erro ao importar relatório.');
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="page-root">
      <main className="container">
        <CompanyReportsHeader
          title="IMPORTAR RELATÓRIO"
          onBack={() => router.push(`/admin/relatorios/${companyId}`)}
        />

        <div className="card">
          <div className="card-header">
            <div>
              <h2>Importar PDF</h2>
              {companyName && (
                <p className="company-name">Empresa: {companyName}</p>
              )}
            </div>
          </div>

          <div className="card-body">
            <div className="upload-section">
              <label className="file-label">
                <span>Arquivo PDF</span>
                <input
                  type="file"
                  accept="application/pdf"
                  onChange={handleFileChange}
                  disabled={uploading}
                />
              </label>

              {file && (
                <div className="file-info">
                  <p><strong>Original:</strong> {file.name}</p>
                  <p>
                    <strong>Tamanho:</strong>{' '}
                    {(file.size / (1024 * 1024)).toFixed(2)} MB
                  </p>
                </div>
              )}

              {/* NOVO CAMPO: nome editável */}
              {file && (
                <div className="name-field">
                  <label>
                    <span>Nome do relatório / arquivo</span>
                    <input
                      type="text"
                      value={nameInput}
                      onChange={(e) => setNameInput(e.target.value)}
                      placeholder="Digite o nome que será exibido"
                      disabled={uploading}
                    />
                  </label>
                </div>
              )}

              {error && <p className="error-text">{error}</p>}

              <div className="actions-row">
                <button
                  type="button"
                  className="btn-ghost"
                  onClick={handleClear}
                  disabled={uploading && !file}
                >
                  Limpar
                </button>
                <button
                  type="button"
                  className="btn-primary"
                  onClick={handleImport}
                  disabled={!file || uploading}
                >
                  {uploading ? 'Importando…' : 'Importar'}
                </button>
              </div>
            </div>

            <div className="preview-section">
              <h3>Pré-visualização</h3>
              {!previewUrl && (
                <p className="preview-placeholder">
                  Selecione um arquivo PDF para visualizar aqui.
                </p>
              )}
              {previewUrl && (
                <div className="preview-frame">
                  <object
                    data={previewUrl}
                    type="application/pdf"
                    width="100%"
                    height="100%"
                  >
                    <p>
                      Não foi possível exibir o PDF. Você ainda pode importar o
                      arquivo normalmente.
                    </p>
                  </object>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      <style jsx>{`
        .page-root {
          padding: 24px;
          background: #f3f4ff;
          box-sizing: border-box;
          min-height: 100vh;
        }

        .container {
          max-width: 1180px;
          margin: 0 auto;
        }

        .card {
          margin-top: 12px;
          background: #ffffff;
          border-radius: 16px;
          box-shadow: 0 10px 25px rgba(11, 37, 39, 0.08);
          padding: 20px 20px 24px;
        }

        .card-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 16px;
        }

        .card-header h2 {
          margin: 0;
          font-size: 18px;
          font-weight: 700;
          color: #0b2527;
        }

        .company-name {
          margin: 4px 0 0;
          font-size: 13px;
          color: #6b7280;
        }

        .card-body {
          display: grid;
          grid-template-columns: minmax(0, 1.1fr) minmax(0, 1.4fr);
          gap: 20px;
        }

        .upload-section {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .file-label {
          display: flex;
          flex-direction: column;
          gap: 6px;
          font-size: 14px;
          color: #0b2527;
        }

        .file-label input[type='file'] {
          display: block;
          padding: 8px;
          border-radius: 10px;
          border: 1px solid #d1d5db;
          background: #f9fafb;
          font-size: 13px;
        }

        .file-info {
          font-size: 13px;
          color: #4b5563;
        }

        .name-field {
          display: flex;
          flex-direction: column;
          gap: 6px;
          font-size: 14px;
          color: #0b2527;
        }

        .name-field input {
          width: 100%;
          padding: 8px 10px;
          border-radius: 10px;
          border: 1px solid #d1d5db;
          background: #ffffff;
          font-size: 13px;
        }

        .error-text {
          color: #b91c1c;
          font-size: 13px;
        }

        .actions-row {
          display: flex;
          gap: 10px;
          margin-top: 4px;
        }

        .btn-primary {
          background: #0b2527;
          color: #ffffff;
          border-radius: 999px;
          border: none;
          padding: 8px 18px;
          font-size: 14px;
          font-weight: 700;
          cursor: pointer;
        }

        .btn-primary:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .btn-ghost {
          background: transparent;
          color: #0b2527;
          border-radius: 999px;
          border: 1px solid #0b2527;
          padding: 8px 18px;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
        }

        .btn-ghost:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .preview-section h3 {
          margin: 0 0 8px;
          font-size: 15px;
          font-weight: 600;
          color: #0b2527;
        }

        .preview-placeholder {
          font-size: 13px;
          color: #6b7280;
          border-radius: 10px;
          border: 1px dashed #d1d5db;
          padding: 18px;
          text-align: center;
        }

        .preview-frame {
          border-radius: 10px;
          border: 1px solid #d1d5db;
          overflow: hidden;
          height: 430px;
          background: #111827;
        }

        @media (max-width: 900px) {
          .card-body {
            grid-template-columns: minmax(0, 1fr);
          }

          .preview-frame {
            height: 360px;
          }
        }

        @media (max-width: 640px) {
          .page-root {
            padding: 16px;
          }

          .card {
            padding: 16px;
          }
        }
      `}</style>
    </div>
  );
}
