// ============================================================
// componentes/importacao/EtapaRevisao.tsx
// Etapa 4: Revisão e edição dos registros antes da importação
// ============================================================

'use client';

import React, { useState, useMemo } from 'react';
import {
  CheckCircle, AlertTriangle, AlertCircle, Copy, Trash2,
  Edit3, Save, X, Filter,
} from 'lucide-react';
import type { RegistroImportado, StatusRegistro, MapeamentoColuna, CampoSistema } from '../../types/importacao';
import { CAMPOS_SISTEMA } from '../../types/importacao';

interface EtapaRevisaoProps {
  registros: RegistroImportado[];
  mapeamento: MapeamentoColuna[];
  colunasVisiveis: CampoSistema[] | null; // null = mostrar todas
  registrosSelecionados: number;
  onToggle: (id: string) => void;
  onSelecionarTodos: () => void;
  onDeselecionarTodos: () => void;
  onDescartar: (id: string) => void;
  onEditarCampo: (id: string, campo: string, valor: string) => void;
  onConfirmar: () => void;
  onVoltar: () => void;
}

const ICONE_STATUS: Record<StatusRegistro, React.ReactNode> = {
  valido:     <CheckCircle size={14} className="text-green-500" />,
  incompleto: <AlertTriangle size={14} className="text-amber-500" />,
  duplicado:  <Copy size={14} className="text-blue-500" />,
  erro:       <AlertCircle size={14} className="text-red-500" />,
};

const COR_STATUS: Record<StatusRegistro, string> = {
  valido:     'bg-green-50',
  incompleto: 'bg-amber-50',
  duplicado:  'bg-blue-50',
  erro:       'bg-red-50',
};

