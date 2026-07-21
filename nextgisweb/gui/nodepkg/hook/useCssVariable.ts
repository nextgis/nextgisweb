import { useMemo } from "react";

export function useCssVariable({
  name,
  defaultValue = "",
}: {
  name: `--${string}`;
  defaultValue: string;
}): string {
  const value = useMemo(
    () => getComputedStyle(document.documentElement).getPropertyValue(name),
    [name]
  );

  return value || defaultValue;
}
