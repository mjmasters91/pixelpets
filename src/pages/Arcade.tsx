import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { GAMES, gameBySlug } from "../data/catalog";
import { LanternCatch, ParcelSort, QuayDash, ShoalPairs } from "../games/Games";
import { featuredGame, glimsForScore } from "../lib/rules";
import type { ScoreRow } from "../lib/types";
import { useTown } from "../state/Town";

export function Arcade() {
  const bright = featuredGame();
  return (
    <div>
      <p className="kicker">The Arcade</p>
      <h1>Four short games</h1>
      <p>Practice is free. Turning a score in pays Glims on the books: one Glim for every 20 points, at most 1,000 a play, 3,000 a Wick-Time day, and three submits per game. Today’s bright board is <strong>{bright.name}</strong>, which warms the counted score by half before those caps.</p>
      <div className="grid-2">
        {GAMES.map((game) => (
          <Link key={game.slug} to={`/arcade/${game.slug}`} className="card game-tile">
            <strong>{game.name}</strong>
            <p>{game.blurb}</p>
            {game.slug === bright.slug && <p className="muted">Bright board today</p>}
          </Link>
        ))}
      </div>
    </div>
  );
}

export function GamePage() {
  const { slug = "" } = useParams();
  const game = GAMES.find((item) => item.slug === slug);
  const { api, act, profile } = useTown();
  const [phase, setPhase] = useState<"ready" | "play" | "done">("ready");
  const [score, setScore] = useState(0);
  const [session, setSession] = useState<{ sessionId: string; nonce: string } | null>(null);
  const [board, setBoard] = useState<{ today: ScoreRow[]; allTime: ScoreRow[] }>({ today: [], allTime: [] });
  useEffect(() => {
    if (!game) return;
    api.scoreboard(game.slug).then(setBoard).catch(() => setBoard({ today: [], allTime: [] }));
  }, [api, game]);
  if (!game) return <div className="card"><h1>Unknown game</h1></div>;
  const current = game;
  const bright = featuredGame().slug === current.slug;
  async function begin() {
    if (!profile) {
      setSession(null);
      setPhase("play");
      return;
    }
    const ok = await act(async () => {
      const next = await api.startGame(gameBySlug(current.slug).id);
      setSession(next);
      setPhase("play");
    });
    if (!ok) setPhase("ready");
  }
  return (
    <div className="stack">
      <div>
        <p className="kicker">Arcade {bright ? "· bright board" : ""}</p>
        <h1>{game.name}</h1>
        <p>{game.how}</p>
      </div>
      <div className="card play-wrap">
        {phase === "ready" && <button className="btn" type="button" onClick={() => void begin()}>{profile ? "Play for a score" : "Practice"}</button>}
        {phase === "play" && game.slug === "lantern-catch" && <LanternCatch active onDone={(value) => { setScore(value); setPhase("done"); }} />}
        {phase === "play" && game.slug === "shoal-pairs" && <ShoalPairs active onDone={(value) => { setScore(value); setPhase("done"); }} />}
        {phase === "play" && game.slug === "parcel-sort" && <ParcelSort active onDone={(value) => { setScore(value); setPhase("done"); }} />}
        {phase === "play" && game.slug === "quay-dash" && <QuayDash active onDone={(value) => { setScore(value); setPhase("done"); }} />}
        {phase === "done" && (
          <div>
            <h2>Score {score.toLocaleString()}</h2>
            <p>If the books accept it, that is about {glimsForScore(score)} Glims before the daily cap{bright ? ", and the bright board may warm it" : ""}.</p>
            {profile && session && <button className="btn" type="button" onClick={() => void act(() => api.submitGame(session.sessionId, session.nonce, score), "Score turned in.").then(() => api.scoreboard(current.slug).then(setBoard))}>Turn in this score</button>}
            <button className="btn secondary" type="button" onClick={() => { setPhase("ready"); setSession(null); }}>Practice again</button>
          </div>
        )}
      </div>
      <div className="grid-2">
        <Board title="Today" rows={board.today} />
        <Board title="All time" rows={board.allTime} />
      </div>
    </div>
  );
}

function Board({ title, rows }: { title: string; rows: ScoreRow[] }) {
  return (
    <section className="card">
      <h2>{title}</h2>
      <table className="table">
        <tbody>
          {rows.map((row) => <tr key={row.id}><td>{row.username}</td><td>{row.score.toLocaleString()}</td><td>{row.glims} Glims</td></tr>)}
          {rows.length === 0 && <tr><td>No scores yet.</td></tr>}
        </tbody>
      </table>
    </section>
  );
}
