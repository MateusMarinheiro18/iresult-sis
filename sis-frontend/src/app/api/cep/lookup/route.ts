// src/app/api/cep/lookup/route.ts
import { NextResponse } from 'next/server';

/**
 * Simple in-memory cache with TTL
 * key -> {ts:number, data:any}
 */
const CACHE = new Map<string, { ts: number; data: any }>();
const DEFAULT_TTL_MS = 1000 * 60 * 60 * 24; // 24h

function cacheGet(key: string) {
  const e = CACHE.get(key);
  if (!e) return null;
  if (Date.now() - e.ts > DEFAULT_TTL_MS) {
    CACHE.delete(key);
    return null;
  }
  return e.data;
}

function cacheSet(key: string, data: any) {
  CACHE.set(key, { ts: Date.now(), data });
}

/** Normalize CEP: remove non-digits */
function normalizeCep(raw: string) {
  return String(raw || '').replace(/\D/g, '');
}

/** Try lookup via Correios SOAP webservice */
async function lookupCorreios(cep: string): Promise<any | null> {
  // Correios SOAP endpoint (AtendeCliente)
  const url = 'https://apps.correios.com.br/SigepMasterJPA/AtendeClienteService/AtendeCliente';

  const soapEnvelope = `<?xml version="1.0" encoding="utf-8"?>
    <soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:cli="http://cliente.bean.master.sigep.bsb.correios.com.br/">
      <soapenv:Header/>
      <soapenv:Body>
        <cli:consultaCEP>
          <cep>${cep}</cep>
        </cli:consultaCEP>
      </soapenv:Body>
    </soapenv:Envelope>`;

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/xml;charset=UTF-8',
        SOAPAction: 'consultaCEP',
      },
      body: soapEnvelope,
    });

    if (!res.ok) {
      // Correios service returned non-200
      return null;
    }

    const text = await res.text();

    // The SOAP response contains a <return>...</return> block with nested tags like:
    // <return><cep>01001-000</cep><logradouro>Praça da Sé</logradouro>...
    // We'll try to extract the inner <return> ... </return>
    const returnMatch = text.match(/<return[^>]*>([\s\S]*?)<\/return>/i);
    if (!returnMatch) {
      // sometimes the response may be wrapped differently; try to find cep tag directly
      if (!/\<cep\>/.test(text)) return null;
    }

    const payloadXml = returnMatch ? returnMatch[1] : text;

    // helper to extract tag value (first occurrence)
    const getTag = (tag: string) => {
      const m = payloadXml.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i'));
      if (!m) return '';
      return m[1].trim();
    };

    const cepResp = getTag('cep') || getTag('cep');
    const logradouro = getTag('end') || getTag('logradouro') || getTag('endereco') || getTag('tipoLogradouro') || getTag('logradouro');
    // Correios sometimes returns 'end' or 'logradouro' or 'address' variations; above tries multiple
    const bairro = getTag('bairro') || '';
    const localidade = getTag('cidade') || getTag('localidade') || getTag('cidade');
    const uf = getTag('uf') || getTag('estado') || '';
    const complemento = getTag('complemento') || '';

    // If not found major fields, treat as not found
    if (!cepResp && !logradouro && !localidade && !uf && !bairro) {
      return null;
    }

    return {
      cep: cepResp || cep,
      logradouro: logradouro || '',
      complemento: complemento || '',
      bairro: bairro || '',
      localidade: localidade || '',
      uf: uf || '',
      fonte: 'correios',
      raw: payloadXml,
    };
  } catch (err) {
    // network or parsing error
    console.error('lookupCorreios error', err);
    return null;
  }
}

/** Lookup via ViaCEP (fallback) */
async function lookupViaCep(cep: string): Promise<any | null> {
  const url = `https://viacep.com.br/ws/${cep}/json/`;
  try {
    const res = await fetch(url, { method: 'GET' });
    if (!res.ok) return null;
    const data = await res.json();
    if (!data || data.erro) return null;

    return {
      cep: data.cep,
      logradouro: data.logradouro || '',
      complemento: data.complemento || '',
      bairro: data.bairro || '',
      localidade: data.localidade || '',
      uf: data.uf || '',
      fonte: 'viacep',
      raw: data,
    };
  } catch (err) {
    console.error('lookupViaCep error', err);
    return null;
  }
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const rawCep = String(url.searchParams.get('cep') || '');
    const cep = normalizeCep(rawCep);

    // validate
    if (!cep || cep.length !== 8) {
      return NextResponse.json({ error: 'CEP inválido. Deve conter 8 dígitos.' }, { status: 422 });
    }

    // try cache
    const cacheKey = `cep:${cep}`;
    const cached = cacheGet(cacheKey);
    if (cached) {
      return NextResponse.json(cached, { status: 200 });
    }

    // 1) try Correios
    let result = await lookupCorreios(cep);

    // 2) fallback to ViaCEP
    if (!result) {
      result = await lookupViaCep(cep);
    }

    if (!result) {
      // not found in both providers
      return NextResponse.json({ error: 'CEP não encontrado' }, { status: 404 });
    }

    // normalize output to the expected shape
    const normalized = {
      cep: (result.cep || cep).replace(/\D/g, '').replace(/(\d{5})(\d{3})/, '$1-$2'),
      logradouro: result.logradouro || '',
      complemento: result.complemento || '',
      bairro: result.bairro || '',
      localidade: result.localidade || result.city || '',
      uf: (result.uf || '').toUpperCase(),
      fonte: result.fonte || 'unknown',
    };

    cacheSet(cacheKey, normalized);

    return NextResponse.json(normalized, { status: 200 });
  } catch (err) {
    console.error('CEP lookup error', err);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
