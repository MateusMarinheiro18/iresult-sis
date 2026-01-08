// src/components/import/FileUploader.tsx
'use client';

import React, { useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { EmployeeRow, normalizeKey } from './validators';
import DescriptionOutlinedIcon from '@mui/icons-material/DescriptionOutlined';

type Props = {
  onParsed: (rows: EmployeeRow[]) => void;
  setMessage?: (m: string | null) => void;
  setParsing?: (b: boolean) => void;
};

export default function FileUploader({ onParsed, setMessage, setParsing }: Props) {
  const [hovered, setHovered] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);

  async function handleFiles(files?: FileList | null) {
    setMessage?.(null);
    if (!files || files.length === 0) {
      toast.error('Nenhum arquivo selecionado.');
      setMessage?.('Nenhum arquivo selecionado.');
      return;
    }
    const f = files[0];
    setParsing?.(true);
    try {
      const name = f.name.toLowerCase();
      if (name.endsWith('.csv')) {
        try {
          const Papa = (await import('papaparse')).default;
          await new Promise<void>((resolve, reject) => {
            Papa.parse(f, {
              header: true,
              skipEmptyLines: true,
              complete: (res: any) => {
                const parsed = res.data as Record<string, any>[];
                onParsed(mapParsed(parsed));
                toast.success('Arquivo CSV importado com sucesso!');
                resolve();
              },
              error: (err: any) => reject(err),
            });
          });
        } catch (errCsvParse) {
          console.warn('papaparse dynamic import failed, fallback to FileReader', errCsvParse);
          const text = await f.text();
          const lines = text.split(/\r?\n/).filter(Boolean);
          if (lines.length === 0) {
            throw new Error('CSV vazio');
          }
          const headers = lines[0].split(',').map((h) => h.trim());
          const parsed: Record<string, any>[] = lines.slice(1).map((ln) => {
            const cols = ln.split(',');
            const obj: Record<string, any> = {};
            headers.forEach((h, i) => (obj[h] = cols[i] ?? ''));
            return obj;
          });
          onParsed(mapParsed(parsed));
          toast.success('Arquivo CSV importado (modo fallback).');
        }
      } else if (name.endsWith('.xls') || name.endsWith('.xlsx')) {
        try {
          const XLSX = await import('xlsx');
          const buffer = await f.arrayBuffer();
          const wb = XLSX.read(buffer, { type: 'array' });
          const firstSheet = wb.SheetNames[0];
          const sheet = wb.Sheets[firstSheet];
          const parsed = XLSX.utils.sheet_to_json<Record<string, any>>(sheet, { defval: '' });
          onParsed(mapParsed(parsed));
          toast.success('Arquivo Excel importado com sucesso!');
        } catch (errXlsx) {
          console.error('Erro ao processar XLSX:', errXlsx);
          toast.error('Erro ao processar arquivo Excel. Verifique se a dependência "xlsx" está instalada.');
          setMessage?.('Erro ao processar arquivo Excel.');
        }
      } else {
        toast.error('Formato não suportado. Use .csv, .xls ou .xlsx.');
        setMessage?.('Formato não suportado. Use .csv, .xls ou .xlsx.');
      }
    } catch (err: any) {
      console.error('Erro parsing file', err);
      toast.error(err?.message ? String(err.message) : 'Erro ao processar o arquivo. Veja o console.');
      setMessage?.(err?.message ? String(err.message) : 'Erro ao processar o arquivo.');
    } finally {
      setParsing?.(false);
    }
  }

  function mapParsed(parsed: Record<string, any>[]) {
    return parsed.map((r, idx) => {
      const out: EmployeeRow = { origem_linha: idx + 2 };
      for (const kRaw of Object.keys(r)) {
        const k = normalizeKey(kRaw);
        const v = r[kRaw];
        if ((k.includes('nome') || k === 'name') && !k.includes('cidade')) {
          out.nome = (v ?? '').toString().trim();
        } else if (k === 'email' || k.includes('e-mail')) {
          out.email = (v ?? '').toString().trim();
        } else if (k.includes('tel') || k.includes('phone') || k.includes('fone')) {
          out.telefone = (v ?? '').toString().trim();
        } else if (k.includes('data') && (k.includes('nasc') || k.includes('birth'))) {
          out.data_nascimento = convertBrazilianDateToISO((v ?? '').toString().trim());
        } else if (k.includes('cidade')) {
          out.cidade_nascimento = (v ?? '').toString().trim();
        } else if (k.includes('gestor') || k.includes('manager')) {
          out.gestor = (v ?? '').toString().trim();
        } else if (k === 'grupo' || k.includes('group') || k.includes('departamento')) {
          out.grupo = (v ?? '').toString().trim();
        } else if (k === 'ativo' || k === 'active') {
          out.ativo = (v === '0' || v === 0 || v === false) ? 0 : 1;
        } else {
          out[k] = v;
        }
      }
      return out;
    });
  }

  function convertBrazilianDateToISO(dateStr: string): string {
    if (!dateStr) return '';
    const match = dateStr.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
    if (match) {
      const day = match[1].padStart(2, '0');
      const month = match[2].padStart(2, '0');
      const year = match[3];
      return `${year}-${month}-${day}`;
    }
    if (dateStr.match(/^\d{4}-\d{2}-\d{2}$/)) {
      return dateStr;
    }
    const num = Number(dateStr);
    if (!isNaN(num) && num > 0 && num < 100000) {
      const excelEpoch = new Date(1900, 0, 1);
      const date = new Date(excelEpoch.getTime() + (num - 2) * 86400000);
      const y = date.getFullYear();
      const m = String(date.getMonth() + 1).padStart(2, '0');
      const d = String(date.getDate()).padStart(2, '0');
      return `${y}-${m}-${d}`;
    }
    return dateStr;
  }

  return (
    <div
      className={`dropzone ${hovered ? 'hovered' : ''}`}
      onClick={() => inputRef.current?.click()}
      onDragOver={(e) => {
        e.preventDefault();
        setHovered(true);
      }}
      onDragLeave={() => setHovered(false)}
      onDrop={(e) => {
        e.preventDefault();
        setHovered(false);
        handleFiles(e.dataTransfer.files);
      }}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') inputRef.current?.click();
      }}
    >
      <div className="content">
        <DescriptionOutlinedIcon className="icon" />
        <p className="text">Clique ou arraste o arquivo (.csv, .xls, .xlsx)</p>
        <p className="hint">Formatos aceitos: CSV, XLS, XLSX</p>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept=".csv, .xls, .xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
        onChange={(e) => handleFiles(e.target.files)}
        style={{ display: 'none' }}
      />

      <style jsx>{`
        .dropzone {
          display: flex;
          align-items: center;
          justify-content: center;
          flex-direction: column;
          border: 3px dashed #d1d5db;
          border-radius: 12px;
          padding: 60px 20px;
          text-align: center;
          cursor: pointer;
          background-color: #fafafa;
          transition: all 0.22s ease;
        }
        .dropzone:hover,
        .dropzone.hovered {
          border-color: #421E97;
          background-color: rgba(11, 37, 39, 0.15);
        }
        .content {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 8px;
        }
        .icon {
          font-size: 72px;
          color: #421E97;
          transition: color 0.22s ease, transform 0.22s ease;
        }
        .dropzone:hover .icon,
        .dropzone.hovered .icon {
          color: #421E97;
          transform: scale(1.03);
        }
        .text {
          color: #374151;
          font-weight: 600;
          font-size: 16px;
          margin-top: 4px;
          transition: color 0.22s ease;
        }
        .hint {
          color: #6b7280;
          font-size: 13px;
          margin-top: 4px;
        }
        .dropzone:hover .text,
        .dropzone.hovered .text {
          color: #421E97;
        }
      `}</style>
    </div>
  );
}
