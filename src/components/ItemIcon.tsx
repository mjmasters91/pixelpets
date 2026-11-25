import type { Category } from "../data/catalog";

const ACCENTS = ["#f0b429", "#2eb6c7", "#f07830", "#8a64c4", "#e36b9a", "#3e9b55", "#5aa2e6"];

function accent(slug: string) {
  let h = 0;
  for (const c of slug) h = (h * 33 + c.charCodeAt(0)) >>> 0;
  return ACCENTS[h % ACCENTS.length];
}

export function ItemIcon({ slug, category }: { slug: string; category: Category | string }) {
  const fill = accent(slug);
  return (
    <svg className="item-icon" viewBox="0 0 64 64" aria-hidden="true">
      <rect x="6" y="6" width="52" height="52" rx="18" fill="#fff" stroke="#2c241c" strokeWidth="3" />
      <ellipse cx="32" cy="24" rx="14" ry="8" fill="#fff" opacity=".55" />
      {category === "toy" && <circle cx="32" cy="36" r="12" fill={fill} stroke="#2c241c" strokeWidth="3" />}
      {category === "groom" && <path d="M24 18h16v8H24zM22 26h20l-2 22H24z" fill={fill} stroke="#2c241c" strokeWidth="3" strokeLinejoin="round" />}
      {category === "treat" && <path d="M18 34c0-10 28-10 28 0 0 10-6 16-14 16S18 44 18 34z" fill={fill} stroke="#2c241c" strokeWidth="3" />}
      {category === "misc" && <path d="M32 16l4 10h10l-8 6 3 10-9-6-9 6 3-10-8-6h10z" fill={fill} stroke="#2c241c" strokeWidth="3" />}
      {category === "weapon" && <path d="M18 46 L40 16 h6 L24 46z" fill={fill} stroke="#2c241c" strokeWidth="3" />}
      {category === "shield" && <path d="M32 14 l16 6 v12 c0 12-8 18-16 22 c-8-4-16-10-16-22 V20z" fill={fill} stroke="#2c241c" strokeWidth="3" />}
      {category === "potion" && <path d="M26 18 h12 v6 l6 8 v16 a8 8 0 0 1-8 8 h-8 a8 8 0 0 1-8-8 V32 l6-8z" fill={fill} stroke="#2c241c" strokeWidth="3" />}
      {(category === "food" || !["toy", "groom", "treat", "misc", "weapon", "shield", "potion"].includes(category)) && (
        <path d="M18 30c2-12 26-12 28 0 1 14-6 20-14 20S17 44 18 30z" fill={fill} stroke="#2c241c" strokeWidth="3" />
      )}
    </svg>
  );
}
