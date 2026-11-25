import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { LANDS, PET_CAP, SPECIES, TINTS, speciesBySlug } from "../data/catalog";
import { PetPortrait } from "../components/PetPortrait";
import { Meter } from "../components/Ui";
import { careLine } from "../lib/rules";
import type { Companion, Stack } from "../lib/types";
import { useTown } from "../state/Town";

export function Pets() {
  const { profile, companions, satchel, act, api } = useTown();
  if (!profile) return <div className="card"><h1>My Pets</h1><p><Link to="/sign-in">Sign in</Link> to see your four slots.</p></div>;
  const slots: (Companion | null)[] = [...companions];
  while (slots.length < PET_CAP) slots.push(null);
  return (
    <div className="stack">
      <div>
        <p className="kicker">My Pets</p>
        <h1>Four slots</h1>
        <p>Hunger and mood settle with time. Nobody runs away. Feed, play, or brush them from the satchel.</p>
      </div>
      <div className="slot-grid">
        {slots.map((pet, index) => pet ? (
          <article key={pet.id} className="card slot">
            <Link to={`/pets/${pet.id}`} className="pet-frame">
              <PetPortrait species={pet.speciesSlug} tint={pet.tintSlug} alt={pet.name} className={pet.hunger < 15 || pet.mood < 15 ? "low-pet" : ""} />
            </Link>
            <h2>{pet.name}</h2>
            <p className="muted">{pet.speciesName} · {pet.tintName}</p>
            <Meter kind="hunger" value={pet.hunger} />
            <Meter kind="mood" value={pet.mood} />
            <p className="muted">{careLine(pet.hunger, pet.mood)}</p>
            <CareActions pet={pet} satchel={satchel} onAct={(fn, ok) => act(fn, ok)} />
          </article>
        ) : (
          <article key={`empty-${index}`} className="card slot">
            <div className="pet-frame" />
            <h2>Empty slot</h2>
            <div className="row-actions">
              <Link className="btn" to="/adopt">Adopt</Link>
              <Link className="btn secondary" to="/create">Hatch</Link>
            </div>
          </article>
        ))}
      </div>
      <p className="muted">Playing uses a toy and then waits 15 minutes. Food is eaten. Brushes stay in the satchel.</p>
      <ReleaseHint apiRelease={(id) => api.releaseCompanion(id)} pets={companions} act={act} />
    </div>
  );
}

function CareActions({ pet, satchel, onAct }: { pet: Companion; satchel: Stack[]; onAct: (fn: () => Promise<unknown>, ok?: string) => Promise<boolean> }) {
  const { api } = useTown();
  const foods = satchel.filter((item) => item.category === "food" || item.category === "treat");
  const toys = satchel.filter((item) => item.category === "toy");
  const brushes = satchel.filter((item) => item.category === "groom");
  const [food, setFood] = useState(foods[0]?.itemSlug ?? "");
  const [toy, setToy] = useState(toys[0]?.itemSlug ?? "");
  const [brush, setBrush] = useState(brushes[0]?.itemSlug ?? "");
  return (
    <div className="stack">
      <div className="inline">
        <select value={food} onChange={(e) => setFood(e.target.value)} aria-label={`Food for ${pet.name}`}>
          {foods.map((item) => <option key={item.itemSlug} value={item.itemSlug}>{item.name} ×{item.qty}</option>)}
          {foods.length === 0 && <option value="">No food</option>}
        </select>
        <button className="btn" type="button" disabled={!food} onClick={() => void onAct(() => api.feed(pet.id, food), `${pet.name} ate well.`)}>Feed</button>
      </div>
      <div className="inline">
        <select value={toy} onChange={(e) => setToy(e.target.value)} aria-label={`Toy for ${pet.name}`}>
          {toys.map((item) => <option key={item.itemSlug} value={item.itemSlug}>{item.name}</option>)}
          {toys.length === 0 && <option value="">No toy</option>}
        </select>
        <button className="btn secondary" type="button" disabled={!toy} onClick={() => void onAct(() => api.play(pet.id, toy), `${pet.name} played.`)}>Play</button>
      </div>
      <div className="inline">
        <select value={brush} onChange={(e) => setBrush(e.target.value)} aria-label={`Brush for ${pet.name}`}>
          {brushes.map((item) => <option key={item.itemSlug} value={item.itemSlug}>{item.name}</option>)}
          {brushes.length === 0 && <option value="">No brush</option>}
        </select>
        <button className="btn secondary" type="button" disabled={!brush} onClick={() => void onAct(() => api.groom(pet.id, brush), `${pet.name} looks neat.`)}>Groom</button>
      </div>
    </div>
  );
}

