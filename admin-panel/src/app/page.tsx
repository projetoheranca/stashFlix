import React from 'react';

export default function AdminDashboard() {
  return (
    <div className="min-h-screen bg-black text-white p-8 font-sans">
      <header className="flex justify-between items-center mb-10 border-b border-[#1a0000] pb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white flex items-center gap-3">
            <span className="text-neon-flow">K</span> SafeVault Control
          </h1>
          <p className="text-zinc-500 mt-1">Visão geral do sistema e telemetria de segurança.</p>
        </div>
        <div className="flex gap-4">
          <button className="bg-zinc-900 border border-zinc-700 hover:bg-zinc-800 px-4 py-2 rounded-lg text-sm font-medium transition-colors">
            Exportar Relatório
          </button>
          <button className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-sm font-bold transition-colors shadow-[0_0_15px_rgba(220,38,38,0.5)]">
            Bloqueio Global 🚨
          </button>
        </div>
      </header>

      {/* Metrics Section */}
      <section className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-10">
        <div className="bg-zinc-950 border border-zinc-800 p-6 rounded-xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-red-500/10 rounded-full blur-3xl -mr-10 -mt-10"></div>
          <h3 className="text-zinc-400 text-sm font-medium">Usuários Ativos</h3>
          <p className="text-4xl font-bold mt-2">1,248</p>
          <p className="text-emerald-500 text-xs mt-2 font-medium flex items-center">↑ +12% este mês</p>
        </div>
        
        <div className="bg-zinc-950 border border-zinc-800 p-6 rounded-xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full blur-3xl -mr-10 -mt-10"></div>
          <h3 className="text-zinc-400 text-sm font-medium">Storage Ocupado (Cloud)</h3>
          <p className="text-4xl font-bold mt-2">4.2 TB</p>
          <p className="text-emerald-500 text-xs mt-2 font-medium">Abaixo da cota (10TB)</p>
        </div>

        <div className="bg-zinc-950 border border-zinc-800 p-6 rounded-xl relative overflow-hidden">
          <h3 className="text-zinc-400 text-sm font-medium">Violações de PIN Hoje</h3>
          <p className="text-4xl font-bold mt-2 text-red-500">47</p>
          <p className="text-red-500 text-xs mt-2 font-medium">Fotos de intrusos capturadas</p>
        </div>

        <div className="bg-zinc-950 border border-zinc-800 p-6 rounded-xl relative overflow-hidden">
          <h3 className="text-zinc-400 text-sm font-medium">Assinaturas PRO</h3>
          <p className="text-4xl font-bold mt-2">312</p>
          <p className="text-emerald-500 text-xs mt-2 font-medium">R$ 15.288,00 / MRR</p>
        </div>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* User Management List */}
        <section className="lg:col-span-2 bg-zinc-950 border border-zinc-800 rounded-xl overflow-hidden">
          <div className="p-6 border-b border-zinc-800 flex justify-between items-center bg-zinc-900/50">
            <h2 className="text-xl font-bold">Gerenciamento de Usuários</h2>
            <input 
              type="text" 
              placeholder="Buscar por e-mail ou UID..." 
              className="bg-zinc-900 border border-zinc-700 rounded-lg px-4 py-2 text-sm text-white w-64 focus:outline-none focus:border-red-500"
            />
          </div>
          <div className="p-0">
            <table className="w-full text-left text-sm">
              <thead className="bg-zinc-900/50 text-zinc-400 border-b border-zinc-800">
                <tr>
                  <th className="px-6 py-4 font-medium">E-mail</th>
                  <th className="px-6 py-4 font-medium">Plano</th>
                  <th className="px-6 py-4 font-medium">Status</th>
                  <th className="px-6 py-4 font-medium text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800">
                {[
                  { email: 'cliente.teste@gmail.com', plan: 'PRO', status: 'Ativo' },
                  { email: 'dev.mestre@outlook.com', plan: 'FREE', status: 'Suspeito' },
                  { email: 'usuario.anon@protonmail.com', plan: 'PRO', status: 'Ativo' },
                  { email: 'teste222@gmail.com', plan: 'FREE', status: 'Banido' },
                ].map((user, i) => (
                  <tr key={i} className="hover:bg-zinc-900/30 transition-colors">
                    <td className="px-6 py-4 font-medium text-zinc-300">{user.email}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded text-xs font-bold ${user.plan === 'PRO' ? 'bg-amber-500/20 text-amber-500' : 'bg-zinc-800 text-zinc-400'}`}>
                        {user.plan}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium border ${
                        user.status === 'Ativo' ? 'border-emerald-500/30 text-emerald-400' : 
                        user.status === 'Banido' ? 'border-red-500/30 text-red-400' : 
                        'border-yellow-500/30 text-yellow-400'
                      }`}>
                        {user.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button className="text-zinc-500 hover:text-white mr-3">Ver Cofre Cloud</button>
                      <button className="text-red-500 hover:text-red-400 font-medium">Banir</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Email System Config */}
        <section className="bg-zinc-950 border border-zinc-800 rounded-xl overflow-hidden flex flex-col">
          <div className="p-6 border-b border-zinc-800 bg-zinc-900/50">
            <h2 className="text-xl font-bold">Sistema de E-mail Automático</h2>
            <p className="text-xs text-zinc-400 mt-1">Disparos transacionais e suporte</p>
          </div>
          <div className="p-6 flex-1 flex flex-col gap-4">
            
            <div className="group border border-zinc-800 rounded-lg p-4 hover:border-zinc-600 transition-colors cursor-pointer">
              <h3 className="font-bold text-sm text-zinc-200">📧 Atualizações e Novidades</h3>
              <p className="text-xs text-zinc-500 mt-1">Disparar e-mail massivo para todos os usuários ATIVOS.</p>
            </div>

            <div className="group border border-zinc-800 rounded-lg p-4 hover:border-zinc-600 transition-colors cursor-pointer">
              <h3 className="font-bold text-sm text-zinc-200">🛠️ Resposta de Suporte</h3>
              <p className="text-xs text-zinc-500 mt-1">Enviar arquivos solicitados ou logs de recuperação de PIN.</p>
            </div>

            <div className="group border border-zinc-800 rounded-lg p-4 hover:border-zinc-600 transition-colors cursor-pointer">
              <h3 className="font-bold text-sm text-zinc-200">❌ Confirmação de Cancelamento</h3>
              <p className="text-xs text-zinc-500 mt-1">Editar o template enviado quando a conta PRO é cancelada.</p>
            </div>

            <button className="mt-auto w-full bg-zinc-900 border border-zinc-700 hover:bg-zinc-800 text-white py-3 rounded-lg text-sm font-bold transition-colors">
              Configurar Servidor SMTP
            </button>
          </div>
        </section>

      </div>
    </div>
  );
}
