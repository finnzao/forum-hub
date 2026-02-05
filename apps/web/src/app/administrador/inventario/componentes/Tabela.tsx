// componentes/Tabela.tsx
import React from 'react';

interface ColunaTabela<T> {
  chave: keyof T | string;
  titulo: string;
  largura?: string;
  renderizar?: (item: T) => React.ReactNode;
}

interface TabelaProps<T> {
  dados: T[];
  colunas: ColunaTabela<T>[];
  onCliqueLinha?: (item: T) => void;
  mensagemVazia?: string;
}

export function Tabela<T extends { id: string }>({ 
  dados, 
  colunas, 
  onCliqueLinha,
  mensagemVazia = 'Nenhum registro encontrado'
}: TabelaProps<T>) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse">
        <thead>
          <tr className="bg-slate-100 border-b-2 border-slate-300">
            {colunas.map((coluna, index) => (
              <th
                key={index}
                className="text-left px-4 py-3 text-sm font-bold text-slate-700 uppercase tracking-wide"
                style={{ width: coluna.largura }}
              >
                {coluna.titulo}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {dados.length === 0 ? (
            <tr>
              <td
                colSpan={colunas.length}
                className="text-center py-8 text-slate-500"
              >
                {mensagemVazia}
              </td>
            </tr>
          ) : (
            dados.map((item) => (
              <tr
                key={item.id}
                onClick={() => onCliqueLinha?.(item)}
                className={`border-b border-slate-200 ${
                  onCliqueLinha ? 'hover:bg-slate-50 cursor-pointer' : ''
                }`}
              >
                {colunas.map((coluna, indexColuna) => (
                  <td key={indexColuna} className="px-4 py-3 text-sm text-slate-700">
                    {coluna.renderizar 
                      ? coluna.renderizar(item)
                      : String(item[coluna.chave as keyof T] || '-')
                    }
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
