// ============================================================
// componentes/importacao/SeletorPadroes.tsx
// UI para carregar, salvar e gerenciar padrões de mapeamento
// ============================================================

'use client';

import React, { useState } from 'react';
import {
  BookmarkPlus, FolderOpen, Trash2, X, Save,
  ChevronDown, ChevronUp, Eye, EyeOff,
} from 'lucide-react';
import type { PadraoMapeamento, MapeamentoColuna, CampoSistema } from '../../types/importacao';
import { CAMPOS_SISTEMA } from '../../types/importacao';

interface SeletorPadroesProps {
  padroes: PadraoMapeamento[];
  padraoAtivo: string | null;
  mapeamentoAtual: MapeamentoColuna[];
  onAplicarPadrao: (id: string) => void;
  onSalvarPadrao: (nome: string, descricao: string, colunasVisiveis: CampoSistema[]) => void;
  onExcluirPadrao: (id: string) => void;
  onLimparPadrao: () => void;
}

type Modo = 'fechado' | 'lista' | 'salvar';

export const SeletorPadroes: React.FC<SeletorPadroesProps> = ({
  padroes,
  padraoAtivo,
  mapeamentoAtual,
  onAplicarPadrao,
  onSalvarPadrao,
  onExcluirPadrao,
  onLimparPadrao,
}) => {
  // Estado inicial sempre 'fechado' para não poluir a tela
  const [modo, setModo] = useState<Modo>('fechado');
  const [nome, setNome] = useState('');
  const [descricao, setDescricao] = useState('');
  const [colunasVisiveis, setColunasVisiveis] = useState<CampoSistema[]>(
    () => mapeamentoAtual
      .filter((m) => m.campoSistema !== 'ignorar')
      .map((m) => m.campoSistema)
  );
  const [confirmandoExclusao, setConfirmandoExclusao] = useState<string | null>(null);

  const camposMapeados = mapeamentoAtual.filter((m) => m.campoSistema !== 'ignorar');

  const toggleColunaVisivel = (campo: CampoSistema) => {
    setColunasVisiveis((prev) =>
      prev.includes(campo) ? prev.filter((c) => c !== campo) : [...prev, campo]
    );
  };

  const handleSalvar = () => {
    if (!nome.trim()) return;
    onSalvarPadrao(nome.trim(), descricao.trim(), colunasVisiveis);
    setNome('');
    setDescricao('');
    setModo('lista');
  };

  const handleExcluir = (id: string) => {
    onExcluirPadrao(id);
    setConfirmandoExclusao(null);
    if (padraoAtivo === id) onLimparPadrao();
  };

  const padraoAtivoObj = padroes.find((p) => p.id === padraoAtivo);

  return (
    <div className="mb-6">
      {/* Barra principal */}
      <div className="flex items-center gap-2 p-3 bg-slate-50 border-2 border-slate-200">
        {/* Indicador de padrão ativo */}
        {padraoAtivoObj ? (
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <FolderOpen size={14} className="text-blue-600 flex-shrink-0" />
            <span className="text-xs font-bold text-blue-700 truncate">
              Padrão: {padraoAtivoObj.nome}
            </span>
            <button
              onClick={onLimparPadrao}
              className="text-xs text-slate-400 hover:text-slate-600 flex-shrink-0"
              title="Voltar ao mapeamento automático"
            >
              <X size={12} />
            </button>
          </div>
        ) : (
          <span className="text-xs text-slate-500 flex-1">
            {padroes.length > 0
              ? 'Mapeamento automático — ou selecione um padrão salvo'
              : 'Mapeamento automático'}
          </span>
        )}

        {/* Botões */}
        <div className="flex items-center gap-1 flex-shrink-0">
          {padroes.length > 0 && (
            <button
              onClick={() => setModo(modo === 'lista' ? 'fechado' : 'lista')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold transition-colors ${
                modo === 'lista'
                  ? 'bg-slate-900 text-white'
                  : 'bg-white border border-slate-300 text-slate-700 hover:border-slate-400'
              }`}
            >
              <FolderOpen size={12} />
              Meus Padrões ({padroes.length})
              {modo === 'lista' ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
            </button>
          )}
          <button
            onClick={() => {
              setColunasVisiveis(camposMapeados.map((m) => m.campoSistema));
              setModo(modo === 'salvar' ? 'fechado' : 'salvar');
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold transition-colors ${
              modo === 'salvar'
                ? 'bg-slate-900 text-white'
                : 'bg-white border border-slate-300 text-slate-700 hover:border-slate-400'
            }`}
          >
            <BookmarkPlus size={12} />
            Salvar Padrão
          </button>
        </div>
      </div>

      {/* Painel: Lista de padrões */}
      {modo === 'lista' && (
        <div className="border-2 border-t-0 border-slate-200 bg-white">
          {/* Lista com altura fixa e scroll */}
          <div className="max-h-64 overflow-y-auto divide-y divide-slate-100">
            {padroes.map((padrao) => {
              const ativo = padraoAtivo === padrao.id;
              const confirmando = confirmandoExclusao === padrao.id;

              return (
                <div
                  key={padrao.id}
                  className={`p-3 transition-colors ${ativo ? 'bg-blue-50' : 'hover:bg-slate-50'}`}
                >
                  {confirmando ? (
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-red-700 font-semibold">
                        Excluir &ldquo;{padrao.nome}&rdquo;?
                      </span>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleExcluir(padrao.id)}
                          className="px-3 py-1 text-xs font-bold text-white bg-red-600 hover:bg-red-700 transition-colors"
                        >
                          Confirmar
                        </button>
                        <button
                          onClick={() => setConfirmandoExclusao(null)}
                          className="px-3 py-1 text-xs text-slate-500 hover:text-slate-700"
                        >
                          Cancelar
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-start gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-sm font-bold text-slate-900 truncate">
                            {padrao.nome}
                          </span>
                          {ativo && (
                            <span className="text-[10px] font-bold px-1.5 py-0.5 bg-blue-100 text-blue-700">
                              ATIVO
                            </span>
                          )}
                        </div>
                        {padrao.descricao && (
                          <p className="text-xs text-slate-500 truncate mb-1">{padrao.descricao}</p>
                        )}
                        <div className="flex items-center gap-3 text-[10px] text-slate-400">
                          <span>{padrao.regras.length} regras</span>
                          <span>•</span>
                          <span>{padrao.colunasVisiveis.length} colunas visíveis</span>
                          <span>•</span>
                          <span>por {padrao.criadoPor}</span>
                          <span>•</span>
                          <span>{new Date(padrao.atualizadoEm).toLocaleDateString('pt-BR')}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        {!ativo && (
                          <button
                            onClick={() => onAplicarPadrao(padrao.id)}
                            className="px-3 py-1.5 text-xs font-semibold bg-slate-900 text-white hover:bg-slate-800 transition-colors"
                          >
                            Aplicar
                          </button>
                        )}
                        <button
                          onClick={() => setConfirmandoExclusao(padrao.id)}
                          className="p-1.5 text-slate-400 hover:text-red-500 transition-colors"
                          title="Excluir"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Rodapé da lista */}
          {padroes.length > 3 && (
            <div className="px-3 py-2 border-t border-slate-100 bg-slate-50">
              <p className="text-[10px] text-slate-400 text-center">
                {padroes.length} padrão(ões) salvo(s) — role para ver todos
              </p>
            </div>
          )}
        </div>
      )}

      {/* Painel: Salvar novo padrão */}
      {modo === 'salvar' && (
        <div className="border-2 border-t-0 border-slate-200 bg-white p-4 space-y-4">
          <div>
            <label className="text-xs font-bold text-slate-600 uppercase tracking-wide mb-1 block">
              Nome do padrão *
            </label>
            <input
              type="text"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="Ex: Planilha Exaudi Padrão, Importação TJBA..."
              className="w-full px-3 py-2 border-2 border-slate-200 text-sm focus:outline-none focus:border-slate-400"
              autoFocus
            />
          </div>

          <div>
            <label className="text-xs font-bold text-slate-600 uppercase tracking-wide mb-1 block">
              Descrição (opcional)
            </label>
            <input
              type="text"
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              placeholder="Breve descrição do uso deste padrão..."
              className="w-full px-3 py-2 border-2 border-slate-200 text-sm focus:outline-none focus:border-slate-400"
            />
          </div>

          {/* Seleção de colunas visíveis */}
          <div>
            <label className="text-xs font-bold text-slate-600 uppercase tracking-wide mb-2 block">
              Colunas visíveis na revisão
            </label>
            <p className="text-xs text-slate-500 mb-3">
              Escolha quais campos serão exibidos na tela de revisão ao usar este padrão.
              Campos desmarcados ficam ocultos (mas os dados permanecem importados).
            </p>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {camposMapeados.map((m) => {
                const config = CAMPOS_SISTEMA.find((c) => c.campo === m.campoSistema);
                if (!config) return null;
                const ativo = colunasVisiveis.includes(m.campoSistema);

                return (
                  <button
                    key={m.campoSistema}
                    type="button"
                    onClick={() => toggleColunaVisivel(m.campoSistema)}
                    className={`flex items-center gap-2 px-3 py-2 text-xs font-medium transition-colors text-left ${
                      ativo
                        ? 'bg-slate-900 text-white'
                        : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                    }`}
                  >
                    {ativo ? <Eye size={12} /> : <EyeOff size={12} />}
                    <span className="truncate">{config.rotulo}</span>
                  </button>
                );
              })}
            </div>
            <p className="text-xs text-slate-400 mt-2">
              {colunasVisiveis.length} de {camposMapeados.length} visíveis
            </p>
          </div>

          {/* Regras que serão salvas */}
          <div className="p-3 bg-slate-50 border border-slate-200">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">
              Regras de mapeamento que serão salvas
            </p>
            <div className="flex flex-wrap gap-1">
              {camposMapeados.map((m) => {
                const config = CAMPOS_SISTEMA.find((c) => c.campo === m.campoSistema);
                return (
                  <span
                    key={m.colunaOriginal}
                    className="text-[10px] px-2 py-1 bg-white border border-slate-200 text-slate-600"
                  >
                    <span className="font-semibold">{m.colunaOriginal}</span>
                    {' → '}
                    {config?.rotulo}
                  </span>
                );
              })}
            </div>
          </div>

          {/* Ações */}
          <div className="flex gap-2">
            <button
              onClick={handleSalvar}
              disabled={!nome.trim()}
              className={`flex items-center gap-1.5 px-4 py-2 text-xs font-bold transition-colors ${
                nome.trim()
                  ? 'bg-slate-900 text-white hover:bg-slate-800'
                  : 'bg-slate-200 text-slate-400 cursor-not-allowed'
              }`}
            >
              <Save size={13} />
              Salvar Padrão
            </button>
            <button
              onClick={() => setModo('fechado')}
              className="px-4 py-2 text-xs text-slate-500 hover:text-slate-700 transition-colors"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
