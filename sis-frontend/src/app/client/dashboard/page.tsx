// src/app/client/dashboard/page.tsx
import React from "react";

export default function ClientDashboardPage() {
  return (
    <section>
      <h2 className="text-2xl font-semibold mb-4">Dashboard — Cliente</h2>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="rounded-lg p-4 bg-white shadow-sm">
          <h3 className="text-sm text-gray-500">Pesquisas Ativas</h3>
          <p className="text-3xl font-bold">12</p>
        </div>
        <div className="rounded-lg p-4 bg-white shadow-sm">
          <h3 className="text-sm text-gray-500">Respostas (últimos 7d)</h3>
          <p className="text-3xl font-bold">312</p>
        </div>
        <div className="rounded-lg p-4 bg-white shadow-sm">
          <h3 className="text-sm text-gray-500">NPS Médio</h3>
          <p className="text-3xl font-bold">78</p>
        </div>
      </div>

      <div className="mt-6 rounded-lg bg-white shadow-sm p-4">
        <h3 className="font-medium mb-2">Últimas pesquisas</h3>
        <ul className="divide-y">
          <li className="py-3">Pesquisa: Bem-estar — 120 respostas</li>
          <li className="py-3">Pesquisa: Segurança — 85 respostas</li>
          <li className="py-3">Pesquisa: Comunicação — 107 respostas</li>
        </ul>
      </div>
    </section>
  );
}
