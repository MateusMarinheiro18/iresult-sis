// src/lib/email/sendAdminAccessEmail.ts
// Envia o e-mail de acesso administrativo usando Brevo.
// A função pública sendAdminAccessEmail(opts) aceita APENAS:
//   { to: string; name?: string | null; plainPassword: string }
// e NÃO adiciona novos parâmetros.

import { sendEmailViaBrevo, escapeHtml } from './brevoClient';

type Opts = {
  to: string;
  name?: string | null;
  plainPassword: string;
};

type BuiltEmail = {
  to: string;
  subject: string;
  html: string;
  text: string;
};

const BRAND_COLOR = '#421E97';

function buildAdminAccessEmailPayload(opts: Opts): BuiltEmail {
  const { to, name, plainPassword } = opts;

  const safeTo = escapeHtml(to);
  const safeName = name ? escapeHtml(name) : '';
  const safePassword = escapeHtml(plainPassword);

  const subject = 'Acesso administrativo criado — acesse sua conta';
  const preheader = 'Seu usuário administrativo foi criado. Use as credenciais abaixo para acessar.';

  const companyName = 'SIS';
  const loginUrl = 'https://146.190.121.239:3001/admin/login';

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
        <div class="email-container" role="main" aria-label="Email de acesso administrativo">
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

            <h1>Acesso administrativo criado</h1>

            <p>Olá ${safeName || ''}${safeName ? ',' : ''}</p>

            <p>Uma conta administrativa foi criada para você. Abaixo estão as credenciais de acesso temporárias. Use-as para entrar pela primeira vez e altere sua senha imediatamente após o login.</p>

            <div class="credentials" role="group" aria-label="Credenciais de acesso">
              <div class="cred-row"><span class="label">Email: </span><div class="value">${safeTo}</div></div>
              <div class="cred-row"><span class="label">Senha temporária: </span><div class="value">${safePassword}</div></div>
              <div class="cred-row small" style="margin-top:8px; color:#5f7272;">Observação: essa senha é temporária e deve ser alterada no primeiro acesso.</div>
            </div>

            <div class="btn-wrap">
              <a class="btn" href="${loginUrl}" target="_blank" rel="noopener noreferrer" aria-label="Acessar painel - fazer login" style="color:#ffffff !important; text-decoration:none;">Acessar o painel</a>
            </div>

          </div>

        </div>
      </td>
    </tr>
  </table>
</body>
</html>`;

  const text = [
    `${subject}`,
    '',
    `Olá ${safeName || ''}`,
    '',
    `Uma conta administrativa foi criada para você. Use as credenciais abaixo para acessar e, por segurança, altere sua senha assim que fizer login.`,
    '',
    `Email: ${safeTo}`,
    `Senha temporária: ${safePassword}`,
    '',
    `Acessar: ${loginUrl}`,
    '',
  ].join('\n');

  return {
    to,
    subject,
    html,
    text,
  };
}

export async function sendAdminAccessEmail(opts: Opts) {
  const built = buildAdminAccessEmailPayload(opts);

  await sendEmailViaBrevo({
    to: built.to,
    subject: built.subject,
    htmlContent: built.html,
    textContent: built.text,
  });

  return { success: true, to: built.to };
}

export { buildAdminAccessEmailPayload as buildAdminAccessEmail };
export type { BuiltEmail as BuiltEmail };
