import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { GAMES } from "../data/catalog";
import { Meter } from "../components/Ui";
import { featuredGame } from "../lib/rules";
import type { DailyStatus } from "../lib/types";
import { useTown } from "../state/Town";

export function Home() {
  const { profile, companions, api } = useTown();
  const [daily, setDaily] = useState<DailyStatus | null>(null);
  const bright = featuredGame();
  useEffect(() => {
    if (!profile) {
      setDaily(null);
      return;
    }
    api.dailies().then(setDaily).catch(() => setDaily(null));
  }, [api, profile]);

  return (
    <div className="stack">
      <section className="card welcome-card">
        <p className="kicker">Harborlight Quay</p>
        <h1>Welcome to Lumenwick</h1>
        <p>Ferry hops, restocking shops, and companions who only ask to be fed and played with. The currency is Glims.</p>
        <div className="hero-actions">
          <Link className="btn" to="/adopt">Open Nest</Link>
          <Link className="btn secondary" to="/create">Hatchery</Link>
        </div>
      </section>

      <div className="grid-2">
        <section className="card">
          <p className="kicker">Today in Lumenwick</p>
          <h2>Still unclaimed</h2>
          {!profile && <p>Sign in to light the Morning Wick, take the Tide Bowl, and see your satchel.</p>}
          {profile && daily && (
            <ul>
              <li>Morning Wick: {daily.morningClaimed ? `lit · streak ${daily.streak}` : `${daily.nextMorningGlims} Glims waiting`}</li>
              <li>Tide Bowl: {daily.tideClaimed ? "used" : "a free meal is ready"}</li>
              <li>Shared Basket: {3 - daily.basketTaken} takes left today</li>
            </ul>
          )}
          <Link to="/dailies">Open the dailies</Link>
          <p className="muted">The bright arcade board today is {bright.name}. A featured score is warmed by half, still inside the caps.</p>
        </section>
        <section className="card">
          <p className="kicker">Your companions</p>
          <h2>{profile ? profile.displayName : "Four empty slots"}</h2>
          {!profile && <p><Link to="/join">Join the quay</Link> and hatch or adopt up to four friends.</p>}
          {profile && companions.length === 0 && <p>The nest and the hatchery are both open.</p>}
          <div className="stack">
            {companions.map((pet) => (
              <Link key={pet.id} to={`/pets/${pet.id}`} style={{ textDecoration: "none", color: "inherit" }}>
                <strong>{pet.name}</strong>
                <span className="muted"> · {pet.speciesName}</span>
                <Meter kind="hunger" value={pet.hunger} />
                <Meter kind="mood" value={pet.mood} />
              </Link>
            ))}
          </div>
        </section>
      </div>

      <section>
        <p className="kicker">The Arcade</p>
        <h2>Short games, counted fairly</h2>
        <div className="grid-4">
          {GAMES.map((game) => (
            <Link key={game.slug} to={`/arcade/${game.slug}`} className="card game-tile">
              <strong>{game.name}</strong>
              <span className="muted">{game.blurb}</span>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
