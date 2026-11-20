export const shouldShowConnectHandles = (
  isConnectable: boolean | undefined,
  hasIncoming: boolean,
  hasOutgoing: boolean,
): readonly [showTarget: boolean, showSource: boolean] => {
  if (isConnectable === true) return [true, true] as const;
  return [hasIncoming, hasOutgoing] as const;
};
