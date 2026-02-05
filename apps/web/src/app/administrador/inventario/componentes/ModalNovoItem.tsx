// componentes/ModalNovoItem.tsx
import React, { useState } from 'react';
import { X, Plus } from 'lucide-react';
import { FormularioNovoItem } from '../types/inventario';
import { AutocompleteInput } from './AutocompleteInput';

interface ModalNovoItemProps {
  aberto: boolean;
  onFechar: () => void;
  onSalvar: (item: FormularioNovoItem) => void;
  categorias: string[];
  localizacoes: string[];
}

export const ModalNovoItem: React.FC<ModalNovoItemProps> = ({
  aberto,
  onFechar,
  onSalvar,
  categorias,
  localizacoes,
}) => {
  const dataAtual = new Date().toISOString().split('T')[0];
  
  const [formulario, setFormulario] = useState<FormularioNovoItem>({
    nome: '',
    descricao: '',
    categoria: '',
    tomboAzul: '',
    tomboCinza: '',
    localizacaoAtual: '',
    dataAquisicao: dataAtual,
    observacoes: '',
  });

  const [erros, setErros] = useState<Record<string, string>>({});

  if (!aberto) return null;

  const validarFormulario = (): boolean => {
    const novosErros: Record<string, string> = {};

    if (!formulario.nome.trim()) {
      novosErros.nome = 'Nome é obrigatório';
    }

    if (!formulario.tomboAzul?.trim() && !formulario.tomboCinza?.trim()) {
      novosErros.tombos = 'Pelo menos um tombo (azul ou cinza) é obrigatório';
    }

    if (!formulario.localizacaoAtual.trim()) {
      novosErros.localizacaoAtual = 'Localização é obrigatória';
    }

    if (!formulario.categoria.trim()) {
      novosErros.categoria = 'Categoria é obrigatória';
    }

    if (!formulario.dataAquisicao) {
      novosErros.dataAquisicao = 'Data de aquisição é obrigatória';
    }

    setErros(novosErros);
    return Object.keys(novosErros).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (validarFormulario()) {
      onSalvar(formulario);
      handleFechar();
    }
  };

  const handleFechar = () => {
    setFormulario({
      nome: '',
      descricao: '',
      categoria: '',
      tomboAzul: '',
      tomboCinza: '',
      localizacaoAtual: '',
      dataAquisicao: dataAtual,
      observacoes: '',
    });
    setErros({});
    onFechar();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white max-w-2xl w-full max-h-[90vh] overflow-y-auto border-2 border-slate-300">
        {/* Cabeçalho */}
        <div className="flex items-start justify-between p-6 border-b-2 border-slate-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 text-blue-700 border-2 border-blue-200">
              <Plus size={24} />
            </div>
            <h2 className="text-2xl font-bold text-slate-900">Novo Item</h2>
          </div>
          <button
            onClick={handleFechar}
            className="p-2 hover:bg-slate-100 transition-colors"
          >
            <X size={24} className="text-slate-600" />
          </button>
        </div>

        {/* Formulário */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Nome */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              Nome do Item <span className="text-red-600">*</span>
            </label>
            <input
              type="text"
              value={formulario.nome}
              onChange={(e) => setFormulario({ ...formulario, nome: e.target.value })}
              className="w-full px-4 py-2 border-2 border-slate-200 focus:border-slate-400 focus:outline-none text-sm"
              placeholder="Ex: Notebook Dell Latitude 5420"
            />
            {erros.nome && (
              <p className="text-red-600 text-xs mt-1 font-semibold">{erros.nome}</p>
            )}
          </div>

          {/* Tombos */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              Tombos <span className="text-red-600">*</span>
              <span className="text-slate-500 font-normal ml-1">
                (pelo menos um obrigatório)
              </span>
            </label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-slate-600 mb-1">Tombo Azul</label>
                <input
                  type="text"
                  value={formulario.tomboAzul}
                  onChange={(e) =>
                    setFormulario({ ...formulario, tomboAzul: e.target.value })
                  }
                  className="w-full px-4 py-2 border-2 border-blue-200 focus:border-blue-400 focus:outline-none text-sm"
                  placeholder="Ex: TI-2024-001"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-600 mb-1">Tombo Cinza</label>
                <input
                  type="text"
                  value={formulario.tomboCinza}
                  onChange={(e) =>
                    setFormulario({ ...formulario, tomboCinza: e.target.value })
                  }
                  className="w-full px-4 py-2 border-2 border-slate-300 focus:border-slate-400 focus:outline-none text-sm"
                  placeholder="Ex: PAT-2024-001"
                />
              </div>
            </div>
            {erros.tombos && (
              <p className="text-red-600 text-xs mt-1 font-semibold">{erros.tombos}</p>
            )}
          </div>

          {/* Localização e Categoria */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <AutocompleteInput
              label="Localização"
              value={formulario.localizacaoAtual}
              onChange={(value) =>
                setFormulario({ ...formulario, localizacaoAtual: value })
              }
              sugestoes={localizacoes}
              placeholder="Digite ou selecione"
              obrigatorio
            />
            {erros.localizacaoAtual && (
              <p className="text-red-600 text-xs mt-1 font-semibold col-span-2">
                {erros.localizacaoAtual}
              </p>
            )}

            <AutocompleteInput
              label="Categoria"
              value={formulario.categoria}
              onChange={(value) => setFormulario({ ...formulario, categoria: value })}
              sugestoes={categorias}
              placeholder="Digite ou selecione"
              obrigatorio
            />
            {erros.categoria && (
              <p className="text-red-600 text-xs mt-1 font-semibold col-span-2">
                {erros.categoria}
              </p>
            )}
          </div>

          {/* Data de Aquisição */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              Data de Aquisição <span className="text-red-600">*</span>
            </label>
            <input
              type="date"
              value={formulario.dataAquisicao}
              onChange={(e) =>
                setFormulario({ ...formulario, dataAquisicao: e.target.value })
              }
              className="w-full px-4 py-2 border-2 border-slate-200 focus:border-slate-400 focus:outline-none text-sm"
            />
            {erros.dataAquisicao && (
              <p className="text-red-600 text-xs mt-1 font-semibold">
                {erros.dataAquisicao}
              </p>
            )}
          </div>

          {/* Descrição */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              Descrição
            </label>
            <textarea
              value={formulario.descricao}
              onChange={(e) => setFormulario({ ...formulario, descricao: e.target.value })}
              className="w-full px-4 py-2 border-2 border-slate-200 focus:border-slate-400 focus:outline-none text-sm"
              rows={3}
              placeholder="Informações adicionais sobre o item"
            />
          </div>

          {/* Observações */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              Observações
            </label>
            <textarea
              value={formulario.observacoes}
              onChange={(e) =>
                setFormulario({ ...formulario, observacoes: e.target.value })
              }
              className="w-full px-4 py-2 border-2 border-slate-200 focus:border-slate-400 focus:outline-none text-sm"
              rows={2}
              placeholder="Observações gerais"
            />
          </div>

          {/* Botões */}
          <div className="flex gap-4 pt-4">
            <button
              type="button"
              onClick={handleFechar}
              className="flex-1 px-6 py-3 border-2 border-slate-200 hover:border-slate-400 text-slate-700 font-semibold transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="flex-1 px-6 py-3 bg-slate-700 hover:bg-slate-800 text-white font-semibold transition-colors"
            >
              Cadastrar Item
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
