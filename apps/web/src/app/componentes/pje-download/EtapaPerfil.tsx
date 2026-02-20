// ============================================================
// app/componentes/pje-download/EtapaPerfil.tsx
// Etapa 2 — Seleção de perfil/localização no PJE
// ============================================================

'use client';

import React from 'react';
import { User, Star, Loader2, AlertTriangle } from 'lucide-react';
import type { PerfilPJE, UsuarioPJE } from './tipos';

interface EtapaPerfilProps {
  usuario: UsuarioPJE;
  perfis: PerfilPJE[];
  carregando: boolean;
  erro: string | null;
  onSelecionar: (perfil: PerfilPJE) => void;
}

export function EtapaPerfil({
  usuario,
  perfis,
  carregando,
  erro,
  onSelecionar,
}: EtapaPerfilProps) {
  return (
    <div className="max-w-2xl mx-auto">
      {/* Boas-vindas */}
      <div className="bg-white border-2 border-slate-200 p-6 mb-6 flex items-center gap-4">
        <div className="w-12 h-12 bg-emerald-100 flex items-center justify-center flex-shrink-0">
          <User size={24} className="text-emerald-700" />
        </div>
        <div>
          <p className="text-sm text-slate-500">Autenticado como</p>
          <p className="text-lg font-bold text-slate-900">{usuario.nomeUsuario}</p>
          <p className="text-xs font-mono text-slate-400">CPF: {usuario.login}</p>
        </div>
      </div>

      {/* Título */}
      <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide mb-4">
        Selecione o Perfil de Acesso
      </h3>
      <p className="text-sm text-slate-500 mb-6">
        As tarefas e etiquetas disponíveis dependem do perfil selecionado.
      </p>

      {erro && (
        <div className="p-3 bg-red-50 border-2 border-red-200 flex items-start gap-2 mb-6">
          <AlertTriangle size={14} className="text-red-600 mt-0.5 flex-shrink-0" />
          <p className="text-xs text-red-700">{erro}</p>
        </div>
      )}

      {/* Grade de perfis */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {perfis.map((perfil) => (
          <button
            key={perfil.indice}
            type="button"
            disabled={carregando}
            onClick={() => onSelecionar(perfil)}
            className={`group text-left p-5 border-2 transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed ${
              perfil.favorito
                ? 'border-amber-300 bg-amber-50/50 hover:border-amber-500 hover:bg-amber-50'
                : 'border-slate-200 bg-white hover:border-slate-400 hover:bg-slate-50'
            }`}
          >
            <div className="flex items-start justify-between mb-2">
              <div className="flex items-center gap-2">
                {perfil.favorito && (
                  <Star size={14} className="text-amber-500" fill="currentColor" />
                )}
                <span className="text-sm font-bold text-slate-900 group-hover:text-slate-700">
                  {perfil.nome}
                </span>
              </div>
              {carregando && (
                <Loader2 size={14} className="animate-spin text-slate-400" />
              )}
            </div>
            <p className="text-xs text-slate-500">{perfil.orgao}</p>
            <p className="text-xs text-slate-400 mt-1">Índice: {perfil.indice}</p>
          </button>
        ))}
      </div>

      {perfis.length === 0 && !carregando && (
        <div className="border-2 border-dashed border-slate-200 p-8 text-center">
          <User size={32} className="text-slate-300 mx-auto mb-3" />
          <p className="text-sm text-slate-500">Nenhum perfil disponível.</p>
        </div>
      )}
    </div>
  );
}
