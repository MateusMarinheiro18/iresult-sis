// src/lib/email/sendEscala.ts
// Envia emails de escala mantendo o padrão estético dos outros templates (top-bar, botão com texto branco,
// card reduzido para link, etc).
//
// Usa APENAS as variáveis que o arquivo original já usava:
//  - env: SMTP_HOST, SMTP_USER, SMTP_PASS, SMTP_PORT, SMTP_SECURE, SMTP_FROM
//  - função pública: sendBulkEmail(...) e sendEscalaEmails(...)
// Não adiciona novos parâmetros.

import nodemailer from 'nodemailer';

type SendBulkArgs = {
  subject: string;
  text?: string;
  html?: string;
  to: string[];
};

const BRAND_COLOR = '#421E97';

let transporter: ReturnType<typeof nodemailer.createTransport> | null = null;

function escapeHtml(s: string) {
  return String(s || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function getTransporter() {
  if (transporter) return transporter;

  if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
    throw new Error('Configuração SMTP ausente. Defina SMTP_HOST, SMTP_USER e SMTP_PASS no .env');
  }

  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT ?? 587),
    secure: process.env.SMTP_SECURE === 'true', // true para 465, false para 587
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  return transporter;
}

export async function sendBulkEmail({ subject, text, html, to }: SendBulkArgs) {
  const emails = Array.from(new Set(to));
  if (!emails.length) return;

  const t = getTransporter();

  await t.sendMail({
    from: process.env.SMTP_FROM || process.env.SMTP_USER,
    bcc: emails,
    subject,
    text,
    html,
  });
}

/* ======= ESPECÍFICO PARA ENVIO DE ESCALA (link único por funcionário) ======= */

export type EscalaRecipient = {
  email: string;
  nome?: string | null;
  empresa?: string | null;
  link: string;
};

type SendEscalaArgs = {
  subject: string;
  message: string;
  recipients: EscalaRecipient[];
};

export async function sendEscalaEmails({
  subject,
  message,
  recipients,
}: SendEscalaArgs) {
  const t = getTransporter();

  const list = recipients.filter((r) => r.email);

  if (!list.length) return;

  for (const r of list) {
    const safeName = r.nome ? escapeHtml(r.nome) : '';
    const displayName = safeName ? `${safeName}` : '';
    const safeMessage = escapeHtml(message).replace(/\n/g, '<br />');
    const safeLink = escapeHtml(r.link);
    const safeEmpresa = r.empresa ? escapeHtml(r.empresa) : '';

    const preheader = 'Convite para participação no questionário';
    const companyName = 'SIS';

    // plain-text
    const plain = [
      `Olá${displayName ? ` ${displayName}` : ''}!`,
      '',
      message,
      '',
      `Responder questionário: ${r.link}`,
      '',
      'Obrigado.',
    ].join('\n');

    // html — mantém a mesma estética dos outros templates
    const html = `<!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1"/>
  <title>${escapeHtml(subject)}</title>
  <style>
    body { margin:0; padding:0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif; color:#222; }
    .preheader { display:none !important; visibility:hidden; opacity:0; height:0; width:0; overflow:hidden; }
    .email-container { width:100%; max-width:600px; margin:0 auto; background:white; border-radius:8px; overflow:hidden; }
    .top-bar { background:${BRAND_COLOR}; padding:18px 24px; text-align:center; color:#ffffff; }
    .logo { max-height:42px; display:block; margin:0 auto; font-weight:700; font-size:18px; color:#fff; }
    .content { padding:28px; }
    h1 { font-size:20px; margin:0 0 12px 0; color:${BRAND_COLOR}; }
    p { margin:0 0 12px 0; line-height:1.45; font-size:15px; color:#333; }
    .credentials, .box { margin:16px 0; padding:10px; background:#f7f9f9; border-radius:6px; border:1px solid #e6eded; font-size:15px; }
    .btn-wrap { text-align:center; margin:18px 0 8px 0; }
    .btn { display:inline-block; background:${BRAND_COLOR}; color:#ffffff !important; padding:12px 22px; border-radius:8px; font-weight:600; text-decoration:none; min-width:160px; }
    .box .link { color:${BRAND_COLOR}; word-break:break-all; font-size:13px; line-height:1.3; text-decoration:none; }
    .small { font-size:12px; color:#889696; }
    @media (max-width:480px) {
      .content { padding:20px 16px; }
      .btn { width:100%; box-sizing:border-box; display:block; text-align:center; }
    }
  </style>
</head>
<body>
  <span class="preheader">${escapeHtml(preheader)}</span>

  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#eef2f3; padding:24px 12px;">
    <tr>
      <td align="center">
        <div class="email-container" role="main" aria-label="Convite para escala">
          <div class="top-bar">
            <div class="logo">${escapeHtml(companyName)}</div>
          </div>

          <div class="content">
            <div style="text-align:center; margin-bottom:14px;">
              <svg width="78" height="78" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                <rect width="24" height="24" rx="4" fill="${BRAND_COLOR}"/>
                <path d="M12 11a2 2 0 100-4 2 2 0 000 4z" fill="#fff" opacity="0.95"/>
                <path d="M7 11v6a3 3 0 003 3h4a3 3 0 003-3v-6" stroke="#fff" stroke-width="1" stroke-linecap="round" stroke-linejoin="round" opacity="0.95"/>
              </svg>
            </div>

            <h1>Convite para participação</h1>

            <p>Olá${displayName ? ` ${displayName}` : ''}${safeEmpresa ? ` — ${safeEmpresa}` : ''},</p>

            <p>${safeMessage}</p>

            <div class="btn-wrap">
              <a class="btn" href="${safeLink}" target="_blank" rel="noopener noreferrer" style="color:#ffffff !important; text-decoration:none;" aria-label="Responder questionário">Responder questionário</a>
            </div>

            <div class="box">
              <p style="margin:0 0 8px 0; font-size:13px; color:#4b6363;">Se o botão não funcionar, cole este link no seu navegador:</p>
              <p style="margin:0;"><a class="link" href="${safeLink}" target="_blank" rel="noopener noreferrer">${safeLink}</a></p>
            </div>

            <p class="small">Obrigado.</p>

          </div>

          <div class="footer" style="background:#f1f4f4; padding:14px 20px; text-align:center;">
            <div class="small">© ${escapeHtml(companyName)}</div>
          </div>

        </div>
      </td>
    </tr>
  </table>
</body>
</html>`;

    await t.sendMail({
      from: process.env.SMTP_FROM || process.env.SMTP_USER,
      to: r.email,
      subject,
      text: plain,
      html,
    });
  }
}
