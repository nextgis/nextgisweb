import { createContext, use } from "react";

import type { Display } from "../Display";

export interface DisplayContextValue {
  display: Display;
}

export const DisplayContext = createContext<DisplayContextValue | null>(null);
DisplayContext.displayName = "DisplayContext";

export function useOptionalDisplayContext(): DisplayContextValue | null {
  return use(DisplayContext);
}

export function useDisplayContext(): DisplayContextValue {
  const context = useOptionalDisplayContext();
  if (context === null) {
    throw new Error(
      "No context provided: useDisplayContext() can only be used in a descendant of <DisplayWidget>"
    );
  }
  return context;
}
