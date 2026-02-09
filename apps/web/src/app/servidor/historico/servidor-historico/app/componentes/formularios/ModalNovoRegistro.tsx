// ============================================================
// app/componentes/formularios/ModalNovoRegistro.tsx
// Modal para cadastro de novo registro de atividade
// Similar a uma planilha Excel mas com UX aprimorada
// ============================================================

'use client';

import React, { useState } from 'react';
import { X, Bell, Save, AlertCircle } from 'lucide-react';
import { CategoriaAcao, StatusRegistro, CATEGORIAS_ACAO, STATUS_LABELS } from '../../../tipos/historico';

interface DadosFormulario {
  numeroProcesso: string;
  partes: string;
  categoriaAcao: CategoriaAcao;
  descricaoAcao: string;
  observacao: string;
  status: StatusRegistro;
  temLembrete: boolean;
  dataLembrete: string;
  descricaoLembrete: string;
}

interface ModalNovoRegistroProps {
  aberto: boolean;
  onFechar: () => void;
  onSalvar: (dados: DadosFormulario) => void;
}

const ESTADO_INICIAL: DadosFormulario = {
  numeroProcesso: '',
  partes: '',
  categoriaAcao: 'despacho',
  descricaoAcao: '',
  observacao: '',
  status: 'concluido',
  temLembrete: false,
  dataLembrete: '',
  descricaoLembrete: '',
};