export const EtapaRevisao: React.FC<EtapaRevisaoProps> = ({
  registros,
  mapeamento,
  colunasVisiveis,
  registrosSelecionados,
  onToggle,
  onSelecionarTodos,
  onDeselecionarTodos,
  onDescartar,
  onEditarCampo,
  onConfirmar,
  onVoltar,
}) => {
  const [filtroStatus, setFiltroStatus] = useState<StatusRegistro | 'todos'>('todos');
  const [editandoId, setEditandoId] = useState<string | null>(null);

  // Campos mapeados (excluindo ignorados), filtrados por visibilidade do padrão.
  // Deduplicate by campo to avoid duplicate React keys when user maps
  // two columns to the same system field.
  const camposMapeados = useMemo(() => {
    const seen = new Set<CampoSistema>();
    const result: Array<{ campo: CampoSistema; rotulo: string }> = [];

    for (const m of mapeamento) {
      if (m.campoSistema === 'ignorar') continue;
      if (colunasVisiveis && !colunasVisiveis.includes(m.campoSistema)) continue;
      if (seen.has(m.campoSistema)) continue;
      seen.add(m.campoSistema);

      const config = CAMPOS_SISTEMA.find((c) => c.campo === m.campoSistema);
      result.push({ campo: m.campoSistema, rotulo: config?.rotulo || m.campoSistema });
    }

    return result;
  }, [mapeamento, colunasVisiveis]);

  const registrosFiltrados = useMemo(() => {
    if (filtroStatus === 'todos') return registros;
    return registros.filter((r) => r.status === filtroStatus);
  }, [registros, filtroStatus]);

  const contadores = useMemo(() => ({
    todos: registros.length,
    valido: registros.filter((r) => r.status === 'valido').length,
    incompleto: registros.filter((r) => r.status === 'incompleto').length,
    duplicado: registros.filter((r) => r.status === 'duplicado').length,
    erro: registros.filter((r) => r.status === 'erro').length,
  }), [registros]);

  return (
    <div>
      <h3 className="text-lg font-bold text-slate-900 mb-2">Revisão dos Registros</h3>
      <p className="text-sm text-slate-600 mb-6">
        Revise, edite ou descarte registros antes de confirmar a importação.
        Apenas registros selecionados (✓) serão importados.
      </p>

      {/* Filtros por status */}
      <div className="flex items-center gap-2 mb-4 flex-wrap">
        <Filter size={14} className="text-slate-400" />
        {([
          { key: 'todos' as const, rotulo: 'Todos', count: contadores.todos },
          { key: 'valido' as const, rotulo: 'Válidos', count: contadores.valido },
          { key: 'incompleto' as const, rotulo: 'Incompletos', count: contadores.incompleto },
          { key: 'duplicado' as const, rotulo: 'Duplicados', count: contadores.duplicado },
          { key: 'erro' as const, rotulo: 'Erros', count: contadores.erro },
        ]).map((f) => (
          <button
            key={f.key}
            onClick={() => setFiltroStatus(f.key)}
            className={`px-3 py-1.5 text-xs font-semibold transition-colors ${
              filtroStatus === f.key
                ? 'bg-slate-900 text-white'
                : 'bg-white border-2 border-slate-200 text-slate-600 hover:border-slate-400'
            }`}
          >
            {f.rotulo} ({f.count})
          </button>
        ))}
      </div>

      {/* Ações em massa */}
      <div className="flex items-center justify-between p-3 bg-slate-50 border-2 border-slate-200 mb-4">
        <div className="flex items-center gap-3">
          <button
            onClick={onSelecionarTodos}
            className="text-xs font-semibold text-slate-600 hover:text-slate-900 underline"
          >
            Selecionar todos
          </button>
          <span className="text-slate-300">|</span>
          <button
            onClick={onDeselecionarTodos}
            className="text-xs font-semibold text-slate-600 hover:text-slate-900 underline"
          >
            Desmarcar todos
          </button>
        </div>
        <span className="text-xs font-bold text-slate-700">
          {registrosSelecionados} de {registros.length} selecionados para importação
        </span>
      </div>

      {/* Tabela de registros */}
      <div className="bg-white border-2 border-slate-200 overflow-x-auto mb-6">
        <table className="w-full text-sm border-collapse min-w-[800px]">
          <thead>
            <tr className="bg-slate-100 border-b-2 border-slate-300">
              <th className="px-3 py-3 text-left w-10">
                <span className="text-xs font-bold text-slate-500">✓</span>
              </th>
              <th className="px-3 py-3 text-left w-10">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wide">#</span>
              </th>
              <th className="px-3 py-3 text-center w-16">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wide">Status</span>
              </th>
              {camposMapeados.map((c) => (
                <th key={c.campo} className="px-3 py-3 text-left">
                  <span className="text-xs font-bold text-slate-600 uppercase tracking-wide">
                    {c.rotulo}
                  </span>
                </th>
              ))}
              <th className="px-3 py-3 text-center w-20">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wide">Ações</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {registrosFiltrados.length === 0 ? (
              <tr>
                <td colSpan={camposMapeados.length + 4} className="p-8 text-center text-slate-400">
                  Nenhum registro com este filtro
                </td>
              </tr>
            ) : (
              registrosFiltrados.map((reg) => {
                const estaEditando = editandoId === reg.id;

                return (
                  <tr
                    key={reg.id}
                    className={`border-b border-slate-100 transition-colors ${COR_STATUS[reg.status]} ${
                      !reg.selecionado ? 'opacity-60' : ''
                    }`}
                  >
                    {/* Checkbox */}
                    <td className="px-3 py-2">
                      <input
                        type="checkbox"
                        checked={reg.selecionado}
                        onChange={() => onToggle(reg.id)}
                        className="w-4 h-4 accent-slate-900"
                      />
                    </td>

                    {/* Índice */}
                    <td className="px-3 py-2 text-xs text-slate-400 font-mono">
                      {reg.indice + 2}
                    </td>

                    {/* Status */}
                    <td className="px-3 py-2 text-center" title={reg.erros.join(', ')}>
                      {ICONE_STATUS[reg.status]}
                    </td>

                    {/* Dados */}
                    {camposMapeados.map((c) => (
                      <td key={`${reg.id}-${c.campo}`} className="px-3 py-2">
                        {estaEditando ? (
                          <input
                            type="text"
                            value={reg.dados[c.campo] || ''}
                            onChange={(e) => onEditarCampo(reg.id, c.campo, e.target.value)}
                            className="w-full px-2 py-1 border-2 border-slate-300 text-xs focus:outline-none focus:border-slate-500"
                          />
                        ) : (
                          <span
                            className={`text-xs ${
                              !reg.dados[c.campo] ? 'text-slate-400 italic' : 'text-slate-800'
                            }`}
                          >
                            {reg.dados[c.campo] || '(vazio)'}
                          </span>
                        )}
                      </td>
                    ))}

                    {/* Ações */}
                    <td className="px-3 py-2">
                      <div className="flex items-center justify-center gap-1">
                        {estaEditando ? (
                          <button
                            onClick={() => setEditandoId(null)}
                            className="p-1 text-green-600 hover:bg-green-50 transition-colors"
                            title="Salvar"
                          >
                            <Save size={14} />
                          </button>
                        ) : (
                          <button
                            onClick={() => setEditandoId(reg.id)}
                            className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                            title="Editar"
                          >
                            <Edit3 size={14} />
                          </button>
                        )}
                        <button
                          onClick={() => onDescartar(reg.id)}
                          className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                          title="Descartar"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Erros visíveis */}
      {registrosFiltrados.some((r) => r.erros.length > 0 && r.status !== 'valido') && (
        <div className="mb-6 p-3 bg-amber-50 border-2 border-amber-200">
          <p className="text-xs text-amber-800">
            <strong>Dica:</strong> Registros com problemas podem ser editados diretamente na tabela
            (ícone ✎) ou descartados (ícone 🗑). Registros desmarcados não serão importados.
          </p>
        </div>
      )}

      {/* Ações finais */}
      <div className="flex gap-3">
        <button
          onClick={onVoltar}
          className="px-6 py-3 border-2 border-slate-200 hover:border-slate-400 text-slate-700 text-sm font-semibold transition-colors"
        >
          Voltar
        </button>
        <button
          onClick={onConfirmar}
          disabled={registrosSelecionados === 0}
          className={`flex-1 px-6 py-3 text-sm font-bold transition-colors ${
            registrosSelecionados > 0
              ? 'bg-slate-900 text-white hover:bg-slate-800'
              : 'bg-slate-200 text-slate-400 cursor-not-allowed'
          }`}
        >
          Confirmar Importação ({registrosSelecionados} registros)
        </button>
      </div>
    </div>
  );
};
