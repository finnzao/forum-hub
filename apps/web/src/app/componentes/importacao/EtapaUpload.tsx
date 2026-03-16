// ============================================================
// componentes/importacao/EtapaUpload.tsx
// Etapa 1: Upload de arquivo XLSX/CSV com drag and drop
// ============================================================

'use client';

import React, { useState, useRef, useCallback } from 'react';
import { Upload, FileSpreadsheet, AlertCircle, Loader2, X } from 'lucide-react';
import { detectarFormato } from '../../lib/importacao';

interface EtapaUploadProps {
  carregando: boolean;
  erro: string | null;
  onUpload: (arquivo: File) => void;
}

export const EtapaUpload: React.FC<EtapaUploadProps> = ({ carregando, erro, onUpload }) => {
  const [dragAtivo, setDragAtivo] = useState(false);
  const [arquivoSelecionado, setArquivoSelecionado] = useState<File | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const processarArquivo = useCallback(
    (arquivo: File) => {
      setArquivoSelecionado(arquivo);
      onUpload(arquivo);
    },
    [onUpload],
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragAtivo(false);
      const arquivo = e.dataTransfer.files[0];
      if (arquivo) processarArquivo(arquivo);
    },
    [processarArquivo],
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragAtivo(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragAtivo(false);
  }, []);

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const arquivo = e.target.files?.[0];
      if (arquivo) processarArquivo(arquivo);
    },
    [processarArquivo],
  );

  const limpar = () => {
    setArquivoSelecionado(null);
    if (inputRef.current) inputRef.current.value = '';
  };

  return (
    <div>
      <h3 className="text-lg font-bold text-slate-900 mb-2">Upload de Planilha</h3>
      <p className="text-sm text-slate-600 mb-6">
        Importe arquivos XLSX ou CSV exportados do Exaudi ou outro sistema.
      </p>

      {/* Erro */}
      {erro && (
        <div className="mb-4 p-4 bg-red-50 border-2 border-red-200 flex items-start gap-3">
          <AlertCircle size={18} className="text-red-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-semibold text-red-900">Erro no upload</p>
            <p className="text-sm text-red-700 mt-1">{erro}</p>
          </div>
          <button onClick={limpar} className="text-red-400 hover:text-red-600">
            <X size={16} />
          </button>
        </div>
      )}

      {/* Zona de drop */}
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={() => !carregando && inputRef.current?.click()}
        className={`relative border-2 border-dashed p-12 text-center cursor-pointer transition-all ${
          carregando
            ? 'border-slate-300 bg-slate-50 cursor-wait'
            : dragAtivo
              ? 'border-slate-900 bg-slate-50'
              : 'border-slate-300 hover:border-slate-400 hover:bg-slate-50'
        }`}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".xlsx,.xls,.csv,.tsv"
          onChange={handleInputChange}
          className="hidden"
          disabled={carregando}
        />

        {carregando ? (
          <div className="flex flex-col items-center gap-4">
            <Loader2 size={40} className="text-slate-400 animate-spin" />
            <div>
              <p className="text-sm font-semibold text-slate-700">Processando arquivo...</p>
              <p className="text-xs text-slate-500 mt-1">Lendo e analisando dados da planilha</p>
            </div>
          </div>
        ) : arquivoSelecionado && !erro ? (
          <div className="flex flex-col items-center gap-4">
            <div className="w-14 h-14 bg-green-100 flex items-center justify-center">
              <FileSpreadsheet size={28} className="text-green-700" />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-900">{arquivoSelecionado.name}</p>
              <p className="text-xs text-slate-500 mt-1">
                {(arquivoSelecionado.size / 1024).toFixed(1)} KB •{' '}
                {detectarFormato(arquivoSelecionado.name)?.toUpperCase()}
              </p>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-4">
            <div className="w-14 h-14 bg-slate-100 flex items-center justify-center">
              <Upload size={28} className="text-slate-400" />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-700">
                Arraste um arquivo aqui ou <span className="text-slate-900 underline">clique para selecionar</span>
              </p>
              <p className="text-xs text-slate-500 mt-2">
                Formatos aceitos: <strong>.xlsx</strong>, <strong>.csv</strong> • Máximo: 20 MB
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Dica */}
      <div className="mt-6 p-4 bg-blue-50 border-2 border-blue-200">
        <p className="text-xs text-blue-800 leading-relaxed">
          <strong>Dica:</strong> Exporte a planilha do Exaudi no formato XLSX para melhor compatibilidade.
          Na próxima etapa você poderá mapear as colunas do arquivo para os campos do sistema,
          independente da estrutura original.
        </p>
      </div>
    </div>
  );
};
