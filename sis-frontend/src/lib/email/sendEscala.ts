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
