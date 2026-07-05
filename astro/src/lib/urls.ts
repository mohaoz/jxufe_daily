export function withBase(path: string): string {
  const suffix = path.startsWith('/') ? path.slice(1) : path;
  return `${import.meta.env.BASE_URL}${suffix}`;
}
