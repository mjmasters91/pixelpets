import { useEffect, useState, type FormEvent } from "react";
import { Link, useParams } from "react-router-dom";
import { Glims } from "../components/Ui";
import type { TradeView } from "../lib/types";
import { useTown } from "../state/Town";

export function TradeBoard() {
  const { api, profile, satchel, act } = useTown();
  const [rows, setRows] = useState<TradeView[]>([]);
  const [lines, setLines] = useState([{ itemSlug: satchel[0]?.itemSlug ?? "", qty: 1 }]);
  const [ask, setAsk] = useState(0);
  const [wish, setWish] = useState("");
  function load() {
    api.trades().then(setRows).catch(() => setRows([]));
  }
  useEffect(load, [api]);
  function submit(event: FormEvent) {
    event.preventDefault();
    void act(() => api.createTrade(lines.filter((line) => line.itemSlug), ask, wish), "Listed on the Greenboard.").then(load);
  }
  return (
    <div className="stack">
      <div>
        <p className="kicker">The Greenboard</p>
        <h1>Player listings</h1>
        <p>Items wait in escrow for three Wick-Time days. Pay the asking price, or leave an offer. There is no cancel fee.</p>
      </div>
      <div className="stack">
        {rows.map((trade) => (
          <Link key={trade.id} to={`/greenboard/${trade.id}`} className="card">
            <strong>{trade.seller}</strong> asks <Glims amount={trade.askGlims} />
            <p>{trade.lots.map((lot) => `${lot.name} ×${lot.qty}`).join(", ")}</p>
            {trade.wishlist && <p className="muted">Wants: {trade.wishlist}</p>}
          </Link>
        ))}
        {rows.length === 0 && <p>The board is clear.</p>}
      </div>
      {profile && (
        <form className="card" onSubmit={submit}>
          <h2>List from your satchel</h2>
          {lines.map((line, index) => (
            <div className="inline" key={index}>
              <select value={line.itemSlug} onChange={(e) => setLines(lines.map((item, i) => i === index ? { ...item, itemSlug: e.target.value } : item))}>
                {satchel.map((item) => <option key={item.itemSlug} value={item.itemSlug}>{item.name} ×{item.qty}</option>)}
              </select>
              <input type="number" min={1} value={line.qty} onChange={(e) => setLines(lines.map((item, i) => i === index ? { ...item, qty: Number(e.target.value) } : item))} />
            </div>
          ))}
          {lines.length < 5 && <button className="btn ghost" type="button" onClick={() => setLines([...lines, { itemSlug: satchel[0]?.itemSlug ?? "", qty: 1 }])}>Add a stack</button>}
          <label className="field">Asking Glims<input type="number" min={0} value={ask} onChange={(e) => setAsk(Number(e.target.value))} /></label>
          <label className="field">Wishlist note<input value={wish} onChange={(e) => setWish(e.target.value)} /></label>
          <button className="btn" type="submit">Post listing</button>
        </form>
      )}
    </div>
  );
}

export function ListingPage() {
  const { id = "" } = useParams();
  const { api, act, profile, satchel } = useTown();
  const [trade, setTrade] = useState<TradeView | null>(null);
  const [glims, setGlims] = useState(0);
  const [itemSlug, setItemSlug] = useState(satchel[0]?.itemSlug ?? "");
  function load() {
    api.getTrade(id).then(setTrade).catch(() => setTrade(null));
  }
  useEffect(load, [api, id]);
  if (!trade) return <div className="card"><h1>Listing</h1><p>That note has left the board.</p></div>;
  const mine = profile?.id === trade.sellerId;
  return (
    <div className="card stack">
      <p className="kicker">{trade.status}</p>
      <h1>{trade.seller}’s listing</h1>
      <p>{trade.lots.map((lot) => `${lot.name} ×${lot.qty}`).join(", ")}</p>
      <p>Asking <Glims amount={trade.askGlims} /></p>
      {trade.wishlist && <p>Wishlist: {trade.wishlist}</p>}
      <p className="muted">Expires {new Date(trade.expiresAt).toLocaleString()}</p>
      {profile && trade.status === "open" && !mine && (
        <button className="btn" type="button" onClick={() => void act(() => api.buyTrade(trade.id), "The trade is done.").then(load)}>Pay the asking price</button>
      )}
      {mine && trade.status === "open" && (
        <button className="btn secondary" type="button" onClick={() => void act(() => api.cancelTrade(trade.id), "Listing cancelled.").then(load)}>Cancel and return items</button>
      )}
      {profile && !mine && trade.status === "open" && (
        <form onSubmit={(event) => { event.preventDefault(); void act(() => api.offerTrade(trade.id, glims, itemSlug ? [{ itemSlug, qty: 1 }] : []), "Offer left in escrow.").then(load); }}>
          <h2>Leave an offer</h2>
          <label className="field">Glims<input type="number" min={0} value={glims} onChange={(e) => setGlims(Number(e.target.value))} /></label>
          <label className="field">Item
            <select value={itemSlug} onChange={(e) => setItemSlug(e.target.value)}>
              <option value="">No item</option>
              {satchel.map((item) => <option key={item.itemSlug} value={item.itemSlug}>{item.name}</option>)}
            </select>
          </label>
          <button className="btn secondary" type="submit">Offer</button>
        </form>
      )}
      <div>
        {trade.offers.map((offer) => (
          <div key={offer.id} className="thread">
            <strong>{offer.buyer}</strong> offers <Glims amount={offer.glims} /> {offer.lots.map((lot) => `${lot.name} ×${lot.qty}`).join(", ")} · {offer.status}
            {mine && offer.status === "open" && <button className="btn" type="button" onClick={() => void act(() => api.acceptOffer(offer.id), "Offer accepted.").then(load)}>Accept</button>}
            {profile?.id === offer.buyerId && offer.status === "open" && <button className="btn ghost" type="button" onClick={() => void act(() => api.withdrawOffer(offer.id), "Offer withdrawn.").then(load)}>Withdraw</button>}
          </div>
        ))}
      </div>
    </div>
  );
}
