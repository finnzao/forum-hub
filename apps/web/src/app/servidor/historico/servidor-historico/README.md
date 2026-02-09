# Histórico de Trabalho - Módulo do Servidor

## Estrutura de Arquivos

Copie os arquivos para as respectivas pastas do seu projeto:

```
apps/web/src/
├── tipos/
│   └── historico.ts                          # Tipos compartilhados (DRY)
├── app/
│   ├── componentes/
│   │   ├── cartoes/
│   │   │   └── Distintivo.tsx                # Badge reutilizável (novo)
│   │   ├── formularios/
│   │   │   ├── BarraFiltros.tsx              # Barra de filtros (novo)
│   │   │   └── ModalNovoRegistro.tsx         # Modal de cadastro (novo)
│   │   ├── layout/
│   │   │   └── EstadoVazio.tsx               # Estado vazio (novo)
│   │   └── tabelas/
│   │       ├── LinhaRegistro.tsx             # Linha expandível (novo)
│   │       ├── TabelaRegistros.tsx           # Tabela agrupada (novo)
│   │       └── LinhaDoTempo.tsx              # Timeline por processo (novo)
│   └── servidor/
│       └── historico/
│           ├── page.tsx                      # Página principal
│           └── dados-mock.ts                 # Dados de desenvolvimento
```

## Componentes Reutilizáveis (DRY)

| Componente | Uso |
|---|---|
| `Distintivo` | Status, categorias, prioridades em qualquer módulo |
| `EstadoVazio` | Telas sem dados em qualquer listagem |
| `BarraFiltros` | Pode ser adaptado para Tarefas e Lembretes |
| `TabelaRegistros` | Padrão tabular reutilizável |
| `LinhaDoTempo` | Visualização cronológica por processo |

## Dependências Já Existentes no Projeto

- `lucide-react` (ícones)
- `next/link` (navegação)
- Tailwind CSS

## Componentes Existentes Utilizados

- `Cabecalho` (de `componentes/layout/Cabecalho`)
- `Rodape` (de `componentes/layout/Rodape`)
- `CartaoEstatistica` (de `componentes/cartoes/CartaoEstatistica`)

## Funcionalidades

1. **Registro de atividades** — Modal com campos: processo, partes, categoria, ação, observação, status
2. **Filtros** — Busca textual, categoria, status, intervalo de datas
3. **Duas visualizações** — Tabela (agrupada por data) e Linha do Tempo (agrupada por processo)
4. **Lembretes de prazo** — Vinculados a cada registro, com data e descrição
5. **Auditoria** — Cada registro tem data, hora, servidor e ID únicos
6. **Exportar** — Botão preparado para integração com API