export function ModalNovoRegistro({ aberto, onFechar, onSalvar }: ModalNovoRegistroProps) {
  const [dados, setDados] = useState<DadosFormulario>(ESTADO_INICIAL);
  const [erros, setErros] = useState<Partial<Record<keyof DadosFormulario, string>>>({});

  if (!aberto) return null;

  const atualizar = <K extends keyof DadosFormulario>(campo: K, valor: DadosFormulario[K]) => {
    setDados((prev) => ({ ...prev, [campo]: valor }));
    if (erros[campo]) {
      setErros((prev) => {
        const novos = { ...prev };
        delete novos[campo];
        return novos;
      });
    }
  };

  const validar = (): boolean => {
    const novosErros: Partial<Record<keyof DadosFormulario, string>> = {};

    if (!dados.numeroProcesso.trim()) {
      novosErros.numeroProcesso = 'Número do processo é obrigatório';
    }
    if (!dados.descricaoAcao.trim()) {
      novosErros.descricaoAcao = 'Descrição da ação é obrigatória';
    }
    if (dados.temLembrete && !dados.dataLembrete) {
      novosErros.dataLembrete = 'Data do lembrete é obrigatória quando lembrete está ativo';
    }

    setErros(novosErros);
    return Object.keys(novosErros).length === 0;
  };

  const handleSalvar = () => {
    if (validar()) {
      onSalvar(dados);
      setDados(ESTADO_INICIAL);
      setErros({});
    }
  };

  const handleFechar = () => {
    setDados(ESTADO_INICIAL);
    setErros({});
    onFechar();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Overlay */}
      <div className="absolute inset-0 bg-slate-900/60" onClick={handleFechar} />

      {/* Modal */}
      <div className="relative bg-white w-full max-w-2xl max-h-[90vh] overflow-y-auto mx-4 border-2 border-slate-900 shadow-[8px_8px_0px_0px_rgba(15,23,42,1)]">
        {/* Cabeçalho */}
        <div className="flex items-center justify-between p-5 border-b-2 border-slate-200">
          <h2 className="text-lg font-bold text-slate-900 uppercase tracking-wide">
            Novo Registro de Atividade
          </h2>
          <button
            onClick={handleFechar}
            className="p-1.5 text-slate-400 hover:text-slate-900 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Corpo do formulário */}
        <div className="p-5 space-y-5">
          {/* Processo e Partes - similar às colunas do Excel */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <CampoFormulario
              rotulo="Nº do Processo *"
              erro={erros.numeroProcesso}
            >
              <input
                type="text"
                placeholder="0000000-00.0000.0.00.0000"
                value={dados.numeroProcesso}
                onChange={(e) => atualizar('numeroProcesso', e.target.value)}
                className={`w-full px-3 py-2.5 border-2 text-sm ${erros.numeroProcesso ? 'border-red-400' : 'border-slate-200'} focus:outline-none focus:border-slate-900 transition-colors font-mono`}
              />
            </CampoFormulario>

            <CampoFormulario rotulo="Partes">
              <input
                type="text"
                placeholder="Autor vs. Réu"
                value={dados.partes}
                onChange={(e) => atualizar('partes', e.target.value)}
                className="w-full px-3 py-2.5 border-2 border-slate-200 text-sm focus:outline-none focus:border-slate-900 transition-colors"
              />
            </CampoFormulario>
          </div>

          {/* Categoria e Status */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <CampoFormulario rotulo="Categoria da Ação *">
              <select
                value={dados.categoriaAcao}
                onChange={(e) => atualizar('categoriaAcao', e.target.value as CategoriaAcao)}
                className="w-full px-3 py-2.5 border-2 border-slate-200 text-sm focus:outline-none focus:border-slate-900 transition-colors bg-white"
              >
                {Object.entries(CATEGORIAS_ACAO).map(([valor, rotulo]) => (
                  <option key={valor} value={valor}>{rotulo}</option>
                ))}
              </select>
            </CampoFormulario>

            <CampoFormulario rotulo="Status">
              <select
                value={dados.status}
                onChange={(e) => atualizar('status', e.target.value as StatusRegistro)}
                className="w-full px-3 py-2.5 border-2 border-slate-200 text-sm focus:outline-none focus:border-slate-900 transition-colors bg-white"
              >
                {Object.entries(STATUS_LABELS).map(([valor, rotulo]) => (
                  <option key={valor} value={valor}>{rotulo}</option>
                ))}
              </select>
            </CampoFormulario>
          </div>

          {/* Descrição da ação */}
          <CampoFormulario
            rotulo="Descrição da Ação *"
            erro={erros.descricaoAcao}
          >
            <textarea
              rows={3}
              placeholder="Descreva detalhadamente a ação realizada no processo..."
              value={dados.descricaoAcao}
              onChange={(e) => atualizar('descricaoAcao', e.target.value)}
              className={`w-full px-3 py-2.5 border-2 text-sm ${erros.descricaoAcao ? 'border-red-400' : 'border-slate-200'} focus:outline-none focus:border-slate-900 transition-colors resize-none`}
            />
          </CampoFormulario>

          {/* Observação */}
          <CampoFormulario rotulo="Observação">
            <textarea
              rows={2}
              placeholder="Observações adicionais (opcional)..."
              value={dados.observacao}
              onChange={(e) => atualizar('observacao', e.target.value)}
              className="w-full px-3 py-2.5 border-2 border-slate-200 text-sm focus:outline-none focus:border-slate-900 transition-colors resize-none"
            />
          </CampoFormulario>

          {/* Separador para lembrete */}
          <div className="border-t-2 border-slate-100 pt-5">
            <div className="flex items-center gap-3 mb-4">
              <button
                type="button"
                onClick={() => atualizar('temLembrete', !dados.temLembrete)}
                className={`relative w-11 h-6 rounded-full transition-colors ${dados.temLembrete ? 'bg-slate-900' : 'bg-slate-300'}`}
              >
                <span
                  className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform shadow-sm ${dados.temLembrete ? 'translate-x-5' : ''}`}
                />
              </button>
              <div className="flex items-center gap-2">
                <Bell size={16} className="text-slate-600" />
                <span className="text-sm font-semibold text-slate-700">
                  Criar lembrete de prazo
                </span>
              </div>
            </div>

            {dados.temLembrete && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pl-14">
                <CampoFormulario
                  rotulo="Data do Lembrete *"
                  erro={erros.dataLembrete}
                >
                  <input
                    type="date"
                    value={dados.dataLembrete}
                    onChange={(e) => atualizar('dataLembrete', e.target.value)}
                    className={`w-full px-3 py-2.5 border-2 text-sm ${erros.dataLembrete ? 'border-red-400' : 'border-slate-200'} focus:outline-none focus:border-slate-900 transition-colors`}
                  />
                </CampoFormulario>

                <CampoFormulario rotulo="Descrição do Lembrete">
                  <input
                    type="text"
                    placeholder="Ex: Verificar resposta..."
                    value={dados.descricaoLembrete}
                    onChange={(e) => atualizar('descricaoLembrete', e.target.value)}
                    className="w-full px-3 py-2.5 border-2 border-slate-200 text-sm focus:outline-none focus:border-slate-900 transition-colors"
                  />
                </CampoFormulario>
              </div>
            )}
          </div>
        </div>

        {/* Rodapé com ações */}
        <div className="flex items-center justify-between p-5 border-t-2 border-slate-200 bg-slate-50">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <AlertCircle size={14} />
            <span>Campos marcados com * são obrigatórios</span>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleFechar}
              className="px-4 py-2.5 text-sm font-semibold text-slate-600 hover:text-slate-900 border-2 border-slate-200 hover:border-slate-400 transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={handleSalvar}
              className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-bold text-white bg-slate-900 hover:bg-slate-800 transition-colors"
            >
              <Save size={16} />
              Salvar Registro
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// Sub-componente reutilizável para campo de formulário
// ============================================================

function CampoFormulario({
  rotulo,
  erro,
  children,
}: {
  rotulo: string;
  erro?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">
        {rotulo}
      </label>
      {children}
      {erro && (
        <span className="text-xs text-red-600 font-medium">{erro}</span>
      )}
    </div>
  );
}
