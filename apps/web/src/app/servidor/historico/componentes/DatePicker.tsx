'use client';

import React, { useState, useRef, useEffect } from 'react';
import { ChevronUp, ChevronDown, Calendar } from 'lucide-react';

const MESES = [
  'janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
  'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro',
];
const DIAS_SEMANA = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];

interface DatePickerProps {
  value: string; // DD/MM/AAAA
  onChange: (value: string) => void;
  placeholder?: string;
  erro?: string;
  className?: string;
}

function parseDateBR(str: string): Date | null {
  const m = str.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!m) return null;
  const d = new Date(+m[3], +m[2] - 1, +m[1]);
  if (d.getDate() !== +m[1] || d.getMonth() !== +m[2] - 1) return null;
  return d;
}

function formatDateBR(d: Date): string {
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  return `${dd}/${mm}/${d.getFullYear()}`;
}

function getDaysGrid(year: number, month: number) {
  const first = new Date(year, month, 1);
  const startDay = first.getDay(); // 0=dom
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const cells: Array<{ day: number; currentMonth: boolean; date: Date }> = [];

  // Dias do mês anterior
  const prevMonthDays = new Date(year, month, 0).getDate();
  for (let i = startDay - 1; i >= 0; i--) {
    const d = prevMonthDays - i;
    cells.push({ day: d, currentMonth: false, date: new Date(year, month - 1, d) });
  }

  // Dias do mês atual
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push({ day: d, currentMonth: true, date: new Date(year, month, d) });
  }

  // Preencher até completar 42 (6 semanas)
  const remaining = 42 - cells.length;
  for (let d = 1; d <= remaining; d++) {
    cells.push({ day: d, currentMonth: false, date: new Date(year, month + 1, d) });
  }

  return cells;
}

function isSameDay(a: Date, b: Date) {
  return a.getDate() === b.getDate() && a.getMonth() === b.getMonth() && a.getFullYear() === b.getFullYear();
}

export function DatePicker({ value, onChange, placeholder = 'DD/MM/AAAA', erro, className = '' }: DatePickerProps) {
  const [aberto, setAberto] = useState(false);
  const parsed = parseDateBR(value);
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);

  const [viewYear, setViewYear] = useState(parsed?.getFullYear() ?? hoje.getFullYear());
  const [viewMonth, setViewMonth] = useState(parsed?.getMonth() ?? hoje.getMonth());

  const containerRef = useRef<HTMLDivElement>(null);
  const calRef = useRef<HTMLDivElement>(null);
  const [abrirParaCima, setAbrirParaCima] = useState(false);

  // Fechar ao clicar fora
  useEffect(() => {
    if (!aberto) return;
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setAberto(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [aberto]);

  // Posicionar para cima se necessário
  useEffect(() => {
    if (aberto && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const espacoAbaixo = window.innerHeight - rect.bottom;
      setAbrirParaCima(espacoAbaixo < 310);
    }
  }, [aberto]);

  // Sync view quando value muda por fora
  useEffect(() => {
    const p = parseDateBR(value);
    if (p) {
      setViewYear(p.getFullYear());
      setViewMonth(p.getMonth());
    }
  }, [value]);

  const cells = getDaysGrid(viewYear, viewMonth);

  const prevMonth = () => {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(viewYear - 1); }
    else setViewMonth(viewMonth - 1);
  };
  const nextMonth = () => {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(viewYear + 1); }
    else setViewMonth(viewMonth + 1);
  };

  const selectDay = (d: Date) => {
    onChange(formatDateBR(d));
    setAberto(false);
  };

  const limpar = () => {
    onChange('');
    setAberto(false);
  };

  const selecionarHoje = () => {
    onChange(formatDateBR(hoje));
    setAberto(false);
  };

  // Máscara no input
  const handleInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/\D/g, '').slice(0, 8);
    let masked = '';
    for (let i = 0; i < raw.length; i++) {
      if (i === 2 || i === 4) masked += '/';
      masked += raw[i];
    }
    onChange(masked);
  };

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <div className="relative">
        <input
          type="text"
          value={value}
          onChange={handleInput}
          placeholder={placeholder}
          onFocus={() => setAberto(true)}
          className={`w-full px-3 py-2 pr-9 text-sm border rounded focus:outline-none focus:ring-1 ${
            erro
              ? 'border-red-400 focus:border-red-500 focus:ring-red-200'
              : 'border-gray-300 focus:border-slate-500 focus:ring-slate-500'
          }`}
        />
        <button
          type="button"
          tabIndex={-1}
          onClick={() => setAberto(!aberto)}
          className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
        >
          <Calendar size={15} />
        </button>
      </div>

      {aberto && (
        <div
          ref={calRef}
          className={`absolute z-50 mt-1 bg-white border border-gray-200 rounded shadow-lg p-3 w-[260px] ${
            abrirParaCima ? 'bottom-full mb-1' : ''
          }`}
          style={abrirParaCima ? { bottom: '100%', marginBottom: 4 } : {}}
        >
          {/* Navegação mês/ano */}
          <div className="flex items-center justify-between mb-2">
            <button
              type="button"
              className="text-xs font-medium text-gray-700 hover:bg-gray-100 rounded px-2 py-1"
              onClick={(e) => { e.preventDefault(); }}
            >
              {MESES[viewMonth]} de {viewYear} ▾
            </button>
            <div className="flex gap-1">
              <button
                type="button"
                onClick={prevMonth}
                className="p-1 hover:bg-gray-100 rounded text-gray-500"
              >
                <ChevronUp size={14} />
              </button>
              <button
                type="button"
                onClick={nextMonth}
                className="p-1 hover:bg-gray-100 rounded text-gray-500"
              >
                <ChevronDown size={14} />
              </button>
            </div>
          </div>

          {/* Cabeçalho dias da semana */}
          <div className="grid grid-cols-7 mb-1">
            {DIAS_SEMANA.map((d, i) => (
              <div key={i} className="text-center text-[10px] font-semibold text-gray-400 py-1">
                {d}
              </div>
            ))}
          </div>

          {/* Dias */}
          <div className="grid grid-cols-7">
            {cells.map((cell, i) => {
              const isToday = isSameDay(cell.date, hoje);
              const isSelected = parsed && isSameDay(cell.date, parsed);
              return (
                <button
                  key={i}
                  type="button"
                  onClick={() => selectDay(cell.date)}
                  className={`
                    w-8 h-8 text-xs rounded flex items-center justify-center transition-colors
                    ${!cell.currentMonth ? 'text-gray-300' : 'text-gray-700 hover:bg-gray-100'}
                    ${isToday && !isSelected ? 'font-bold text-blue-600' : ''}
                    ${isSelected ? 'bg-blue-600 text-white hover:bg-blue-700 font-bold' : ''}
                  `}
                >
                  {cell.day}
                </button>
              );
            })}
          </div>

          {/* Rodapé: Limpar / Hoje */}
          <div className="flex justify-between mt-2 pt-2 border-t border-gray-100">
            <button
              type="button"
              onClick={limpar}
              className="text-xs text-blue-600 hover:text-blue-800 font-medium px-1"
            >
              Limpar
            </button>
            <button
              type="button"
              onClick={selecionarHoje}
              className="text-xs text-blue-600 hover:text-blue-800 font-medium px-1"
            >
              Hoje
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
