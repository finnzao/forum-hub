'use client';

import React, { useState } from 'react';
import { Save, AlertCircle } from 'lucide-react';
import { RegistroHistorico, TipoMovimentacao } from '../types';
import { CampoForm } from './CampoForm';
import { DatePicker } from './DatePicker';
import { SelectMovimentacao } from './SelectMovimentacao';
import { mascaraProcesso, validarProcesso, validarData } from '../utils';

interface PainelEditarProps {
  registro: RegistroHistorico;
  onSalvar: (dados: Partial<RegistroHistorico>) => void;
  onCancelar: () => void;
}

export function PainelEditar({ registro, onSalvar, onCancelar }: PainelEditarProps) {
  const [processo, setProcesso] = useState(registro.processo);
  const [data, setData] = useState(registro.data);
  const [tipo, setTipo] = useState<TipoMovimentacao>(registro.tipo);
  const [qtdAtos, setQtdAtos] = useState(registro.qtdAtos);
  const [nota, setNota] = useState(registro.nota || '');
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
    setErros(novosErros);
    if (Object.keys(novosErros).length > 0) return;
    onSalvar({ processo, data, tipo, qtdAtos, nota });
  };

  return (
    <div className="p-4 space-y-4">
      <CampoForm label="Nº do Processo *">
        <input type="text" value={processo}
          onChange={(e) => { setProcesso(mascaraProcesso(e.target.value)); limparErro('processo'); }}
          className={`w-full px-3 py-2 text-sm border rounded focus:outline-none focus:ring-1 font-mono ${
            erros.processo ? 'border-red-400 focus:border-red-500 focus:ring-red-200' : 'border-gray-300 focus:border-slate-500 focus:ring-slate-500'
          }`} />
        {erros.processo && <p className="text-xs text-red-600 mt-1 flex items-center gap-1"><AlertCircle size={11} />{erros.processo}</p>}
      </CampoForm>

      <div className="grid grid-cols-2 gap-3">
        <CampoForm label="Data *">
          <DatePicker value={data} onChange={(v) => { setData(v); limparErro('data'); }} erro={erros.data} />
          {erros.data && <p className="text-xs text-red-600 mt-1 flex items-center gap-1"><AlertCircle size={11} />{erros.data}</p>}
        </CampoForm>
        <CampoForm label="Qtd Atos">
          <input type="number" min={1} value={qtdAtos}
            onChange={(e) => setQtdAtos(parseInt(e.target.value) || 1)}
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:border-slate-500 focus:ring-1 focus:ring-slate-500" />
        </CampoForm>
      </div>

      <CampoForm label="Tipo de Movimentação *">
        <SelectMovimentacao value={tipo} onChange={setTipo} />
      </CampoForm>

      <CampoForm label="Nota (opcional)">
        <textarea value={nota} onChange={(e) => setNota(e.target.value)} rows={3}
          className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:border-slate-500 focus:ring-1 focus:ring-slate-500 resize-none"
          placeholder="Observação..." />
      </CampoForm>

      <div className="flex gap-2 pt-2">
        <button onClick={handleSalvar}
          className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-sm font-semibold text-white bg-slate-800 rounded hover:bg-slate-700 transition-colors">
          <Save size={14} /> Salvar
        </button>
        <button onClick={onCancelar}
          className="px-4 py-2 text-sm font-medium text-gray-500 border border-gray-300 rounded hover:bg-gray-50 transition-colors">
          Cancelar
        </button>
      </div>
    </div>
  );
}
