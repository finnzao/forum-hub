import React from 'react';
import { CheckSquare, Clock, FileText, User, LogOut, AlertCircle } from 'lucide-react';

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

interface TaskItemProps {
  processNumber: string;
  title: string;
  priority: 'high' | 'medium' | 'low';
  dueDate: string;
  assignedBy: string;
}

const TaskItem: React.FC<TaskItemProps> = ({ processNumber, title, priority, dueDate, assignedBy }) => {
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

  const getPriorityLabel = () => {
    switch (priority) {
      case 'high':
        return 'Alta';
      case 'medium':
        return 'Média';
      case 'low':
        return 'Baixa';
    }
  };

  return (
    <div className={`p-4 border-l-4 bg-white border-r border-t border-b border-slate-200 ${getPriorityColor()}`}>
      <div className="flex items-start justify-between mb-2">
        <div>
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">{processNumber}</p>
          <h4 className="font-semibold text-slate-900">{title}</h4>
        </div>
        <span className={`text-xs font-bold px-2 py-1 ${priority === 'high' ? 'text-red-700 bg-red-100' : priority === 'medium' ? 'text-amber-700 bg-amber-100' : 'text-slate-700 bg-slate-100'}`}>
          {getPriorityLabel()}
        </span>
      </div>
      <div className="flex items-center gap-4 text-xs text-slate-600 mt-3">
        <span className="flex items-center gap-1">
          <Clock size={12} />
          Prazo: {dueDate}
        </span>
        <span>•</span>
        <span>Atribuído por: {assignedBy}</span>
      </div>
    </div>
  );
};

interface ReminderItemProps {
  processNumber: string;
  description: string;
  dueDate: string;
  daysRemaining: number;
}

