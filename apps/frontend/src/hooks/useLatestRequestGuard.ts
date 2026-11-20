import { useCallback, useRef } from 'react';

type IsLatest = () => boolean;

export const useLatestRequestGuard = (): (() => IsLatest) => {
  const generationRef = useRef(0);
  return useCallback((): IsLatest => {
    const token = generationRef.current + 1;
    generationRef.current = token;
    return () => generationRef.current === token;
  }, []);
};
