// componentes/AutocompleteInput.tsx
import React, { useState, useRef, useEffect } from 'react';

interface AutocompleteInputProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  sugestoes: string[];
  placeholder?: string;
  obrigatorio?: boolean;
}

export const AutocompleteInput: React.FC<AutocompleteInputProps> = ({
  label,
  value,
  onChange,
  sugestoes,
  placeholder,
  obrigatorio = false,
}) => {
  const [mostrarSugestoes, setMostrarSugestoes] = useState(false);
  const [sugestoesFiltradas, setSugestoesFiltradas] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickFora = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setMostrarSugestoes(false);
      }
    };

    document.addEventListener('mousedown', handleClickFora);
    return () => document.removeEventListener('mousedown', handleClickFora);
  }, []);

  const handleInputChange = (inputValue: string) => {
    onChange(inputValue);
    
    if (inputValue.trim()) {
      const filtradas = sugestoes.filter((sugestao) =>
        sugestao.toLowerCase().includes(inputValue.toLowerCase())
      );
      setSugestoesFiltradas(filtradas);
      setMostrarSugestoes(true);
    } else {
      setSugestoesFiltradas([]);
      setMostrarSugestoes(false);
    }
  };

  const handleSelecionarSugestao = (sugestao: string) => {
    onChange(sugestao);
    setMostrarSugestoes(false);
  };

  return (
    <div ref={containerRef} className="relative">
      <label className="block text-sm font-semibold text-slate-700 mb-2">
        {label}
        {obrigatorio && <span className="text-red-600 ml-1">*</span>}
      </label>
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={(e) => handleInputChange(e.target.value)}
        onFocus={() => value.trim() && setSugestoesFiltradas(
          sugestoes.filter((s) => s.toLowerCase().includes(value.toLowerCase()))
        ) && setMostrarSugestoes(true)}
        placeholder={placeholder}
        className="w-full px-4 py-2 border-2 border-slate-200 focus:border-slate-400 focus:outline-none text-sm"
      />
      {mostrarSugestoes && sugestoesFiltradas.length > 0 && (
        <div className="absolute z-10 w-full mt-1 bg-white border-2 border-slate-200 max-h-48 overflow-y-auto">
          {sugestoesFiltradas.map((sugestao, index) => (
            <button
              key={index}
              type="button"
              onClick={() => handleSelecionarSugestao(sugestao)}
              className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-100 transition-colors"
            >
              {sugestao}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
