

'use client';

import { useCallback } from 'react';
import { ArrowLeft, ClipboardList } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

import { Cabecalho } from '../../componentes/layout/Cabecalho';
import { Rodape } from '../../componentes/layout/Rodape';
import {
  IndicadorEtapas,
  EtapaUpload,
  EtapaMapeamento,
  EtapaValidacao,
  EtapaRevisao,
  EtapaConcluido,
} from '../../componentes/importacao';
import { useImportacao } from '../../hooks/useImportacao';

export default function PaginaAtribuicao() {
  const router = useRouter();
  const {
    estado,
    iniciarUpload,
    atualizarMapeamento,
    confirmarMapeamento,
    avancarEtapa,
    voltarEtapa,
    toggleRegistro,
    selecionarTodos,
    deselecionarTodos,
    descartarRegistro,
    editarCampo,
    confirmarImportacao,
    resetar,
    registrosSelecionados,
  } = useImportacao();

  const handleConfirmarImportacao = useCallback(() => {
    const importados = confirmarImportacao();
    // Em produção: enviar para API / serviço de distribuição
    console.log(`${importados.length} registros importados`, importados);
  }, [confirmarImportacao]);

  const handleIrParaDistribuicao = useCallback(() => {
    router.push('/chefe-cartorio/acompanhamento');
  }, [router]);

  return (
    <div className="min-h-screen bg-slate-50">
      <Cabecalho
        nomeUsuario="Carlos Ferreira"
        subtitulo="Chefe de Cartório — 1ª Vara Cível"
        tipoPerfil="chefe-cartorio"
      />

      <main className="max-w-5xl mx-auto px-8 py-12">
        {/* Breadcrumb */}
        <div className="mb-8">
          <div className="flex items-center gap-2 text-sm text-slate-600 mb-4">
            <Link
              href="/chefe-cartorio"
              className="hover:text-slate-900 font-semibold flex items-center gap-1.5"
            >
              <ArrowLeft size={14} /> Painel
            </Link>
            <span>›</span>
            <span className="text-slate-900 font-semibold">Atribuição de Tarefas</span>
          </div>

          <div className="flex items-center gap-4">
            <div className="p-3 bg-slate-100 text-slate-700 border-2 border-slate-200">
              <ClipboardList size={28} strokeWidth={2} />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-slate-900">
                Importar Processos e Atribuir Tarefas
              </h2>
              <p className="text-slate-600 text-sm mt-1">
                Importe planilhas do Exaudi, revise os dados e distribua para a equipe
              </p>
            </div>
          </div>
        </div>

        {/* Indicador de etapas */}
        <IndicadorEtapas etapaAtual={estado.etapa} />

        {/* Conteúdo da etapa ativa */}
        <div className="bg-white border-2 border-slate-200 p-8">
          {estado.etapa === 'upload' && (
            <EtapaUpload
              carregando={estado.carregando}
              erro={estado.erro}
              onUpload={iniciarUpload}
            />
          )}

          {estado.etapa === 'mapeamento' && estado.parsing && (
            <EtapaMapeamento
              parsing={estado.parsing}
              mapeamento={estado.mapeamento}
              erro={estado.erro}
              onAtualizarMapeamento={atualizarMapeamento}
              onConfirmar={confirmarMapeamento}
              onVoltar={voltarEtapa}
            />
          )}

          {estado.etapa === 'validacao' && estado.validacao && (
            <EtapaValidacao
              validacao={estado.validacao}
              onProsseguir={avancarEtapa}
              onVoltar={voltarEtapa}
            />
          )}

          {estado.etapa === 'revisao' && estado.validacao && (
            <EtapaRevisao
              registros={estado.validacao.registros}
              mapeamento={estado.mapeamento}
              registrosSelecionados={registrosSelecionados.length}
              onToggle={toggleRegistro}
              onSelecionarTodos={selecionarTodos}
              onDeselecionarTodos={deselecionarTodos}
              onDescartar={descartarRegistro}
              onEditarCampo={editarCampo}
              onConfirmar={handleConfirmarImportacao}
              onVoltar={voltarEtapa}
            />
          )}

          {estado.etapa === 'concluido' && (
            <EtapaConcluido
              totalImportados={registrosSelecionados.length}
              totalDescartados={
                (estado.validacao?.resumo.total || 0) - registrosSelecionados.length
              }
              nomeArquivo={estado.parsing?.nomeArquivo || ''}
              onNovaImportacao={resetar}
              onIrParaDistribuicao={handleIrParaDistribuicao}
            />
          )}
        </div>
      </main>

      <Rodape />
    </div>
  );
}
