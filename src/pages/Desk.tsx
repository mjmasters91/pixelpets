import { useEffect, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { ITEMS, SHOPS } from "../data/catalog";
import type { FlaggedGame, LedgerRow, ReportRow, StewardFile } from "../lib/types";
import { useTown } from "../state/Town";

function Gate({ children }: { children: ReactNode }) {
  const { profile } = useTown();
  if (!profile?.isAdmin) return <div className="card"><h1>The desk is locked</h1><p>Only a steward can open these books. In the sample town, visit with <code>?demo=1&as=Sender</code>.</p></div>;
  return <>{children}</>;
}

export function DeskHome() {
  const { api } = useTown();
  const [flags, setFlags] = useState<FlaggedGame[]>([]);
  useEffect(() => { api.stewardFlags().then(setFlags).catch(() => setFlags([])); }, [api]);
  return (
    <Gate>
      <div className="stack">
        <div>
          <p className="kicker">Steward’s Desk</p>
          <h1>Quiet tools</h1>
        </div>
        <div className="row-actions">
          <Link className="btn" to="/desk/keepers">Keepers</Link>
          <Link className="btn secondary" to="/desk/items">Shops</Link>
          <Link className="btn secondary" to="/desk/reports">Reports</Link>
          <Link className="btn secondary" to="/desk/ledger">Ledger</Link>
        </div>
        <section className="card">
          <h2>Near-cap games</h2>
          {flags.map((flag) => <p key={flag.id}>{flag.username} · {flag.gameSlug} · {flag.score}</p>)}
          {flags.length === 0 && <p>Nothing flagged.</p>}
        </section>
      </div>
    </Gate>
  );
}

export function DeskKeepers() {
  const { api, act } = useTown();
  const [name, setName] = useState("Bramble");
  const [file, setFile] = useState<StewardFile | null>(null);
  const [delta, setDelta] = useState(50);
  const [item, setItem] = useState(ITEMS[1].slug);
  async function lookup(event?: { preventDefault(): void }) {
    event?.preventDefault();
    const found = await api.stewardLookup(name);
    setFile(found);
  }
  return (
    <Gate>
      <form className="card stack" onSubmit={(event) => void lookup(event)}>
        <h1>Keeper lookup</h1>
        <label className="field">Username<input value={name} onChange={(e) => setName(e.target.value)} /></label>
        <button className="btn" type="submit">Look up</button>
        {file && (
          <div>
            <p>{file.profile.displayName} · {file.profile.glims} Glims · {file.profile.bannedAt ? "banned" : "in good standing"}</p>
            <p>Companions: {file.companions.map((pet) => `${pet.name} (${pet.hunger}/${pet.mood})`).join(", ") || "none"}</p>
            <p>Satchel: {file.satchel.map((stack) => `${stack.name} ×${stack.qty}`).join(", ") || "empty"}</p>
            <div className="inline">
              <input type="number" value={delta} onChange={(e) => setDelta(Number(e.target.value))} />
              <button className="btn secondary" type="button" onClick={() => void act(() => api.stewardGlims(name, delta, "desk"), "Glims adjusted.").then(() => lookup())}>Adjust Glims</button>
            </div>
            <div className="inline">
              <select value={item} onChange={(e) => setItem(e.target.value)}>{ITEMS.map((entry) => <option key={entry.slug} value={entry.slug}>{entry.name}</option>)}</select>
              <button className="btn secondary" type="button" onClick={() => void act(() => api.stewardItem(name, item, 1), "Item granted.").then(() => lookup())}>Grant item</button>
            </div>
            <button className="btn danger" type="button" onClick={() => void act(() => api.stewardBan(name, !file.profile.bannedAt, "desk"), "Ban updated.").then(() => lookup())}>{file.profile.bannedAt ? "Unban" : "Ban"}</button>
          </div>
        )}
      </form>
    </Gate>
  );
}

export function DeskItems() {
  const { api, act } = useTown();
  const [shopId, setShopId] = useState(SHOPS[0].id);
  const shop = SHOPS.find((entry) => entry.id === shopId) ?? SHOPS[0];
  const [itemId, setItemId] = useState(shop.stock[0] ? ITEMS.find((entry) => entry.slug === shop.stock[0].itemSlug)?.id ?? "" : "");
  const [price, setPrice] = useState(40);
  return (
    <Gate>
      <div className="card stack">
        <h1>Catalog and shops</h1>
        <select value={shopId} onChange={(e) => setShopId(e.target.value)}>{SHOPS.map((entry) => <option key={entry.id} value={entry.id}>{entry.name}</option>)}</select>
        <button className="btn" type="button" onClick={() => void act(() => api.stewardRestock(shopId), "Shelves refilled.")}>Force restock</button>
        <div className="inline">
          <select value={itemId} onChange={(e) => setItemId(e.target.value)}>
            {shop.stock.map((line) => {
              const item = ITEMS.find((entry) => entry.slug === line.itemSlug);
              return item ? <option key={item.id} value={item.id}>{item.name}</option> : null;
            })}
          </select>
          <input type="number" min={0} value={price} onChange={(e) => setPrice(Number(e.target.value))} />
          <button className="btn secondary" type="button" onClick={() => void act(() => api.stewardPrice(shopId, itemId, price), "Price updated.")}>Set price</button>
        </div>
      </div>
    </Gate>
  );
}

export function DeskReports() {
  const { api, act } = useTown();
  const [rows, setRows] = useState<ReportRow[]>([]);
  function load() { api.stewardReports().then(setRows).catch(() => setRows([])); }
  useEffect(load, [api]);
  return (
    <Gate>
      <div className="card">
        <h1>Reports</h1>
        {rows.map((row) => (
          <article key={row.id} className="thread">
            <p><strong>{row.reporter}</strong> on {row.targetType} · {row.status}</p>
            <p>{row.reason}</p>
            <button className="btn" type="button" onClick={() => void act(() => api.stewardResolve(row.id, "resolved"), "Resolved.").then(load)}>Resolve</button>
            <button className="btn secondary" type="button" onClick={() => void act(() => api.stewardResolve(row.id, "dismissed"), "Dismissed.").then(load)}>Dismiss</button>
          </article>
        ))}
        {rows.length === 0 && <p>The queue is clear.</p>}
      </div>
    </Gate>
  );
}

export function DeskLedger() {
  const { api } = useTown();
  const [rows, setRows] = useState<LedgerRow[]>([]);
  useEffect(() => { api.stewardLedger().then(setRows).catch(() => setRows([])); }, [api]);
  return (
    <Gate>
      <div className="card">
        <h1>Economy log</h1>
        <table className="table">
          <tbody>
            {rows.map((row) => <tr key={row.id}><td>{row.username}</td><td>{row.delta}</td><td>{row.balanceAfter}</td><td>{row.reason}</td></tr>)}
          </tbody>
        </table>
      </div>
    </Gate>
  );
}
