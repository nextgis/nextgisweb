import { createContext, use, useState } from "react";
import type { ReactNode } from "react";

import { InjectionContainer } from "./InjectionContainer";

const InjectionContext = createContext<InjectionContainer | null>(null);
InjectionContext.displayName = "InjectionContext";

export interface InjectionProviderProps {
  children: ReactNode;
  container?: InjectionContainer;
}

export function InjectionProvider({
  children,
  container: containerProp,
}: InjectionProviderProps) {
  const [container] = useState(() => new InjectionContainer());

  return (
    <InjectionContext value={containerProp ?? container}>
      {children}
    </InjectionContext>
  );
}

export function useInjection<Args extends unknown[], T>(
  factory: (...args: Args) => T,
  ...args: NoInfer<Args>
): T {
  const container = use(InjectionContext);
  if (container === null) {
    throw new Error("useInjection() requires an InjectionProvider");
  }
  return container.get(factory, ...args);
}
