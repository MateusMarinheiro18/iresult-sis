// src/app/client/reset/page.tsx
import ResetClient from './ResetClient';

export default function ClientResetPasswordPage() {
  // Mantemos esta página como Server Component;
  // toda a lógica que precisa de hooks/estado fica no ResetClient (client component).
  return <ResetClient />;
}
