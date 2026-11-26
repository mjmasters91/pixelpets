import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ItemIcon } from "../components/ItemIcon";
import { ItemTip } from "../components/ItemTip";
import { SHOPS } from "../data/catalog";
import { Glims } from "../components/Ui";
import type { ShopView } from "../lib/types";
import { useTown } from "../state/Town";

export function ShopPage() {
  const { slug = "" } = useParams();
  const { api, act, glims, profile } = useTown();
  const [shop, setShop] = useState<ShopView | null>(null);
  const [error, setError] = useState("");
  const [bought, setBought] = useState("");
  function load() {
    api.shops().then((rows) => setShop(rows.find((row) => row.slug === slug) ?? null)).catch((reason: unknown) => setError(reason instanceof Error ? reason.message : "The shop is closed."));
  }
  useEffect(load, [api, slug]);
  if (error) return <div className="card"><h1>Shop</h1><p className="banner bad">{error}</p></div>;
  if (!shop) return <div className="card skeleton" aria-busy="true"><h1>Lighting the shop…</h1><p className="muted">The shelves are being set.</p></div>;
  const front = SHOPS.find((item) => item.slug === shop.slug);
  return (
    <div className="stack shop-page">
      <div className="card shop-blurb">
        <p className="kicker">{shop.landName}</p>
        <h1>{shop.name}</h1>
        <p>{front?.greeting ?? shop.blurb}</p>
        <p className="muted">{shop.keeper} · restock {new Date(shop.nextRestockAt).toLocaleTimeString()}</p>
        {profile && <Glims amount={glims} />}
        <p><Link to={`/towns/${shop.landSlug}`}>Back to the town</Link></p>
      </div>
      <div className="shop-wares">
        {shop.lines.map((line) => (
          <article key={line.itemSlug} className={`item-card ${bought === line.itemSlug ? "just-bought" : ""}`}>
            <ItemTip item={{ slug: line.itemSlug, name: line.name, category: line.category, description: line.description, hunger: line.hunger, mood: line.mood, gearPower: line.gearPower, reusable: line.reusable, price: line.price }}>
              <ItemIcon slug={line.itemSlug} category={line.category} alt="" />
            </ItemTip>
            <h3>{line.name}</h3>
            <p className="muted">{line.qty} left</p>
            <div className="price"><Glims amount={line.price} /></div>
            <button className="btn" type="button" disabled={!profile || line.qty < 1} onClick={() => void act(() => api.buy(shop.id, line.itemId, 1, line.price), `Bought ${line.name}.`).then((ok) => { if (ok) { setBought(line.itemSlug); window.setTimeout(() => setBought(""), 700); } return load(); })}>
              {line.qty < 1 ? "Sold out" : "Buy"}
            </button>
          </article>
        ))}
      </div>
    </div>
  );
}