const ReminderItem: React.FC<ReminderItemProps> = ({ processNumber, description, dueDate, daysRemaining }) => {
  const getUrgencyColor = () => {
    if (daysRemaining <= 3) return 'border-l-red-600 bg-red-50';
    if (daysRemaining <= 7) return 'border-l-amber-600 bg-amber-50';
    return 'border-l-slate-600 bg-slate-50';
  };

  return (
    <div className={`p-4 border-l-4 bg-white border-r border-t border-b border-slate-200 ${getUrgencyColor()}`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">{processNumber}</p>
          <h4 className="font-medium text-slate-900 text-sm">{description}</h4>
        </div>
        <div className="text-right">
          <p className="text-xs font-bold text-slate-700">{daysRemaining} dias</p>
          <p className="text-xs text-slate-500">{dueDate}</p>
        </div>
      </div>
    </div>
  );
};

const ServerHome: React.FC = () => {
  // Dados mockados - em produção viriam da API
  const pendingTasks = [
    {
      processNumber: '0001234-56.2024.8.00.0001',
      title: 'Minutar despacho de citação',
      priority: 'high' as const,
      dueDate: '08/02/2026',
      assignedBy: 'Dr. João Magistrado',
    },
    {
      processNumber: '0007890-12.2024.8.00.0001',
      title: 'Elaborar relatório de cumprimento de sentença',
      priority: 'medium' as const,
      dueDate: '12/02/2026',
      assignedBy: 'Dr. João Magistrado',
    },
    {
      processNumber: '0005678-90.2024.8.00.0001',
      title: 'Revisar petição inicial',
      priority: 'low' as const,
      dueDate: '15/02/2026',
      assignedBy: 'Dr. João Magistrado',
    },
  ];

  const upcomingReminders = [
    {
      processNumber: '0001234-56.2024.8.00.0001',
      description: 'Prazo para manifestação da parte',
      dueDate: '07/02/2026',
      daysRemaining: 2,
    },
    {
      processNumber: '0002345-67.2024.8.00.0001',
      description: 'Audiência de conciliação',
      dueDate: '10/02/2026',
      daysRemaining: 5,
    },
    {
      processNumber: '0003456-78.2024.8.00.0001',
      description: 'Prazo para juntada de documentos',
      dueDate: '18/02/2026',
      daysRemaining: 13,
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
              <p className="text-sm text-slate-300 mt-1 font-medium">Cartório / Servidor</p>
            </div>
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-4 pr-6 border-r border-slate-700">
                <div className="w-10 h-10 bg-slate-700 text-white flex items-center justify-center font-bold text-sm">
                  <User size={20} />
                </div>
                <div>
                  <p className="text-sm font-semibold text-white">Maria Silva</p>
                  <p className="text-xs text-slate-400">Setor Cível - 1ª Vara</p>
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
            Painel Operacional
          </h2>
          <p className="text-slate-600 text-base leading-relaxed max-w-3xl">
            Gerencie suas tarefas, registre o histórico de trabalho e acompanhe prazos processuais com rastreabilidade completa.
          </p>
        </div>

        {/* Module Cards */}
        <div className="mb-12">
          <h3 className="text-lg font-bold text-slate-900 mb-6 uppercase tracking-wide">Módulos do Sistema</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <ModuleCard
              icon={<CheckSquare size={28} strokeWidth={2} />}
              title="Tarefas"
              description="Visualize e execute tarefas atribuídas pelo magistrado. Controle de status e histórico auditável."
              href="/servidor/tarefas"
              stats={{
                label: 'pendentes',
                value: 8,
                variant: 'warning',
              }}
            />
            <ModuleCard
              icon={<FileText size={28} strokeWidth={2} />}
              title="Histórico de Trabalho"
              description="Registre todas as atividades realizadas por processo. Linha do tempo completa e auditada."
              href="/servidor/historico"
              stats={{
                label: 'registros este mês',
                value: 47,
                variant: 'success',
              }}
            />
            <ModuleCard
              icon={<Clock size={28} strokeWidth={2} />}
              title="Lembretes de Prazos"
              description="Controle prazos processuais com notificações. Vinculação direta aos processos."
              href="/servidor/lembretes"
              stats={{
                label: 'próximos 7 dias',
                value: 5,
                variant: 'danger',
              }}
            />
          </div>
        </div>

        {/* Quick Stats */}
        <div className="mb-12">
          <h3 className="text-lg font-bold text-slate-900 mb-6 uppercase tracking-wide">Resumo Operacional</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-white border-2 border-slate-200 p-8">
              <div className="flex items-center justify-between mb-4">
                <p className="text-sm font-bold text-slate-600 uppercase tracking-wide">Tarefas Pendentes</p>
                <CheckSquare size={24} className="text-slate-400" strokeWidth={2} />
              </div>
              <p className="text-4xl font-bold text-slate-900 mb-2">8</p>
              <p className="text-sm text-slate-600 font-medium">3 de alta prioridade</p>
            </div>

            <div className="bg-white border-2 border-slate-200 p-8">
              <div className="flex items-center justify-between mb-4">
                <p className="text-sm font-bold text-slate-600 uppercase tracking-wide">Prazos Próximos</p>
                <Clock size={24} className="text-slate-400" strokeWidth={2} />
              </div>
              <p className="text-4xl font-bold text-slate-900 mb-2">5</p>
              <p className="text-sm text-slate-600 font-medium">Nos próximos 7 dias</p>
            </div>

            <div className="bg-white border-2 border-slate-200 p-8">
              <div className="flex items-center justify-between mb-4">
                <p className="text-sm font-bold text-slate-600 uppercase tracking-wide">Registros Hoje</p>
                <FileText size={24} className="text-slate-400" strokeWidth={2} />
              </div>
              <p className="text-4xl font-bold text-slate-900 mb-2">12</p>
              <p className="text-sm text-slate-600 font-medium">Em 8 processos diferentes</p>
            </div>
          </div>
        </div>

        {/* Tasks and Reminders Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Pending Tasks */}
          <div>
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold text-slate-900 uppercase tracking-wide">Tarefas Urgentes</h3>
              <a href="/servidor/tarefas" className="text-sm text-slate-600 hover:text-slate-900 font-semibold">
                Ver todas →
              </a>
            </div>
            <div className="space-y-3">
              {pendingTasks.map((task, index) => (
                <TaskItem key={index} {...task} />
              ))}
            </div>
          </div>

          {/* Upcoming Reminders */}
          <div>
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold text-slate-900 uppercase tracking-wide">Prazos Próximos</h3>
              <a href="/servidor/lembretes" className="text-sm text-slate-600 hover:text-slate-900 font-semibold">
                Ver todos →
              </a>
            </div>
            <div className="space-y-3">
              {upcomingReminders.map((reminder, index) => (
                <ReminderItem key={index} {...reminder} />
              ))}
            </div>
            <div className="mt-6 p-4 bg-amber-50 border-2 border-amber-200 flex items-start gap-3">
              <AlertCircle size={20} className="text-amber-700 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-amber-900">Atenção aos prazos</p>
                <p className="text-xs text-amber-800 mt-1">
                  Você possui 2 lembretes com vencimento em menos de 3 dias.
                </p>
              </div>
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

export default ServerHome;