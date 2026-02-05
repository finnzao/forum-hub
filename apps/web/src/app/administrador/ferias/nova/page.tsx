'use client';

import React, { useState } from 'react';
import { Plus, ArrowLeft } from 'lucide-react';
import { Cabecalho } from '../../../componentes/layout/Cabecalho';
import { Rodape } from '../../../componentes/layout/Rodape';
import { FormularioAusencia, DadosAusencia } from '../../../../componentes/ferias/FormularioAusencia';
import { AlertaConflito } from '../../../../componentes/ferias/AlertaConflito';
import { useFeriasManager } from '../../../../hooks/useFeriasManager';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function PaginaNovaAusencia() {
  const router = useRouter();
  const { funcionarios, registrarAusencia, loading } = useFeriasManager();
  const [validacao, setValidacao] = useState<any>(null);
  const [mostrarSucesso, setMostrarSucesso] = useState(false);

  const handleSubmit = async (dados: DadosAusencia) => {
    const resultado = await registrarAusencia(dados);
    
    if (resultado.sucesso) {
      setMostrarSucesso(true);
      setValidacao(null);
      
      // Redirecionar após 2 segundos
      setTimeout(() => {
        router.push('/administrador/ferias/solicitacoes');
      }, 2000);
    } else {
      setValidacao(resultado.validacao);
      setMostrarSucesso(false);
      
      // Scroll para o topo para ver o erro
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleCancel = () => {
    router.back();
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <Cabecalho 
        nomeUsuario="Usuário Admin"
        subtitulo="Perfil Administrativo"
        tipoPerfil="administrador"
      />

      <main className="max-w-4xl mx-auto px-8 py-12">
        {/* Breadcrumb */}
        <div className="mb-8">
          <div className="flex items-center gap-2 text-sm text-slate-600 mb-4">
            <a href="/administrador" className="hover:text-slate-900">Administrador</a>
            <span>›</span>
            <a href="/administrador/ferias" className="hover:text-slate-900">Férias</a>
            <span>›</span>
            <span className="text-slate-900 font-semibold">Nova Ausência</span>
          </div>
          
          <div className="flex items-center gap-4 mb-6">
            <button
              onClick={() => router.back()}
              className="p-2 hover:bg-slate-200 transition-colors"
            >
              <ArrowLeft size={24} className="text-slate-600" />
            </button>
            <div>
              <h2 className="text-2xl font-bold text-slate-900 mb-2">
                Registrar Nova Ausência
              </h2>
              <p className="text-slate-600 text-base leading-relaxed">
                Preencha os dados abaixo. O sistema validará automaticamente se há conflitos com o limite do setor.
              </p>
            </div>
          </div>
        </div>

        {/* Mensagem de sucesso */}
        {mostrarSucesso && (
          <div className="mb-6 p-6 bg-green-50 border-2 border-green-200 border-l-4 border-l-green-600">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-green-600 text-white flex items-center justify-center font-bold text-lg">
                ✓
              </div>
              <div>
                <h4 className="font-bold text-green-900 mb-1">
                  Ausência Registrada com Sucesso!
                </h4>
                <p className="text-sm text-green-800">
                  A solicitação foi enviada para aprovação. Redirecionando...
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Alerta de conflito */}
        {validacao && !validacao.valido && (
          <div className="mb-6">
            <AlertaConflito
              conflitos={validacao.conflitos}
              nomeSetor={
                funcionarios.find(f => 
                  f.id === validacao.conflitos[0]?.funcionariosAusentes[0]
                )?.setor?.nome || 'Setor'
              }
            />
          </div>
        )}

        {/* Formulário */}
        <div className="bg-white border-2 border-slate-200 p-8">
          <div className="flex items-center gap-3 mb-6 pb-6 border-b-2 border-slate-200">
            <div className="p-3 bg-slate-100 text-slate-700">
              <Plus size={24} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900">
                Dados da Ausência
              </h3>
              <p className="text-sm text-slate-600">
                Campos marcados com * são obrigatórios
              </p>
            </div>
          </div>

          <FormularioAusencia
            funcionarios={funcionarios}
            onSubmit={handleSubmit}
            onCancel={handleCancel}
            loading={loading}
          />
        </div>

        {/* Informações adicionais */}
        <div className="mt-6 p-6 bg-blue-50 border-2 border-blue-200">
          <h4 className="font-bold text-blue-900 mb-3">
            Como funciona a validação?
          </h4>
          <ul className="space-y-2 text-sm text-blue-800">
            <li className="flex gap-2">
              <span className="font-bold">•</span>
              <span>O sistema verifica <strong>dia a dia</strong> se o limite de ausências simultâneas do setor será respeitado</span>
            </li>
            <li className="flex gap-2">
              <span className="font-bold">•</span>
              <span>Se em qualquer dia do período houver conflito, a solicitação será <strong>bloqueada</strong></span>
            </li>
            <li className="flex gap-2">
              <span className="font-bold">•</span>
              <span>Você verá exatamente quais dias têm conflito e quem já está ausente</span>
            </li>
            <li className="flex gap-2">
              <span className="font-bold">•</span>
              <span>Configure os limites por setor em <Link href="/administrador/ferias/setores" className="underline font-semibold">Configurar Setores</Link></span>
            </li>
          </ul>
        </div>
      </main>

      <Rodape />
    </div>
  );
}
