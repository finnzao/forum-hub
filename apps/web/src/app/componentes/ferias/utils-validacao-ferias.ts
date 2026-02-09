import { Ausencia, ConflitoDia, ResultadoValidacao, Setor } from '../../tipos/ferias';
import { obterDatasEntre, formatarData } from './datas';

/**
 * Valida se uma ausência pode ser registrada sem ultrapassar o limite do setor
 * 
 * Esta é a função principal de validação do sistema.
 * Verifica dia a dia se o limite de ausências simultâneas será respeitado.
 */
export function validarAusencia(
  novaAusencia: {
    setorId: string;
    dataInicio: Date;
    dataFim: Date;
    funcionarioId?: string;
  },
  ausenciasExistentes: Ausencia[],
  setor: Setor
): ResultadoValidacao {
  const conflitos: ConflitoDia[] = [];
  
  // Obter todas as datas do período da nova ausência
  const datasNovaAusencia = obterDatasEntre(
    novaAusencia.dataInicio,
    novaAusencia.dataFim
  );
  
  // Para cada dia do período, verificar quantas ausências já existem
  for (const data of datasNovaAusencia) {
    const ausenciasNesteDia = contarAusenciasNoDia(
      data,
      novaAusencia.setorId,
      ausenciasExistentes,
      novaAusencia.funcionarioId // Excluir a própria ausência em caso de edição
    );
    
    // Se adicionar mais uma ausência ultrapassar o limite, registrar conflito
    if (ausenciasNesteDia + 1 > setor.limiteAusenciasSimultaneas) {
      const funcionariosAusentes = obterFuncionariosAusentesNoDia(
        data,
        novaAusencia.setorId,
        ausenciasExistentes
      );
      
      conflitos.push({
        data,
        ausenciasNoDia: ausenciasNesteDia,
        limiteSetor: setor.limiteAusenciasSimultaneas,
        funcionariosAusentes,
      });
    }
  }
  
  // Se houver conflitos, retornar inválido
  if (conflitos.length > 0) {
    const mensagem = gerarMensagemConflito(conflitos, setor);
    return {
      valido: false,
      conflitos,
      mensagem,
    };
  }
  
  // Sem conflitos, aprovação permitida
  return {
    valido: true,
    conflitos: [],
    mensagem: 'Ausência pode ser aprovada sem conflitos.',
  };
}

/**
 * Conta quantas ausências aprovadas existem em um dia específico para um setor
 */
function contarAusenciasNoDia(
  data: Date,
  setorId: string,
  ausencias: Ausencia[],
  excluirFuncionarioId?: string
): number {
  return ausencias.filter(ausencia => {
    // Ignorar ausências rejeitadas ou canceladas
    if (ausencia.status === 'rejeitada' || ausencia.status === 'cancelada') {
      return false;
    }
    
    // Se for uma edição, ignorar a ausência do próprio funcionário
    if (excluirFuncionarioId && ausencia.funcionarioId === excluirFuncionarioId) {
      return false;
    }
    
    // Verificar se a ausência é do mesmo setor
    if (ausencia.setorId !== setorId) {
      return false;
    }
    
    // Verificar se a data está dentro do período da ausência
    const dataInicio = new Date(ausencia.dataInicio);
    const dataFim = new Date(ausencia.dataFim);
    dataInicio.setHours(0, 0, 0, 0);
    dataFim.setHours(0, 0, 0, 0);
    data.setHours(0, 0, 0, 0);
    
    return data >= dataInicio && data <= dataFim;
  }).length;
}

/**
 * Retorna lista de funcionários ausentes em um dia específico
 */
function obterFuncionariosAusentesNoDia(
  data: Date,
  setorId: string,
  ausencias: Ausencia[]
): string[] {
  return ausencias
    .filter(ausencia => {
      if (ausencia.status === 'rejeitada' || ausencia.status === 'cancelada') {
        return false;
      }
      
      if (ausencia.setorId !== setorId) {
        return false;
      }
      
      const dataInicio = new Date(ausencia.dataInicio);
      const dataFim = new Date(ausencia.dataFim);
      dataInicio.setHours(0, 0, 0, 0);
      dataFim.setHours(0, 0, 0, 0);
      data.setHours(0, 0, 0, 0);
      
      return data >= dataInicio && data <= dataFim;
    })
    .map(ausencia => ausencia.funcionario?.nome || 'Funcionário não identificado');
}

