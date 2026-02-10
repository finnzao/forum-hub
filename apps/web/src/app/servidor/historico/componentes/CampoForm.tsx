import React from 'react';

interface CampoFormProps {
  label: string;
  children: React.ReactNode;
}

export function CampoForm({ label, children }: CampoFormProps) {
  return (
    <div>
      <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5 block">
        {label}
      </label>
      {children}
    </div>
  );
}
