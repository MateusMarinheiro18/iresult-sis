// src/lib/email/sendUserAccess.ts
// Envia o e-mail de acesso de usuário (portal) usando nodemailer.
// A função pública sendUserAccessEmail(opts) aceita APENAS:
//   { to: string; name?: string | null; email: string; plainPassword: string }
// Não adiciona novos parâmetros.
//
// Requisitos:
//   npm install nodemailer
// Variáveis de ambiente esperadas (no seu ambiente atual):
//   SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM (opcional), FRONTEND_BASE_URL (opcional)

import nodemailer from 'nodemailer';

type Opts = {
  to: string;
  name?: string | null;
  email: string; // login (email)
  plainPassword: string; // senha temporária
};

type BuiltEmail = {
  to: string;
  subject: string;
  html: string;
  text: string;
};

const BRAND_COLOR = '#421E97';

let transporter: nodemailer.Transporter | null = null;

function escapeHtml(s: string) {
  return String(s || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Mantém o comportamento existente: cria um transporter (cacheado) a partir das env vars.
 * Se faltar configuração, retorna null (fallback dev — não lança).
 */
function getTransporter() {
  if (transporter) return transporter;

  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT || 587);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!host || !user || !pass) {
    console.warn('SMTP não configurado - env vars faltando. Emails não serão enviados em dev.');
    return null;
  }

  transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  });

  return transporter;
}

/**
 * Gera o HTML e text seguindo exatamente a estética do sendAdminAccessEmail.ts
 * Usa apenas as variáveis fornecidas dinamicamente: to, name?, email, plainPassword
 */
function buildUserAccessPayload(opts: Opts): BuiltEmail & { from?: string } {
  const { to, name, email, plainPassword } = opts;
  const safeTo = escapeHtml(to);
  const safeName = name ? escapeHtml(name) : '';
  const safeLogin = escapeHtml(email);
  const safePassword = escapeHtml(plainPassword);

  const subject = 'Acesso ao portal — sua conta foi criada';
  const preheader = 'Sua conta no portal foi criada. Use as credenciais abaixo para acessar.';
  const companyName = 'SIS';
  const portal = process.env.FRONTEND_BASE_URL ?? 'http://146.190.121.239:3001';
  const from = process.env.SMTP_FROM || undefined;

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
    .credentials { margin:16px 0; padding:14px; background:#f7f9f9; border-radius:6px; border:1px solid #e6eded; font-size:15px; }
    .cred-row { margin:6px 0; }
    .label { color:#6b7b7b; font-size:13px; }
    .value { font-weight:600; color:#122; word-break:break-all; }
    .btn-wrap { text-align:center; margin:18px 0 8px 0; }
    /* Força cor branca no botão (alguns clients sobrescrevem links) */
    .btn { display:inline-block; background:${BRAND_COLOR}; color:#ffffff !important; padding:12px 22px; border-radius:8px; font-weight:600; text-decoration:none; min-width:160px; }
    .note { font-size:13px; color:#6b7b7b; margin-top:8px; }
    .footer { background:#f1f4f4; padding:14px 20px; font-size:13px; color:#6b7b7b; text-align:center; }
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
        <div class="email-container" role="main" aria-label="Acesso ao portal">
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

            <h1>Acesso ao portal</h1>

            <p>Olá ${safeName || ''}${safeName ? ',' : ''}</p>

            <p>Sua conta no portal foi criada. Seguem os dados de acesso:</p>

            <div class="credentials" role="group" aria-label="Credenciais de acesso">
              <div class="cred-row"><span class="label">Login: </span><div class="value">${safeLogin}</div></div>
              <div class="cred-row"><span class="label">Senha temporária: </span><div class="value">${safePassword}</div></div>
              <div class="cred-row small" style="margin-top:8px; color:#5f7272;">Observação: essa senha é temporária e deve ser alterada no primeiro acesso.</div>
            </div>

            <div class="btn-wrap">
              <!-- Inline style com !important para garantir letra branca em clients que reescrevem links -->
              <a class="btn" href="${portal}" target="_blank" rel="noopener noreferrer" aria-label="Acessar portal" style="color:#ffffff !important; text-decoration:none;">Acessar o portal</a>
            </div>

          </div>

          <div class="footer">
            <div class="small">Se você recebeu este email por engano, apenas ignore-o.</div>
            <div style="height:6px;"></div>
            <div class="small">© ${escapeHtml(companyName)}</div>
          </div>

        </div>
      </td>
    </tr>
  </table>
</body>
</html>`;

  const text = [
    subject,
    '',
    `Olá ${safeName || ''}`,
    '',
    `Sua conta no portal foi criada. Use as credenciais abaixo para acessar e, por segurança, altere sua senha assim que fizer login.`,
    '',
    `Login: ${safeLogin}`,
    `Senha temporária: ${safePassword}`,
    '',
    `Acessar: ${portal}`,
    '',
  ].join('\n');

  return { to: safeTo, subject, html, text, from };
}

/**
 * Envia o e-mail com apenas os campos que você informou (to, name?, email, plainPassword).
 * Em dev, caso o transporter não esteja configurado, não lança — apenas loga e retorna.
 */
export async function sendUserAccessEmail(opts: Opts) {
  const t = getTransporter();
  const payload = buildUserAccessPayload(opts);

  if (!t) {
    // Dev fallback - log minimal info
    console.info('sendUserAccessEmail: transporter não configurado — skip send (dev).');
    return { accepted: [], rejected: [], dev: true };
  }

  const mailOptions: nodemailer.SendMailOptions = {
    from: process.env.SMTP_FROM || undefined,
    to: payload.to,
    subject: payload.subject,
    html: payload.html,
    text: payload.text,
  };

  const result = await t.sendMail(mailOptions);
  return result;
}

// também exporta o builder caso queira gerar html/text sem enviar
export { buildUserAccessPayload as buildUserAccessEmail };
export type { BuiltEmail as BuiltEmail };
