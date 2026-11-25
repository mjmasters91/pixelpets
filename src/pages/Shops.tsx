import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ItemIcon } from "../components/ItemIcon";
import { SHOPS } from "../data/catalog";
import { Glims } from "../components/Ui";
import type { ShopView } from "../lib/types";
import { useTown } from "../state/Town";

const LAND_CLASS: Record<string, string> = { harborlight: "harbor", mossglen: "moss", cinderreach: "cinder", silvershoal: "shoal" };

export function ShopDirectory() {
  return (
    <div>
      <p className="kicker">Shops</p>
      <h1>Four keepers, four shelves</h1>
      <p>Stock refills on its own, a little at a time. Rare things come back in ones and twos. Prices are the prices.</p>
      <div className="grid-2">
        {SHOPS.map((shop) => (
          <Link key={shop.slug} to={`/shops/${shop.slug}`} className={`card shop-tile land-${LAND_CLASS[shop.land]}`}>
            <p className="kicker">{shop.keeper}</p>
            <strong style={{ fontFamily: "var(--display)", fontSize: 32 }}>{shop.name}</strong>
            <p>{shop.blurb}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}

export function ShopPage() {
  const { slug = "" } = useParams();
  const { api, act, glims, profile } = useTown();
  const [shop, setShop] = useState<ShopView | null>(null);
  const [error, setError] = useState("");
  function load() {
    api.shops().then((rows) => setShop(rows.find((row) => row.slug === slug) ?? null)).catch((reason: unknown) => setError(reason instanceof Error ? reason.message : "The shop is closed."));
  }
  useEffect(load, [api, slug]);
  if (error) return <div className="card"><h1>Shop</h1><p className="banner bad">{error}</p></div>;
  if (!shop) return <div className="card"><h1>Lighting the shop…</h1></div>;
  return (
    <div className="stack">
      <section className={`card land-${LAND_CLASS[shop.landSlug] ?? "harbor"}`}>
        <p className="kicker">{shop.landName} · keeper {shop.keeper}</p>
        <h1>{shop.name}</h1>
        <p>{shop.blurb}</p>
        <p className="muted">Next restock {new Date(shop.nextRestockAt).toLocaleTimeString()} · Wick Time</p>
        {profile && <Glims amount={glims} />}
      </section>
      <div className="shelf">
        {shop.lines.map((line) => (
          <article key={line.itemSlug} className="item-card">
            <ItemIcon slug={line.itemSlug} category={line.category} />
            <h3>{line.name}</h3>
            <p className="muted">{line.description}</p>
            <p className="muted">{line.rarity} · {line.qty} on the shelf</p>
            <div className="price"><Glims amount={line.price} /></div>
            <button className="btn" type="button" disabled={!profile || line.qty < 1} onClick={() => void act(() => api.buy(shop.id, line.itemId, 1, line.price), `Bought ${line.name}.`).then(load)}>
              {line.qty < 1 ? "Sold out" : "Buy"}
            </button>
          </article>
        ))}
      </div>
    </div>
  );
}
