import Link from 'next/link';
import { User, Shield, Briefcase } from 'lucide-react';

export default function SeletorPerfil() {
  const perfis = [
    {
      id: 'administrador',
      titulo: 'Administrador',
      descricao: 'Acesso completo ao sistema de gestão institucional',
      icone: Shield,
      href: '/administrador',
      cor: 'bg-blue-600 hover:bg-blue-700',
    },
    {
      id: 'magistrado',
      titulo: 'Magistrado',
      descricao: 'Gestão de cartório e acompanhamento de processos',
      icone: Briefcase,
      href: '/magistrado',
      cor: 'bg-purple-600 hover:bg-purple-700',
    },
    {
      id: 'servidor',
      titulo: 'Servidor',
      descricao: 'Execução de tarefas e controle de prazos',
      icone: User,
      href: '/servidor',
      cor: 'bg-green-600 hover:bg-green-700',
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
      <div className="max-w-5xl w-full">
        {/* Cabeçalho */}
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold text-white mb-4">FORUM HUB</h1>
          <p className="text-xl text-slate-300">
            Sistema Integrado de Gestão Institucional
          </p>
          <div className="mt-4 inline-block px-6 py-2 bg-amber-500 text-slate-900 font-bold text-sm uppercase tracking-wide">
            Modo Desenvolvimento
          </div>
        </div>

        {/* Cartões de Perfil */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {perfis.map((perfil) => {
            const Icone = perfil.icone;
            return (
              <Link
                key={perfil.id}
                href={perfil.href}
                className="group"
              >
                <div className="bg-white/10 backdrop-blur-sm border-2 border-white/20 p-8 transition-all duration-300 hover:bg-white/20 hover:border-white/40 hover:scale-105">
                  <div className={`${perfil.cor} w-16 h-16 flex items-center justify-center mb-6 transition-transform group-hover:scale-110`}>
                    <Icone size={32} className="text-white" strokeWidth={2} />
                  </div>
                  
                  <h2 className="text-2xl font-bold text-white mb-3">
                    {perfil.titulo}
                  </h2>
                  
                  <p className="text-slate-300 text-sm leading-relaxed">
                    {perfil.descricao}
                  </p>

                  <div className="mt-6 text-sm font-semibold text-white group-hover:translate-x-2 transition-transform inline-flex items-center gap-2">
                    Acessar perfil
                    <span>→</span>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>

        {/* Rodapé */}
        <div className="mt-12 text-center">
          <p className="text-slate-400 text-sm">
            Selecione um perfil para visualizar a interface correspondente
          </p>
          <p className="text-slate-500 text-xs mt-2">
            Versão 1.0 • {new Date().getFullYear()}
          </p>
        </div>
      </div>
    </div>
  );
}