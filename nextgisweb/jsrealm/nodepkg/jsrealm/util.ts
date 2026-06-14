export function stripIndex(name: string): string {
  return name.replace(/(?:\/index)?\.(js|tsx?)$/, "");
}
