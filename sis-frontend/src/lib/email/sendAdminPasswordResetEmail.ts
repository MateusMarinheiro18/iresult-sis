// src/lib/email/sendAdminPasswordResetEmail.ts
// Envia e-mail de redefinição de senha para administradores via Brevo

import { sendEmailViaBrevo, escapeHtml } from './brevoClient';

type Payload = {
  to: string;
  name?: string | null;
  resetLink: string;
  expiresSeconds: number;
};

const BRAND_COLOR = '#421E97';

function buildResetHtmlText(payload: Payload) {
  const { to, name, resetLink, expiresSeconds } = payload;
  const safeName = name ? escapeHtml(name) : '';
  const safeLink = escapeHtml(resetLink);
  const subject = 'Redefinição de senha — SIS';
  const preheader = 'Recebemos uma solicitação para redefinir sua senha. Clique no botão abaixo.';
  const companyName = 'SIS';
  const hours = Math.round((expiresSeconds ?? 3600) / 3600) || 1;

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
    .cta-wrap { text-align:center; margin:18px 0 8px 0; }
    .btn { display:inline-block; background:${BRAND_COLOR}; color:#ffffff !important; padding:12px 22px; border-radius:8px; font-weight:600; text-decoration:none; min-width:160px; }
    .note { font-size:13px; color:#6b7b7b; margin-top:8px; }
    .footer { background:#f1f4f4; padding:14px 20px; font-size:13px; color:#6b7b7b; text-align:center; }
    .small { font-size:12px; color:#889696; }
    /* Card com padding reduzido para ficar menos volumoso */
    .box { margin:16px 0; padding:10px; background:#f7f9f9; border-radius:6px; border:1px solid #e6eded; }
    /* Link dentro do card: fonte menor para reduzir visual do card */
    .box .link { color:${BRAND_COLOR}; word-break:break-all; font-size:13px; line-height:1.3; }
    a.link { text-decoration:none; }
    @media (max-width:480px) {
      .content { padding:20px 16px; }
      .btn { width:100%; box-sizing:border-box; display:block; text-align:center; }
      .box { padding:10px; }
      .box .link { font-size:13px; }
    }
  </style>
</head>
<body>
  <span class="preheader">${escapeHtml(preheader)}</span>

  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#eef2f3; padding:24px 12px;">
    <tr>
      <td align="center">
        <div class="email-container" role="main" aria-label="Redefinição de senha">
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

            <h1>Redefinição de senha</h1>

            <p>Olá ${safeName || ''}${safeName ? ',' : ''}</p>

            <p>Recebemos uma solicitação para redefinir sua senha. Clique no botão abaixo para definir uma nova senha. O link é válido por ${hours} hora(s).</p>

            <div class="cta-wrap">
              <a class="btn" href="${safeLink}" target="_blank" rel="noopener noreferrer" style="color:#ffffff !important; text-decoration:none;" aria-label="Redefinir senha">Redefinir senha</a>
            </div>

            <div class="box">
              <p style="margin:0 0 8px 0; font-size:13px; color:#4b6363;">Se o botão não funcionar, cole este link no seu navegador:</p>
              <p style="margin:0;"><a class="link" href="${safeLink}" target="_blank" rel="noopener noreferrer">${safeLink}</a></p>
            </div>

            <p class="note">Se você não solicitou essa alteração, ignore este e-mail. Se precisar de ajuda, contate o suporte do sistema.</p>

          </div>

          <div class="footer">
            <div class="small">© ${escapeHtml(companyName)}</div>
          </div>

        </div>
      </td>
    </tr>
  </table>
</body>
</html>`;

  const text = [
    `Redefinição de senha — SIS`,
    '',
    `Olá ${name ?? ''}`,
    '',
    `Recebemos uma solicitação para redefinir sua senha. Use o link abaixo (válido por ${hours} hora(s)):`,
    '',
    resetLink,
    '',
    `Se você não solicitou essa alteração, ignore este e-mail.`,
    '',
  ].join('\n');

  return { subject: `Redefinição de senha — SIS`, html, text };
}

export async function sendAdminPasswordResetEmail({ to, name, resetLink, expiresSeconds }: Payload) {
  const { subject, html, text } = buildResetHtmlText({ to, name, resetLink, expiresSeconds });

  await sendEmailViaBrevo({
    to,
    subject,
    htmlContent: html,
    textContent: text,
  });

  return { success: true, to };
}