/**
 * Gera mensagem descritiva dos conflitos encontrados
 */
function gerarMensagemConflito(conflitos: ConflitoDia[], setor: Setor): string {
  const totalDiasConflito = conflitos.length;
  const primeiroConflito = conflitos[0];
  
  let mensagem = `O setor "${setor.nome}" permite no máximo ${setor.limiteAusenciasSimultaneas} `;
  mensagem += setor.limiteAusenciasSimultaneas === 1 ? 'pessoa ausente' : 'pessoas ausentes';
  mensagem += ' ao mesmo tempo. ';
  
  if (totalDiasConflito === 1) {
    mensagem += `Conflito detectado no dia ${formatarData(primeiroConflito.data)}. `;
  } else {
    mensagem += `Conflitos detectados em ${totalDiasConflito} dias. `;
  }
  
  if (primeiroConflito.funcionariosAusentes.length > 0) {
    mensagem += `Já ausente(s): ${primeiroConflito.funcionariosAusentes.join(', ')}.`;
  }
  
  return mensagem;
}

/**
 * Verifica se há conflitos entre múltiplas ausências
 */
export function verificarConflitosMassa(
  ausencias: Ausencia[],
  setores: Setor[]
): Map<string, ConflitoDia[]> {
  const conflitosMap = new Map<string, ConflitoDia[]>();
  
  // Agrupar ausências por setor
  const ausenciasPorSetor = new Map<string, Ausencia[]>();
  
  for (const ausencia of ausencias) {
    if (!ausenciasPorSetor.has(ausencia.setorId)) {
      ausenciasPorSetor.set(ausencia.setorId, []);
    }
    ausenciasPorSetor.get(ausencia.setorId)!.push(ausencia);
  }
  
  // Verificar conflitos em cada setor
  for (const [setorId, ausenciasSetor] of ausenciasPorSetor) {
    const setor = setores.find(s => s.id === setorId);
    if (!setor) continue;
    
    // Obter todas as datas únicas
    const datasUnicas = new Set<string>();
    for (const ausencia of ausenciasSetor) {
      const datas = obterDatasEntre(ausencia.dataInicio, ausencia.dataFim);
      datas.forEach(d => datasUnicas.add(d.toISOString().split('T')[0]));
    }
    
    // Verificar cada data
    const conflitosSetor: ConflitoDia[] = [];
    for (const dataStr of datasUnicas) {
      const data = new Date(dataStr);
      const count = contarAusenciasNoDia(data, setorId, ausenciasSetor);
      
      if (count > setor.limiteAusenciasSimultaneas) {
        const funcionariosAusentes = obterFuncionariosAusentesNoDia(
          data,
          setorId,
          ausenciasSetor
        );
        
        conflitosSetor.push({
          data,
          ausenciasNoDia: count,
          limiteSetor: setor.limiteAusenciasSimultaneas,
          funcionariosAusentes,
        });
      }
    }
    
    if (conflitosSetor.length > 0) {
      conflitosMap.set(setorId, conflitosSetor);
    }
  }
  
  return conflitosMap;
}

/**
 * Valida campos obrigatórios de uma ausência
 */
export function validarCamposAusencia(ausencia: {
  funcionarioId: string;
  dataInicio: Date;
  dataFim: Date;
  tipo: string;
}): { valido: boolean; erros: string[] } {
  const erros: string[] = [];
  
  if (!ausencia.funcionarioId) {
    erros.push('Funcionário é obrigatório');
  }
  
  if (!ausencia.dataInicio) {
    erros.push('Data de início é obrigatória');
  }
  
  if (!ausencia.dataFim) {
    erros.push('Data de fim é obrigatória');
  }
  
  if (ausencia.dataInicio && ausencia.dataFim) {
    if (ausencia.dataInicio > ausencia.dataFim) {
      erros.push('Data de início deve ser anterior à data de fim');
    }
  }
  
  if (!ausencia.tipo) {
    erros.push('Tipo de ausência é obrigatório');
  }
  
  return {
    valido: erros.length === 0,
    erros,
  };
}