function ReleaseHint({ pets, act, apiRelease }: { pets: Companion[]; act: (fn: () => Promise<unknown>, ok?: string) => Promise<boolean>; apiRelease: (id: string) => Promise<void> }) {
  const [id, setId] = useState(pets[0]?.id ?? "");
  const [open, setOpen] = useState(false);
  if (!pets.length) return null;
  return (
    <div className="card">
      <h2>Release to the Open Nest</h2>
      <p>The name stays spoken. You can adopt or hatch again afterward, even if this was your last companion.</p>
      <div className="inline">
        <select value={id} onChange={(e) => setId(e.target.value)}>
          {pets.map((pet) => <option key={pet.id} value={pet.id}>{pet.name}</option>)}
        </select>
        <button className="btn danger" type="button" onClick={() => setOpen(true)}>Release</button>
      </div>
      {open && (
        <div className="modal-back" onClick={() => setOpen(false)}>
          <div className="card modal" onClick={(event) => event.stopPropagation()}>
            <h2>Let them wait in the nest?</h2>
            <p>They keep their name, species, and tint. Another keeper may adopt them.</p>
            <div className="row-actions">
              <button className="btn danger" type="button" onClick={() => { setOpen(false); void act(() => apiRelease(id), "Released to the Open Nest."); }}>Yes, release</button>
              <button className="btn secondary" type="button" onClick={() => setOpen(false)}>Keep them</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export function PetPage() {
  const { id = "" } = useParams();
  const { api, profile } = useTown();
  const [pet, setPet] = useState<Companion | null>(null);
  useEffect(() => {
    api.getCompanion(id).then(setPet).catch(() => setPet(null));
  }, [api, id]);
  if (!pet) return <div className="card"><h1>Companion not found</h1><p>They may have changed quays.</p></div>;
  return (
    <article className="card hero">
      <div className="pet-frame" style={{ minHeight: 320 }}>
        <PetPortrait species={pet.speciesSlug} tint={pet.tintSlug} alt={`${pet.name} the ${pet.speciesName}`} />
      </div>
      <div>
        <p className="kicker">{pet.speciesName} · {pet.tintName}</p>
        <h1>{pet.name}</h1>
        <p>{speciesBySlug(pet.speciesSlug).blurb}</p>
        <p>{pet.ownerUsername ? <>Keeper <Link to={`/keepers/${pet.ownerUsername}`}>{pet.ownerUsername}</Link></> : "Waiting in the Open Nest."}</p>
        <Meter kind="hunger" value={pet.hunger} />
        <Meter kind="mood" value={pet.mood} />
        <p className="muted">{careLine(pet.hunger, pet.mood)} Hatched {new Date(pet.createdAt).toLocaleDateString()}.</p>
        {!pet.ownerId && profile && <button className="btn" type="button" onClick={() => void api.adoptCompanion(pet.id).then(() => api.getCompanion(pet.id)).then(setPet)}>Adopt</button>}
      </div>
    </article>
  );
}

export function Hatchery() {
  const { act, api, profile } = useTown();
  const [species, setSpecies] = useState(SPECIES[0].slug);
  const [tint, setTint] = useState("natural");
  const [name, setName] = useState("");
  const chosen = SPECIES.find((item) => item.slug === species) ?? SPECIES[0];
  const tintDef = TINTS.find((item) => item.slug === tint) ?? TINTS[0];
  return (
    <div className="stack">
      <div>
        <p className="kicker">The Hatchery</p>
        <h1>Pick a species, a tint, and a name</h1>
        <p>Natural keeps each species’ own colors. The other tints shift the coat from that base, so markings, ruffs, flames, and stars stay in step. You may keep four companions.</p>
      </div>
      <div className="grid-2">
        <div className="species-grid">
          {SPECIES.map((item) => (
            <button key={item.slug} type="button" className={`species-card ${item.slug === species ? "selected" : ""}`} onClick={() => setSpecies(item.slug)}>
              <div className="pet-frame"><PetPortrait species={item.slug} alt="" /></div>
              <h3>{item.name}</h3>
            </button>
          ))}
        </div>
        <form className="card" onSubmit={(event) => {
          event.preventDefault();
          if (!profile) return;
          void act(() => api.createCompanion(chosen.id, tintDef.id, name), `${name} has joined you.`);
        }}>
          <div className="pet-frame" style={{ minHeight: 260 }}>
            <PetPortrait species={chosen.slug} tint={tint} alt={`${chosen.name} in ${tintDef.name}`} />
          </div>
          <h2>{chosen.name}</h2>
          <p>{chosen.blurb}</p>
          <div className="tint-row" role="listbox" aria-label="Tint">
            {TINTS.map((item) => (
              <button key={item.slug} type="button" className={`swatch ${item.slug === tint ? "on" : ""}`} style={{ background: item.swatch }} onClick={() => setTint(item.slug)} title={item.name}>
                <span>{item.name}</span>
              </button>
            ))}
          </div>
          <p className="muted">{tintDef.name}: {tintDef.note}</p>
          <label className="field">Name<input value={name} onChange={(e) => setName(e.target.value)} required placeholder="A spoken name" /></label>
          {profile ? <button className="btn" type="submit">Hatch</button> : <Link className="btn" to="/sign-in">Sign in to hatch</Link>}
        </form>
      </div>
    </div>
  );
}

export function Adopt() {
  const { api, act, profile } = useTown();
  const [nest, setNest] = useState<Companion[] | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    api.listNest().then(setNest).catch((reason: unknown) => setError(reason instanceof Error ? reason.message : "The nest is quiet."));
  }, [api]);
  const grouped = useMemo(() => LANDS.map((land) => ({
    land,
    pets: (nest ?? []).filter((pet) => {
      try { return speciesBySlug(pet.speciesSlug).home === land.slug; } catch { return false; }
    }),
  })), [nest]);
  return (
    <div>
      <p className="kicker">The Open Nest</p>
      <h1>Adopt a companion</h1>
      <p>Eighteen species wait in their own colors. Adopting is free. A keeper may travel with four at a time. Want to choose a tint yourself? <Link to="/create">The Hatchery</Link> is next door.</p>
      {error && <p className="banner bad">{error}</p>}
      {grouped.map(({ land, pets }) => (
        <section key={land.slug} className="nest-section">
          <h2>{land.name}</h2>
          <p className="muted">{land.tagline}</p>
          <div className="nest-grid">
            {pets.map((pet) => (
              <article key={pet.id} className="nest-card">
                <div className="pet-frame">
                  <PetPortrait species={pet.speciesSlug} tint={pet.tintSlug} alt={`${pet.name} the ${pet.speciesName}`} />
                </div>
                <h3>{pet.name}</h3>
                <p className="muted">{pet.speciesName} · {pet.tintName}</p>
                {profile ? (
                  <button className="btn" type="button" onClick={() => void act(() => api.adoptCompanion(pet.id), `${pet.name} came home.`).then((ok) => { if (ok) setNest((rows) => rows?.filter((row) => row.id !== pet.id) ?? []); })}>Adopt</button>
                ) : <Link to="/sign-in">Sign in to adopt</Link>}
              </article>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
