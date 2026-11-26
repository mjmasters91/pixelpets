import { useEffect, useRef, useState } from "react";
import { Link, Navigate, useNavigate, useParams } from "react-router-dom";
import { LANDS, SHOPS } from "../data/catalog";
import { TOWNS } from "../data/towns";

const TOWN_KEY = "pixelpets-town";

function rememberedTown() {
  const saved = localStorage.getItem(TOWN_KEY);
  return TOWNS.some((town) => town.slug === saved) ? saved! : TOWNS[0].slug;
}

export function TownCanvas({ slug }: { slug: string }) {
  const town = TOWNS.find((item) => item.slug === slug);
  const land = LANDS.find((item) => item.slug === slug);
  if (!town || !land) return null;
  return (
    <>
      <div className="town-map">
        <img src={`${import.meta.env.BASE_URL}art/towns/${town.slug}.jpg`} alt={`${land.name} town, with shop buildings and blank signs`} />
        {town.spots.map((spot) => {
          const shop = SHOPS.find((item) => item.slug === spot.shopSlug);
          return (
            <Link
              key={spot.shopSlug}
              className="hotspot"
              style={{ left: `${spot.x}%`, top: `${spot.y}%`, width: `${spot.w}%`, height: `${spot.h}%` }}
              to={`/shops/${spot.shopSlug}`}
              aria-label={`${shop?.name ?? spot.label}. ${spot.hint}`}
            >
              <span className="sign">{shop?.name ?? spot.label}</span>
              <span className="tip">{spot.hint}</span>
            </Link>
          );
        })}
      </div>
    </>
  );
}

export function TownsPage() {
  const { slug = "" } = useParams();
  const navigate = useNavigate();
  const known = TOWNS.some((town) => town.slug === slug);
  const [motion, setMotion] = useState<"next" | "prev" | "">("");
  const touchX = useRef<number | null>(null);
  const index = Math.max(0, TOWNS.findIndex((town) => town.slug === slug));
  const town = TOWNS[index];
  const land = LANDS.find((item) => item.slug === town.slug);

  useEffect(() => {
    if (!slug) return;
    if (known) localStorage.setItem(TOWN_KEY, slug);
  }, [slug, known]);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      const tag = (event.target as HTMLElement | null)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      if (event.key === "ArrowLeft") shift(-1);
      if (event.key === "ArrowRight") shift(1);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  if (!slug) return <Navigate to={`/towns/${rememberedTown()}`} replace />;
  if (!known || !land) return <div className="card"><h1>That town is not on the ferry map</h1></div>;

  function shift(delta: number) {
    const next = TOWNS[(index + delta + TOWNS.length) % TOWNS.length];
    setMotion(delta > 0 ? "next" : "prev");
    navigate(`/towns/${next.slug}`);
  }

  return (
    <div className="stack town-browser">
      <div className="town-heading">
        <p className="kicker">{land.tagline}</p>
        <h1>{town.name}</h1>
        {town.slug === "cinderreach" && <p><Link to="/ring">The Ember Ring is up the cliff path.</Link></p>}
      </div>
      <div
        className={`town-stage ${motion}`}
        key={town.slug}
        onTouchStart={(event) => { touchX.current = event.changedTouches[0]?.clientX ?? null; }}
        onTouchEnd={(event) => {
          const start = touchX.current;
          const end = event.changedTouches[0]?.clientX;
          touchX.current = null;
          if (start == null || end == null) return;
          if (start - end > 48) shift(1);
          else if (end - start > 48) shift(-1);
        }}
      >
        <button className="town-arrow prev" type="button" aria-label="Previous town" onClick={() => shift(-1)}>‹</button>
        <TownCanvas slug={town.slug} />
        <button className="town-arrow next" type="button" aria-label="Next town" onClick={() => shift(1)}>›</button>
      </div>
      <div className="town-fallback">
        {town.spots.map((spot) => {
          const shop = SHOPS.find((item) => item.slug === spot.shopSlug);
          return (
            <Link key={spot.shopSlug} className="btn secondary" to={`/shops/${spot.shopSlug}`}>
              {shop?.name ?? spot.label}
            </Link>
          );
        })}
      </div>
      <div className="town-dots" role="tablist" aria-label="Towns">
        {TOWNS.map((item, dot) => (
          <button
            key={item.slug}
            type="button"
            role="tab"
            aria-selected={item.slug === town.slug}
            className={item.slug === town.slug ? "on" : ""}
            aria-label={item.name}
            onClick={() => {
              setMotion(dot > index ? "next" : "prev");
              navigate(`/towns/${item.slug}`);
            }}
          />
        ))}
      </div>
    </div>
  );
}

export function TownMap() {
  const { slug = "" } = useParams();
  return <Navigate to={TOWNS.some((town) => town.slug === slug) ? `/towns/${slug}` : "/towns"} replace />;
}
