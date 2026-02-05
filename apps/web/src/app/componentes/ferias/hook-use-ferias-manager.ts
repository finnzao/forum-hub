import { useState, useEffect, useCallback } from 'react';
import {
  Ausencia,
  Funcionario,
  Setor,
  EstatisticasFerias,
  FiltrosAusencia,
  ResultadoValidacao,
} from '../tipos/ferias';
import { validarAusencia } from '../utils/validacaoFerias';
import { contarDiasCorridos, contarDiasUteis } from '../utils/datas';

/**
 * Hook customizado para gerenciar o sistema de férias
 * Centraliza a lógica de negócio e estado
 */
export function useFeriasManager() {
  // Estado
  const [ausencias, setAusencias] = useState<Ausencia[]>([]);
  const [funcionarios, setFuncionarios] = useState<Funcionario[]>([]);
  const [setores, setSetores] = useState<Setor[]>([]);
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  // Carregar dados iniciais (mock - em produção seria API)
  useEffect(() => {
    carregarDadosIniciais();
  }, []);

  const carregarDadosIniciais = useCallback(async () => {
    setLoading(true);
    try {
      // Mock data - em produção, seria chamada à API
      const setoresMock: Setor[] = [
        {
          id: '1',
          nome: 'Cartório Cível',
          limiteAusenciasSimultaneas: 1,
          totalFuncionarios: 8,
          criadoEm: new Date('2024-01-01'),
          atualizadoEm: new Date('2024-01-01'),
        },
        {
          id: '2',
          nome: 'Cartório Criminal',
          limiteAusenciasSimultaneas: 1,
          totalFuncionarios: 6,
          criadoEm: new Date('2024-01-01'),
          atualizadoEm: new Date('2024-01-01'),
        },
        {
          id: '3',
          nome: 'Distribuição',
          limiteAusenciasSimultaneas: 2,
          totalFuncionarios: 12,
          criadoEm: new Date('2024-01-01'),
          atualizadoEm: new Date('2024-01-01'),
        },
      ];

      const funcionariosMock: Funcionario[] = [
        {
          id: '1',
          nome: 'Maria Silva',
          email: 'maria.silva@forum.gov.br',
          setorId: '1',
          status: 'ativo',
          diasFeriasRestantes: 30,
          criadoEm: new Date('2024-01-01'),
          atualizadoEm: new Date('2024-01-01'),
        },
        {
          id: '2',
          nome: 'João Santos',
          email: 'joao.santos@forum.gov.br',
          setorId: '3',
          status: 'ativo',
          diasFeriasRestantes: 15,
          criadoEm: new Date('2024-01-01'),
          atualizadoEm: new Date('2024-01-01'),
        },
        {
          id: '3',
          nome: 'Ana Costa',
          email: 'ana.costa@forum.gov.br',
          setorId: '1',
          status: 'ativo',
          diasFeriasRestantes: 30,
          criadoEm: new Date('2024-01-01'),
          atualizadoEm: new Date('2024-01-01'),
        },
      ];

      // Adicionar referências de setor aos funcionários
      const funcionariosComSetor = funcionariosMock.map(func => ({
        ...func,
        setor: setoresMock.find(s => s.id === func.setorId),
      }));

      const ausenciasMock: Ausencia[] = [
        {
          id: '1',
          funcionarioId: '1',
          setorId: '1',
          tipo: 'ferias',
          dataInicio: new Date('2026-02-15'),
          dataFim: new Date('2026-02-28'),
          diasCorridos: 14,
          diasUteis: 10,
          status: 'pendente',
          solicitadoEm: new Date('2026-02-01'),
        },
        {
          id: '2',
          funcionarioId: '2',
          setorId: '3',
          tipo: 'licenca-premio',
          dataInicio: new Date('2026-03-01'),
          dataFim: new Date('2026-03-10'),
          diasCorridos: 10,
          diasUteis: 7,
          status: 'aprovada',
          solicitadoEm: new Date('2026-02-01'),
          aprovadoEm: new Date('2026-02-03'),
          aprovadoPor: 'Admin',
        },
      ];

      // Adicionar referências aos objetos relacionados
      const ausenciasCompletas = ausenciasMock.map(aus => ({
        ...aus,
        funcionario: funcionariosComSetor.find(f => f.id === aus.funcionarioId),
        setor: setoresMock.find(s => s.id === aus.setorId),
      }));

      setSetores(setoresMock);
      setFuncionarios(funcionariosComSetor);
      setAusencias(ausenciasCompletas);
      setErro(null);
    } catch (error) {
      setErro('Erro ao carregar dados');
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, []);

  // Validar ausência antes de registrar
  const validarNovaAusencia = useCallback(
    (dados: {
      funcionarioId: string;
      setorId: string;
      dataInicio: Date;
      dataFim: Date;
    }): ResultadoValidacao => {
      const setor = setores.find(s => s.id === dados.setorId);
      if (!setor) {
        return {
          valido: false,
          conflitos: [],
          mensagem: 'Setor não encontrado',
        };
      }

      // Filtrar apenas ausências aprovadas ou pendentes
      const ausenciasAtivas = ausencias.filter(
        a => a.status === 'aprovada' || a.status === 'pendente'
      );

      return validarAusencia(dados, ausenciasAtivas, setor);
    },
    [ausencias, setores]
  );

  // Registrar nova ausência
  const registrarAusencia = useCallback(
    async (dados: {
      funcionarioId: string;
      setorId: string;
      tipo: string;
      dataInicio: Date;
      dataFim: Date;
      motivo?: string;
    }): Promise<{ sucesso: boolean; validacao: ResultadoValidacao }> => {
      setLoading(true);
      try {
        // Validar ausência
        const validacao = validarNovaAusencia(dados);

        // Se houver conflitos, retornar resultado sem criar
        if (!validacao.valido) {
          return { sucesso: false, validacao };
        }

        // Criar nova ausência
        const novaAusencia: Ausencia = {
          id: `ausencia-${Date.now()}`,
          funcionarioId: dados.funcionarioId,
          setorId: dados.setorId,
          tipo: dados.tipo as any,
          dataInicio: dados.dataInicio,
          dataFim: dados.dataFim,
          diasCorridos: contarDiasCorridos(dados.dataInicio, dados.dataFim),
          diasUteis: contarDiasUteis(dados.dataInicio, dados.dataFim),
          motivo: dados.motivo,
          status: 'pendente',
          solicitadoEm: new Date(),
          funcionario: funcionarios.find(f => f.id === dados.funcionarioId),
          setor: setores.find(s => s.id === dados.setorId),
        };

        // Adicionar à lista
        setAusencias(prev => [...prev, novaAusencia]);
        setErro(null);

        return { sucesso: true, validacao };
      } catch (error) {
        setErro('Erro ao registrar ausência');
        console.error(error);
        return {
          sucesso: false,
          validacao: { valido: false, conflitos: [], mensagem: 'Erro ao processar' },
        };
      } finally {
        setLoading(false);
      }
    },
    [validarNovaAusencia, funcionarios, setores]
  );

  // Aprovar ausência
  const aprovarAusencia = useCallback(async (id: string) => {
    setLoading(true);
    try {
      setAusencias(prev =>
        prev.map(aus =>
          aus.id === id
            ? {
                ...aus,
                status: 'aprovada',
                aprovadoEm: new Date(),
                aprovadoPor: 'Admin',
              }
            : aus
        )
      );
      setErro(null);
    } catch (error) {
      setErro('Erro ao aprovar ausência');
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, []);

  // Rejeitar ausência
  const rejeitarAusencia = useCallback(
    async (id: string, motivoRejeicao: string) => {
      setLoading(true);
      try {
        setAusencias(prev =>
          prev.map(aus =>
            aus.id === id
              ? {
                  ...aus,
                  status: 'rejeitada',
                  rejeitadoEm: new Date(),
                  rejeitadoPor: 'Admin',
                  motivoRejeicao,
                }
              : aus
          )
        );
        setErro(null);
      } catch (error) {
        setErro('Erro ao rejeitar ausência');
        console.error(error);
      } finally {
        setLoading(false);
      }
    },
    []
  );

  // Obter estatísticas
  const obterEstatisticas = useCallback((): EstatisticasFerias => {
    return {
      totalPendentes: ausencias.filter(a => a.status === 'pendente').length,
      totalAprovadas: ausencias.filter(a => a.status === 'aprovada').length,
      totalRejeitadas: ausencias.filter(a => a.status === 'rejeitada').length,
      totalFuncionarios: funcionarios.length,
      conflitosAtivos: 0, // Calcular baseado em validações
    };
  }, [ausencias, funcionarios]);

  // Filtrar ausências
  const filtrarAusencias = useCallback(
    (filtros: FiltrosAusencia): Ausencia[] => {
      return ausencias.filter(ausencia => {
        if (filtros.setorId && ausencia.setorId !== filtros.setorId) return false;
        if (filtros.funcionarioId && ausencia.funcionarioId !== filtros.funcionarioId)
          return false;
        if (filtros.status && ausencia.status !== filtros.status) return false;
        if (filtros.tipo && ausencia.tipo !== filtros.tipo) return false;
        return true;
      });
    },
    [ausencias]
  );

  return {
    // Estado
    ausencias,
    funcionarios,
    setores,
    loading,
    erro,
    // Ações
    registrarAusencia,
    aprovarAusencia,
    rejeitarAusencia,
    validarNovaAusencia,
    obterEstatisticas,
    filtrarAusencias,
    recarregar: carregarDadosIniciais,
  };
}
