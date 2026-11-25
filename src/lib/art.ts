export function artPath(file: string) {
  const base = import.meta.env.BASE_URL.replace(/\/?$/, "/");
  return `${base}art/pass2/${file}`;
}
