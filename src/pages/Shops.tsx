import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ItemIcon } from "../components/ItemIcon";
import { SHOPS } from "../data/catalog";
import { artPath } from "../lib/art";
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
  const front = SHOPS.find((item) => item.slug === shop.slug);
  return (
    <div className="shop-stage">
      <img className="shop-art" src={artPath("shop-interior.webp")} alt="" />
      <div className="shop-float">
        <div className="card shop-blurb">
          <p className="kicker">{shop.landName}</p>
          <h1>{shop.name}</h1>
          <p>{front?.greeting ?? shop.blurb}</p>
          <p className="muted">{shop.keeper} · next restock {new Date(shop.nextRestockAt).toLocaleTimeString()}</p>
          {profile && <Glims amount={glims} />}
          <p><Link to={`/lands/${shop.landSlug}/town`}>Back to the town</Link></p>
        </div>
        <div className="shop-wares">
          {shop.lines.map((line) => (
            <article key={line.itemSlug} className="item-card">
              <ItemIcon slug={line.itemSlug} category={line.category} alt="" />
              <h3>{line.name}</h3>
              <p className="muted">{line.qty} on the shelf</p>
              <div className="price"><Glims amount={line.price} /></div>
              <button className="btn" type="button" disabled={!profile || line.qty < 1} onClick={() => void act(() => api.buy(shop.id, line.itemId, 1, line.price), `Bought ${line.name}.`).then(load)}>
                {line.qty < 1 ? "Sold out" : "Buy"}
              </button>
            </article>
          ))}
        </div>
      </div>
    </div>
  );
}
