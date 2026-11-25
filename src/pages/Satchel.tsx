import { useState } from "react";
import { Link } from "react-router-dom";
import { ItemIcon } from "../components/ItemIcon";
import { useTown } from "../state/Town";

export function SatchelPage() {
  const { profile, satchel, act, api } = useTown();
  const [qty, setQty] = useState<Record<string, number>>({});
  if (!profile) return <div className="card"><h1>Satchel</h1><p><Link to="/sign-in">Sign in</Link> to open it.</p></div>;
  return (
    <div>
      <p className="kicker">Satchel</p>
      <h1>What you are carrying</h1>
      {satchel.length === 0 && <p>Empty pockets. The shops and the Tide Bowl can help.</p>}
      <div className="satchel-grid">
        {satchel.map((item) => (
          <article key={item.itemSlug} className="item-card">
            <ItemIcon slug={item.itemSlug} category={item.category} />
            <h3>{item.name}</h3>
            <p className="muted">×{item.qty} · {item.category}</p>
            <label className="field">Donate
              <input type="number" min={1} max={item.qty} value={qty[item.itemSlug] ?? 1} onChange={(e) => setQty({ ...qty, [item.itemSlug]: Number(e.target.value) })} />
            </label>
            <button className="btn secondary" type="button" onClick={() => void act(() => api.donate(item.itemSlug, qty[item.itemSlug] ?? 1), "Left in the Shared Basket.")}>Donate</button>
          </article>
        ))}
      </div>
      <p><Link to="/greenboard">List something on the Greenboard</Link></p>
    </div>
  );
}
