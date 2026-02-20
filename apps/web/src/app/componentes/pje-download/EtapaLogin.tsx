// ============================================================
// app/componentes/pje-download/EtapaLogin.tsx
// Etapa 1 — Autenticação no PJE (CPF + Senha + 2FA)
// ============================================================

'use client';

import React, { useState } from 'react';
import { Lock, LogIn, Loader2, AlertTriangle, Shield, Send } from 'lucide-react';

interface EtapaLoginProps {
  carregando: boolean;
  erro: string | null;
  aguardando2FA: boolean;
  onLogin: (cpf: string, senha: string) => void;
  onEnviar2FA: (codigo: string) => void;
}

export function EtapaLogin({
  carregando,
  erro,
  aguardando2FA,
  onLogin,
  onEnviar2FA,
}: EtapaLoginProps) {
  const [cpf, setCpf] = useState('');
  const [senha, setSenha] = useState('');
  const [codigo2FA, setCodigo2FA] = useState('');

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    onLogin(cpf, senha);
  };

  const handle2FA = (e: React.FormEvent) => {
    e.preventDefault();
    if (codigo2FA.length === 6) {
      onEnviar2FA(codigo2FA);
    }
  };

  // ── Formulário 2FA ─────────────────────────────────────────

  if (aguardando2FA) {
    return (
      <div className="max-w-md mx-auto">
        <div className="bg-white border-2 border-slate-200 p-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 bg-amber-100 flex items-center justify-center">
              <Shield size={24} className="text-amber-700" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900">Verificação 2FA</h3>
              <p className="text-sm text-slate-500">Um código foi enviado ao seu email</p>
            </div>
          </div>

          <form onSubmit={handle2FA} className="space-y-5">
            <div>
              <label className="block text-xs font-bold text-slate-600 uppercase tracking-wide mb-2">
                Código de 6 dígitos
              </label>
              <input
                type="text"
                value={codigo2FA}
                onChange={(e) => setCodigo2FA(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="000000"
                className="w-full px-4 py-4 border-2 border-slate-200 text-center text-3xl font-mono tracking-[0.5em] focus:border-slate-900 focus:outline-none transition-colors"
                autoFocus
              />
            </div>

            {erro && (
              <div className="p-3 bg-red-50 border-2 border-red-200 flex items-start gap-2">
                <AlertTriangle size={14} className="text-red-600 mt-0.5 flex-shrink-0" />
                <p className="text-xs text-red-700">{erro}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={codigo2FA.length !== 6 || carregando}
              className="w-full py-3 bg-slate-900 text-white font-bold text-sm hover:bg-slate-800 disabled:bg-slate-300 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
            >
              {carregando ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
              Verificar Código
            </button>
          </form>
        </div>
      </div>
    );
  }

  // ── Formulário de Login ────────────────────────────────────

  return (
    <div className="max-w-md mx-auto">
      <div className="bg-white border-2 border-slate-200 p-8">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 bg-slate-100 flex items-center justify-center">
            <Lock size={24} className="text-slate-700" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-900">Autenticação PJE</h3>
            <p className="text-sm text-slate-500">Entre com suas credenciais do PJE/TJBA</p>
          </div>
        </div>

        <form onSubmit={handleLogin} className="space-y-5">
          <div>
            <label className="block text-xs font-bold text-slate-600 uppercase tracking-wide mb-2">
              CPF
            </label>
            <input
              type="text"
              value={cpf}
              onChange={(e) => setCpf(e.target.value.replace(/\D/g, '').slice(0, 11))}
              placeholder="00000000000"
              className="w-full px-4 py-3 border-2 border-slate-200 text-sm font-mono focus:border-slate-900 focus:outline-none transition-colors"
              autoFocus
              disabled={carregando}
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-600 uppercase tracking-wide mb-2">
              Senha
            </label>
            <input
              type="password"
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              placeholder="••••••••"
              className="w-full px-4 py-3 border-2 border-slate-200 text-sm focus:border-slate-900 focus:outline-none transition-colors"
              disabled={carregando}
            />
          </div>

          {erro && (
            <div className="p-3 bg-red-50 border-2 border-red-200 flex items-start gap-2">
              <AlertTriangle size={14} className="text-red-600 mt-0.5 flex-shrink-0" />
              <p className="text-xs text-red-700">{erro}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={!cpf || !senha || carregando}
            className="w-full py-3 bg-slate-900 text-white font-bold text-sm hover:bg-slate-800 disabled:bg-slate-300 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
          >
            {carregando ? <Loader2 size={16} className="animate-spin" /> : <LogIn size={16} />}
            {carregando ? 'Autenticando...' : 'Entrar no PJE'}
          </button>

          <p className="text-xs text-slate-400 text-center leading-relaxed">
            Credenciais usadas apenas para autenticação e descartadas após login.
          </p>
        </form>
      </div>
    </div>
  );
}
