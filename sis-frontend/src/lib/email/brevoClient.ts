// Cliente centralizado para envio de emails via Brevo API
import * as brevo from '@getbrevo/brevo';

type SendEmailParams = {
  to: string | string[];
  subject: string;
  htmlContent: string;
  textContent?: string;
  from?: { email: string; name: string };
};

let apiInstance: brevo.TransactionalEmailsApi | null = null;

function getBrevoClient() {
  if (apiInstance) return apiInstance;

  const apiKey = process.env.BREVO_API_KEY;
  if (!apiKey) {
    throw new Error('BREVO_API_KEY não configurada. Defina no .env');
  }

  apiInstance = new brevo.TransactionalEmailsApi();
  apiInstance.setApiKey(brevo.TransactionalEmailsApiApiKeys.apiKey, apiKey);

  return apiInstance;
}

export async function sendEmailViaBrevo({
  to,
  subject,
  htmlContent,
  textContent,
  from,
}: SendEmailParams) {
  const client = getBrevoClient();

  const sender = from || {
    email: process.env.BREVO_FROM_EMAIL || 'noreply@sismental.com.br',
    name: process.env.BREVO_FROM_NAME || 'SIS',
  };

  const recipients = Array.isArray(to) 
    ? to.map((email) => ({ email }))
    : [{ email: to }];

  const sendSmtpEmail = new brevo.SendSmtpEmail();
  sendSmtpEmail.sender = sender;
  sendSmtpEmail.to = recipients;
  sendSmtpEmail.subject = subject;
  sendSmtpEmail.htmlContent = htmlContent;
  sendSmtpEmail.textContent = textContent;

  const result = await client.sendTransacEmail(sendSmtpEmail);
  return result;
}

export function escapeHtml(s: string) {
  return String(s || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
