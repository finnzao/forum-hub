// componentes/ModalAcoesItem.tsx
import React, { useState } from 'react';
import { X, ArrowRight, Edit, Trash2 } from 'lucide-react';
import { ItemInventario } from '../types/inventario';
import { Badge } from './Badge';
import { AutocompleteInput } from './AutocompleteInput';

interface ModalAcoesItemProps {
  item: ItemInventario | null;
  aberto: boolean;
  onFechar: () => void;
  onTransferir: (itemId: string, novaLocalizacao: string) => void;
  onEditar: (item: ItemInventario) => void;
  onExcluir: (itemId: string) => void;
  localizacoes: string[];
}

type AcaoAtiva = 'visualizar' | 'transferir' | 'editar' | 'confirmarExclusao';

export const ModalAcoesItem: React.FC<ModalAcoesItemProps> = ({
  item,
  aberto,
  onFechar,
  onTransferir,
  onEditar,
  onExcluir,
  localizacoes,
}) => {
  const [acaoAtiva, setAcaoAtiva] = useState<AcaoAtiva>('visualizar');
  const [novaLocalizacao, setNovaLocalizacao] = useState('');
  const [itemEditado, setItemEditado] = useState<ItemInventario | null>(null);

  if (!aberto || !item) return null;

  const resetarEstado = () => {
    setAcaoAtiva('visualizar');
    setNovaLocalizacao('');
    setItemEditado(null);
  };

  const handleFechar = () => {
    resetarEstado();
    onFechar();
  };

  const handleTransferir = () => {
    if (novaLocalizacao.trim()) {
      onTransferir(item.id, novaLocalizacao);
      handleFechar();
    }
  };

  const handleSalvarEdicao = () => {
    if (itemEditado) {
      onEditar(itemEditado);
      handleFechar();
    }
  };

  const handleExcluir = () => {
    onExcluir(item.id);
    handleFechar();
  };

  const obterCorStatus = (status: string) => {
    switch (status) {
      case 'ativo':
        return 'sucesso';
      case 'manutencao':
        return 'aviso';
      case 'baixado':
        return 'perigo';
      default:
        return 'neutro';
    }
  };

  const iniciarEdicao = () => {
    setItemEditado({ ...item });
    setAcaoAtiva('editar');
  };

  // Visualização padrão
  if (acaoAtiva === 'visualizar') {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
        <div className="bg-white max-w-2xl w-full max-h-[90vh] overflow-y-auto border-2 border-slate-300">
          <div className="flex items-start justify-between p-6 border-b-2 border-slate-200">
            <div>
              <h2 className="text-2xl font-bold text-slate-900 mb-2">{item.nome}</h2>
              <div className="flex items-center gap-2">
                <Badge variante={obterCorStatus(item.status)}>
                  {item.status.toUpperCase()}
                </Badge>
                <Badge variante="neutro">{item.categoria}</Badge>
              </div>
            </div>
            <button onClick={handleFechar} className="p-2 hover:bg-slate-100 transition-colors">
              <X size={24} className="text-slate-600" />
            </button>
          </div>

          <div className="p-6 space-y-6">
            {item.descricao && (
              <div>
                <h3 className="text-sm font-bold text-slate-600 uppercase tracking-wide mb-2">
                  Descrição
                </h3>
                <p className="text-slate-700">{item.descricao}</p>
              </div>
            )}

            <div>
              <h3 className="text-sm font-bold text-slate-600 uppercase tracking-wide mb-3">
                Tombos
              </h3>
              <div className="flex flex-wrap gap-2">
                {item.tombos.map((tombo, index) => (
                  <Badge
                    key={index}
                    variante={tombo.tipo === 'azul' ? 'info' : 'neutro'}
                    tamanho="grande"
                  >
                    {tombo.tipo.toUpperCase()}: {tombo.numero}
                  </Badge>
                ))}
              </div>
            </div>

            <div>
              <h3 className="text-sm font-bold text-slate-600 uppercase tracking-wide mb-2">
                Localização Atual
              </h3>
              <p className="text-slate-700 font-semibold">{item.localizacaoAtual}</p>
            </div>

            <div>
              <h3 className="text-sm font-bold text-slate-600 uppercase tracking-wide mb-2">
                Data de Aquisição
              </h3>
              <p className="text-slate-700">
                {new Date(item.dataAquisicao).toLocaleDateString('pt-BR')}
              </p>
            </div>

            {item.observacoes && (
              <div>
                <h3 className="text-sm font-bold text-slate-600 uppercase tracking-wide mb-2">
                  Observações
                </h3>
                <p className="text-slate-700">{item.observacoes}</p>
              </div>
            )}
          </div>

          <div className="p-6 border-t-2 border-slate-200 bg-slate-50 grid grid-cols-3 gap-3">
            <button
              onClick={() => setAcaoAtiva('transferir')}
              className="flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold transition-colors"
            >
              <ArrowRight size={18} />
              Transferir
            </button>
            <button
              onClick={iniciarEdicao}
              className="flex items-center justify-center gap-2 px-4 py-3 bg-slate-600 hover:bg-slate-700 text-white font-semibold transition-colors"
            >
              <Edit size={18} />
              Editar
            </button>
            <button
              onClick={() => setAcaoAtiva('confirmarExclusao')}
              className="flex items-center justify-center gap-2 px-4 py-3 bg-red-600 hover:bg-red-700 text-white font-semibold transition-colors"
            >
              <Trash2 size={18} />
              Excluir
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Transferência
  if (acaoAtiva === 'transferir') {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
        <div className="bg-white max-w-xl w-full border-2 border-slate-300">
          <div className="flex items-start justify-between p-6 border-b-2 border-slate-200">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 text-blue-700 border-2 border-blue-200">
                <ArrowRight size={24} />
              </div>
              <h2 className="text-xl font-bold text-slate-900">Transferir Item</h2>
            </div>
            <button onClick={handleFechar} className="p-2 hover:bg-slate-100 transition-colors">
              <X size={24} className="text-slate-600" />
            </button>
          </div>

          <div className="p-6 space-y-4">
            <div>
              <p className="text-sm text-slate-600 mb-1">Item:</p>
              <p className="font-bold text-slate-900">{item.nome}</p>
            </div>

            <div>
              <p className="text-sm text-slate-600 mb-1">Localização atual:</p>
              <p className="font-semibold text-slate-700">{item.localizacaoAtual}</p>
            </div>

            <AutocompleteInput
              label="Nova Localização"
              value={novaLocalizacao}
              onChange={setNovaLocalizacao}
              sugestoes={localizacoes.filter((loc) => loc !== item.localizacaoAtual)}
              placeholder="Digite ou selecione o destino"
              obrigatorio
            />
          </div>

          <div className="p-6 border-t-2 border-slate-200 bg-slate-50 flex gap-3">
            <button
              onClick={() => setAcaoAtiva('visualizar')}
              className="flex-1 px-6 py-3 border-2 border-slate-200 hover:border-slate-400 text-slate-700 font-semibold transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={handleTransferir}
              disabled={!novaLocalizacao.trim()}
              className="flex-1 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Confirmar Transferência
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Edição
  if (acaoAtiva === 'editar' && itemEditado) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
        <div className="bg-white max-w-2xl w-full max-h-[90vh] overflow-y-auto border-2 border-slate-300">
          <div className="flex items-start justify-between p-6 border-b-2 border-slate-200">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-slate-100 text-slate-700 border-2 border-slate-200">
                <Edit size={24} />
              </div>
              <h2 className="text-xl font-bold text-slate-900">Editar Item</h2>
            </div>
            <button onClick={handleFechar} className="p-2 hover:bg-slate-100 transition-colors">
              <X size={24} className="text-slate-600" />
            </button>
          </div>

          <div className="p-6 space-y-6">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">Nome</label>
              <input
                type="text"
                value={itemEditado.nome}
                onChange={(e) => setItemEditado({ ...itemEditado, nome: e.target.value })}
                className="w-full px-4 py-2 border-2 border-slate-200 focus:border-slate-400 focus:outline-none text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                Descrição
              </label>
              <textarea
                value={itemEditado.descricao || ''}
                onChange={(e) =>
                  setItemEditado({ ...itemEditado, descricao: e.target.value })
                }
                className="w-full px-4 py-2 border-2 border-slate-200 focus:border-slate-400 focus:outline-none text-sm"
                rows={3}
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">Status</label>
              <select
                value={itemEditado.status}
                onChange={(e) =>
                  setItemEditado({
                    ...itemEditado,
                    status: e.target.value as 'ativo' | 'manutencao' | 'baixado',
                  })
                }
                className="w-full px-4 py-2 border-2 border-slate-200 focus:border-slate-400 focus:outline-none text-sm"
              >
                <option value="ativo">Ativo</option>
                <option value="manutencao">Manutenção</option>
                <option value="baixado">Baixado</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                Observações
              </label>
              <textarea
                value={itemEditado.observacoes || ''}
                onChange={(e) =>
                  setItemEditado({ ...itemEditado, observacoes: e.target.value })
                }
                className="w-full px-4 py-2 border-2 border-slate-200 focus:border-slate-400 focus:outline-none text-sm"
                rows={2}
              />
            </div>
          </div>

          <div className="p-6 border-t-2 border-slate-200 bg-slate-50 flex gap-3">
            <button
              onClick={() => setAcaoAtiva('visualizar')}
              className="flex-1 px-6 py-3 border-2 border-slate-200 hover:border-slate-400 text-slate-700 font-semibold transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={handleSalvarEdicao}
              className="flex-1 px-6 py-3 bg-slate-700 hover:bg-slate-800 text-white font-semibold transition-colors"
            >
              Salvar Alterações
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Confirmação de exclusão
  if (acaoAtiva === 'confirmarExclusao') {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
        <div className="bg-white max-w-md w-full border-2 border-red-300">
          <div className="flex items-start justify-between p-6 border-b-2 border-red-200 bg-red-50">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-100 text-red-700 border-2 border-red-200">
                <Trash2 size={24} />
              </div>
              <h2 className="text-xl font-bold text-red-900">Confirmar Exclusão</h2>
            </div>
            <button onClick={handleFechar} className="p-2 hover:bg-red-100 transition-colors">
              <X size={24} className="text-red-700" />
            </button>
          </div>

          <div className="p-6">
            <p className="text-slate-700 mb-4">
              Tem certeza que deseja excluir o item <strong>{item.nome}</strong>?
            </p>
            <p className="text-sm text-red-600 font-semibold">
              Esta ação não pode ser desfeita.
            </p>
          </div>

          <div className="p-6 border-t-2 border-slate-200 bg-slate-50 flex gap-3">
            <button
              onClick={() => setAcaoAtiva('visualizar')}
              className="flex-1 px-6 py-3 border-2 border-slate-200 hover:border-slate-400 text-slate-700 font-semibold transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={handleExcluir}
              className="flex-1 px-6 py-3 bg-red-600 hover:bg-red-700 text-white font-semibold transition-colors"
            >
              Confirmar Exclusão
            </button>
          </div>
        </div>
      </div>
    );
  }

  return null;
};
