import { createContext, useContext, useState, type ReactNode } from 'react';
import { UnitEntityType, type UnitEntity } from '@stellode/models';

interface UnitContextType {
  unit: UnitEntity | null;
  setUnit: (unit: UnitEntity | null) => void;
}

const UnitContext = createContext<UnitContextType | undefined>(undefined);

const STORAGE_KEY = 'currentUnit';

export function UnitProvider({ children }: { children: ReactNode }) {
  const [unit, setUnitState] = useState<UnitEntity | null>(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    const parsed = stored ? (JSON.parse(stored) as unknown) : null;
    if (
      parsed &&
      typeof parsed === 'object' &&
      'id' in parsed &&
      typeof (parsed as { id: unknown }).id === 'string' &&
      'name' in parsed &&
      typeof (parsed as { name: unknown }).name === 'string'
    ) {
      const record = parsed as {
        id: string;
        name: string;
        description?: string;
        type?: string;
      };
      return {
        id: record.id,
        name: record.name,
        ...(record.description !== undefined ? { description: record.description } : {}),
        type: UnitEntityType.Unit,
      };
    }
    return null;
  });

  const setUnit = (newUnit: UnitEntity | null) => {
    setUnitState(newUnit);
    if (newUnit) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newUnit));
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  };

  return <UnitContext.Provider value={{ unit, setUnit }}>{children}</UnitContext.Provider>;
}

export function useUnit() {
  const context = useContext(UnitContext);
  if (context === undefined) {
    throw new Error('useUnit must be used within a UnitProvider');
  }
  return context;
}
