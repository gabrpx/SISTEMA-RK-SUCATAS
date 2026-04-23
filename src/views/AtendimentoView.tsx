// src/views/AtendimentoView.tsx
import React from 'react';

interface AtendimentoProps {
  theme?: 'light' | 'dark';
}

export const Atendimento: React.FC<AtendimentoProps> = ({ theme = 'light' }) => {
  return (
    <div className={`p-4 ${theme === 'dark' ? 'bg-gray-900 text-white' : 'bg-white text-gray-900'}`}>
      <h1 className="text-2xl font-bold mb-4">Atendimento</h1>
      <div className="space-y-4">
        <div className="bg-blue-50 dark:bg-gray-800 p-4 rounded-lg">
          <p className="text-gray-600 dark:text-gray-300">
            Sistema de atendimento integrado com WhatsApp.
          </p>
          <p className="text-sm text-gray-500 mt-2">
            Em breve: chat em tempo real, histórico de conversas e respostas rápidas.
          </p>
        </div>
        
        {/* Lista de conversas - será implementada depois */}
        <div className="border rounded-lg p-4 dark:border-gray-700">
          <h2 className="font-semibold mb-2">Conversas recentes</h2>
          <p className="text-gray-500 text-sm">Nenhuma conversa no momento.</p>
        </div>
      </div>
    </div>
  );
};

export default Atendimento;