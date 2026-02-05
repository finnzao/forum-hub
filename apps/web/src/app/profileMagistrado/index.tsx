import React from 'react';
import { Users, ClipboardList, BarChart3, Eye, User, LogOut, TrendingUp, AlertTriangle } from 'lucide-react';

interface ModuleCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  href: string;
  stats?: {
    label: string;
    value: string | number;
    variant?: 'default' | 'warning' | 'danger' | 'success';
  };
}

const ModuleCard: React.FC<ModuleCardProps> = ({ icon, title, description, href, stats }) => {
  const getStatsColor = (variant?: string) => {
    switch (variant) {
      case 'warning':
        return 'text-amber-700 bg-amber-50 border border-amber-200';
      case 'danger':
        return 'text-red-700 bg-red-50 border border-red-200';
      case 'success':
        return 'text-green-700 bg-green-50 border border-green-200';
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

interface ServerActivityProps {
  serverName: string;
  sector: string;
  pendingTasks: number;
  completedToday: number;
  status: 'active' | 'overload' | 'idle';
}

const ServerActivity: React.FC<ServerActivityProps> = ({ 
  serverName, 
  sector, 
  pendingTasks, 
  completedToday, 
  status 
}) => {
  const getStatusColor = () => {
    switch (status) {
      case 'overload':
        return 'bg-red-100 text-red-700 border-red-200';
      case 'active':
        return 'bg-green-100 text-green-700 border-green-200';
      case 'idle':
        return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  const getStatusLabel = () => {
    switch (status) {
      case 'overload':
        return 'Sobrecarga';
      case 'active':
        return 'Normal';
      case 'idle':
        return 'Ocioso';
    }
  };

  return (
    <div className="p-4 bg-white border-2 border-slate-200">
      <div className="flex items-start justify-between mb-3">
        <div>
          <h4 className="font-bold text-slate-900">{serverName}</h4>
          <p className="text-xs text-slate-600 mt-1">{sector}</p>
        </div>
        <span className={`text-xs font-bold px-2 py-1 border ${getStatusColor()}`}>
          {getStatusLabel()}
        </span>
      </div>
      <div className="grid grid-cols-2 gap-4 text-sm">
        <div>
          <p className="text-slate-600 text-xs">Pendentes</p>
          <p className="font-bold text-slate-900">{pendingTasks}</p>
        </div>
        <div>
          <p className="text-slate-600 text-xs">Concluídas hoje</p>
          <p className="font-bold text-slate-900">{completedToday}</p>
        </div>
      </div>
    </div>
  );
};

interface PriorityProcessProps {
  processNumber: string;
  subject: string;
  assignedTo: string;
  status: string;
  priority: 'high' | 'medium' | 'low';
}

const PriorityProcess: React.FC<PriorityProcessProps> = ({
  processNumber,
  subject,
  assignedTo,
  status,
  priority,
}) => {
  const getPriorityColor = () => {
    switch (priority) {
      case 'high':
        return 'border-l-red-600 bg-red-50';
      case 'medium':
        return 'border-l-amber-600 bg-amber-50';
      case 'low':
        return 'border-l-slate-600 bg-slate-50';
    }
  };

  return (
    <div className={`p-4 border-l-4 bg-white border-r border-t border-b border-slate-200 ${getPriorityColor()}`}>
      <div className="flex items-start justify-between mb-2">
        <div>
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">{processNumber}</p>
          <h4 className="font-semibold text-slate-900 text-sm">{subject}</h4>
        </div>
      </div>
      <div className="flex items-center gap-4 text-xs text-slate-600 mt-3">
        <span>Atribuído: {assignedTo}</span>
        <span>•</span>
        <span>Status: {status}</span>
      </div>
    </div>
  );
};

const JudgeHome: React.FC = () => {
  // Dados mockados - em produção viriam da API
  const serverActivities = [
    {
      serverName: 'Maria Silva',
      sector: '1ª Vara Cível',
      pendingTasks: 12,
      completedToday: 5,
      status: 'overload' as const,
    },
    {
      serverName: 'João Santos',
      sector: '1ª Vara Cível',
      pendingTasks: 7,
      completedToday: 8,
      status: 'active' as const,
    },
    {
      serverName: 'Ana Costa',
      sector: '2ª Vara Cível',
      pendingTasks: 5,
      completedToday: 6,
      status: 'active' as const,
    },
    {
      serverName: 'Pedro Oliveira',
      sector: '2ª Vara Cível',
      pendingTasks: 3,
      completedToday: 2,
      status: 'idle' as const,
    },
  ];

  const priorityProcesses = [
    {
      processNumber: '0001234-56.2024.8.00.0001',
      subject: 'Ação de Indenização por Danos Morais',
      assignedTo: 'Maria Silva',
      status: 'Aguardando despacho',
      priority: 'high' as const,
    },
    {
      processNumber: '0007890-12.2024.8.00.0001',
      subject: 'Cumprimento de Sentença',
      assignedTo: 'João Santos',
      status: 'Em andamento',
      priority: 'high' as const,
    },
    {
      processNumber: '0005678-90.2024.8.00.0001',
      subject: 'Ação de Cobrança',
      assignedTo: 'Ana Costa',
      status: 'Revisão pendente',
      priority: 'medium' as const,
    },
  ];

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-slate-900 border-b-4 border-slate-700">
        <div className="max-w-7xl mx-auto px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-white tracking-tight">FORUM HUB</h1>
              <p className="text-sm text-slate-300 mt-1 font-medium">Magistrado</p>
            </div>
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-4 pr-6 border-r border-slate-700">
                <div className="w-10 h-10 bg-slate-700 text-white flex items-center justify-center font-bold text-sm">
                  <User size={20} />
                </div>
                <div>
                  <p className="text-sm font-semibold text-white">Dr. João Magistrado</p>
                  <p className="text-xs text-slate-400">1ª e 2ª Vara Cível</p>
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
            Painel de Orquestração
          </h2>
          <p className="text-slate-600 text-base leading-relaxed max-w-3xl">
            Gerencie tarefas do cartório, acompanhe a execução e tome decisões estratégicas com base em dados consolidados.
          </p>
        </div>

        {/* Module Cards */}
        <div className="mb-12">
          <h3 className="text-lg font-bold text-slate-900 mb-6 uppercase tracking-wide">Módulos do Sistema</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <ModuleCard
              icon={<ClipboardList size={28} strokeWidth={2} />}
              title="Atribuição de Tarefas"
              description="Crie e priorize tarefas para o cartório. Distribua trabalho e defina prazos."
              href="/magistrado/tarefas"
              stats={{
                label: 'tarefas ativas',
                value: 27,
                variant: 'default',
              }}
            />
            <ModuleCard
              icon={<Users size={28} strokeWidth={2} />}
              title="Acompanhamento"
              description="Monitore a execução do trabalho do cartório. Visualize carga e produtividade."
              href="/magistrado/acompanhamento"
              stats={{
                label: 'servidores ativos',
                value: 8,
                variant: 'success',
              }}
            />
            <ModuleCard
              icon={<BarChart3 size={28} strokeWidth={2} />}
              title="Relatórios"
              description="Acesse dashboards consolidados e relatórios para tomada de decisão."
              href="/magistrado/relatorios"
              stats={{
                label: 'processos em análise',
                value: 156,
                variant: 'default',
              }}
            />
          </div>
        </div>

        {/* Quick Stats */}
        <div className="mb-12">
          <h3 className="text-lg font-bold text-slate-900 mb-6 uppercase tracking-wide">Visão Consolidada</h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div className="bg-white border-2 border-slate-200 p-8">
              <div className="flex items-center justify-between mb-4">
                <p className="text-sm font-bold text-slate-600 uppercase tracking-wide">Tarefas Pendentes</p>
                <ClipboardList size={24} className="text-slate-400" strokeWidth={2} />
              </div>
              <p className="text-4xl font-bold text-slate-900 mb-2">27</p>
              <p className="text-sm text-slate-600 font-medium">Distribuídas ao cartório</p>
            </div>

            <div className="bg-white border-2 border-slate-200 p-8">
              <div className="flex items-center justify-between mb-4">
                <p className="text-sm font-bold text-slate-600 uppercase tracking-wide">Concluídas Hoje</p>
                <TrendingUp size={24} className="text-slate-400" strokeWidth={2} />
              </div>
              <p className="text-4xl font-bold text-slate-900 mb-2">21</p>
              <p className="text-sm text-slate-600 font-medium">Média de 2,6 por servidor</p>
            </div>

            <div className="bg-white border-2 border-slate-200 p-8">
              <div className="flex items-center justify-between mb-4">
                <p className="text-sm font-bold text-slate-600 uppercase tracking-wide">Processos Ativos</p>
                <Eye size={24} className="text-slate-400" strokeWidth={2} />
              </div>
              <p className="text-4xl font-bold text-slate-900 mb-2">156</p>
              <p className="text-sm text-slate-600 font-medium">Em acompanhamento</p>
            </div>

            <div className="bg-white border-2 border-slate-200 p-8">
              <div className="flex items-center justify-between mb-4">
                <p className="text-sm font-bold text-slate-600 uppercase tracking-wide">Taxa de Conclusão</p>
                <BarChart3 size={24} className="text-slate-400" strokeWidth={2} />
              </div>
              <p className="text-4xl font-bold text-slate-900 mb-2">87%</p>
              <p className="text-sm text-green-600 font-medium">+5% vs semana anterior</p>
            </div>
          </div>
        </div>

        {/* Server Activities and Priority Processes */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Server Activities */}
          <div>
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold text-slate-900 uppercase tracking-wide">Carga de Trabalho</h3>
              <a href="/magistrado/acompanhamento" className="text-sm text-slate-600 hover:text-slate-900 font-semibold">
                Ver detalhes →
              </a>
            </div>
            <div className="space-y-3 mb-6">
              {serverActivities.map((activity, index) => (
                <ServerActivity key={index} {...activity} />
              ))}
            </div>
            <div className="p-4 bg-amber-50 border-2 border-amber-200 flex items-start gap-3">
              <AlertTriangle size={20} className="text-amber-700 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-amber-900">Atenção à distribuição</p>
                <p className="text-xs text-amber-800 mt-1">
                  Maria Silva possui carga elevada (12 tarefas). Considere redistribuir para equilibrar.
                </p>
              </div>
            </div>
          </div>

          {/* Priority Processes */}
          <div>
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold text-slate-900 uppercase tracking-wide">Processos Prioritários</h3>
              <a href="/magistrado/processos" className="text-sm text-slate-600 hover:text-slate-900 font-semibold">
                Ver todos →
              </a>
            </div>
            <div className="space-y-3">
              {priorityProcesses.map((process, index) => (
                <PriorityProcess key={index} {...process} />
              ))}
            </div>
          </div>
        </div>

        {/* Access Notice */}
        <div className="mt-12 p-6 bg-slate-100 border-2 border-slate-300">
          <div className="flex items-start gap-4">
            <Eye size={24} className="text-slate-600 flex-shrink-0 mt-1" strokeWidth={2} />
            <div>
              <h4 className="font-bold text-slate-900 mb-2">Acesso Global de Leitura</h4>
              <p className="text-sm text-slate-700 leading-relaxed">
                Como magistrado, você possui acesso de leitura a todos os módulos do sistema, incluindo Inventário, Férias e demais controles administrativos. 
                Todas as consultas são registradas para fins de auditoria e rastreabilidade institucional.
              </p>
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

export default JudgeHome;