'use client';

import React, { useState } from 'react';
import { Users, Plus, Search, Edit, Trash2 } from 'lucide-react';
import { Cabecalho } from '../../../componentes/layout/Cabecalho';
import { Rodape } from '../../../componentes/layout/Rodape';

export default function PaginaFuncionarios() {
  const [buscaTexto, setBuscaTexto] = useState('');
  const [filtroSetor, setFiltroSetor] = useState('');
  
  // Mock data
  const funcionarios = [
    { id: 1, nome: 'Maria Silva', setor: 'Cartório Cível', email: 'maria.silva@forum.gov.br', status: 'ativo', diasFerias: 30 },
    { id: 2, nome: 'João Santos', setor: 'Distribuição', email: 'joao.santos@forum.gov.br', status: 'ativo', diasFerias: 15 },
    { id: 3, nome: 'Ana Costa', setor: 'Cartório Criminal', email: 'ana.costa@forum.gov.br', status: 'ativo', diasFerias: 30 },
    { id: 4, nome: 'Pedro Oliveira', setor: 'Contadoria', email: 'pedro.oliveira@forum.gov.br', status: 'ferias', diasFerias: 5 },
    { id: 5, nome: 'Julia Mendes', setor: 'Administrativo', email: 'julia.mendes@forum.gov.br', status: 'ativo', diasFerias: 22 },
    { id: 6, nome: 'Carlos Ferreira', setor: 'Arquivo', email: 'carlos.ferreira@forum.gov.br', status: 'ativo', diasFerias: 30 },
    { id: 7, nome: 'Beatriz Lima', setor: 'Distribuição', email: 'beatriz.lima@forum.gov.br', status: 'licenca', diasFerias: 18 },
    { id: 8, nome: 'Rafael Souza', setor: 'Cartório Cível', email: 'rafael.souza@forum.gov.br', status: 'ativo', diasFerias: 12 },
  ];

  // Filtrar funcionários
  const funcionariosFiltrados = funcionarios.filter(func => {
    const matchTexto = !buscaTexto || 
      func.nome.toLowerCase().includes(buscaTexto.toLowerCase()) ||
      func.email.toLowerCase().includes(buscaTexto.toLowerCase());
    
    const matchSetor = !filtroSetor || func.setor === filtroSetor;
    
    return matchTexto && matchSetor;
  });

  const obterCorStatus = (status: string) => {
    switch (status) {
      case 'ativo':
        return 'bg-green-100 text-green-700 border-green-200';
      case 'ferias':
        return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'licenca':
        return 'bg-amber-100 text-amber-700 border-amber-200';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  const obterRotuloStatus = (status: string) => {
    switch (status) {
      case 'ativo':
        return 'Ativo';
      case 'ferias':
        return 'Em Férias';
      case 'licenca':
        return 'Licença';
      default:
        return status;
    }
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
            <span className="text-slate-900 font-semibold">Funcionários</span>
          </div>
          
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-slate-900 mb-3">
                Cadastro de Funcionários
              </h2>
              <p className="text-slate-600 text-base leading-relaxed max-w-3xl">
                Gerencie os funcionários e seus respectivos setores para controle de ausências.
              </p>
            </div>
            <button className="flex items-center gap-2 px-6 py-3 bg-slate-900 hover:bg-slate-800 text-white font-semibold transition-colors">
              <Plus size={20} />
              Novo Funcionário
            </button>
          </div>
        </div>

        {/* Filtros e busca */}
        <div className="mb-8 p-6 bg-white border-2 border-slate-200">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-slate-600 uppercase tracking-wide mb-2">
                Buscar
              </label>
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                <input
                  type="text"
                  value={buscaTexto}
                  onChange={(e) => setBuscaTexto(e.target.value)}
                  placeholder="Nome ou email do funcionário..."
                  className="w-full pl-12 pr-4 py-3 border-2 border-slate-200 focus:border-slate-400 focus:outline-none text-slate-900"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-600 uppercase tracking-wide mb-2">
                Filtrar por Setor
              </label>
              <select 
                value={filtroSetor}
                onChange={(e) => setFiltroSetor(e.target.value)}
                className="w-full px-4 py-3 border-2 border-slate-200 focus:border-slate-400 focus:outline-none text-slate-900 bg-white"
              >
                <option value="">Todos os setores</option>
                <option value="Cartório Cível">Cartório Cível</option>
                <option value="Cartório Criminal">Cartório Criminal</option>
                <option value="Distribuição">Distribuição</option>
                <option value="Contadoria">Contadoria</option>
                <option value="Administrativo">Administrativo</option>
                <option value="Arquivo">Arquivo</option>
              </select>
            </div>
          </div>
        </div>

        {/* Estatísticas rápidas */}
        <div className="mb-8 grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="p-4 bg-white border-2 border-slate-200">
            <p className="text-xs font-bold text-slate-600 uppercase tracking-wide mb-2">
              Total de Funcionários
            </p>
            <p className="text-3xl font-bold text-slate-900">{funcionarios.length}</p>
          </div>
          <div className="p-4 bg-white border-2 border-green-200">
            <p className="text-xs font-bold text-green-600 uppercase tracking-wide mb-2">
              Ativos
            </p>
            <p className="text-3xl font-bold text-green-700">
              {funcionarios.filter(f => f.status === 'ativo').length}
            </p>
          </div>
          <div className="p-4 bg-white border-2 border-blue-200">
            <p className="text-xs font-bold text-blue-600 uppercase tracking-wide mb-2">
              Em Férias
            </p>
            <p className="text-3xl font-bold text-blue-700">
              {funcionarios.filter(f => f.status === 'ferias').length}
            </p>
          </div>
          <div className="p-4 bg-white border-2 border-amber-200">
            <p className="text-xs font-bold text-amber-600 uppercase tracking-wide mb-2">
              Em Licença
            </p>
            <p className="text-3xl font-bold text-amber-700">
              {funcionarios.filter(f => f.status === 'licenca').length}
            </p>
          </div>
        </div>

        {/* Tabela de Funcionários */}
        <div className="bg-white border-2 border-slate-200">
          {/* Cabeçalho da tabela */}
          <div className="grid grid-cols-12 gap-4 p-6 bg-slate-100 border-b-2 border-slate-200">
            <div className="col-span-3">
              <p className="text-xs font-bold text-slate-600 uppercase tracking-wide">
                Nome
              </p>
            </div>
            <div className="col-span-2">
              <p className="text-xs font-bold text-slate-600 uppercase tracking-wide">
                Setor
              </p>
            </div>
            <div className="col-span-3">
              <p className="text-xs font-bold text-slate-600 uppercase tracking-wide">
                Email
              </p>
            </div>
            <div className="col-span-2">
              <p className="text-xs font-bold text-slate-600 uppercase tracking-wide">
                Status
              </p>
            </div>
            <div className="col-span-1">
              <p className="text-xs font-bold text-slate-600 uppercase tracking-wide">
                Dias Restantes
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
            {funcionariosFiltrados.map((funcionario) => (
              <div key={funcionario.id} className="grid grid-cols-12 gap-4 p-6 hover:bg-slate-50 transition-colors">
                <div className="col-span-3">
                  <p className="font-bold text-slate-900">{funcionario.nome}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-slate-700">{funcionario.setor}</p>
                </div>
                <div className="col-span-3">
                  <p className="text-sm text-slate-600">{funcionario.email}</p>
                </div>
                <div className="col-span-2">
                  <span className={`inline-block text-xs font-bold px-3 py-1 border ${obterCorStatus(funcionario.status)}`}>
                    {obterRotuloStatus(funcionario.status)}
                  </span>
                </div>
                <div className="col-span-1">
                  <p className="text-lg font-bold text-slate-900">{funcionario.diasFerias}</p>
                  <p className="text-xs text-slate-600">dias</p>
                </div>
                <div className="col-span-1 flex justify-end gap-2">
                  <button className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors">
                    <Edit size={18} />
                  </button>
                  <button className="p-2 text-red-600 hover:text-red-700 hover:bg-red-50 transition-colors">
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>

      <Rodape />
    </div>
  );
}
