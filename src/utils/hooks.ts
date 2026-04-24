import { useState, useEffect } from 'react';

// useDebounce: atrasa atualização de um valor para evitar re-renderizações excessivas
// value: valor a ser debounced | delay: tempo de espera em ms
export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);
    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);
  return debouncedValue;
}

