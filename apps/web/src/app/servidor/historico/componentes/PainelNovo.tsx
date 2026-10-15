'use client';

import React, { useState } from 'react';
import { AlertCircle, Bell, Save } from 'lucide-react';
import { DadosNovoRegistro, TipoMovimentacao } from '../types';
import { CampoForm } from './CampoForm';
import { DatePicker } from './DatePicker';
import { SelectMovimentacao } from './SelectMovimentacao';
import { mascaraProcesso, validarProcesso, validarData, validarDataLembrete } from '../utils';

export const LIMITE_OBSERVACAO = 500;

function dataHojeBR(): string {
  const d = new Date();
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
}

interface PainelNovoProps {
  dadosIniciais?: Partial<DadosNovoRegistro>;
  onSalvar: (dados: DadosNovoRegistro) => void;
  onCancelar: () => void;
}

/**
 * Cadastro de um ato em três blocos curtos:
 * 1. Qual processo  2. O que foi feito  3. Observação (opcional)
 * Sem etapas extras: a conferência é o próprio formulário, e a confirmação
 * aparece no painel depois de salvar.
 */
export function PainelNovo({ dadosIniciais, onSalvar, onCancelar }: PainelNovoProps) {
  const [processo, setProcesso] = useState(dadosIniciais?.processo || '');
  const [data, setData] = useState(dadosIniciais?.data || dataHojeBR());
  const [tipo, setTipo] = useState<TipoMovimentacao>(dadosIniciais?.tipo || 'despacho');
  const [qtdAtos, setQtdAtos] = useState(dadosIniciais?.qtdAtos || 1);
  const [nota, setNota] = useState(dadosIniciais?.nota || '');
  const [temLembrete, setTemLembrete] = useState(false);
  const [lembreteData, setLembreteData] = useState('');
  const [lembreteTexto, setLembreteTexto] = useState('');
  const [erros, setErros] = useState<Record<string, string>>({});

  const veioDeOutroAto = !!dadosIniciais?.processo;

  const limparErro = (campo: string) => {
    if (erros[campo]) setErros((p) => { const n = { ...p }; delete n[campo]; return n; });
  };

  const handleSalvar = () => {
    const novosErros: Record<string, string> = {};
    const vP = validarProcesso(processo);
    if (!vP.valido) novosErros.processo = vP.erro!;
    const vD = validarData(data);
    if (!vD.valido) novosErros.data = vD.erro!;
    if (temLembrete) {
      const vL = validarDataLembrete(lembreteData);
      if (!vL.valido) novosErros.lembreteData = vL.erro!;
    }
    setErros(novosErros);
    if (Object.keys(novosErros).length > 0) return;

    onSalvar({
      processo, data, tipo, qtdAtos, nota: nota.trim(),
      lembrete: temLembrete && lembreteData ? { data: lembreteData, texto: lembreteTexto } : undefined,
    });
  };

  const inputBase = 'w-full px-3 py-2 text-sm border rounded focus:outline-none focus:ring-1';
  const inputOk = 'border-slate-300 focus:border-slate-600 focus:ring-slate-400';
  const inputErro = 'border-red-400 focus:border-red-500 focus:ring-red-200';

  return (
    <div className="p-4 space-y-5">
      {veioDeOutroAto && (
        <p className="text-xs text-blue-900 bg-blue-50 border border-blue-200 px-3 py-2">
          Número e data já vieram do ato anterior. Só escolha o tipo e salve.
        </p>
      )}

      {/* 1. Processo */}
      <Secao numero={1} titulo="Qual processo?">
        <CampoForm label="Nº do processo *">
          <input
            type="text"
            value={processo}
            onChange={(e) => { setProcesso(mascaraProcesso(e.target.value)); limparErro('processo'); }}
            placeholder="0000000-00.0000.0.00.0000"
            aria-invalid={!!erros.processo}
            className={`${inputBase} font-mono ${erros.processo ? inputErro : inputOk}`}
            autoFocus={!veioDeOutroAto}
          />
          {erros.processo
            ? <Erro texto={erros.processo} />
            : <p className="text-[11px] text-slate-500 mt-1">Cole o número do PJE; a máscara é preenchida sozinha.</p>}
        </CampoForm>
        <CampoForm label="Data em que o ato foi feito *">
          <DatePicker value={data} onChange={(v) => { setData(v); limparErro('data'); }} erro={erros.data} />
          {erros.data && <Erro texto={erros.data} />}
        </CampoForm>
      </Secao>

      {/* 2. O que foi feito */}
      <Secao numero={2} titulo="O que foi feito?">
        <CampoForm label="Tipo de ato *">
          <SelectMovimentacao value={tipo} onChange={setTipo} />
        </CampoForm>
        <CampoForm label="Quantos atos desse tipo?">
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => setQtdAtos((q) => Math.max(1, q - 1))} className="w-9 h-9 border border-slate-300 rounded text-slate-700 hover:bg-slate-50 font-bold" aria-label="Diminuir">−</button>
            <input
              type="number" min={1} value={qtdAtos}
              onChange={(e) => setQtdAtos(Math.max(1, parseInt(e.target.value, 10) || 1))}
              className={`${inputBase} ${inputOk} w-20 text-center tabular-nums`}
            />
            <button type="button" onClick={() => setQtdAtos((q) => q + 1)} className="w-9 h-9 border border-slate-300 rounded text-slate-700 hover:bg-slate-50 font-bold" aria-label="Aumentar">+</button>
            <span className="text-xs text-slate-500">Normalmente 1.</span>
          </div>
        </CampoForm>
      </Secao>

      {/* 3. Observação */}
      <Secao numero={3} titulo="Observação" opcional>
        <p className="text-[11px] text-slate-500 -mt-1 mb-2">
          Registre aqui informações complementares importantes sobre este ato: pendências, particularidades, o que o próximo servidor precisa saber.
        </p>
        <textarea
          value={nota}
          onChange={(e) => setNota(e.target.value.slice(0, LIMITE_OBSERVACAO))}
          rows={3}
          maxLength={LIMITE_OBSERVACAO}
          className={`${inputBase} ${inputOk} resize-none`}
          placeholder="Ex.: AR devolvido, expedido mandado para o novo endereço."
        />
        <p className="text-[10px] text-slate-400 text-right tabular-nums">{nota.length}/{LIMITE_OBSERVACAO}</p>

        <button type="button" onClick={() => setTemLembrete(!temLembrete)}
          className={`w-full flex items-center gap-2 px-3 py-2 rounded border text-sm transition-colors ${
            temLembrete ? 'border-amber-300 bg-amber-50 text-amber-800' : 'border-slate-200 text-slate-600 hover:bg-slate-50'
          }`}>
          <Bell size={14} />
          <span className="font-medium">{temLembrete ? 'Lembrete ativo' : 'Quer um lembrete de prazo?'}</span>
          <span className={`ml-auto w-8 h-4 rounded-full relative transition-colors ${temLembrete ? 'bg-amber-500' : 'bg-slate-300'}`}>
            <span className={`absolute top-0.5 w-3 h-3 bg-white rounded-full transition-transform shadow-sm ${temLembrete ? 'left-4' : 'left-0.5'}`} />
          </span>
        </button>

        {temLembrete && (
          <div className="mt-3 space-y-3 pl-1">
            <CampoForm label="Data do lembrete *">
              <DatePicker value={lembreteData} onChange={(v) => { setLembreteData(v); limparErro('lembreteData'); }} erro={erros.lembreteData} />
              {erros.lembreteData && <Erro texto={erros.lembreteData} />}
            </CampoForm>
            <CampoForm label="Para lembrar do quê? (opcional)">
              <input type="text" value={lembreteTexto} onChange={(e) => setLembreteTexto(e.target.value)}
                placeholder="Ex.: Verificar resposta do réu" className={`${inputBase} ${inputOk}`} />
            </CampoForm>
          </div>
        )}
      </Secao>

      <div className="flex gap-2 pt-1">
        <button onClick={handleSalvar}
          className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 text-sm font-bold text-white bg-slate-900 rounded hover:bg-slate-700 transition-colors">
          <Save size={15} /> Salvar ato
        </button>
        <button onClick={onCancelar}
          className="px-4 py-2.5 text-sm font-medium text-slate-700 border border-slate-300 rounded hover:bg-slate-50 transition-colors">
          Cancelar
        </button>
      </div>
    </div>
  );
}

function Secao({ numero, titulo, opcional = false, children }: { numero: number; titulo: string; opcional?: boolean; children: React.ReactNode }) {
  return (
    <section className="space-y-3">
      <h4 className="flex items-center gap-2 text-sm font-bold text-slate-900">
        <span className="w-6 h-6 rounded-full bg-slate-900 text-white text-xs flex items-center justify-center">{numero}</span>
        {titulo}
        {opcional && <span className="text-xs font-normal text-slate-500">(opcional)</span>}
      </h4>
      {children}
    </section>
  );
}

function Erro({ texto }: { texto: string }) {
  return <p className="text-xs text-red-700 mt-1 flex items-center gap-1" role="alert"><AlertCircle size={11} />{texto}</p>;
}
