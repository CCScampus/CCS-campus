import { createContext, useContext, ReactNode } from 'react';
import { useSystemDefaults, SystemDefaults } from '@/hooks/useSystemDefaults';

interface SystemDefaultsContextType {
  defaults: SystemDefaults | null;
  loading: boolean;
  error: string | null;
  updateDefaults: (updates: Partial<SystemDefaults>) => Promise<void>;
  resetToDefault: (key: keyof SystemDefaults) => void;
}

const SystemDefaultsContext = createContext<SystemDefaultsContextType | undefined>(undefined);

export function SystemDefaultsProvider({ children }: { children: ReactNode }) {
  const systemDefaults = useSystemDefaults();

  return (
    <SystemDefaultsContext.Provider value={systemDefaults}>
      {children}
    </SystemDefaultsContext.Provider>
  );
}

export function useSystemDefaultsContext() {
  const context = useContext(SystemDefaultsContext);
  if (context === undefined) {
    throw new Error('useSystemDefaultsContext must be used within a SystemDefaultsProvider');
  }
  return context;
} 