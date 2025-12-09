// src/lib/email/sendAdminAccessEmail.ts
import { sendUserAccessEmail } from './sendUserAccess'; // se já existir, simples wrapper

export async function sendAdminAccessEmail(opts: { to: string; name?: string; plainPassword: string }) {
  // reusa o template que você já tem
  return sendUserAccessEmail({
    to: opts.to,
    name: opts.name ?? '',
    email: opts.to,
    plainPassword: opts.plainPassword,
  });
}
