import { createContext, useContext, useState, type ReactNode } from 'react';
import { RunningSuggesterModal, type RunningSuggesterPrefill } from '../components/RunningSuggesterModal';
import { StrengthSuggesterModal, type StrengthSuggesterPrefill } from '../components/StrengthSuggesterModal';

interface SuggestersContextValue {
  openRunning: (prefill?: RunningSuggesterPrefill) => void;
  openStrength: (prefill?: StrengthSuggesterPrefill) => void;
}

const SuggestersContext = createContext<SuggestersContextValue | null>(null);

export function useSuggesters(): SuggestersContextValue {
  const ctx = useContext(SuggestersContext);
  if (!ctx) throw new Error('useSuggesters must be used inside <SuggestersProvider>');
  return ctx;
}

interface ProviderProps {
  children: ReactNode;
}

export function SuggestersProvider({ children }: ProviderProps) {
  const [runningOpen, setRunningOpen] = useState(false);
  const [runningPrefill, setRunningPrefill] = useState<RunningSuggesterPrefill | undefined>();
  const [strengthOpen, setStrengthOpen] = useState(false);
  const [strengthPrefill, setStrengthPrefill] = useState<StrengthSuggesterPrefill | undefined>();

  const openRunning = (prefill?: RunningSuggesterPrefill) => {
    setRunningPrefill(prefill);
    setRunningOpen(true);
  };
  const openStrength = (prefill?: StrengthSuggesterPrefill) => {
    setStrengthPrefill(prefill);
    setStrengthOpen(true);
  };

  return (
    <SuggestersContext.Provider value={{ openRunning, openStrength }}>
      {children}
      <RunningSuggesterModal
        isOpen={runningOpen}
        onClose={() => setRunningOpen(false)}
        prefill={runningPrefill}
      />
      <StrengthSuggesterModal
        isOpen={strengthOpen}
        onClose={() => setStrengthOpen(false)}
        prefill={strengthPrefill}
      />
    </SuggestersContext.Provider>
  );
}
