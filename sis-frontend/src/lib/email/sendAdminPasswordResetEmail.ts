// src/lib/email/sendAdminPasswordResetEmail.ts
import nodemailer from 'nodemailer';

type Payload = {
  to: string;
  name?: string;
  resetLink: string;
  expiresSeconds: number;
};

function getTransporter() {
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT ?? 587);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!host || !user || !pass) {
    throw new Error('SMTP config missing (SMTP_HOST/SMTP_USER/SMTP_PASS).');
  }

  // Gmail commonly uses TLS on 587 with secure=false
  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465, // true for 465, false for 587
    auth: {
      user,
      pass,
    },
  });
}

export async function sendAdminPasswordResetEmail({ to, name, resetLink, expiresSeconds }: Payload) {
  const transporter = getTransporter();

  const from = process.env.SMTP_FROM ?? `SIS <no-reply@localhost>`;
  const hours = Math.round((expiresSeconds ?? 3600) / 3600);

  const subject = 'Redefinir sua senha - SIS';
  const html = `
    <div style="font-family: Arial, Helvetica, sans-serif; color:#111;">
      <h2 style="color:#0B2527">Redefinição de senha</h2>
      <p>Olá ${name ? escapeHtml(name) : 'usuário'},</p>
      <p>Recebemos uma solicitação para redefinir sua senha. Clique no botão abaixo para definir uma nova senha. O link é válido por ${hours} hora(s).</p>
      <p style="text-align:center; margin:24px 0;">
        <a href="${resetLink}" style="display:inline-block;padding:12px 22px;background:#0B2527;color:#fff;border-radius:8px;text-decoration:none;">Redefinir senha</a>
      </p>
      <p>Ou cole este link no navegador: <br/><a href="${resetLink}">${resetLink}</a></p>
      <p>Se você não solicitou, ignore este e-mail.</p>
      <hr />
      <small>Atenciosamente,<br/>Equipe SIS</small>
    </div>
  `;

  const text = `Olá ${name ?? ''},

Recebemos uma solicitação para redefinir sua senha. Abra o link abaixo (válido por ${hours} hora(s)):
${resetLink}

Se você não solicitou, ignore este e-mail.
`;

  const info = await transporter.sendMail({
    from,
    to,
    subject,
    text,
    html,
  });

  // opcional: retorna info (messageId etc.)
  return info;
}

// minúscula helper para escapar simples em HTML
function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] ?? c));
}
