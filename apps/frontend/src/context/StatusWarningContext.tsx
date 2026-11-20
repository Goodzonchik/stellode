import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { StatusWarningModal } from '../components/StatusWarningModal';

type StatusWarningTarget =
  | { readonly kind: 'componentVersion'; readonly componentVersionId: string }
  | { readonly kind: 'application'; readonly applicationId: string };

type StatusWarningContextValue = {
  readonly openForComponentVersion: (componentVersionId: string) => void;
  readonly openForApplication: (applicationId: string) => void;
};

const StatusWarningContext = createContext<StatusWarningContextValue | undefined>(undefined);

export const StatusWarningProvider = (props: { readonly children: ReactNode }) => {
  const [target, setTarget] = useState<StatusWarningTarget | null>(null);
  const close = useCallback(() => setTarget(null), []);
  const value = useMemo<StatusWarningContextValue>(
    () => ({
      openForComponentVersion: (componentVersionId: string) =>
        setTarget({ kind: 'componentVersion', componentVersionId }),
      openForApplication: (applicationId: string) =>
        setTarget({ kind: 'application', applicationId }),
    }),
    [],
  );
  return (
    <StatusWarningContext.Provider value={value}>
      {props.children}
      <StatusWarningModal target={target} onClose={close} />
    </StatusWarningContext.Provider>
  );
};

export const useStatusWarning = (): StatusWarningContextValue => {
  const context = useContext(StatusWarningContext);
  if (context === undefined) {
    throw new Error('useStatusWarning must be used within StatusWarningProvider');
  }
  return context;
};
