import { notFound } from 'next/navigation';

export default function RootPage() {
  // Qualquer acesso à raiz (/) cai na página 404 customizada
  notFound();
}
