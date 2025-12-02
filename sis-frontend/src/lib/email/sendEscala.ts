// src/lib/email/sendEscala.ts
import nodemailer from 'nodemailer';

type SendBulkArgs = {
  subject: string;
  text?: string;
  html?: string;
  to: string[];
};

let transporter: ReturnType<typeof nodemailer.createTransport> | null = null;

function getTransporter() {
  if (transporter) return transporter;

  if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
    throw new Error(
      'Configuração SMTP ausente. Defina SMTP_HOST, SMTP_USER e SMTP_PASS no .env',
    );
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
    const safeName = r.nome ? `, ${r.nome}` : '';
    const plain = `Olá${safeName}!

${message}

Responda à escala neste link:
${r.link}

Obrigado.`;

    const html = `
      <p>Olá${safeName}!</p>
      <p>${message.replace(/\n/g, '<br />')}</p>
      <p>
        <a href="${r.link}" target="_blank" rel="noopener noreferrer">
          Responder escala
        </a>
      </p>
      <p>Obrigado.</p>
    `;

    await t.sendMail({
      from: process.env.SMTP_FROM || process.env.SMTP_USER,
      to: r.email,
      subject,
      text: plain,
      html,
    });
  }
}
