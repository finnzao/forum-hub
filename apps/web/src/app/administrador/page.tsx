import React from 'react';
import { Package, Calendar } from 'lucide-react';
import { Cabecalho } from '../componentes/layout/Cabecalho';
import { Rodape } from '../componentes/layout/Rodape';
import { CartaoModulo } from '../componentes/cartoes/CartaoModulo';
import { CartaoEstatistica } from '../componentes/cartoes/CartaoEstatistica';

export default function PaginaAdministrador() {
  return (
    <div className="min-h-screen bg-slate-50">
      <Cabecalho 
        nomeUsuario="Usuário Admin"
        subtitulo="Perfil Administrativo"
        tipoPerfil="administrador"
      />

      <main className="max-w-7xl mx-auto px-8 py-12">
        {/* Seção de Título */}
        <div className="mb-12">
          <h2 className="text-2xl font-bold text-slate-900 mb-3">
            Painel Administrativo
          </h2>
          <p className="text-slate-600 text-base leading-relaxed max-w-3xl">
            Controle centralizado de recursos institucionais com rastreabilidade completa e autonomia operacional.
          </p>
        </div>

        {/* Cartões de Módulos */}
        <div className="mb-12">
          <h3 className="text-lg font-bold text-slate-900 mb-6 uppercase tracking-wide">
            Módulos do Sistema
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <CartaoModulo
              icone={<Package size={28} strokeWidth={2} />}
              titulo="Inventário"
              descricao="Gestão patrimonial com controle de tombos, categorias, localizações e movimentações. Auditoria completa de todas as operações."
              href="/administrador/inventario"
              estatisticas={{
                rotulo: 'itens cadastrados',
                valor: 247,
                variante: 'padrao',
              }}
            />
            <CartaoModulo
              icone={<Calendar size={28} strokeWidth={2} />}
              titulo="Férias"
              descricao="Controle de solicitações, aprovações e calendário anual. Relatórios de cobertura e exportação em PDF."
              href="/administrador/ferias"
              estatisticas={{
                rotulo: 'solicitações pendentes',
                valor: 3,
                variante: 'aviso',
              }}
            />
          </div>
        </div>

        {/* Estatísticas Rápidas */}
        <div>
          <h3 className="text-lg font-bold text-slate-900 mb-6 uppercase tracking-wide">
            Resumo Operacional
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <CartaoEstatistica
              titulo="Patrimônio Total"
              valor={247}
              descricao="+12 itens adicionados este mês"
              icone={<Package size={24} strokeWidth={2} />}
              corDestaque="text-slate-600"
            />
            <CartaoEstatistica
              titulo="Férias Aprovadas"
              valor={18}
              descricao="Referente ao ano corrente"
              icone={<Calendar size={24} strokeWidth={2} />}
              corDestaque="text-slate-600"
            />
          </div>
        </div>
      </main>

      <Rodape />
    </div>
  );
}
