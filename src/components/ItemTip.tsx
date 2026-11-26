import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { ItemIcon } from "./ItemIcon";

export type ItemFacts = {
  slug: string;
  name: string;
  category: string;
  description?: string;
  hunger?: number;
  mood?: number;
  gearPower?: number;
  reusable?: boolean;
  price?: number;
};

function kindLabel(category: string) {
  if (category === "food") return "Food";
  if (category === "treat") return "Treat";
  if (category === "toy") return "Toy";
  if (category === "groom") return "Charm";
  if (category === "weapon" || category === "shield" || category === "potion") return "Battle";
  return "Keepsake";
}

export function effectLines(item: ItemFacts) {
  const lines: string[] = [];
  if (item.hunger) lines.push(`${item.hunger > 0 ? "+" : ""}${item.hunger} hunger`);
  if (item.mood) lines.push(`${item.mood > 0 ? "+" : ""}${item.mood} mood`);
  const power = item.gearPower ?? 0;
  if (power > 0 && item.category === "weapon") lines.push(`+${power} attack for the bout`);
  if (power > 0 && item.category === "shield") lines.push(`+${power} defense for the bout`);
  if (power > 0 && item.category === "potion") lines.push(`Heals ${power} HP in battle`);
  if (item.reusable) lines.push("Stays in the satchel.");
  return lines;
}

export function ItemTip({ item, children, focusable = true }: { item: ItemFacts; children: ReactNode; focusable?: boolean }) {
  const anchor = useRef<HTMLSpanElement>(null);
  const [open, setOpen] = useState(false);
  const [box, setBox] = useState({ top: 0, left: 0 });
  const tipId = useId();

  function place() {
    const rect = anchor.current?.getBoundingClientRect();
    if (!rect) return;
    const width = 260;
    const left = Math.max(8, Math.min(rect.left + rect.width / 2 - width / 2, window.innerWidth - width - 8));
    const below = rect.bottom + 8;
    const top = below + 200 > window.innerHeight ? Math.max(8, rect.top - 188) : below;
    setBox({ top, left });
  }

  useEffect(() => {
    if (!open) return;
    place();
    const onMove = () => place();
    window.addEventListener("scroll", onMove, true);
    window.addEventListener("resize", onMove);
    return () => {
      window.removeEventListener("scroll", onMove, true);
      window.removeEventListener("resize", onMove);
    };
  }, [open]);

  return (
    <span
      className="item-tip"
      ref={anchor}
      tabIndex={focusable ? 0 : undefined}
      aria-describedby={open ? tipId : undefined}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onFocus={() => setOpen(true)}
      onBlur={(event) => {
        if (!anchor.current?.contains(event.relatedTarget as Node | null)) setOpen(false);
      }}
      onPointerUp={(event) => {
        if (event.pointerType === "touch" || window.matchMedia("(hover: none)").matches) {
          setOpen((value) => !value);
        }
      }}
    >
      {children}
      {open && createPortal(
        <div id={tipId} className="item-tooltip" role="tooltip" style={{ top: box.top, left: box.left }}>
          <ItemIcon slug={item.slug} category={item.category} alt="" />
          <div>
            <strong>{item.name}</strong>
            <p className="kicker">{kindLabel(item.category)}{item.price != null ? ` · ${item.price} Glims` : ""}</p>
            {item.description && <p>{item.description}</p>}
            {effectLines(item).map((line) => <p key={line}>{line}</p>)}
          </div>
        </div>,
        document.body,
      )}
    </span>
  );
}
