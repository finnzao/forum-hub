// ============================================================
// app/componentes/tabelas/LinhaDoTempo.tsx
// Componente de linha do tempo agrupada por processo
// Mostra todos os registros de um processo em ordem cronológica
// ============================================================

import React from 'react';
import { RegistroAtividade, CATEGORIAS_ACAO, STATUS_LABELS, StatusRegistro } from '../../../tipos/historico';
import { Distintivo } from '../cartoes/Distintivo';
import { Bell, Clock, FileText } from 'lucide-react';
import { EstadoVazio } from '../layout/EstadoVazio';

interface LinhaDoTempoProps {
  registros: RegistroAtividade[];
}

const VARIANTE_STATUS: Record<StatusRegistro, 'sucesso' | 'aviso' | 'neutro'> = {
  concluido: 'sucesso',
  em_andamento: 'aviso',
  pendente: 'neutro',
};

export function LinhaDoTempo({ registros }: LinhaDoTempoProps) {
  if (registros.length === 0) {
    return <EstadoVazio />;
  }

  // Agrupar por processo
  const porProcesso = registros.reduce<Record<string, RegistroAtividade[]>>((acc, reg) => {
    if (!acc[reg.numeroProcesso]) acc[reg.numeroProcesso] = [];
    acc[reg.numeroProcesso].push(reg);
    return acc;
  }, {});

  return (
    <div className="space-y-8">
      {Object.entries(porProcesso).map(([processo, regs]) => (
        <div key={processo} className="bg-white border-2 border-slate-200">
          {/* Cabeçalho do processo */}
          <div className="p-4 border-b-2 border-slate-200 bg-slate-50 flex items-center gap-3">
            <FileText size={18} className="text-slate-600" />
            <div>
              <p className="text-sm font-mono font-bold text-slate-900">{processo}</p>
              <p className="text-xs text-slate-500">{regs[0].partes}</p>
            </div>
            <span className="ml-auto text-xs font-semibold text-slate-500 bg-slate-200 px-2 py-1">
              {regs.length} atividade{regs.length !== 1 ? 's' : ''}
            </span>
          </div>

          {/* Timeline */}
          <div className="p-4">
            <div className="relative pl-8">
              {/* Linha vertical */}
              <div className="absolute left-3 top-2 bottom-2 w-0.5 bg-slate-200" />

              {regs.map((reg, idx) => (
                <div key={reg.id} className="relative mb-6 last:mb-0">
                  {/* Ponto na timeline */}
                  <div className={`absolute -left-5 top-1.5 w-3 h-3 rounded-full border-2 border-white ${
                    reg.status === 'concluido' ? 'bg-emerald-500' : reg.status === 'em_andamento' ? 'bg-amber-500' : 'bg-slate-400'
                  }`} />

                  {/* Conteúdo */}
                  <div className="pl-4">
                    <div className="flex items-center gap-3 mb-1">
                      <span className="text-xs font-semibold text-slate-500">
                        {reg.data} • {reg.hora}
                      </span>
                      <Distintivo
                        rotulo={CATEGORIAS_ACAO[reg.categoriaAcao]}
                        variante="info"
                        comPonto={false}
                        tamanho="sm"
                      />
                      <Distintivo
                        rotulo={STATUS_LABELS[reg.status]}
                        variante={VARIANTE_STATUS[reg.status]}
                        tamanho="sm"
                      />
                    </div>
                    <p className="text-sm text-slate-800 leading-relaxed">
                      {reg.descricaoAcao}
                    </p>
                    {reg.observacao && (
                      <p className="text-xs text-slate-500 mt-1 italic">
                        Obs: {reg.observacao}
                      </p>
                    )}
                    {reg.temLembrete && (
                      <div className="inline-flex items-center gap-1.5 mt-2 text-xs text-amber-700 bg-amber-50 px-2 py-1 border border-amber-200">
                        <Bell size={12} />
                        <span>Lembrete: {reg.dataLembrete} — {reg.descricaoLembrete}</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
