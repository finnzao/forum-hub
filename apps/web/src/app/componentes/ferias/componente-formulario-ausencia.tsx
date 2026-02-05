import React, { useState, useEffect } from 'react';
import { Calendar, AlertCircle } from 'lucide-react';
import { Funcionario, TipoAusencia, Setor } from '../../tipos/ferias';
import { contarDiasCorridos, contarDiasUteis, formatarDataISO, parseDataISO } from '../../utils/datas';
import { validarCamposAusencia } from '../../utils/validacaoFerias';

interface FormularioAusenciaProps {
  funcionarios: Funcionario[];
  onSubmit: (dados: DadosAusencia) => void;
  onCancel: () => void;
  loading?: boolean;
  dadosIniciais?: Partial<DadosAusencia>;
}

export interface DadosAusencia {
  funcionarioId: string;
  setorId: string;
  tipo: TipoAusencia;
  dataInicio: Date;
  dataFim: Date;
  motivo?: string;
}

export const FormularioAusencia: React.FC<FormularioAusenciaProps> = ({
  funcionarios,
  onSubmit,
  onCancel,
  loading = false,
  dadosIniciais,
}) => {
  const [funcionarioSelecionado, setFuncionarioSelecionado] = useState<string>(
    dadosIniciais?.funcionarioId || ''
  );
  const [tipo, setTipo] = useState<TipoAusencia>(dadosIniciais?.tipo || 'ferias');
  const [dataInicio, setDataInicio] = useState<string>(
    dadosIniciais?.dataInicio ? formatarDataISO(dadosIniciais.dataInicio) : ''
  );
  const [dataFim, setDataFim] = useState<string>(
    dadosIniciais?.dataFim ? formatarDataISO(dadosIniciais.dataFim) : ''
  );
  const [motivo, setMotivo] = useState<string>(dadosIniciais?.motivo || '');
  const [erros, setErros] = useState<string[]>([]);

  const funcionario = funcionarios.find(f => f.id === funcionarioSelecionado);
  const diasCorridos = dataInicio && dataFim 
    ? contarDiasCorridos(parseDataISO(dataInicio), parseDataISO(dataFim))
    : 0;
  const diasUteis = dataInicio && dataFim
    ? contarDiasUteis(parseDataISO(dataInicio), parseDataISO(dataFim))
    : 0;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!funcionario) {
      setErros(['Selecione um funcionário']);
      return;
    }

    const dados: DadosAusencia = {
      funcionarioId: funcionarioSelecionado,
      setorId: funcionario.setorId,
      tipo,
      dataInicio: parseDataISO(dataInicio),
      dataFim: parseDataISO(dataFim),
      motivo: motivo.trim() || undefined,
    };

    const validacao = validarCamposAusencia(dados);
    if (!validacao.valido) {
      setErros(validacao.erros);
      return;
    }

    setErros([]);
    onSubmit(dados);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Erros de validação */}
      {erros.length > 0 && (
        <div className="p-4 bg-red-50 border-2 border-red-200">
          <div className="flex gap-3">
            <AlertCircle size={20} className="text-red-600 flex-shrink-0" />
            <div>
              <h4 className="font-bold text-red-900 mb-2">
                Corrija os seguintes erros:
              </h4>
              <ul className="list-disc list-inside space-y-1 text-sm text-red-800">
                {erros.map((erro, index) => (
                  <li key={index}>{erro}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Seleção de funcionário */}
      <div>
        <label className="block text-xs font-bold text-slate-600 uppercase tracking-wide mb-2">
          Funcionário *
        </label>
        <select
          value={funcionarioSelecionado}
          onChange={(e) => setFuncionarioSelecionado(e.target.value)}
          className="w-full px-4 py-3 border-2 border-slate-200 focus:border-slate-400 focus:outline-none text-slate-900 bg-white"
          disabled={loading}
          required
        >
          <option value="">Selecione um funcionário</option>
          {funcionarios.map((func) => (
            <option key={func.id} value={func.id}>
              {func.nome} - {func.setor?.nome}
            </option>
          ))}
        </select>
        {funcionario && (
          <p className="mt-2 text-sm text-slate-600">
            Setor: <strong>{funcionario.setor?.nome}</strong> • 
            Dias de férias restantes: <strong>{funcionario.diasFeriasRestantes}</strong>
          </p>
        )}
      </div>

      {/* Tipo de ausência */}
      <div>
        <label className="block text-xs font-bold text-slate-600 uppercase tracking-wide mb-2">
          Tipo de Ausência *
        </label>
        <select
          value={tipo}
          onChange={(e) => setTipo(e.target.value as TipoAusencia)}
          className="w-full px-4 py-3 border-2 border-slate-200 focus:border-slate-400 focus:outline-none text-slate-900 bg-white"
          disabled={loading}
          required
        >
          <option value="ferias">Férias</option>
          <option value="licenca-premio">Licença Prêmio</option>
          <option value="licenca-medica">Licença Médica</option>
          <option value="outros">Outros</option>
        </select>
      </div>

      {/* Período */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-xs font-bold text-slate-600 uppercase tracking-wide mb-2">
            Data de Início *
          </label>
          <div className="relative">
            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
            <input
              type="date"
              value={dataInicio}
              onChange={(e) => setDataInicio(e.target.value)}
              className="w-full pl-11 pr-4 py-3 border-2 border-slate-200 focus:border-slate-400 focus:outline-none text-slate-900"
              disabled={loading}
              required
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-600 uppercase tracking-wide mb-2">
            Data de Fim *
          </label>
          <div className="relative">
            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
            <input
              type="date"
              value={dataFim}
              onChange={(e) => setDataFim(e.target.value)}
              className="w-full pl-11 pr-4 py-3 border-2 border-slate-200 focus:border-slate-400 focus:outline-none text-slate-900"
              disabled={loading}
              required
            />
          </div>
        </div>
      </div>

      {/* Resumo do período */}
      {dataInicio && dataFim && diasCorridos > 0 && (
        <div className="p-4 bg-blue-50 border-2 border-blue-200">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-blue-700 font-semibold mb-1">Dias corridos</p>
              <p className="text-2xl font-bold text-blue-900">{diasCorridos}</p>
            </div>
            <div>
              <p className="text-blue-700 font-semibold mb-1">Dias úteis</p>
              <p className="text-2xl font-bold text-blue-900">{diasUteis}</p>
            </div>
          </div>
        </div>
      )}

      {/* Motivo/Observação */}
      <div>
        <label className="block text-xs font-bold text-slate-600 uppercase tracking-wide mb-2">
          Observação (opcional)
        </label>
        <textarea
          value={motivo}
          onChange={(e) => setMotivo(e.target.value)}
          className="w-full px-4 py-3 border-2 border-slate-200 focus:border-slate-400 focus:outline-none text-slate-900 resize-none"
          rows={3}
          placeholder="Informações adicionais sobre a ausência..."
          disabled={loading}
        />
      </div>

      {/* Botões */}
      <div className="flex gap-3 pt-6 border-t-2 border-slate-200">
        <button
          type="submit"
          disabled={loading}
          className="flex-1 px-6 py-3 bg-slate-900 hover:bg-slate-800 text-white font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Processando...' : 'Registrar Ausência'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          disabled={loading}
          className="px-6 py-3 bg-white border-2 border-slate-300 hover:border-slate-400 text-slate-700 font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Cancelar
        </button>
      </div>
    </form>
  );
};
