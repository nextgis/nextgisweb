export function formatCrs(name: string, auth: string | null) {
  return auth ? `${name} (${auth})` : name;
}
