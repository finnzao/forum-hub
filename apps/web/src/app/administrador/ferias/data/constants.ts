import { CorSetor, Setor, Funcionario, Ausencia, MotivoConfig } from '../types/ferias';

export const MESES: string[] = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];

export const MOTIVOS: MotivoConfig[] = [
  { valor: 'ferias', rotulo: 'Férias', cor: '#ef6c00', corTexto: '#fff' },
  { valor: 'licenca_premio', rotulo: 'Lic. Prêmio', cor: '#7B1FA2', corTexto: '#fff' },
  { valor: 'licenca_medica', rotulo: 'Lic. Médica', cor: '#1565C0', corTexto: '#fff' },
  { valor: 'licenca_maternidade', rotulo: 'Lic. Maternidade', cor: '#E91E63', corTexto: '#fff' },
  { valor: 'outros', rotulo: 'Outros', cor: '#546E7A', corTexto: '#fff' },
];

export const CORES_SETOR: CorSetor[] = [
  { bg: '#4CAF50', light: '#C8E6C9', text: '#1B5E20' },
  { bg: '#2196F3', light: '#BBDEFB', text: '#0D47A1' },
  { bg: '#9C27B0', light: '#E1BEE7', text: '#4A148C' },
  { bg: '#FF9800', light: '#FFE0B2', text: '#E65100' },
  { bg: '#F44336', light: '#FFCDD2', text: '#B71C1C' },
  { bg: '#009688', light: '#B2DFDB', text: '#004D40' },
  { bg: '#795548', light: '#D7CCC8', text: '#3E2723' },
  { bg: '#607D8B', light: '#CFD8DC', text: '#263238' },
];

export const INITIAL_SETORES: Setor[] = [
  { id: '1', nome: 'Cartório Cível', limiteAusencias: 1, cor: 0 },
  { id: '2', nome: 'Distribuição', limiteAusencias: 2, cor: 1 },
  { id: '3', nome: 'Contadoria', limiteAusencias: 1, cor: 2 },
  { id: '4', nome: 'Administrativo', limiteAusencias: 2, cor: 3 },
  { id: '5', nome: 'Arquivo', limiteAusencias: 1, cor: 4 },
];

export const INITIAL_FUNCIONARIOS: Funcionario[] = [
  { id: '1', nome: 'Maria Silva', setorId: '1' },
  { id: '2', nome: 'João Santos', setorId: '1' },
  { id: '3', nome: 'Ana Costa', setorId: '1' },
  { id: '4', nome: 'Pedro Oliveira', setorId: '1' },
  { id: '5', nome: 'Julia Mendes', setorId: '2' },
  { id: '6', nome: 'Carlos Ferreira', setorId: '2' },
  { id: '7', nome: 'Beatriz Lima', setorId: '2' },
  { id: '8', nome: 'Rafael Souza', setorId: '2' },
  { id: '9', nome: 'Lucia Pereira', setorId: '2' },
  { id: '10', nome: 'Fernando Gomes', setorId: '3' },
  { id: '11', nome: 'Carla Dias', setorId: '3' },
  { id: '12', nome: 'Bruno Alves', setorId: '3' },
  { id: '13', nome: 'Mariana Rocha', setorId: '4' },
  { id: '14', nome: 'Diego Martins', setorId: '4' },
  { id: '15', nome: 'Patricia Lopes', setorId: '4' },
  { id: '16', nome: 'Thiago Reis', setorId: '5' },
  { id: '17', nome: 'Sandra Nunes', setorId: '5' },
];

export const INITIAL_AUSENCIAS: Ausencia[] = [
  { id: '1', funcionarioId: '1', dataInicio: '2026-01-05', dataFim: '2026-01-30', motivo: 'ferias' },
  { id: '2', funcionarioId: '3', dataInicio: '2026-03-16', dataFim: '2026-04-10', motivo: 'ferias' },
  { id: '3', funcionarioId: '5', dataInicio: '2026-02-02', dataFim: '2026-02-27', motivo: 'ferias' },
  { id: '4', funcionarioId: '6', dataInicio: '2026-06-01', dataFim: '2026-06-30', motivo: 'licenca_premio' },
  { id: '5', funcionarioId: '8', dataInicio: '2026-07-15', dataFim: '2026-08-14', motivo: 'ferias' },
  { id: '6', funcionarioId: '10', dataInicio: '2026-12-01', dataFim: '2026-12-31', motivo: 'ferias' },
  { id: '7', funcionarioId: '13', dataInicio: '2026-04-01', dataFim: '2026-04-30', motivo: 'licenca_premio' },
  { id: '8', funcionarioId: '16', dataInicio: '2026-10-01', dataFim: '2026-10-31', motivo: 'ferias' },
  { id: '9', funcionarioId: '2', dataInicio: '2026-08-03', dataFim: '2026-08-28', motivo: 'ferias' },
  { id: '10', funcionarioId: '11', dataInicio: '2026-05-15', dataFim: '2026-06-10', motivo: 'licenca_medica' },
  { id: '11', funcionarioId: '14', dataInicio: '2026-09-01', dataFim: '2026-09-30', motivo: 'ferias' },
  { id: '12', funcionarioId: '17', dataInicio: '2026-02-16', dataFim: '2026-03-15', motivo: 'licenca_premio' },
];
