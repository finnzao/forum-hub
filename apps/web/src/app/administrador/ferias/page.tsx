'use client';

import React, { useState } from 'react';
import { Settings, Plus, Edit, Building2, Save, X } from 'lucide-react';
import { Cabecalho } from '../../../componentes/layout/Cabecalho';
import { Rodape } from '../../../componentes/layout/Rodape';

export default function PaginaSetores() {
  const [setorEditando, setSetorEditando] = useState<string | null>(null);
  const [novoLimite, setNovoLimite] = useState<number>(1);

  // Mock data - em produção viria do banco de dados
  const [setores, setSetores] = useState([
    { id: '1', nome: 'Cartório Cível', limiteAusencias: 1, totalFuncionarios: 8 },
    { id: '2', nome: 'Cartório Criminal', limiteAusencias: 1, totalFuncionarios: 6 },
    { id: '3', nome: 'Distribuição', limiteAusencias: 2, totalFuncionarios: 12 },
    { id: '4', nome: 'Contadoria', limiteAusencias: 1, totalFuncionarios: 4 },
    { id: '5', nome: 'Administrativo', limiteAusencias: 2, totalFuncionarios: 10 },
    { id: '6', nome: 'Arquivo', limiteAusencias: 1, totalFuncionarios: 5 },
  ]);

  const iniciarEdicao = (setorId: string, limiteAtual: number) => {
    setSetorEditando(setorId);
    setNovoLimite(limiteAtual);
  };

  const cancelarEdicao = () => {
    setSetorEditando(null);
    setNovoLimite(1);
  };

  const salvarEdicao = (setorId: string) => {
    setSetores(prev =>
      prev.map(setor =>
        setor.id === setorId
          ? { ...setor, limiteAusencias: novoLimite }
          : setor
      )
    );
    setSetorEditando(null);
    setNovoLimite(1);
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <Cabecalho 
        nomeUsuario="Usuário Admin"
        subtitulo="Perfil Administrativo"
        tipoPerfil="administrador"
      />

      <main className="max-w-7xl mx-auto px-8 py-12">
        {/* Breadcrumb */}
        <div className="mb-8">
          <div className="flex items-center gap-2 text-sm text-slate-600 mb-4">
            <a href="/administrador" className="hover:text-slate-900">Administrador</a>
            <span>›</span>
            <a href="/administrador/ferias" className="hover:text-slate-900">Férias</a>
            <span>›</span>
            <span className="text-slate-900 font-semibold">Setores</span>
          </div>
          
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-slate-900 mb-3">
                Configuração de Setores
              </h2>
              <p className="text-slate-600 text-base leading-relaxed max-w-3xl">
                Defina o limite de ausências simultâneas permitidas para cada setor. Este limite garante a continuidade operacional.
              </p>
            </div>
            <button className="flex items-center gap-2 px-6 py-3 bg-slate-900 hover:bg-slate-800 text-white font-semibold transition-colors">
              <Plus size={20} />
              Novo Setor
            </button>
          </div>
        </div>

        {/* Alert informativo */}
        <div className="mb-8 p-6 bg-blue-50 border-2 border-blue-200 border-l-4 border-l-blue-600">
          <div className="flex gap-4">
            <Building2 size={24} className="text-blue-600 flex-shrink-0" />
            <div>
              <h4 className="font-bold text-blue-900 mb-2">
                Como funciona o limite de ausências?
              </h4>
              <p className="text-sm text-blue-800 leading-relaxed">
                O limite define quantas pessoas podem estar ausentes simultaneamente no mesmo setor. Por exemplo, se o "Cartório Cível" tem limite 1, apenas uma pessoa pode estar de férias/licença por vez. Ao tentar registrar uma nova ausência, o sistema verifica dia a dia se o limite será ultrapassado.
              </p>
            </div>
          </div>
        </div>

        {/* Tabela de Setores */}
        <div className="bg-white border-2 border-slate-200">
          {/* Cabeçalho da tabela */}
          <div className="grid grid-cols-12 gap-4 p-6 bg-slate-100 border-b-2 border-slate-200">
            <div className="col-span-4">
              <p className="text-xs font-bold text-slate-600 uppercase tracking-wide">
                Nome do Setor
              </p>
            </div>
            <div className="col-span-2">
              <p className="text-xs font-bold text-slate-600 uppercase tracking-wide">
                Funcionários
              </p>
            </div>
            <div className="col-span-3">
              <p className="text-xs font-bold text-slate-600 uppercase tracking-wide">
                Limite Ausências Simultâneas
              </p>
            </div>
            <div className="col-span-2">
              <p className="text-xs font-bold text-slate-600 uppercase tracking-wide">
                Capacidade
              </p>
            </div>
            <div className="col-span-1">
              <p className="text-xs font-bold text-slate-600 uppercase tracking-wide text-right">
                Ações
              </p>
            </div>
          </div>

          {/* Linhas da tabela */}
          <div className="divide-y-2 divide-slate-200">
            {setores.map((setor) => {
              const percentualLimite = (setor.limiteAusencias / setor.totalFuncionarios) * 100;
              const estaEditando = setorEditando === setor.id;
              
              return (
                <div key={setor.id} className="grid grid-cols-12 gap-4 p-6 hover:bg-slate-50 transition-colors">
                  <div className="col-span-4">
                    <p className="font-bold text-slate-900">{setor.nome}</p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-slate-700">{setor.totalFuncionarios}</p>
                  </div>
                  <div className="col-span-3">
                    {estaEditando ? (
                      <div className="flex items-center gap-3">
                        <input
                          type="number"
                          min="1"
                          max={setor.totalFuncionarios}
                          value={novoLimite}
                          onChange={(e) => setNovoLimite(parseInt(e.target.value) || 1)}
                          className="w-20 px-3 py-2 border-2 border-slate-300 focus:border-slate-500 focus:outline-none text-slate-900 font-bold"
                        />
                        <span className="text-sm text-slate-600">
                          {novoLimite === 1 ? 'pessoa' : 'pessoas'}
                        </span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-3">
                        <span className="text-2xl font-bold text-slate-900">
                          {setor.limiteAusencias}
                        </span>
                        <span className="text-sm text-slate-600">
                          {setor.limiteAusencias === 1 ? 'pessoa' : 'pessoas'}
                        </span>
                      </div>
                    )}
                  </div>
                  <div className="col-span-2">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-2 bg-slate-200 overflow-hidden">
                          <div 
                            className={`h-full ${
                              percentualLimite <= 15 
                                ? 'bg-red-600' 
                                : percentualLimite <= 25 
                                ? 'bg-amber-600' 
                                : 'bg-green-600'
                            }`}
                            style={{ width: `${percentualLimite}%` }}
                          />
                        </div>
                      </div>
                      <p className="text-xs text-slate-600">
                        {percentualLimite.toFixed(0)}% do total
                      </p>
                    </div>
                  </div>
                  <div className="col-span-1 flex justify-end gap-2">
                    {estaEditando ? (
                      <>
                        <button
                          onClick={() => salvarEdicao(setor.id)}
                          className="p-2 text-green-600 hover:text-green-700 hover:bg-green-50 transition-colors"
                          title="Salvar"
                        >
                          <Save size={18} />
                        </button>
                        <button
                          onClick={cancelarEdicao}
                          className="p-2 text-red-600 hover:text-red-700 hover:bg-red-50 transition-colors"
                          title="Cancelar"
                        >
                          <X size={18} />
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={() => iniciarEdicao(setor.id, setor.limiteAusencias)}
                        className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors"
                        title="Editar"
                      >
                        <Edit size={18} />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Informações adicionais */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="p-6 bg-white border-2 border-slate-200">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-green-100 text-green-700">
                <Settings size={24} />
              </div>
              <div>
                <h4 className="font-bold text-slate-900 mb-2">Configuração Recomendada</h4>
                <p className="text-sm text-slate-600 leading-relaxed">
                  Para setores críticos, recomenda-se manter o limite em 1 pessoa. Para setores com equipes maiores, configure entre 15-25% do total de funcionários.
                </p>
              </div>
            </div>
          </div>

          <div className="p-6 bg-white border-2 border-slate-200">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-amber-100 text-amber-700">
                <Building2 size={24} />
              </div>
              <div>
                <h4 className="font-bold text-slate-900 mb-2">Validação Automática</h4>
                <p className="text-sm text-slate-600 leading-relaxed">
                  O sistema bloqueia automaticamente solicitações que ultrapassem o limite configurado, evitando sobrecarga operacional.
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>

      <Rodape />
    </div>
  );
}
