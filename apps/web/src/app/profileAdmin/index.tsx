import React from 'react';
import { Package, Calendar, User, LogOut } from 'lucide-react';

interface ModuleCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  href: string;
  stats?: {
    label: string;
    value: string | number;
    variant?: 'default' | 'warning' | 'danger';
  };
}

const ModuleCard: React.FC<ModuleCardProps> = ({ icon, title, description, href, stats }) => {
  const getStatsColor = (variant?: string) => {
    switch (variant) {
      case 'warning':
        return 'text-amber-700 bg-amber-50 border border-amber-200';
      case 'danger':
        return 'text-red-700 bg-red-50 border border-red-200';
      default:
        return 'text-slate-700 bg-slate-50 border border-slate-200';
    }
  };

  return (
    <a
      href={href}
      className="group block p-8 bg-white border-2 border-slate-200 hover:border-slate-400 transition-all duration-150"
    >
      <div className="flex items-start justify-between mb-4">
        <div className="p-4 bg-slate-100 text-slate-700 group-hover:bg-slate-700 group-hover:text-white transition-colors">
          {icon}
        </div>
        {stats && (
          <div className={`px-4 py-2 text-sm font-semibold ${getStatsColor(stats.variant)}`}>
            {stats.value} {stats.label}
          </div>
        )}
      </div>
      <div>
        <h3 className="text-xl font-bold text-slate-900 mb-2">
          {title}
        </h3>
        <p className="text-sm text-slate-600 leading-relaxed">{description}</p>
      </div>
    </a>
  );
};

const AdminHome: React.FC = () => {
  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-slate-900 border-b-4 border-slate-700">
        <div className="max-w-7xl mx-auto px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-white tracking-tight">FORUM HUB</h1>
              <p className="text-sm text-slate-300 mt-1 font-medium">Administração</p>
            </div>
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-4 pr-6 border-r border-slate-700">
                <div className="w-10 h-10 bg-slate-700 text-white flex items-center justify-center font-bold text-sm">
                  <User size={20} />
                </div>
                <div>
                  <p className="text-sm font-semibold text-white">Usuário Admin</p>
                  <p className="text-xs text-slate-400">Perfil Administrativo</p>
                </div>
              </div>
              <button className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-300 hover:text-white hover:bg-slate-800 transition-colors">
                <LogOut size={16} />
                Sair
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-8 py-12">
        {/* Title Section */}
        <div className="mb-12">
          <h2 className="text-2xl font-bold text-slate-900 mb-3">
            Painel Administrativo
          </h2>
          <p className="text-slate-600 text-base leading-relaxed max-w-3xl">
            Controle centralizado de recursos institucionais com rastreabilidade completa e autonomia operacional.
          </p>
        </div>

        {/* Module Cards */}
        <div className="mb-12">
          <h3 className="text-lg font-bold text-slate-900 mb-6 uppercase tracking-wide">Módulos do Sistema</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <ModuleCard
              icon={<Package size={28} strokeWidth={2} />}
              title="Inventário"
              description="Gestão patrimonial com controle de tombos, categorias, localizações e movimentações. Auditoria completa de todas as operações."
              href="/admin/inventario"
              stats={{
                label: 'itens cadastrados',
                value: 247,
                variant: 'default',
              }}
            />
            <ModuleCard
              icon={<Calendar size={28} strokeWidth={2} />}
              title="Férias"
              description="Controle de solicitações, aprovações e calendário anual. Relatórios de cobertura e exportação em PDF."
              href="/admin/ferias"
              stats={{
                label: 'solicitações pendentes',
                value: 3,
                variant: 'warning',
              }}
            />
          </div>
        </div>

        {/* Quick Stats */}
        <div>
          <h3 className="text-lg font-bold text-slate-900 mb-6 uppercase tracking-wide">Resumo Operacional</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="bg-white border-2 border-slate-200 p-8">
              <div className="flex items-center justify-between mb-4">
                <p className="text-sm font-bold text-slate-600 uppercase tracking-wide">Patrimônio Total</p>
                <Package size={24} className="text-slate-400" strokeWidth={2} />
              </div>
              <p className="text-4xl font-bold text-slate-900 mb-2">247</p>
              <p className="text-sm text-slate-600 font-medium">+12 itens adicionados este mês</p>
            </div>

            <div className="bg-white border-2 border-slate-200 p-8">
              <div className="flex items-center justify-between mb-4">
                <p className="text-sm font-bold text-slate-600 uppercase tracking-wide">Férias Aprovadas</p>
                <Calendar size={24} className="text-slate-400" strokeWidth={2} />
              </div>
              <p className="text-4xl font-bold text-slate-900 mb-2">18</p>
              <p className="text-sm text-slate-600 font-medium">Referente ao ano corrente</p>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t-2 border-slate-200 mt-16">
        <div className="max-w-7xl mx-auto px-8 py-6">
          <p className="text-sm text-slate-600 text-center">
            Sistema Interno de Gestão do Fórum • Versão 1.0 • {new Date().getFullYear()}
          </p>
        </div>
      </footer>
    </div>
  );
};

export default AdminHome;