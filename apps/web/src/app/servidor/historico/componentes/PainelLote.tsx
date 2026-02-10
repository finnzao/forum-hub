'use client';

import React, { useState } from 'react';
import { Plus, Save, AlertCircle, X, Bell } from 'lucide-react';
import { DadosNovoRegistro, ItemLote, TipoMovimentacao, TIPOS_MOVIMENTACAO, CATEGORIAS_MOVIMENTACAO } from '../types';
import { CampoForm } from './CampoForm';
import { DatePicker } from './DatePicker';
import { mascaraProcesso, mascaraData, validarProcesso, validarData, validarDataLembrete } from '../utils';

function dataHojeBR(): string {
  const d = new Date();
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
}

interface PainelLoteProps {
  onSalvar: (registros: DadosNovoRegistro[]) => void;
  onCancelar: () => void;
}

export function PainelLote({ onSalvar, onCancelar }: PainelLoteProps) {
  const [processo, setProcesso] = useState('');
  const [data, setData] = useState(dataHojeBR());
  const [itens, setItens] = useState<ItemLote[]>([{ tipo: 'despacho', qtdAtos: 1 }]);
  const [erros, setErros] = useState<Record<string, string>>({});
  const [itemExpandido, setItemExpandido] = useState<number | null>(null);

  const limparErro = (campo: string) => {
    if (erros[campo]) setErros((p) => { const n = { ...p }; delete n[campo]; return n; });
  };

  const adicionarItem = () => setItens([...itens, { tipo: 'despacho', qtdAtos: 1 }]);

  const atualizarItem = (idx: number, campo: string, valor: any) => {
    setItens(itens.map((item, i) => {
      if (i !== idx) return item;
      if (campo === 'lembreteData') {
        const lembrete = item.lembrete || { data: '', texto: '' };
        return { ...item, lembrete: { ...lembrete, data: mascaraData(valor) } };
      }
      if (campo === 'lembreteTexto') {
        const lembrete = item.lembrete || { data: '', texto: '' };
        return { ...item, lembrete: { ...lembrete, texto: valor } };
      }
      return { ...item, [campo]: valor };
    }));
  };

  const setLembreteDataItem = (idx: number, valor: string) => {
    setItens(itens.map((item, i) => {
      if (i !== idx) return item;
      const lembrete = item.lembrete || { data: '', texto: '' };
      return { ...item, lembrete: { ...lembrete, data: valor } };
    }));
    limparErro(`lembrete_${idx}`);
  };

  const toggleLembreteItem = (idx: number) => {
    setItens(itens.map((item, i) => {
      if (i !== idx) return item;
      if (item.lembrete) { const { lembrete, ...rest } = item; return rest as ItemLote; }
      return { ...item, lembrete: { data: '', texto: '' } };
    }));
  };

  const removerItem = (idx: number) => {
    if (itens.length > 1) {
      setItens(itens.filter((_, i) => i !== idx));
      if (itemExpandido === idx) setItemExpandido(null);
    }
  };

  const handleSalvar = () => {
    const novosErros: Record<string, string> = {};
    const vP = validarProcesso(processo);
    if (!vP.valido) novosErros.processo = vP.erro!;
    const vD = validarData(data);
    if (!vD.valido) novosErros.data = vD.erro!;
    itens.forEach((item, idx) => {
      if (item.lembrete) {
        const vL = validarDataLembrete(item.lembrete.data);
        if (!vL.valido) { novosErros[`lembrete_${idx}`] = vL.erro!; setItemExpandido(idx); }
      }
    });
    setErros(novosErros);
    if (Object.keys(novosErros).length > 0) return;

    onSalvar(itens.map((item) => ({
      processo, data, tipo: item.tipo, qtdAtos: item.qtdAtos, nota: '',
      lembrete: item.lembrete?.data ? { data: item.lembrete.data, texto: item.lembrete.texto } : undefined,
    })));
  };

  return (
    <div className="p-4 space-y-4">
      <div className="p-3 bg-blue-50 border border-blue-200 rounded text-sm text-blue-700">
        <p className="font-medium mb-0.5">Modo Lote</p>
        <p className="text-xs text-blue-600">Registre vários tipos de movimentação no mesmo processo de uma vez.</p>
      </div>

      <CampoForm label="Nº do Processo *">
        <input type="text" value={processo}
          onChange={(e) => { setProcesso(mascaraProcesso(e.target.value)); limparErro('processo'); }}
          placeholder="0000000-00.0000.0.00.0000"
          className={`w-full px-3 py-2 text-sm border rounded focus:outline-none focus:ring-1 font-mono ${
            erros.processo ? 'border-red-400 focus:border-red-500 focus:ring-red-200' : 'border-gray-300 focus:border-slate-500 focus:ring-slate-500'
          }`} autoFocus />
        {erros.processo && <p className="text-xs text-red-600 mt-1 flex items-center gap-1"><AlertCircle size={11} />{erros.processo}</p>}
      </CampoForm>

      <CampoForm label="Data *">
        <DatePicker value={data} onChange={(v) => { setData(v); limparErro('data'); }} erro={erros.data} />
        {erros.data && <p className="text-xs text-red-600 mt-1 flex items-center gap-1"><AlertCircle size={11} />{erros.data}</p>}
      </CampoForm>

      {/* Movimentações */}
      <div>
        <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 block">Movimentações</label>
        <div className="space-y-2">
          {itens.map((item, idx) => (
            <div key={idx} className="bg-gray-50 border border-gray-200 rounded overflow-hidden">
              <div className="flex items-center gap-2 p-2">
                <select value={item.tipo} onChange={(e) => atualizarItem(idx, 'tipo', e.target.value)}
                  className="flex-1 px-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:border-slate-500 bg-white">
                  {Object.entries(CATEGORIAS_MOVIMENTACAO).map(([cat, tipos]) => (
                    <optgroup key={cat} label={cat}>
                      {tipos.map((t) => (
                        <option key={t} value={t}>{TIPOS_MOVIMENTACAO[t]}</option>
                      ))}
                    </optgroup>
                  ))}
                </select>
                <input type="number" min={1} value={item.qtdAtos}
                  onChange={(e) => atualizarItem(idx, 'qtdAtos', parseInt(e.target.value) || 1)}
                  className="w-14 px-2 py-1.5 text-sm text-center border border-gray-300 rounded focus:outline-none focus:border-slate-500" />
                <button onClick={() => setItemExpandido(itemExpandido === idx ? null : idx)}
                  className={`p-1.5 rounded transition-colors ${item.lembrete ? 'text-amber-500 bg-amber-50 hover:bg-amber-100' : 'text-gray-400 hover:bg-gray-200'}`}
                  title="Lembrete"><Bell size={13} /></button>
                <button onClick={() => removerItem(idx)} disabled={itens.length === 1}
                  className="p-1 text-gray-400 hover:text-red-500 disabled:opacity-30 transition-colors"><X size={14} /></button>
              </div>

              {itemExpandido === idx && (
                <div className="border-t border-gray-200 bg-white p-2.5 space-y-2">
                  <button type="button" onClick={() => toggleLembreteItem(idx)}
                    className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded text-xs transition-colors ${
                      item.lembrete ? 'bg-amber-50 text-amber-700 border border-amber-200' : 'bg-gray-100 text-gray-500 border border-gray-200'
                    }`}>
                    <Bell size={12} />
                    <span className="font-medium">{item.lembrete ? 'Lembrete ativo' : 'Adicionar lembrete'}</span>
                    <span className={`ml-auto w-7 h-3.5 rounded-full relative transition-colors ${item.lembrete ? 'bg-amber-500' : 'bg-gray-300'}`}>
                      <span className={`absolute top-0.5 w-2.5 h-2.5 bg-white rounded-full transition-transform shadow-sm ${item.lembrete ? 'left-3.5' : 'left-0.5'}`} />
                    </span>
                  </button>
                  {item.lembrete && (
                    <div className="space-y-2 pt-1">
                      <DatePicker value={item.lembrete.data} onChange={(v) => setLembreteDataItem(idx, v)}
                        erro={erros[`lembrete_${idx}`]} placeholder="Data do lembrete *" />
                      {erros[`lembrete_${idx}`] && <p className="text-xs text-red-600 mt-0.5 flex items-center gap-1"><AlertCircle size={10} />{erros[`lembrete_${idx}`]}</p>}
                      <input type="text" value={item.lembrete.texto}
                        onChange={(e) => atualizarItem(idx, 'lembreteTexto', e.target.value)}
                        placeholder="Descrição (opcional)"
                        className="w-full px-2.5 py-1.5 text-xs border border-gray-300 rounded focus:outline-none focus:border-slate-500" />
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
        <button onClick={adicionarItem}
          className="mt-2 flex items-center gap-1 text-xs font-medium text-slate-600 hover:text-slate-800 transition-colors">
          <Plus size={13} /> Adicionar movimentação
        </button>
      </div>

      {/* Resumo */}
      <div className="p-3 bg-gray-50 border border-gray-200 rounded">
        <p className="text-xs text-gray-500">
          <span className="font-semibold text-gray-700">{itens.length}</span> tipo(s) •{' '}
          <span className="font-semibold text-gray-700">{itens.reduce((a, i) => a + i.qtdAtos, 0)}</span> ato(s)
          {itens.some((i) => i.lembrete) && (
            <> • <span className="font-semibold text-amber-600">{itens.filter((i) => i.lembrete).length}</span> lembrete(s)</>
          )}
        </p>
      </div>

      <div className="flex gap-2 pt-2">
        <button onClick={handleSalvar}
          className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-sm font-semibold text-white bg-slate-800 rounded hover:bg-slate-700 transition-colors">
          <Save size={14} /> Salvar tudo
        </button>
        <button onClick={onCancelar}
          className="px-4 py-2 text-sm font-medium text-gray-500 border border-gray-300 rounded hover:bg-gray-50 transition-colors">
          Cancelar
        </button>
      </div>
    </div>
  );
}
