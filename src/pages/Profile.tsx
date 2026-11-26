import { useEffect, useState, type FormEvent } from "react";
import { Link, useParams } from "react-router-dom";
import { PetPortrait } from "../components/PetPortrait";
import { speciesBySlug } from "../data/catalog";
import { Glims, Meter } from "../components/Ui";
import type { PublicKeeper } from "../lib/types";
import { useTown } from "../state/Town";

export function KeeperPage() {
  const { username = "" } = useParams();
  const { api, profile, act } = useTown();
  const [keeper, setKeeper] = useState<PublicKeeper | null>(null);
  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  useEffect(() => {
    api.keeper(username).then((row) => {
      setKeeper(row);
      if (row && profile && row.profile.username === profile.username) {
        setDisplayName(row.profile.displayName);
        setBio(row.profile.bio);
      }
    }).catch(() => setKeeper(null));
  }, [api, username, profile]);
  if (!keeper) return <div className="card"><h1>No keeper by that name</h1></div>;
  const mine = profile?.username === keeper.profile.username;
  function save(event: FormEvent) {
    event.preventDefault();
    void act(() => api.updateProfile({ displayName, bio }), "Profile saved.");
  }
  return (
    <div className="stack">
      <section className="card">
        <p className="kicker">Keeper</p>
        <h1>{keeper.profile.displayName}</h1>
        <p>@{keeper.profile.username}</p>
        <Glims amount={keeper.profile.glims} />
        <p>{keeper.profile.bio || "No bio yet."}</p>
        {keeper.profile.bannedAt && <p className="banner bad">This keeper is away from the quay.</p>}
      </section>
      <div className="nest-grid">
        {keeper.companions.map((pet) => (
          <article key={pet.id} className="nest-card">
            <Link to={`/pets/${pet.id}`}>
              <div className="pet-frame"><PetPortrait species={pet.speciesSlug} tint={pet.tintSlug} alt={pet.name} /></div>
              <h3>{pet.name}</h3>
            </Link>
            <p className="muted">{pet.speciesName} · level {pet.level} · {pet.rating} rating · {pet.pvpWins}–{pet.pvpLosses}</p>
            <Meter kind="hunger" value={pet.hunger} />
            <Meter kind="mood" value={pet.mood} />
            {!mine && profile && !speciesBySlug(pet.speciesSlug).exclusive && (
              <Link className="btn" to={`/ring?vs=${pet.id}`}>Challenge</Link>
            )}
          </article>
        ))}
      </div>
      {mine && (
        <form className="card" onSubmit={save}>
          <h2>Edit your page</h2>
          <label className="field">Display name<input value={displayName} onChange={(e) => setDisplayName(e.target.value)} /></label>
          <label className="field">Bio<textarea value={bio} onChange={(e) => setBio(e.target.value)} rows={4} /></label>
          <button className="btn" type="submit">Save</button>
        </form>
      )}
    </div>
  );
}
