'use client';

import React, { useState } from 'react';
import { Plus, AlertCircle, Bell } from 'lucide-react';
import { DadosNovoRegistro, TipoMovimentacao } from '../types';
import { CampoForm } from './CampoForm';
import { DatePicker } from './DatePicker';
import { SelectMovimentacao } from './SelectMovimentacao';
import { mascaraProcesso, validarProcesso, validarData, validarDataLembrete } from '../utils';

function dataHojeBR(): string {
  const d = new Date();
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
}

interface PainelNovoProps {
  dadosIniciais?: Partial<DadosNovoRegistro>;
  onSalvar: (dados: DadosNovoRegistro) => void;
  onCancelar: () => void;
}

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
      processo, data, tipo, qtdAtos, nota,
      lembrete: temLembrete && lembreteData ? { data: lembreteData, texto: lembreteTexto } : undefined,
    });
  };

  return (
    <div className="p-4 space-y-4">
      {/* Processo */}
      <CampoForm label="Nº do Processo *">
        <input
          type="text"
          value={processo}
          onChange={(e) => { setProcesso(mascaraProcesso(e.target.value)); limparErro('processo'); }}
          placeholder="0000000-00.0000.0.00.0000"
          className={`w-full px-3 py-2 text-sm border rounded focus:outline-none focus:ring-1 font-mono ${
            erros.processo ? 'border-red-400 focus:border-red-500 focus:ring-red-200' : 'border-gray-300 focus:border-slate-500 focus:ring-slate-500'
          }`}
          autoFocus
        />
        {erros.processo && <p className="text-xs text-red-600 mt-1 flex items-center gap-1"><AlertCircle size={11} />{erros.processo}</p>}
      </CampoForm>

      <div className="grid grid-cols-2 gap-3">
        <CampoForm label="Data *">
          <DatePicker value={data} onChange={(v) => { setData(v); limparErro('data'); }} erro={erros.data} />
          {erros.data && <p className="text-xs text-red-600 mt-1 flex items-center gap-1"><AlertCircle size={11} />{erros.data}</p>}
        </CampoForm>
        <CampoForm label="Qtd Atos">
          <input
            type="number" min={1} value={qtdAtos}
            onChange={(e) => setQtdAtos(parseInt(e.target.value) || 1)}
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:border-slate-500 focus:ring-1 focus:ring-slate-500"
          />
        </CampoForm>
      </div>

      <CampoForm label="Tipo de Movimentação *">
        <SelectMovimentacao value={tipo} onChange={setTipo} />
      </CampoForm>

      <CampoForm label="Nota (opcional)">
        <textarea value={nota} onChange={(e) => setNota(e.target.value)} rows={2}
          className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:border-slate-500 focus:ring-1 focus:ring-slate-500 resize-none"
          placeholder="Observação..." />
      </CampoForm>

      {/* Lembrete */}
      <div className="border-t border-gray-100 pt-4">
        <button type="button" onClick={() => setTemLembrete(!temLembrete)}
          className={`w-full flex items-center gap-2 px-3 py-2 rounded border text-sm transition-colors ${
            temLembrete ? 'border-amber-300 bg-amber-50 text-amber-700' : 'border-gray-200 text-gray-500 hover:bg-gray-50'
          }`}>
          <Bell size={14} />
          <span className="font-medium">{temLembrete ? 'Lembrete ativo' : 'Adicionar lembrete'}</span>
          <span className={`ml-auto w-8 h-4 rounded-full relative transition-colors ${temLembrete ? 'bg-amber-500' : 'bg-gray-300'}`}>
            <span className={`absolute top-0.5 w-3 h-3 bg-white rounded-full transition-transform shadow-sm ${temLembrete ? 'left-4' : 'left-0.5'}`} />
          </span>
        </button>

        {temLembrete && (
          <div className="mt-3 space-y-3 pl-1">
            <CampoForm label="Data do lembrete *">
              <DatePicker value={lembreteData} onChange={(v) => { setLembreteData(v); limparErro('lembreteData'); }} erro={erros.lembreteData} />
              {erros.lembreteData && <p className="text-xs text-red-600 mt-1 flex items-center gap-1"><AlertCircle size={11} />{erros.lembreteData}</p>}
            </CampoForm>
            <CampoForm label="Descrição (opcional)">
              <input type="text" value={lembreteTexto} onChange={(e) => setLembreteTexto(e.target.value)}
                placeholder="Ex: Verificar resposta..." className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:border-slate-500 focus:ring-1 focus:ring-slate-500" />
            </CampoForm>
          </div>
        )}
      </div>

      <div className="flex gap-2 pt-2">
        <button onClick={handleSalvar}
          className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-sm font-semibold text-white bg-slate-800 rounded hover:bg-slate-700 transition-colors">
          <Plus size={14} /> Adicionar
        </button>
        <button onClick={onCancelar}
          className="px-4 py-2 text-sm font-medium text-gray-500 border border-gray-300 rounded hover:bg-gray-50 transition-colors">
          Cancelar
        </button>
      </div>
    </div>
  );
}
