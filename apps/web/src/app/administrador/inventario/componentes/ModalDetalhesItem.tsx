// componentes/ModalDetalhesItem.tsx
import React from 'react';
import { X, MapPin, Calendar, DollarSign, Info } from 'lucide-react';
import { ItemInventario } from '../types/inventario';
import { Badge } from './Badge';

interface ModalDetalhesItemProps {
  item: ItemInventario | null;
  aberto: boolean;
  onFechar: () => void;
}

export const ModalDetalhesItem: React.FC<ModalDetalhesItemProps> = ({
  item,
  aberto,
  onFechar,
}) => {
  if (!aberto || !item) return null;

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

  const obterCorTombo = (tipo: string) => {
    return tipo === 'azul' ? 'info' : 'neutro';
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white max-w-2xl w-full max-h-[90vh] overflow-y-auto border-2 border-slate-300">
        {/* Cabeçalho */}
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
          <button
            onClick={onFechar}
            className="p-2 hover:bg-slate-100 transition-colors"
          >
            <X size={24} className="text-slate-600" />
          </button>
        </div>

        {/* Conteúdo */}
        <div className="p-6 space-y-6">
          {/* Descrição */}
          <div>
            <h3 className="text-sm font-bold text-slate-600 uppercase tracking-wide mb-2 flex items-center gap-2">
              <Info size={16} />
              Descrição
            </h3>
            <p className="text-slate-700">{item.descricao}</p>
          </div>

          {/* Tombos */}
          <div>
            <h3 className="text-sm font-bold text-slate-600 uppercase tracking-wide mb-3">
              Tombos
            </h3>
            <div className="flex flex-wrap gap-2">
              {item.tombos.map((tombo, index) => (
                <div key={index} className="flex items-center gap-2">
                  <Badge variante={obterCorTombo(tombo.tipo)} tamanho="grande">
                    {tombo.tipo.toUpperCase()}: {tombo.numero}
                  </Badge>
                </div>
              ))}
            </div>
          </div>

          {/* Informações de Aquisição */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h3 className="text-sm font-bold text-slate-600 uppercase tracking-wide mb-2 flex items-center gap-2">
                <Calendar size={16} />
                Data de Aquisição
              </h3>
              <p className="text-slate-700">
                {new Date(item.dataAquisicao).toLocaleDateString('pt-BR')}
              </p>
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-600 uppercase tracking-wide mb-2 flex items-center gap-2">
                <DollarSign size={16} />
                Valor de Aquisição
              </h3>
              <p className="text-slate-700">
                {item.valorAquisicao.toLocaleString('pt-BR', {
                  style: 'currency',
                  currency: 'BRL',
                })}
              </p>
            </div>
          </div>

          {/* Localização */}
          <div>
            <h3 className="text-sm font-bold text-slate-600 uppercase tracking-wide mb-2 flex items-center gap-2">
              <MapPin size={16} />
              Localização Atual
            </h3>
            <p className="text-slate-700 font-semibold">{item.localizacaoAtual}</p>
          </div>

          {/* Observações */}
          {item.observacoes && (
            <div>
              <h3 className="text-sm font-bold text-slate-600 uppercase tracking-wide mb-2">
                Observações
              </h3>
              <p className="text-slate-700">{item.observacoes}</p>
            </div>
          )}

          {/* Metadados */}
          <div className="pt-4 border-t border-slate-200">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-slate-500">
              <div>
                <span className="font-semibold">Criado em:</span>{' '}
                {new Date(item.criadoEm).toLocaleString('pt-BR')}
              </div>
              <div>
                <span className="font-semibold">Atualizado em:</span>{' '}
                {new Date(item.atualizadoEm).toLocaleString('pt-BR')}
              </div>
            </div>
          </div>
        </div>

        {/* Rodapé */}
        <div className="p-6 border-t-2 border-slate-200 bg-slate-50">
          <button
            onClick={onFechar}
            className="w-full px-6 py-3 bg-slate-700 hover:bg-slate-800 text-white font-semibold transition-colors"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};
