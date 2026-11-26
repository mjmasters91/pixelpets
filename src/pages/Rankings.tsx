import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { PetPortrait } from "../components/PetPortrait";
import type { RankingBoard, RecentBout } from "../lib/types";
import { useTown } from "../state/Town";

const BOARDS = [
  ["ring", "Ring record"],
  ["pets", "Top pets"],
  ["keepers", "Top keepers"],
  ["week", "This week"],
] as const;

export function Rankings() {
  const { api, profile, companions } = useTown();
  const navigate = useNavigate();
  const [board, setBoard] = useState<(typeof BOARDS)[number][0]>("ring");
  const [table, setTable] = useState<RankingBoard | null>(null);
  const [recent, setRecent] = useState<RecentBout[]>([]);
  const [notices, setNotices] = useState<{ id: string; body: string; at: string }[]>([]);
  const [mine, setMine] = useState(companions.find((pet) => pet.speciesSlug !== "crownwyrm")?.id ?? "");
  useEffect(() => {
    api.ringRankings(board).then(setTable).catch(() => setTable({ board, rows: [] }));
  }, [api, board]);
  useEffect(() => {
    api.ringRecent().then(setRecent).catch(() => setRecent([]));
    if (profile) api.ringNotices().then(setNotices).catch(() => setNotices([]));
  }, [api, profile]);
  const challenger = companions.find((pet) => pet.id === mine && pet.speciesSlug !== "crownwyrm");
  return (
    <div className="stack">
      <div className="card rank-head">
        <p className="kicker">Ember Ring</p>
        <h1>Rankings</h1>
        <p>Ring Record counts every bout, including Crownwyrm. The rating boards stay PvP only, and Crownwyrm stays off those.</p>
        <div className="row-actions">
          {BOARDS.map(([id, label]) => (
            <button key={id} className={`btn ${board === id ? "" : "secondary"}`} type="button" onClick={() => setBoard(id)}>{label}</button>
          ))}
          <Link className="btn ghost" to="/ring">Back to the ring</Link>
        </div>
        {profile && (
          <label className="field">Challenge with
            <select value={mine} onChange={(event) => setMine(event.target.value)}>
              {companions.filter((pet) => pet.speciesSlug !== "crownwyrm").map((pet) => (
                <option key={pet.id} value={pet.id}>{pet.name} · {pet.rating} · {pet.pvpWins}–{pet.pvpLosses}</option>
              ))}
            </select>
          </label>
        )}
      </div>
      <div className="stack">
        {(table?.rows ?? []).map((row) => (
          <article key={`${row.rank}-${row.owner}-${row.name}`} className={`card rank-row ${row.yours ? "yours" : ""}`}>
            <strong className="rank-num">{row.rank}</strong>
            <div className="pet-frame rank-pet"><PetPortrait species={row.speciesSlug} alt="" /></div>
            <div>
              <h2>{row.name}{row.speciesSlug === "crownwyrm" && <span className="crown-badge">Crown</span>}</h2>
              <p className="muted">{row.owner}{row.level ? ` · level ${row.level}` : ""}</p>
              {board === "ring" ? (
                <p>{(row.pveWins ?? 0) + row.pvpWins}–{(row.pveLosses ?? 0) + (row.pvpLosses ?? 0)} · PvE {row.pveWins ?? 0}–{row.pveLosses ?? 0} · PvP {row.pvpWins}–{row.pvpLosses ?? 0}{(row.pveStreak || row.pvpStreak) ? ` · streak ${row.pveStreak || row.pvpStreak}` : ""}</p>
              ) : (
                <p>{row.weekWins != null ? `${row.weekWins} wins this week` : `${row.rating} rating`}</p>
              )}
              {board !== "ring" && row.pvpLosses != null && <p className="muted">{row.pvpWins}–{row.pvpLosses}{row.pvpStreak ? ` · streak ${row.pvpStreak}` : ""}</p>}
              {board === "keepers" && <p className="muted">{row.pvpWins} keeper wins</p>}
            </div>
            {profile && row.companionId && !row.yours && challenger && (
              <button className="btn" type="button" onClick={() => navigate(`/ring?vs=${row.companionId}&with=${challenger.id}`)}>Challenge</button>
            )}
          </article>
        ))}
        {table && table.rows.length === 0 && <p className="card">The board is still quiet.</p>}
      </div>
      <section className="card">
        <h2>Recent bouts</h2>
        {recent.map((bout) => (
          <p key={bout.id}>
            {bout.challenger} ({bout.challengerOwner}) {bout.defenderWon ? "fell to" : "beat"} {bout.defender} ({bout.defenderOwner})
            {bout.rated ? ` · ${bout.ratingDelta >= 0 ? "+" : ""}${bout.ratingDelta}` : " · unrated"}
          </p>
        ))}
        {recent.length === 0 && <p className="muted">No keeper bouts yet.</p>}
      </section>
      {profile && (
        <section className="card">
          <h2>Your defense notes</h2>
          {notices.map((note) => <p key={note.id}>{note.body}</p>)}
          {notices.length === 0 && <p className="muted">Nobody has called your companions out yet.</p>}
        </section>
      )}
    </div>
  );
}
