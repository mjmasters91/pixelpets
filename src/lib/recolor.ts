import { findSpecies, findTint } from "../data/catalog";

const cache = new Map<string, string>();

function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return [0, 0, l];
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h = 0;
  if (max === r) h = ((g - b) / d) % 6;
  else if (max === g) h = (b - r) / d + 2;
  else h = (r - g) / d + 4;
  h *= 60;
  if (h < 0) h += 360;
  return [h, s, l];
}

function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const hp = ((h % 360) + 360) % 360 / 60;
  const x = c * (1 - Math.abs((hp % 2) - 1));
  let r = 0;
  let g = 0;
  let b = 0;
  if (hp < 1) [r, g, b] = [c, x, 0];
  else if (hp < 2) [r, g, b] = [x, c, 0];
  else if (hp < 3) [r, g, b] = [0, c, x];
  else if (hp < 4) [r, g, b] = [0, x, c];
  else if (hp < 5) [r, g, b] = [x, 0, c];
  else [r, g, b] = [c, 0, x];
  const m = l - c / 2;
  return [r + m, g + m, b + m];
}

function shortest(from: number, to: number) {
  let delta = to - from;
  while (delta > 180) delta -= 360;
  while (delta < -180) delta += 360;
  return delta;
}

export async function portraitUrl(src: string, speciesSlug: string, tintSlug: string) {
  const key = `${src}|${tintSlug}`;
  const hit = cache.get(key);
  if (hit) return hit;
  const tint = findTint(tintSlug);
  const species = findSpecies(speciesSlug);
  if (!tint || !species || tint.slug === "natural" || species.exclusive) {
    cache.set(key, src);
    return src;
  }
  const delta = shortest(species.baseHue, tint.hue);
  const image = await loadImage(src);
  const canvas = document.createElement("canvas");
  canvas.width = image.naturalWidth;
  canvas.height = image.naturalHeight;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return src;
  ctx.drawImage(image, 0, 0);
  const frame = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = frame.data;
  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] < 8) continue;
    const r = data[i] / 255;
    const g = data[i + 1] / 255;
    const b = data[i + 2] / 255;
    const [h, s, l] = rgbToHsl(r, g, b);
    if (s < 0.16 || l < 0.12 || l > 0.97) continue;
    const [nr, ng, nb] = hslToRgb(
      h + delta,
      Math.min(1, s * tint.satMul),
      Math.min(0.96, Math.max(0.05, l + tint.lightAdd)),
    );
    data[i] = Math.round(nr * 255);
    data[i + 1] = Math.round(ng * 255);
    data[i + 2] = Math.round(nb * 255);
  }
  ctx.putImageData(frame, 0, 0);
  const url = canvas.toDataURL("image/png");
  cache.set(key, url);
  return url;
}

function loadImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("The portrait did not load."));
    image.src = src;
  });
}
