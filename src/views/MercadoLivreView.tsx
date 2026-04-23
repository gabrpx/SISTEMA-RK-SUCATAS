// src/views/MercadoLivreView.tsx
import React from 'react';

interface MercadoLivreProps {
  theme?: 'light' | 'dark';
}

export const MercadoLivre: React.FC<MercadoLivreProps> = ({ theme = 'light' }) => {
  return (
    <div className={`p-4 ${theme === 'dark' ? 'bg-gray-900 text-white' : 'bg-white text-gray-900'}`}>
      <h1 className="text-2xl font-bold mb-4">Mercado Livre</h1>
      <div className="space-y-4">
        <div className="bg-yellow-50 dark:bg-gray-800 p-4 rounded-lg">
          <p className="text-gray-600 dark:text-gray-300">
            Integração com Mercado Livre.
          </p>
          <p className="text-sm text-gray-500 mt-2">
            Gerencie seus anúncios, vendas e envios diretamente do sistema.
          </p>
        </div>
        
        <div className="border rounded-lg p-4 dark:border-gray-700">
          <h2 className="font-semibold mb-2">Resumo de vendas ML</h2>
          <p className="text-gray-500 text-sm">Carregando dados...</p>
        </div>
      </div>
    </div>
  );
};

export default MercadoLivre;