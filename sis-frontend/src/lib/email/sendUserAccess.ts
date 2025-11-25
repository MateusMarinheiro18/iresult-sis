// src/lib/email/sendUserAccess.ts
import nodemailer from 'nodemailer';

type Opts = {
  to: string;
  name?: string | null;
  email: string;       // login (email)
  plainPassword: string; // senha temporária gerada (NUNCA logar)
};

let transporter: nodemailer.Transporter | null = null;

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
    secure: port === 465, // true for 465, false for other ports
    auth: { user, pass },
  });

  return transporter;
}

export async function sendUserAccessEmail(opts: Opts) {
  const t = getTransporter();
  if (!t) {
    // dev fallback: não lançar, apenas logar (sem expor a senha)
    console.info('sendUserAccessEmail: transporter não configurado — skip send (dev).');
    return;
  }

  const portal = process.env.FRONTEND_BASE_URL ?? 'http://localhost:3000';
  const subject = 'Acesso ao portal — sua conta foi criada';
  const html = `
    <p>Olá ${opts.name ?? ''},</p>
    <p>Sua conta no portal foi criada. Seguem os dados de acesso:</p>
    <ul>
      <li><strong>Login</strong>: ${opts.email}</li>
      <li><strong>Senha temporária</strong>: ${opts.plainPassword}</li>
    </ul>
    <p>Acesse o portal: <a href="${portal}" target="_blank" rel="noreferrer">${portal}</a></p>
    <p>Por segurança, altere sua senha após o primeiro acesso (Esqueci minha senha).</p>
    <hr/>
    <p>Atenciosamente,<br/>Equipe</p>
  `;

  await t.sendMail({
    from: process.env.SMTP_FROM,
    to: opts.to,
    subject,
    html,
    text: `Olá ${opts.name ?? ''}\n\nLogin: ${opts.email}\nSenha temporária: ${opts.plainPassword}\n\nAcesse: ${portal}\n\nTroque a senha após o primeiro acesso.`,
  });
}
