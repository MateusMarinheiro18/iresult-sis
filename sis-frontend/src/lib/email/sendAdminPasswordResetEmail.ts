// src/lib/email/sendAdminPasswordResetEmail.ts
export async function sendAdminPasswordResetEmail({
    to,
    name,
    resetLink,
    expiresSeconds,
  }: {
    to: string;
    name: string;
    resetLink: string;
    expiresSeconds: number;
  }) {
    // EXEMPLO: use seu provider real aqui.
    // Se você já tem sendUserAccessEmail, adapte-o em vez de recriar.
    const subject = 'Redefinição de senha';
    const text = `Olá ${name || ''},
  
  Recebemos uma solicitação para redefinir sua senha. Clique no link abaixo para definir a nova senha (válido por ${Math.ceil(expiresSeconds / 3600)} horas):
  
  ${resetLink}
  
  Se você não solicitou, ignore este e-mail.
  
  Atenciosamente.
  `;
    // substitua console.log por envio real
    console.log('Enviar e-mail:', { to, subject, text });
    return Promise.resolve();
  }
  