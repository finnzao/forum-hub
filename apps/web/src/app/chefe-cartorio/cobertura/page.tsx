// ============================================================
// chefe-cartorio/cobertura/page.tsx
// Cobertura de dígito da unidade (ARQUITETURA.md, seção 6):
// quem cobre cada valor de cada eixo, buracos e sobreposições,
// calculado no cliente a partir dos filtros salvos nos perfis.
// ============================================================

'use client';

import React, { useMemo } from 'react';
import Link from 'next/link';
import { ArrowLeft, Hash, AlertTriangle, Users, CheckCircle, ClipboardList } from 'lucide-react';

import { Cabecalho } from '../../componentes/layout/Cabecalho';
import { Rodape } from '../../componentes/layout/Rodape';
import { USUARIOS_UNIDADE, LISTAS_MANUAIS, obterAcervo, contarPorFiltro } from '../../lib/mock/acervo';
import { EIXOS_DIGITO, calcularCobertura, casaFiltroDigito, descreverFiltro, filtroVazio, type EixoDigito } from '../../lib/cnj';

const NOME_USUARIO = 'Carlos Ferreira';

export default function PaginaCobertura() {
  const servidores = USUARIOS_UNIDADE.filter((u) => u.perfilSistema === 'servidor');
  const ativos = servidores.filter((s) => s.ativo);
  const acervo = obterAcervo();

  const coberturaPorEixo = useMemo(() => {
    const resultado: Record<EixoDigito, ReturnType<typeof calcularCobertura>> = {} as never;
    for (const { eixo } of EIXOS_DIGITO) {
      resultado[eixo] = calcularCobertura(servidores.map((s) => ({ nome: s.nome, filtro: s.filtroDigito })), eixo);
    }
    return resultado;
  }, [servidores]);

  /** Eixos realmente usados por alguém */
  const eixosEmUso = EIXOS_DIGITO.filter(({ eixo }) => servidores.some((s) => (s.filtroDigito[eixo]?.length ?? 0) > 0));

  /** Sem responsável ativo = nenhum servidor ativo cobre pelo dígito nem por lista manual (mesma conta do Acervo) */
  const semResponsavel = useMemo(() => {
    const emListaDeAtivo = new Set(
      LISTAS_MANUAIS.filter((l) => ativos.some((s) => s.id === l.servidorId)).flatMap((l) => l.processoIds),
    );
    return acervo.filter(
      (p) => !emListaDeAtivo.has(p.id)
        && !ativos.some((s) => !filtroVazio(s.filtroDigito) && casaFiltroDigito(p.numeroCnj, s.filtroDigito)),
    ).length;
  }, [acervo, ativos]);

  const nomeAtivo = (nome: string) => servidores.find((s) => s.nome === nome)?.ativo ?? false;

  return (
    <div className="min-h-screen bg-slate-50">
      <Cabecalho nomeUsuario={NOME_USUARIO} subtitulo="Chefe de Cartório — Vara Criminal de Rio Real" tipoPerfil="chefe-cartorio" />

      <main className="max-w-6xl mx-auto px-8 py-10">
        <div className="mb-8">
          <div className="flex items-center gap-2 text-sm text-slate-600 mb-4">
            <Link href="/chefe-cartorio" className="hover:text-slate-900 font-semibold flex items-center gap-1.5"><ArrowLeft size={14} /> Painel</Link>
            <span>›</span>
            <span className="text-slate-900 font-semibold">Cobertura de Dígito</span>
          </div>
          <div className="flex items-center gap-4">
            <div className="p-3 bg-slate-100 text-slate-700 border-2 border-slate-200"><Hash size={28} strokeWidth={2} /></div>
            <div>
              <h2 className="text-2xl font-bold text-slate-900">Cobertura de Dígito da Unidade</h2>
              <p className="text-slate-600 text-sm mt-1">
                Cada servidor configura o próprio dígito no perfil. Aqui você enxerga quem cobre o quê, onde há buraco e onde há dois na mesma fatia.
              </p>
            </div>
          </div>
        </div>

        {/* Alertas */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <Indicador
            icone={<Users size={18} />}
            titulo="Servidores ativos"
            valor={`${ativos.length} de ${servidores.length}`}
            detalhe={servidores.filter((s) => !s.ativo).map((s) => `${s.nome} inativo`).join(', ') || 'Todos ativos'}
          />
          <Indicador
            icone={<AlertTriangle size={18} />}
            titulo="Processos sem responsável ativo"
            valor={String(semResponsavel)}
            detalhe={`de ${acervo.length} no acervo`}
            tom={semResponsavel > 0 ? 'alerta' : 'ok'}
          />
          <Indicador
            icone={<ClipboardList size={18} />}
            titulo="Listas manuais ativas"
            valor={String(LISTAS_MANUAIS.length)}
            detalhe={`${LISTAS_MANUAIS.reduce((s, l) => s + l.processoIds.length, 0)} processos fora de dígito`}
          />
        </div>

        {/* Grade por eixo */}
        {eixosEmUso.map(({ eixo, rotulo, descricao }) => {
          const cobertura = coberturaPorEixo[eixo];
          return (
            <section key={eixo} className="bg-white border-2 border-slate-200 p-6 mb-6">
              <div className="flex items-baseline justify-between mb-4">
                <h3 className="text-base font-bold text-slate-900">{rotulo}</h3>
                <span className="text-xs text-slate-500">{descricao}</span>
              </div>
              <div className={`grid gap-2 ${eixo === 'ano' ? 'grid-cols-9' : 'grid-cols-10'}`}>
                {cobertura.map(({ valor, responsaveis }) => {
                  const ativosAqui = responsaveis.filter(nomeAtivo);
                  const estado = ativosAqui.length === 0 ? 'buraco' : ativosAqui.length > 1 ? 'sobreposicao' : 'ok';
                  const cor = estado === 'buraco'
                    ? 'border-red-300 bg-red-50'
                    : estado === 'sobreposicao'
                      ? 'border-amber-300 bg-amber-50'
                      : 'border-emerald-200 bg-emerald-50';
                  return (
                    <div key={valor} className={`border-2 p-2 min-h-[5.5rem] ${cor}`}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-lg font-bold text-slate-900 tabular-nums">{valor}</span>
                        {estado === 'ok' && <CheckCircle size={13} className="text-emerald-600" />}
                        {estado !== 'ok' && <AlertTriangle size={13} className={estado === 'buraco' ? 'text-red-600' : 'text-amber-600'} />}
                      </div>
                      {responsaveis.length === 0 ? (
                        <p className="text-[11px] font-semibold text-red-700">Ninguém</p>
                      ) : (
                        responsaveis.map((nome) => (
                          <p key={nome} className={`text-[11px] leading-tight ${nomeAtivo(nome) ? 'text-slate-800' : 'text-slate-400 line-through'}`} title={nomeAtivo(nome) ? '' : 'inativo'}>
                            {nome.split(' ')[0]}
                          </p>
                        ))
                      )}
                      {estado === 'sobreposicao' && <p className="text-[10px] text-amber-700 mt-1">2+ ativos</p>}
                      {estado === 'buraco' && responsaveis.length > 0 && <p className="text-[10px] text-red-700 mt-1">só inativo</p>}
                    </div>
                  );
                })}
              </div>
              <div className="flex items-center gap-4 mt-3 text-[11px] text-slate-500">
                <Legenda cor="bg-emerald-50 border-emerald-200" texto="1 servidor ativo" />
                <Legenda cor="bg-amber-50 border-amber-300" texto="Sobreposição (2+ ativos)" />
                <Legenda cor="bg-red-50 border-red-300" texto="Buraco (ninguém ou só inativo)" />
              </div>
            </section>
          );
        })}

        {/* Tabela de servidores */}
        <section className="bg-white border-2 border-slate-200 overflow-hidden">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="bg-slate-100 border-b-2 border-slate-300 text-xs font-semibold text-slate-600 uppercase tracking-wider">
                <th className="px-4 py-2.5 text-left border-r border-slate-200">Servidor</th>
                <th className="px-4 py-2.5 text-left border-r border-slate-200">Situação</th>
                <th className="px-4 py-2.5 text-left border-r border-slate-200">Meu dígito (configurado no perfil)</th>
                <th className="px-4 py-2.5 text-right w-36 border-r border-slate-200">Processos no dígito</th>
                <th className="px-4 py-2.5 text-right w-36">Em listas manuais</th>
              </tr>
            </thead>
            <tbody>
              {servidores.map((s) => {
                const emListas = LISTAS_MANUAIS.filter((l) => l.servidorId === s.id).reduce((n, l) => n + l.processoIds.length, 0);
                return (
                  <tr key={s.id} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="px-4 py-2.5 border-r border-slate-100 font-semibold text-slate-900">{s.nome}</td>
                    <td className="px-4 py-2.5 border-r border-slate-100">
                      <span className={`text-[11px] font-semibold px-1.5 py-0.5 border ${s.ativo ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : 'bg-slate-100 text-slate-500 border-slate-300'}`}>
                        {s.ativo ? 'Ativo' : 'Inativo (férias)'}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 border-r border-slate-100 text-xs text-slate-700">{descreverFiltro(s.filtroDigito)}</td>
                    <td className="px-4 py-2.5 border-r border-slate-100 text-right tabular-nums font-semibold text-slate-900">
                      {filtroVazio(s.filtroDigito) ? <span className="text-slate-400 font-normal">—</span> : contarPorFiltro(s.filtroDigito)}
                    </td>
                    <td className="px-4 py-2.5 text-right tabular-nums text-slate-700">{emListas || <span className="text-slate-300">—</span>}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </section>
      </main>

      <Rodape />
    </div>
  );
}

function Indicador({ icone, titulo, valor, detalhe, tom = 'neutro' }: { icone: React.ReactNode; titulo: string; valor: string; detalhe: string; tom?: 'neutro' | 'alerta' | 'ok' }) {
  const cores = tom === 'alerta' ? 'border-red-200 bg-red-50 text-red-800' : tom === 'ok' ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-slate-200 bg-white text-slate-800';
  return (
    <div className={`border-2 p-4 ${cores}`}>
      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide opacity-80">{icone} {titulo}</div>
      <p className="text-2xl font-bold mt-1 tabular-nums">{valor}</p>
      <p className="text-xs mt-0.5 opacity-80">{detalhe}</p>
    </div>
  );
}

function Legenda({ cor, texto }: { cor: string; texto: string }) {
  return <span className="flex items-center gap-1.5"><span className={`w-3 h-3 border ${cor}`} /> {texto}</span>;
}
